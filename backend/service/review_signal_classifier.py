from __future__ import annotations

import json
import os
import re
from typing import Dict, Optional, Tuple

from openai import OpenAI


SYSTEM_PROMPT = """
너는 CX Nexus의 signal classifier다.
입력 텍스트는 뉴스, 공시, FDA/규제 기사, 기업 발표문 등 다양한 형식일 수 있다.
형식에 관계없이 핵심 사건을 식별하고 아래 JSON만 반환해라.
설명문, 마크다운, 코드블록 없이 JSON만 출력한다.

반환 형식:
{
  "signal_keyword": "가능한 한 구체적인 핵심 키워드",
  "signal_category": "투자 | 생산 | 계약 | 규제 | 품질 | 법무 | 운영 | 재무 | 평판 | 기타",
  "signal_level": "HIGH | MEDIUM | LOW",
  "signal_type": "OPPORTUNITY | RISK",
  "event_type": "가능한 한 구체적인 짧은 사건명",
  "summary": "회사/대상 + 사건 + 맥락이 들어간 한 줄 요약",
  "industry_label": "화면 표시용 분류 (예: 제약/바이오, IT/플랫폼, 식품/유통 등)"
}

중요 규칙:
- signal_keyword와 event_type은 너무 일반적인 단어(예: 허가, 승인, 계약, 투자)만 단독으로 쓰지 말고,
  가능한 경우 'FDA 품목허가', '희귀의약품 지정', 'IND 승인', '생산중단', '리콜', '영업정지'처럼 사건을 구체화해라.
- summary는 반드시 '누가 + 무엇을 + 어떤 맥락에서' 형식으로 써라.
  예: '셀트리온, 미국 FDA 품목허가 획득'
- 기사 제목 정보가 있으면 본문보다 더 구체적인 사건명을 만드는 데 적극 활용해라.
- signal_keyword와 event_type은 서로 비슷할 수 있으나 완전히 같은 단어 반복은 피하고,
  event_type은 더 사건 중심, signal_keyword는 화면에 짧게 보일 핵심 표현으로 작성해라.
- 불확실하면 보수적으로 분류하되, 정보가 명확하면 가능한 한 구체적으로 쓴다.

판단 기준:
- 투자, 유상증자, 증설, 신규시설, 계약, 허가, 승인, 신제품 출시 → 주로 OPPORTUNITY
- 리콜, 회수, 품질문제, 규제처분, GMP 위반, 소송, 압수수색, 영업정지, 생산중단, 감자 → 주로 RISK
- signal_level 기준:
  HIGH   → 즉각적인 사업 영향이 예상되는 중대한 이슈
  MEDIUM → 모니터링이 필요한 주목할 이슈
  LOW    → 참고 수준의 경미한 이슈
"""

USER_PROMPT_TEMPLATE = """
[source_type]
{source_type}

[title]
{title}

[article_summary]
{article_summary}

[content]
{content}
"""

GENERIC_TERMS = {"허가", "승인", "계약", "투자", "출시", "규제", "이슈", "변경", "공시"}


PATTERN_RULES: Tuple[Tuple[Tuple[str, ...], Tuple[str, ...], str, str, str, str], ...] = (
    (("희귀의약품", "orphan drug"), tuple(), "희귀의약품 지정", "희귀의약품 지정", "규제", "OPPORTUNITY"),
    (("ind",), ("승인", "허가", "clearance"), "IND 승인", "임상시험계획 승인", "규제", "OPPORTUNITY"),
    (("nda",), ("승인", "허가"), "NDA 승인", "신약허가 승인", "규제", "OPPORTUNITY"),
    (("bla",), ("승인", "허가"), "BLA 승인", "바이오의약품 허가", "규제", "OPPORTUNITY"),
    (("fda",), ("품목허가", "승인", "허가", "approval"), "FDA 품목허가", "미국 FDA 품목허가", "규제", "OPPORTUNITY"),
    (("유럽", "ema"), ("허가", "승인"), "EMA 허가", "유럽 EMA 허가", "규제", "OPPORTUNITY"),
    (("리콜", "회수"), tuple(), "리콜", "제품 회수", "품질", "RISK"),
    (("생산중단",), tuple(), "생산중단", "생산중단", "운영", "RISK"),
    (("영업정지",), tuple(), "영업정지", "영업정지", "규제", "RISK"),
    (("gmp",), ("위반", "부적합", "취소"), "GMP 위반", "GMP 위반", "품질", "RISK"),
    (("소송", "피소"), tuple(), "소송", "소송 이슈", "법무", "RISK"),
    (("압수수색",), tuple(), "압수수색", "압수수색", "법무", "RISK"),
    (("증설", "신규시설", "공장"), ("투자", "착공", "완공"), "시설 투자", "생산시설 투자", "투자", "OPPORTUNITY"),
    (("공급계약", "계약체결", "수주"), tuple(), "공급계약", "공급계약 체결", "계약", "OPPORTUNITY"),
    (("기술이전", "라이선스 아웃", "license-out"), tuple(), "기술이전", "기술이전 계약", "계약", "OPPORTUNITY"),
    (("판매중지", "판매정지"), tuple(), "판매중지", "판매중지", "운영", "RISK"),
)


def _get_client() -> Optional[OpenAI]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def _normalize_short_label(value: str, limit: int = 40) -> str:
    text_value = re.sub(r"\s+", " ", str(value or "")).strip()
    text_value = text_value.strip('"“”\'`')
    if len(text_value) > limit:
        text_value = text_value[:limit].rstrip()
    return text_value


def _normalize_summary(value: str, limit: int = 120) -> str:
    text_value = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text_value) > limit:
        text_value = text_value[:limit].rstrip()
    return text_value


def _contains_all(text_value: str, keywords: Tuple[str, ...]) -> bool:
    return all(keyword in text_value for keyword in keywords)


def _contains_any(text_value: str, keywords: Tuple[str, ...]) -> bool:
    return any(keyword in text_value for keyword in keywords)


def _apply_pattern_rules(
    *,
    source_type: str,
    title: str,
    article_summary: str,
    content: str,
    data: Dict[str, str],
) -> Dict[str, str]:
    combined = " ".join([source_type or "", title or "", article_summary or "", content or ""]).lower()

    for must_terms, any_terms, keyword_label, event_label, category_label, type_label in PATTERN_RULES:
        if _contains_all(combined, must_terms) and (not any_terms or _contains_any(combined, any_terms)):
            data["signal_keyword"] = keyword_label
            data["event_type"] = event_label
            if not str(data.get("signal_category", "")).strip() or str(data.get("signal_category", "")).strip() == "기타":
                data["signal_category"] = category_label
            if not str(data.get("signal_type", "")).strip():
                data["signal_type"] = type_label
            break

    return data


def _postprocess_output(
    data: Dict[str, str],
    *,
    source_type: str,
    title: str,
    article_summary: str,
    content: str,
) -> Dict[str, str]:
    data = _apply_pattern_rules(
        source_type=source_type,
        title=title,
        article_summary=article_summary,
        content=content,
        data=data,
    )

    signal_keyword = _normalize_short_label(data.get("signal_keyword", ""), 40)
    event_type = _normalize_short_label(data.get("event_type", ""), 40)
    summary = _normalize_summary(data.get("summary", ""), 120)
    title_norm = _normalize_summary(title, 90)

    if signal_keyword in GENERIC_TERMS and title_norm:
        signal_keyword = _normalize_short_label(title_norm, 40)

    if event_type in GENERIC_TERMS and signal_keyword:
        event_type = signal_keyword

    if event_type and signal_keyword and event_type.lower() == signal_keyword.lower():
        # event_type과 keyword가 완전히 같으면 event_type을 조금 더 사건명으로 확장 시도
        if title_norm and signal_keyword.lower() not in title_norm.lower():
            event_type = signal_keyword

    if summary and title_norm:
        lowered_summary = summary.lower()
        lowered_title = title_norm.lower()
        if lowered_summary in lowered_title or len(summary) < 12:
            summary = title_norm

    if not summary and title_norm:
        summary = title_norm

    if not signal_keyword and event_type:
        signal_keyword = event_type
    if not event_type and signal_keyword:
        event_type = signal_keyword

    return {
        "signal_keyword": signal_keyword,
        "signal_category": str(data.get("signal_category", "")).strip() or "기타",
        "signal_level": str(data.get("signal_level", "")).strip().upper(),
        "signal_type": str(data.get("signal_type", "")).strip().upper(),
        "event_type": event_type,
        "summary": summary,
        "industry_label": str(data.get("industry_label", "")).strip() or "기타",
    }


def classify_review_signal(
    source_type: str,
    content: str,
    title: str = "",
    article_summary: str = "",
    model: str = "gpt-4.1-mini",
) -> Optional[Dict[str, str]]:
    """
    google_reviews 기반 텍스트를 LLM으로 분석한다.
    현재 스키마와 호환되도록 기존 7개 키만 반환한다.
    5차에서는 generic 결과를 줄이기 위한 규칙 기반 후보정을 추가한다.
    """
    client = _get_client()
    if client is None:
        print("[ERROR] OPENAI_API_KEY 가 설정되지 않았습니다.")
        return None

    if not content or not content.strip():
        return None

    user_prompt = USER_PROMPT_TEMPLATE.format(
        source_type=source_type or "unknown",
        title=(title or "")[:500],
        article_summary=(article_summary or "")[:1000],
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

    return _postprocess_output(
        data,
        source_type=source_type,
        title=title,
        article_summary=article_summary,
        content=content,
    )
