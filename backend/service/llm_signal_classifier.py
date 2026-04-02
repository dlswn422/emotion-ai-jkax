from __future__ import annotations

import json
import os
from typing import Optional, Dict

from openai import OpenAI


SYSTEM_PROMPT = """
너는 CX Nexus의 signal classifier다.
입력된 뉴스/공시 텍스트를 읽고 아래 JSON만 반환해라.
설명문, 마크다운, 코드블록 없이 JSON만 출력한다.

반환 형식:
{
  "signal_keyword": "짧은 핵심 키워드",
  "signal_category": "투자 | 생산 | 계약 | 규제 | 품질 | 법무 | 운영 | 재무 | 평판 | 기타",
  "signal_level": "HIGH | MEDIUM | LOW",
  "signal_type": "OPPORTUNITY | RISK",
  "event_type": "짧은 이벤트명",
  "summary": "한 줄 요약",
  "industry_label": "화면 표시용 분류"
}

판단 기준:
- 투자, 유상증자, 증설, 신규시설, 계약, 허가, 승인 → 주로 OPPORTUNITY
- 리콜, 회수, 품질문제, 규제처분, GMP 위반, 소송, 압수수색, 영업정지, 생산중단, 감자 → 주로 RISK
- 확신이 낮으면 보수적으로 분류한다.
"""

USER_PROMPT_TEMPLATE = """
[source]
{source}

[text]
{text}
"""


def _get_client() -> Optional[OpenAI]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def classify_signal_with_llm(
    source: str,
    text: str,
    model: str = "gpt-4.1-mini",
) -> Optional[Dict[str, str]]:
    client = _get_client()
    if client is None:
        return None

    if not text or not text.strip():
        return None

    user_prompt = USER_PROMPT_TEMPLATE.format(
        source=source,
        text=text[:6000],
    )

    response = client.chat.completions.create(
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    content = response.choices[0].message.content
    if not content:
        return None

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
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
            return None

    return {
        "signal_keyword": str(data["signal_keyword"]).strip(),
        "signal_category": str(data["signal_category"]).strip(),
        "signal_level": str(data["signal_level"]).strip().upper(),
        "signal_type": str(data["signal_type"]).strip().upper(),
        "event_type": str(data["event_type"]).strip(),
        "summary": str(data["summary"]).strip(),
        "industry_label": str(data["industry_label"]).strip(),
    }