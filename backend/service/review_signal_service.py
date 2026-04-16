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


# ──────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────

TENANT_ID = 7
STORE_ID = "store_7"

SIGNAL_TYPE_MAP = {
    1: "RISK",         # 경쟁사
    2: "OPPORTUNITY",  # 고객사
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


# ──────────────────────────────────────────────
# 공통 유틸
# ──────────────────────────────────────────────

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


def _build_notification_message(signal_type: str, signal_keyword: str) -> str:
    keyword = (signal_keyword or "").strip()
    if signal_type == "RISK":
        return f'부정 키워드 감지: "{keyword}"'
    return f'긍정 키워드 감지: "{keyword}"'


# ──────────────────────────────────────────────
# 1. 미분석 리뷰 선점 조회
# ──────────────────────────────────────────────

def fetch_unanalyzed_reviews(db: Session, store_id: str = STORE_ID) -> List[Dict[str, Any]]:
    """
    google_reviews에서 미분석(N) 리뷰를 먼저 P(processing)로 선점한 뒤 반환.
    동시 배치 실행 시 같은 리뷰를 중복 처리하는 위험을 줄인다.
    """
    rows = db.execute(
        text(
            """
            WITH candidates AS (
                SELECT id
                FROM google_reviews
                WHERE store_id = :store_id
                  AND is_analyzed = 'N'
                  AND raw_comment IS NOT NULL
                  AND BTRIM(raw_comment) <> ''
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
                gr.source_url,
                gr.published_at,
                gr.raw_comment,
                gr.target_type_code
            """
        ),
        {"store_id": store_id},
    ).mappings().all()

    # 선점 상태를 즉시 반영
    db.commit()

    return [dict(r) for r in rows]


# ──────────────────────────────────────────────
# 2. signals 중복 체크 / upsert helper
# ──────────────────────────────────────────────

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
    signal_level: str,
    detected_date: date,
) -> Optional[int]:
    company_name_norm = _normalize_text(company_name)
    signal_keyword_norm = _normalize_text(signal_keyword)

    # 회사명/키워드가 비면 과도한 중복 판정 위험이 커서 semantic dedupe 생략
    if not company_name_norm or not signal_keyword_norm:
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
              AND coalesce(signal_level, '') = :signal_level
              AND coalesce(detected_at::date, created_at::date) = :detected_date
            ORDER BY id
            LIMIT 1
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "company_name_norm": company_name_norm,
            "signal_type": signal_type or "",
            "signal_keyword_norm": signal_keyword_norm,
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
    signal_level: str,
    detected_at: Any,
    signal_data: Dict[str, Any],
) -> Tuple[int, bool]:
    """
    반환:
      (signal_id, created)
    """
    exact_signal_id = _find_signal_id_by_source(db, source, source_id)
    if exact_signal_id:
        return exact_signal_id, False

    semantic_signal_id = _find_semantic_duplicate_signal_id(
        db,
        company_name=company_name,
        signal_type=signal_type,
        signal_keyword=signal_keyword,
        signal_level=signal_level,
        detected_date=_resolve_date_bucket(detected_at),
    )
    if semantic_signal_id:
        return semantic_signal_id, False

    signal_id = _insert_signal(db, signal_data)
    return signal_id, True


# ──────────────────────────────────────────────
# 3. notifications 중복 체크 / upsert helper
# ──────────────────────────────────────────────

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


def _insert_notification(db: Session, data: Dict[str, Any]) -> int:
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
    )
    return result.fetchone()[0]


def _upsert_notification(
    db: Session,
    *,
    data: Dict[str, Any],
    detected_at: Any,
) -> Tuple[int, bool]:
    """
    반환:
      (notification_id, created)
    """
    existing_by_signal = _find_notification_id_by_signal(db, data["signal_id"])
    if existing_by_signal:
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
        return existing_fallback, False

    notification_id = _insert_notification(db, data)
    return notification_id, True


# ──────────────────────────────────────────────
# 4. 상태 업데이트
# ──────────────────────────────────────────────

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


# ──────────────────────────────────────────────
# 5. 1건 처리
# ──────────────────────────────────────────────

def _process_review(db: Session, row: Dict[str, Any]) -> Dict[str, Any]:
    """
    반환 예:
      {
        "status": "inserted" | "skipped" | "failed",
        "notification_id": Optional[int],
        "notification_created": bool,
      }
    """
    google_review_id = row["google_review_id"]
    source = row["source_type"]
    raw_comment = row["raw_comment"]

    result: Dict[str, Any] = {
        "status": "failed",
        "notification_id": None,
        "notification_created": False,
    }

    if not source:
        print(f"[WARN] source_type 없음 — google_review_id={google_review_id}")
        _mark_for_retry(db, google_review_id)
        db.commit()
        return result

    llm = classify_review_signal(source_type=source, content=raw_comment)
    if not llm:
        print(f"[WARN] LLM 분석 실패 — google_review_id={google_review_id}")
        _mark_for_retry(db, google_review_id)
        db.commit()
        return result

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
        "detected_at": detected_at,
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
            signal_level=signal_level,
            detected_at=detected_at,
            signal_data=signal_data,
        )

        notification_id: Optional[int] = None
        notification_created = False

        if signal_level in NOTIFIABLE_LEVELS:
            notification_data = {
                "tenant_id": TENANT_ID,
                "signal_id": signal_id,
                "company_name": row["author_name"],
                "category": SIGNAL_LEVEL_TO_CATEGORY.get(signal_level, "일반"),
                "signal_type_label": SIGNAL_TYPE_TO_LABEL.get(signal_type, ""),
                "message": _build_notification_message(signal_type, llm.get("signal_keyword", "")),
                "link_url": row["source_url"],
                "is_read": False,
            }
            notification_id, notification_created = _upsert_notification(
                db,
                data=notification_data,
                detected_at=detected_at,
            )

        _mark_as_analyzed(db, google_review_id)
        db.commit()

        result["notification_id"] = notification_id
        result["notification_created"] = notification_created
        result["status"] = "inserted" if (signal_created or notification_created) else "skipped"
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


# ──────────────────────────────────────────────
# 6. 배치 메인 함수
# ──────────────────────────────────────────────

def run_analyze_reviews_batch(
    db: Session,
    tenant_id: int = TENANT_ID,
    store_id: str = STORE_ID,
) -> Dict[str, int]:
    """
    tenant_id는 현재 7 고정으로 사용.
    미분석 리뷰 전체를 선점 후 순회 처리하고 결과를 집계한다.
    """
    tenant_id = TENANT_ID  # 고정 tenant

    rows = fetch_unanalyzed_reviews(db, store_id)

    stats: Dict[str, int] = {
        "total": len(rows),
        "inserted": 0,
        "skipped": 0,
        "failed": 0,
    }

    created_notification_ids: List[int] = []

    for row in rows:
        outcome = _process_review(db, row)
        stats[outcome["status"]] += 1

        if outcome.get("notification_created") and outcome.get("notification_id"):
            created_notification_ids.append(outcome["notification_id"])

    print(
        f"[BATCH] analyze-reviews 완료 | "
        f"tenant_id={tenant_id} total={stats['total']} "
        f"inserted={stats['inserted']} skipped={stats['skipped']} "
        f"failed={stats['failed']} notifications_created={len(created_notification_ids)}"
    )

    if created_notification_ids:
        _send_alerts(db, created_notification_ids)

    return stats


# ──────────────────────────────────────────────
# 7. 배치 후 알림 발송
# ──────────────────────────────────────────────

def _send_alerts(db: Session, notification_ids: List[int]) -> None:
    """
    배치 완료 후 Redis Publish + FCM 일괄 발송.

    변경점:
    - 최근 10분 전체를 긁지 않고
      이번 배치에서 새로 만들어진 notification id만 전송
    - tenant_id는 7 고정
    """
    notification_ids = sorted(set(notification_ids))
    if not notification_ids:
        return

    try:
        query = text(
            """
            SELECT id, company_name, category, signal_type_label, message, link_url
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