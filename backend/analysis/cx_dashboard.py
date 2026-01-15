from backend.analysis.engine import call_llm


def analyze_cx_dashboard(reviews: list[str]) -> dict:
    """
    📈 CX 전략 대시보드용 분석
    - Executive Summary
    - Sentiment 비율
    - Drivers / Improvements
    - Insights / Action Plan
    """

    if not reviews:
        return {}

    sample_reviews = reviews[:80]

    prompt = f"""
아래는 특정 매장의 고객 Google 리뷰 목록입니다.

리뷰:
{chr(10).join(sample_reviews)}

CX 전략 리포트를 생성하세요.

JSON 형식으로만 응답:

{{
  "summary": "경영진 요약 (Executive Summary)",
  "rating": 0~5 평균 평점,
  "nps": 0~10 추천 지수,
  "sentiment": {{
    "positive": 비율,
    "neutral": 비율,
    "negative": 비율
  }},
  "drivers": [
    {{ "label": "강점 항목", "value": 비율 }}
  ],
  "improvements": [
    {{ "label": "개선 필요 항목", "value": 비율 }}
  ],
  "insights": [
    {{ "title": "인사이트 제목", "desc": "설명" }}
  ],
  "actionPlan": [
    {{ "area": "개선 영역", "action": "실행 방안" }}
  ]
}}
"""

    return call_llm(prompt)