from __future__ import annotations

import json
import os
from typing import Optional, Dict

from openai import OpenAI


# ──────────────────────────────────────────────
# google_reviews.raw_comment 전용 LLM 분류기
# 기존 llm_signal_classifier.py 와 별도로 관리
# (뉴스/공시/FDA 등 다양한 형식 대응)
# ──────────────────────────────────────────────

SYSTEM_PROMPT = """
너는 CX Nexus의 signal classifier다.
입력된 텍스트는 뉴스, 공시, FDA 뉴스 등 다양한 형식일 수 있다.
형식에 관계없이 핵심 내용을 파악하고 아래 JSON만 반환해라.
설명문, 마크다운, 코드블록 없이 JSON만 출력한다.

반환 형식:
{
  "signal_keyword": "짧은 핵심 키워드",
  "signal_category": "투자 | 생산 | 계약 | 규제 | 품질 | 법무 | 운영 | 재무 | 평판 | 기타",
  "signal_level": "HIGH | MEDIUM | LOW",
  "signal_type": "OPPORTUNITY | RISK",
  "event_type": "짧은 이벤트명",
  "summary": "한 줄 요약",
  "industry_label": "화면 표시용 분류 (예: 제약/바이오, IT/플랫폼, 식품/유통 등)"
}

판단 기준:
- 투자, 유상증자, 증설, 신규시설, 계약, 허가, 승인, 신제품 출시 → 주로 OPPORTUNITY
- 리콜, 회수, 품질문제, 규제처분, GMP 위반, 소송, 압수수색, 영업정지, 생산중단, 감자 → 주로 RISK
- 확신이 낮으면 보수적으로 분류한다.
- signal_level 기준:
  HIGH   → 즉각적인 사업 영향이 예상되는 중대한 이슈
  MEDIUM → 모니터링이 필요한 주목할 이슈
  LOW    → 참고 수준의 경미한 이슈
"""

USER_PROMPT_TEMPLATE = """
[source_type]
{source_type}

[content]
{content}
"""


def _get_client() -> Optional[OpenAI]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def classify_review_signal(
    source_type: str,
    content: str,
    model: str = "gpt-4.1-mini",
) -> Optional[Dict[str, str]]:
    """
    google_reviews.raw_comment 를 LLM으로 분석한다.

    Args:
        source_type: google_reviews.source_type (뉴스 / 공시 / FDA 등)
        content:     google_reviews.raw_comment 본문
        model:       사용할 OpenAI 모델

    Returns:
        {
          signal_keyword, signal_category, signal_level,
          signal_type, event_type, summary, industry_label
        }
        실패 시 None 반환
    """
    client = _get_client()
    if client is None:
        print("[ERROR] OPENAI_API_KEY 가 설정되지 않았습니다.")
        return None

    if not content or not content.strip():
        return None

    user_prompt = USER_PROMPT_TEMPLATE.format(
        source_type=source_type or "unknown",
        content=content[:6000],
    )

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
    except Exception as e:
        print(f"[ERROR] OpenAI API 호출 실패: {e}")
        return None

    content_str = response.choices[0].message.content
    if not content_str:
        return None

    try:
        data = json.loads(content_str)
    except json.JSONDecodeError:
        print("[ERROR] LLM 응답 JSON 파싱 실패")
        return None

    required_keys = [
        "signal_keyword",
        "signal_category",
        "signal_level",
        "signal_type",
        "event_type",
        "summary",
        "industry_label",
    ]

    for key in required_keys:
        if key not in data or data[key] in (None, ""):
            print(f"[ERROR] LLM 응답 누락 키: {key}")
            return None

    return {
        "signal_keyword":  str(data["signal_keyword"]).strip(),
        "signal_category": str(data["signal_category"]).strip(),
        "signal_level":    str(data["signal_level"]).strip().upper(),
        "signal_type":     str(data["signal_type"]).strip().upper(),
        "event_type":      str(data["event_type"]).strip(),
        "summary":         str(data["summary"]).strip(),
        "industry_label":  str(data["industry_label"]).strip(),
    }