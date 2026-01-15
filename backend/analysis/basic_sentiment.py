from backend.analysis.engine import call_llm


def analyze_basic_sentiment(reviews: list[str]) -> dict:
    """
    📊 엑셀/CSV/설문 데이터용 분석
    - 감성 분류
    - 점수
    - 키워드
    - 요약
    """

    if not reviews:
        return {
            "total": 0,
            "positive": 0,
            "neutral": 0,
            "negative": 0,
            "score": 0.0,
            "keywords": [],
            "summary": "",
        }

    sample_reviews = reviews[:50]

    prompt = f"""
아래는 고객 설문 및 리뷰 텍스트 목록입니다.

리뷰 목록:
{chr(10).join(sample_reviews)}

각 리뷰에 대해 감성을 판단하세요.

규칙:
- 각 리뷰마다 감성 1개 선택
- positive / neutral / negative 중 하나
- 계산은 하지 말 것
- 키워드는 원문 언어 유지
- 설명은 한국어

JSON 형식:

{{
  "sentiments": ["positive", "neutral", ...],
  "score": 0~10점 (소수점 1자리),
  "keywords": ["핵심 키워드 5개"],
  "summary": "전체 리뷰 요약"
}}
"""

    result = call_llm(prompt)

    if result.get("error"):
        return {
            "total": len(sample_reviews),
            "positive": 0,
            "neutral": 0,
            "negative": 0,
            "score": 0.0,
            "keywords": [],
            "summary": "",
        }

    sentiments = result.get("sentiments", [])[:len(sample_reviews)]

    return {
        "total": len(sentiments),
        "positive": sentiments.count("positive"),
        "neutral": sentiments.count("neutral"),
        "negative": sentiments.count("negative"),
        "score": float(result.get("score", 0.0)),
        "keywords": result.get("keywords", []),
        "summary": result.get("summary", ""),
    }