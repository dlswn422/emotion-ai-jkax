from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.service.review_signal_classifier import classify_review_signal
from backend.core.redis_client import publish
from backend.core.fcm_client import send_fcm_to_devices


# ──────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────

STORE_ID = "store_7"

SIGNAL_TYPE_MAP = {
    1: "RISK",        # 경쟁사
    2: "OPPORTUNITY", # 고객사
}

SIGNAL_LEVEL_TO_CATEGORY = {
    "HIGH":   "긴급",
    "MEDIUM": "주의",
    "LOW":    "일반",
}

SIGNAL_TYPE_TO_LABEL = {
    "RISK":        "경쟁 동향",
    "OPPORTUNITY": "고객 동향",
}


# ──────────────────────────────────────────────
# 1. 미분석 리뷰 조회
# ──────────────────────────────────────────────

def fetch_unanalyzed_reviews(db: Session, store_id: str = STORE_ID) -> List[Dict[str, Any]]:
    """
    google_reviews에서 store_id = store_id AND is_analyzed = 'N' 인 row 조회.
    """
    rows = db.execute(
        text("""
            SELECT
                google_review_id,
                author_name,
                source_type,
                article_title,
                source_url,
                published_at,
                raw_comment,
                target_type_code
            FROM google_reviews
            WHERE store_id    = :store_id
              AND is_analyzed = 'N'
              AND raw_comment IS NOT NULL
              AND raw_comment != ''
            ORDER BY id
        """),
        {"store_id": store_id},
    ).mappings().all()

    return [dict(r) for r in rows]


# ──────────────────────────────────────────────
# 2. 중복 체크
# ──────────────────────────────────────────────

def _signal_exists(db: Session, source: str, source_id: str) -> bool:
    row = db.execute(
        text("""
            SELECT 1
            FROM public.signals
            WHERE source    = :source
              AND source_id = :source_id
            LIMIT 1
        """),
        {"source": source, "source_id": source_id},
    ).first()
    return row is not None


# ──────────────────────────────────────────────
# 3. signals INSERT
# ──────────────────────────────────────────────

def _insert_signal(db: Session, data: Dict[str, Any]) -> int:
    """signals INSERT 후 생성된 id 반환"""
    result = db.execute(
        text("""
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
        """),
        data,
    )
    return result.fetchone()[0]


# ──────────────────────────────────────────────
# 4. notifications INSERT
# ──────────────────────────────────────────────

def _insert_notification(db: Session, data: Dict[str, Any]) -> Optional[int]:
    """
    notifications 테이블 INSERT 후 생성된 id 반환.
    savepoint를 사용해 실패해도 트랜잭션이 오염되지 않도록 처리.
    """
    try:
        db.execute(text("SAVEPOINT notification_save"))
        result = db.execute(
            text("""
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
            """),
            data,
        )
        return result.fetchone()[0]
        db.execute(text("RELEASE SAVEPOINT notification_save"))
    except Exception as e:
        # 트랜잭션 오염 방지: savepoint로 롤백
        db.execute(text("ROLLBACK TO SAVEPOINT notification_save"))
        print(f"[WARN] notifications INSERT 실패 (source_id={data.get('source_id')}): {e}")
        return None


# ──────────────────────────────────────────────
# 5. is_analyzed 업데이트
# ──────────────────────────────────────────────

def _mark_as_analyzed(db: Session, google_review_id: str) -> None:
    db.execute(
        text("""
            UPDATE google_reviews
            SET is_analyzed = 'Y'
            WHERE google_review_id = :google_review_id
        """),
        {"google_review_id": google_review_id},
    )


# ──────────────────────────────────────────────
# 6. 1건 처리
# ──────────────────────────────────────────────

def _process_review(db: Session, row: Dict[str, Any], tenant_id: int) -> str:
    """
    리뷰 1건을 처리한다.
    반환값: 'inserted' | 'skipped' | 'failed'
    """
    google_review_id = row["google_review_id"]
    source           = row["source_type"]
    raw_comment      = row["raw_comment"]

    # ── source_type 없으면 skip ──
    if not source:
        print(f"[WARN] source_type 없음 — google_review_id={google_review_id}")
        return "failed"

    # ── 중복 체크 ──
    if _signal_exists(db, source, google_review_id):
        _mark_as_analyzed(db, google_review_id)
        db.commit()
        return "skipped"

    # ── LLM 분석 ──
    llm = classify_review_signal(source_type=source, content=raw_comment)
    if not llm:
        print(f"[WARN] LLM 분석 실패 — google_review_id={google_review_id}")
        return "failed"

    # ── signal_type 변환 ──
    signal_type = SIGNAL_TYPE_MAP.get(row["target_type_code"], llm.get("signal_type"))

    # ── signals INSERT ──
    signal_data = {
        "tenant_id":       tenant_id,
        "source_id":       google_review_id,
        "source":          source,
        "source_url":      row["source_url"],
        "company_name":    row["author_name"],
        "title":           row["article_title"],
        "detected_at":     row["published_at"],
        "signal_type":     signal_type,
        "signal_keyword":  llm["signal_keyword"],
        "signal_category": llm["signal_category"],
        "signal_level":    llm["signal_level"],
        "event_type":      llm["event_type"],
        "summary":         llm["summary"],
        "industry_label":  llm["industry_label"],
    }

    try:
        signal_id = _insert_signal(db, signal_data)
    except Exception as e:
        db.rollback()
        print(f"[ERROR] signals INSERT 실패 — google_review_id={google_review_id}: {e}")
        return "failed"

    # ── notifications INSERT (signal_level HIGH만) ──
    if llm["signal_level"] != "HIGH":
        _mark_as_analyzed(db, google_review_id)
        db.commit()
        return "inserted"

    notification_data = {
        "tenant_id":         tenant_id,
        "signal_id":         signal_id,
        "company_name":      row["author_name"],
        "category":          SIGNAL_LEVEL_TO_CATEGORY.get(llm["signal_level"], "일반"),
        "signal_type_label": SIGNAL_TYPE_TO_LABEL.get(signal_type, ""),
        "message":           f'부정 키워드 감지: "{llm["signal_keyword"]}"' if signal_type == "RISK" else f'긍정 키워드 감지: "{llm["signal_keyword"]}"',
        "link_url":          row["source_url"],
        "is_read":           False,
        "source_id":         google_review_id,  # 로그용
    }
    notification_id = _insert_notification(db, notification_data)

    # ── is_analyzed 업데이트 ──
    _mark_as_analyzed(db, google_review_id)

    db.commit()
    return "inserted"


# ──────────────────────────────────────────────
# 7. 배치 메인 함수
# ──────────────────────────────────────────────

def run_analyze_reviews_batch(
    db: Session,
    tenant_id: int,
    store_id: str = STORE_ID,
) -> Dict[str, int]:
    """
    미분석 리뷰 전체를 순회하며 처리하고 결과를 집계한다.

    반환:
      {
        "total":    전체 대상 건수,
        "inserted": 정상 적재 건수,
        "skipped":  중복 건너뜀 건수,
        "failed":   처리 실패 건수,
      }
    """
    rows = fetch_unanalyzed_reviews(db, store_id)

    stats: Dict[str, int] = {
        "total":    len(rows),
        "inserted": 0,
        "skipped":  0,
        "failed":   0,
    }

    for row in rows:
        result = _process_review(db, row, tenant_id)
        stats[result] += 1

    print(
        f"[BATCH] analyze-reviews 완료 | "
        f"total={stats['total']} inserted={stats['inserted']} "
        f"skipped={stats['skipped']} failed={stats['failed']}"
    )

    # ── 알림 발송 (inserted > 0 일 때만 한 번에 발송) ──
    if stats["inserted"] > 0:
        _send_alerts(db, stats["inserted"])

    return stats


def _send_alerts(db: Session, inserted_count: int) -> None:
    """
    배치 완료 후 Redis Publish + FCM 일괄 발송.

    순서:
    1. 요약 메시지 1건 emit (패널 자동 오픈)
    2. notifications 테이블에서 방금 적재된 건별 데이터 emit
    3. FCM 요약 메시지 1건 발송
    """
    import json

    summary_message = f"오늘 긴급 알림 {inserted_count}건이 감지되었습니다."

    # ── ① 요약 메시지 emit (패널 자동 오픈) ──
    try:
        payload = json.dumps({
            "tenant_id": 7,
            "message": summary_message,
            "category": "정보",
            "signal_type_label": "시스템 알림",
            "company_name": "",
            "open_panel": True,  # 프론트에서 패널 자동 오픈 트리거
        })
        publish("alert_channel", payload)
        print(f"[Redis] 요약 메시지 발송 완료")
    except Exception as e:
        print(f"[ERROR] Redis 요약 메시지 발송 실패: {e}")

    # ── ② 건별 notifications 데이터 emit ──
    try:
        rows = db.execute(
            text("""
                SELECT id, company_name, category, signal_type_label, message, link_url
                FROM public.notifications
                WHERE created_at >= NOW() - INTERVAL '10 minutes'
                ORDER BY created_at DESC
            """)
        ).mappings().all()

        for row in rows:
            payload = json.dumps({
                "tenant_id": 7,
                "db_id": row["id"],
                "message": row["message"],
                "category": row["category"],
                "signal_type_label": row["signal_type_label"],
                "company_name": row["company_name"],
                "link_url": row["link_url"],
                "open_panel": False,
            })
            publish("alert_channel", payload)

        print(f"[Redis] 건별 알림 {len(rows)}건 발송 완료")
    except Exception as e:
        print(f"[ERROR] Redis 건별 발송 실패: {e}")

    # ── ③ FCM 발송 (요약 1건) ──
    try:
        rows = db.execute(
            text("""
                SELECT fcm_token
                FROM registered_devices
                WHERE is_active = true
            """)
        ).mappings().all()

        tokens = [r["fcm_token"] for r in rows]
        send_fcm_to_devices(
            tokens=tokens,
            title="경영진 Alert",
            body=summary_message,
        )
    except Exception as e:
        print(f"[ERROR] FCM 발송 실패: {e}")
