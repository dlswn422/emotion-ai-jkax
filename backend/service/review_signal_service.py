from __future__ import annotations

import json
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from backend.core.fcm_client import send_fcm_to_devices
from backend.core.redis_client import publish
from backend.service.review_signal_classifier import classify_review_signal


TENANT_ID = 7
STORE_ID = "store_7"

SIGNAL_TYPE_MAP = {
    1: "RISK",
    2: "OPPORTUNITY",
}

SIGNAL_LEVEL_TO_CATEGORY = {
    "HIGH": "긴급",
    "MEDIUM": "주의",
    "LOW": "신호",
}

SIGNAL_TYPE_TO_LABEL = {
    "RISK": "경쟁 동향",
    "OPPORTUNITY": "고객 동향",
}

NOTIFIABLE_LEVELS = {"HIGH", "MEDIUM", "LOW"}
GENERIC_EVENT_TERMS = {"허가", "승인", "계약", "투자", "출시", "규제", "이슈", "변경"}


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text_value = str(value).strip().lower()
    text_value = re.sub(r'["“”\'`]+', "", text_value)
    text_value = re.sub(r"\s+", " ", text_value)
    return text_value


def _resolve_date_bucket(value: Any) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        candidate = value.strip()
        if candidate:
            try:
                return datetime.fromisoformat(candidate.replace("Z", "+00:00")).date()
            except ValueError:
                pass
            try:
                return datetime.strptime(candidate[:10], "%Y-%m-%d").date()
            except ValueError:
                pass
    return datetime.now().date()


def _pick_analysis_content(row: Dict[str, Any]) -> str:
    candidates = [
        row.get("raw_comment"),
        row.get("comment"),
        row.get("article_summary"),
        row.get("article_title"),
    ]
    for value in candidates:
        if value and str(value).strip():
            return str(value).strip()
    return ""


def _shorten_text(value: Any, limit: int = 40) -> str:
    if not value:
        return ""
    text_value = re.sub(r"\s+", " ", str(value)).strip()
    if len(text_value) <= limit:
        return text_value
    return text_value[: limit - 1].rstrip() + "…"


def _canonicalize_llm_output(llm: Dict[str, Any], row: Dict[str, Any]) -> Dict[str, str]:
    title = str(row.get("article_title") or "")
    article_summary = str(row.get("article_summary") or "")
    content = _pick_analysis_content(row)
    combined = " ".join([title, article_summary, content]).lower()

    signal_keyword = str(llm.get("signal_keyword") or "").strip()
    event_type = str(llm.get("event_type") or "").strip()
    summary = str(llm.get("summary") or "").strip()
    signal_category = str(llm.get("signal_category") or "기타").strip()
    signal_type = str(llm.get("signal_type") or "").strip().upper()

    def force(event_label: str, keyword_label: str, category_label: str, type_label: Optional[str] = None) -> None:
        nonlocal signal_keyword, event_type, signal_category, signal_type
        signal_keyword = keyword_label
        event_type = event_label
        signal_category = category_label
        if type_label:
            signal_type = type_label

    if "희귀의약품" in combined or "orphan drug" in combined:
        force("희귀의약품 지정", "희귀의약품 지정", "규제", "OPPORTUNITY")
    elif "ind" in combined and any(word in combined for word in ["승인", "허가", "clearance"]):
        force("임상시험계획 승인", "IND 승인", "규제", "OPPORTUNITY")
    elif "fda" in combined and any(word in combined for word in ["품목허가", "approval", "승인", "허가"]):
        force("미국 FDA 품목허가", "FDA 품목허가", "규제", "OPPORTUNITY")
    elif any(word in combined for word in ["리콜", "회수"]):
        force("제품 회수", "리콜", "품질", "RISK")
    elif "생산중단" in combined:
        force("생산중단", "생산중단", "운영", "RISK")
    elif "영업정지" in combined:
        force("영업정지", "영업정지", "규제", "RISK")
    elif "gmp" in combined and any(word in combined for word in ["위반", "부적합", "취소"]):
        force("GMP 위반", "GMP 위반", "품질", "RISK")
    elif any(word in combined for word in ["공급계약", "계약체결", "수주"]):
        force("공급계약 체결", "공급계약", "계약", signal_type or "OPPORTUNITY")

    if signal_keyword in GENERIC_EVENT_TERMS and title:
        signal_keyword = _shorten_text(title, 36)
    if event_type in GENERIC_EVENT_TERMS and signal_keyword:
        event_type = signal_keyword
    if not summary or len(summary) < 12:
        summary = _shorten_text(title or article_summary or content, 100)

    return {
        "signal_keyword": signal_keyword,
        "signal_category": signal_category or "기타",
        "signal_level": str(llm.get("signal_level") or "").strip().upper(),
        "signal_type": signal_type,
        "event_type": event_type,
        "summary": summary,
        "industry_label": str(llm.get("industry_label") or "기타").strip(),
    }


def _build_notification_message(
    signal_type: str,
    signal_keyword: str,
    event_type: str,
    company_name: str,
) -> str:
    prefix = "부정 이벤트 감지" if signal_type == "RISK" else "긍정 이벤트 감지"
    event_label = _shorten_text(event_type or signal_keyword, 28)
    keyword_label = _shorten_text(signal_keyword, 22)
    company_label = _shorten_text(company_name, 18)

    parts: List[str] = []
    seen = set()
    for candidate in (company_label, event_label, keyword_label):
        norm = _normalize_text(candidate)
        if candidate and norm and norm not in seen:
            parts.append(candidate)
            seen.add(norm)

    if not parts:
        return prefix
    return f"{prefix}: " + " · ".join(parts)


def fetch_unanalyzed_reviews(db: Session, store_id: str = STORE_ID) -> List[Dict[str, Any]]:
    rows = db.execute(
        text(
            """
            WITH candidates AS (
                SELECT id
                FROM google_reviews
                WHERE store_id = :store_id
                  AND is_analyzed = 'N'
                  AND COALESCE(
                        NULLIF(BTRIM(raw_comment), ''),
                        NULLIF(BTRIM(comment), ''),
                        NULLIF(BTRIM(article_summary), ''),
                        NULLIF(BTRIM(article_title), '')
                  ) IS NOT NULL
                ORDER BY id
                FOR UPDATE SKIP LOCKED
            )
            UPDATE google_reviews gr
            SET is_analyzed = 'P'
            FROM candidates c
            WHERE gr.id = c.id
            RETURNING
                gr.google_review_id,
                gr.author_name,
                gr.source_type,
                gr.article_title,
                gr.article_summary,
                gr.source_url,
                gr.published_at,
                gr.raw_comment,
                gr.comment,
                gr.target_type_code
            """
        ),
        {"store_id": store_id},
    ).mappings().all()

    db.commit()
    return [dict(r) for r in rows]


def _find_signal_id_by_source(db: Session, source: str, source_id: str) -> Optional[int]:
    row = db.execute(
        text(
            """
            SELECT id
            FROM public.signals
            WHERE source = :source
              AND source_id = :source_id
            LIMIT 1
            """
        ),
        {"source": source, "source_id": source_id},
    ).fetchone()
    return row[0] if row else None


def _find_semantic_duplicate_signal_id(
    db: Session,
    *,
    company_name: str,
    signal_type: str,
    signal_keyword: str,
    event_type: str,
    signal_level: str,
    detected_date: date,
) -> Optional[int]:
    company_name_norm = _normalize_text(company_name)
    signal_keyword_norm = _normalize_text(signal_keyword)
    event_type_norm = _normalize_text(event_type)

    if not company_name_norm or (not signal_keyword_norm and not event_type_norm):
        return None

    row = db.execute(
        text(
            r"""
            SELECT id
            FROM public.signals
            WHERE tenant_id = :tenant_id
              AND regexp_replace(lower(coalesce(company_name, '')), '\s+', ' ', 'g') = :company_name_norm
              AND coalesce(signal_type, '') = :signal_type
              AND regexp_replace(lower(coalesce(signal_keyword, '')), '\s+', ' ', 'g') = :signal_keyword_norm
              AND regexp_replace(lower(coalesce(event_type, '')), '\s+', ' ', 'g') = :event_type_norm
              AND coalesce(signal_level, '') = :signal_level
              AND detected_at = :detected_date
            ORDER BY id
            LIMIT 1
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "company_name_norm": company_name_norm,
            "signal_type": signal_type or "",
            "signal_keyword_norm": signal_keyword_norm,
            "event_type_norm": event_type_norm,
            "signal_level": signal_level or "",
            "detected_date": detected_date,
        },
    ).fetchone()

    return row[0] if row else None


def _insert_signal(db: Session, data: Dict[str, Any]) -> int:
    result = db.execute(
        text(
            """
            INSERT INTO public.signals (
                tenant_id,
                source_id,
                source,
                source_url,
                company_name,
                title,
                detected_at,
                signal_type,
                signal_keyword,
                signal_category,
                signal_level,
                event_type,
                summary,
                industry_label,
                created_at
            ) VALUES (
                :tenant_id,
                :source_id,
                :source,
                :source_url,
                :company_name,
                :title,
                :detected_at,
                :signal_type,
                :signal_keyword,
                :signal_category,
                :signal_level,
                :event_type,
                :summary,
                :industry_label,
                NOW()
            )
            RETURNING id
            """
        ),
        data,
    )
    return result.fetchone()[0]


def _upsert_signal(
    db: Session,
    *,
    source: str,
    source_id: str,
    company_name: str,
    signal_type: str,
    signal_keyword: str,
    event_type: str,
    signal_level: str,
    detected_at: Any,
    signal_data: Dict[str, Any],
) -> Tuple[int, bool]:
    exact_signal_id = _find_signal_id_by_source(db, source, source_id)
    if exact_signal_id:
        return exact_signal_id, False

    semantic_signal_id = _find_semantic_duplicate_signal_id(
        db,
        company_name=company_name,
        signal_type=signal_type,
        signal_keyword=signal_keyword,
        event_type=event_type,
        signal_level=signal_level,
        detected_date=_resolve_date_bucket(detected_at),
    )
    if semantic_signal_id:
        return semantic_signal_id, False

    signal_id = _insert_signal(db, signal_data)
    return signal_id, True


def _get_notification_row(db: Session, notification_id: int) -> Optional[Dict[str, Any]]:
    row = db.execute(
        text(
            """
            SELECT
                id,
                signal_id,
                company_name,
                category,
                signal_type_label,
                message,
                is_read,
                created_at::date AS created_date
            FROM public.notifications
            WHERE id = :id
            LIMIT 1
            """
        ),
        {"id": notification_id},
    ).mappings().first()
    return dict(row) if row else None


def _find_notification_id_by_signal(db: Session, signal_id: int) -> Optional[int]:
    row = db.execute(
        text(
            """
            SELECT id
            FROM public.notifications
            WHERE signal_id = :signal_id
            LIMIT 1
            """
        ),
        {"signal_id": signal_id},
    ).fetchone()
    return row[0] if row else None


def _find_duplicate_notification_id(
    db: Session,
    *,
    company_name: str,
    category: str,
    signal_type_label: str,
    message: str,
    detected_date: date,
) -> Optional[int]:
    row = db.execute(
        text(
            r"""
            SELECT id
            FROM public.notifications
            WHERE tenant_id = :tenant_id
              AND regexp_replace(lower(coalesce(company_name, '')), '\s+', ' ', 'g') = :company_name_norm
              AND coalesce(category, '') = :category
              AND coalesce(signal_type_label, '') = :signal_type_label
              AND regexp_replace(lower(coalesce(message, '')), '\s+', ' ', 'g') = :message_norm
              AND created_at::date = :detected_date
            ORDER BY id
            LIMIT 1
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "company_name_norm": _normalize_text(company_name),
            "category": category or "",
            "signal_type_label": signal_type_label or "",
            "message_norm": _normalize_text(message),
            "detected_date": detected_date,
        },
    ).fetchone()

    return row[0] if row else None


def _insert_notification(db: Session, data: Dict[str, Any]) -> Optional[int]:
    result = db.execute(
        text(
            """
            INSERT INTO public.notifications (
                tenant_id,
                signal_id,
                company_name,
                category,
                signal_type_label,
                message,
                link_url,
                is_read,
                created_at
            ) VALUES (
                :tenant_id,
                :signal_id,
                :company_name,
                :category,
                :signal_type_label,
                :message,
                :link_url,
                :is_read,
                NOW()
            )
            ON CONFLICT (signal_id) WHERE signal_id IS NOT NULL DO NOTHING
            RETURNING id
            """
        ),
        data,
    ).fetchone()
    return result[0] if result else None


def _insert_notification_without_signal_conflict(db: Session, data: Dict[str, Any]) -> int:
    result = db.execute(
        text(
            """
            INSERT INTO public.notifications (
                tenant_id,
                signal_id,
                company_name,
                category,
                signal_type_label,
                message,
                link_url,
                is_read,
                created_at
            ) VALUES (
                :tenant_id,
                :signal_id,
                :company_name,
                :category,
                :signal_type_label,
                :message,
                :link_url,
                :is_read,
                NOW()
            )
            RETURNING id
            """
        ),
        data,
    ).fetchone()
    return result[0]


def _reactivate_notification(db: Session, notification_id: int, data: Dict[str, Any]) -> int:
    result = db.execute(
        text(
            """
            UPDATE public.notifications
            SET signal_id = COALESCE(signal_id, :signal_id),
                company_name = :company_name,
                category = :category,
                signal_type_label = :signal_type_label,
                message = :message,
                link_url = :link_url,
                is_read = FALSE
            WHERE id = :id
            RETURNING id
            """
        ),
        {
            "id": notification_id,
            "signal_id": data["signal_id"],
            "company_name": data["company_name"],
            "category": data["category"],
            "signal_type_label": data["signal_type_label"],
            "message": data["message"],
            "link_url": data["link_url"],
        },
    ).fetchone()

    return result[0]


def _upsert_notification(
    db: Session,
    *,
    data: Dict[str, Any],
    detected_at: Any,
) -> Tuple[int, bool]:
    existing_by_signal = _find_notification_id_by_signal(db, data["signal_id"])
    if existing_by_signal:
        existing_row = _get_notification_row(db, existing_by_signal)
        if existing_row and existing_row["is_read"]:
            return _reactivate_notification(db, existing_by_signal, data), True
        return existing_by_signal, False

    existing_fallback = _find_duplicate_notification_id(
        db,
        company_name=data["company_name"],
        category=data["category"],
        signal_type_label=data["signal_type_label"],
        message=data["message"],
        detected_date=_resolve_date_bucket(detected_at),
    )
    if existing_fallback:
        existing_row = _get_notification_row(db, existing_fallback)
        if existing_row and existing_row["is_read"]:
            return _reactivate_notification(db, existing_fallback, data), True
        return existing_fallback, False

    notification_id = _insert_notification(db, data)
    if notification_id:
        return notification_id, True

    conflicted_id = _find_notification_id_by_signal(db, data["signal_id"])
    if conflicted_id:
        conflicted_row = _get_notification_row(db, conflicted_id)
        if conflicted_row and conflicted_row["is_read"]:
            return _reactivate_notification(db, conflicted_id, data), True
        return conflicted_id, False

    return _insert_notification_without_signal_conflict(db, data), True


def _mark_as_analyzed(db: Session, google_review_id: str) -> None:
    db.execute(
        text(
            """
            UPDATE google_reviews
            SET is_analyzed = 'Y'
            WHERE google_review_id = :google_review_id
            """
        ),
        {"google_review_id": google_review_id},
    )


def _mark_for_retry(db: Session, google_review_id: str) -> None:
    db.execute(
        text(
            """
            UPDATE google_reviews
            SET is_analyzed = 'N'
            WHERE google_review_id = :google_review_id
            """
        ),
        {"google_review_id": google_review_id},
    )


def _process_review(db: Session, row: Dict[str, Any]) -> Dict[str, Any]:
    google_review_id = row["google_review_id"]
    source = row["source_type"]
    content = _pick_analysis_content(row)

    result: Dict[str, Any] = {
        "status": "failed",
        "notification_id": None,
        "notification_changed": False,
    }

    if not source:
        print(f"[WARN] source_type 없음 — google_review_id={google_review_id}")
        _mark_for_retry(db, google_review_id)
        db.commit()
        return result

    if not content:
        print(f"[WARN] 분석 본문 없음 — google_review_id={google_review_id}")
        _mark_for_retry(db, google_review_id)
        db.commit()
        return result

    llm_raw = classify_review_signal(
        source_type=source,
        content=content,
        title=str(row.get("article_title") or ""),
        article_summary=str(row.get("article_summary") or ""),
    )
    if not llm_raw:
        print(f"[WARN] LLM 분석 실패 — google_review_id={google_review_id}")
        _mark_for_retry(db, google_review_id)
        db.commit()
        return result

    llm = _canonicalize_llm_output(llm_raw, row)

    signal_type = SIGNAL_TYPE_MAP.get(row["target_type_code"], llm.get("signal_type")) or ""
    signal_level = llm.get("signal_level") or ""
    detected_at = row["published_at"]

    signal_data = {
        "tenant_id": TENANT_ID,
        "source_id": google_review_id,
        "source": source,
        "source_url": row["source_url"],
        "company_name": row["author_name"],
        "title": row["article_title"],
        "detected_at": _resolve_date_bucket(detected_at),
        "signal_type": signal_type,
        "signal_keyword": llm.get("signal_keyword"),
        "signal_category": llm.get("signal_category"),
        "signal_level": signal_level,
        "event_type": llm.get("event_type"),
        "summary": llm.get("summary"),
        "industry_label": llm.get("industry_label"),
    }

    try:
        signal_id, signal_created = _upsert_signal(
            db,
            source=source,
            source_id=google_review_id,
            company_name=row["author_name"],
            signal_type=signal_type,
            signal_keyword=llm.get("signal_keyword", ""),
            event_type=llm.get("event_type", ""),
            signal_level=signal_level,
            detected_at=detected_at,
            signal_data=signal_data,
        )

        notification_id: Optional[int] = None
        notification_changed = False

        if signal_level in NOTIFIABLE_LEVELS:
            notification_data = {
                "tenant_id": TENANT_ID,
                "signal_id": signal_id,
                "company_name": row["author_name"],
                "category": SIGNAL_LEVEL_TO_CATEGORY.get(signal_level, "일반"),
                "signal_type_label": SIGNAL_TYPE_TO_LABEL.get(signal_type, ""),
                "message": _build_notification_message(
                    signal_type=signal_type,
                    signal_keyword=llm.get("signal_keyword", ""),
                    event_type=llm.get("event_type", ""),
                    company_name=row["author_name"],
                ),
                "link_url": row["source_url"],
                "is_read": False,
            }
            notification_id, notification_changed = _upsert_notification(
                db,
                data=notification_data,
                detected_at=detected_at,
            )

        _mark_as_analyzed(db, google_review_id)
        db.commit()

        result["notification_id"] = notification_id
        result["notification_changed"] = notification_changed
        result["status"] = "inserted" if (signal_created or notification_changed) else "skipped"
        return result

    except Exception as e:
        db.rollback()
        print(f"[ERROR] 리뷰 처리 실패 — google_review_id={google_review_id}: {e}")

        try:
            _mark_for_retry(db, google_review_id)
            db.commit()
        except Exception as retry_e:
            db.rollback()
            print(f"[ERROR] retry 상태 복구 실패 — google_review_id={google_review_id}: {retry_e}")

        return result


def run_analyze_reviews_batch(
    db: Session,
    tenant_id: int = TENANT_ID,
    store_id: str = STORE_ID,
) -> Dict[str, int]:
    tenant_id = TENANT_ID
    rows = fetch_unanalyzed_reviews(db, store_id)

    stats: Dict[str, int] = {
        "total": len(rows),
        "inserted": 0,
        "skipped": 0,
        "failed": 0,
    }

    changed_notification_ids: List[int] = []

    for row in rows:
        outcome = _process_review(db, row)
        stats[outcome["status"]] += 1

        if outcome.get("notification_changed") and outcome.get("notification_id"):
            changed_notification_ids.append(outcome["notification_id"])

    print(
        f"[BATCH] analyze-reviews 완료 | "
        f"tenant_id={tenant_id} total={stats['total']} "
        f"inserted={stats['inserted']} skipped={stats['skipped']} "
        f"failed={stats['failed']} notifications_changed={len(changed_notification_ids)}"
    )

    if changed_notification_ids:
        _send_alerts(db, changed_notification_ids)

    return stats


def _send_alerts(db: Session, notification_ids: List[int]) -> None:
    notification_ids = sorted(set(notification_ids))
    if not notification_ids:
        return

    try:
        query = text(
            """
            SELECT id, signal_id, company_name, category, signal_type_label, message, link_url
            FROM public.notifications
            WHERE tenant_id = 7
              AND id IN :notification_ids
            ORDER BY created_at DESC, id DESC
            """
        ).bindparams(bindparam("notification_ids", expanding=True))

        rows = db.execute(
            query,
            {"notification_ids": notification_ids},
        ).mappings().all()
    except Exception as e:
        print(f"[ERROR] notifications 조회 실패: {e}")
        rows = []

    notification_count = len(rows)
    if notification_count == 0:
        return

    summary_message = f"오늘 알림 {notification_count}건이 감지되었습니다."

    try:
        for row in rows:
            payload = json.dumps(
                {
                    "tenant_id": 7,
                    "db_id": row["id"],
                    "signal_id": row.get("signal_id"),
                    "message": row["message"],
                    "category": row["category"],
                    "signal_type_label": row["signal_type_label"],
                    "company_name": row["company_name"],
                    "link_url": row["link_url"],
                    "open_panel": False,
                }
            )
            publish("alert_channel", payload)

        print(f"[Redis] 건별 알림 {notification_count}건 발송 완료")
    except Exception as e:
        print(f"[ERROR] Redis 건별 발송 실패: {e}")

    try:
        payload = json.dumps(
            {
                "tenant_id": 7,
                "message": summary_message,
                "category": "정보",
                "signal_type_label": "시스템 알림",
                "company_name": "",
                "open_panel": True,
            }
        )
        publish("alert_channel", payload)
        print(f"[Redis] 요약 메시지 발송 완료 ({notification_count}건)")
    except Exception as e:
        print(f"[ERROR] Redis 요약 메시지 발송 실패: {e}")

    try:
        device_rows = db.execute(
            text(
                """
                SELECT fcm_token
                FROM registered_devices
                WHERE is_active = true
                """
            )
        ).mappings().all()

        tokens = [r["fcm_token"] for r in device_rows if r.get("fcm_token")]
        if tokens:
            send_fcm_to_devices(
                tokens=tokens,
                title="경영진 Alert",
                body=summary_message,
            )
    except Exception as e:
        print(f"[ERROR] FCM 발송 실패: {e}")
