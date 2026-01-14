import json
import re
from openai import OpenAI

client = OpenAI()


def analyze_reviews(reviews: list[str]):
    """
    다국어(한국어/영어/혼합) 리뷰 리스트를 입력받아
    GPT는 감성 판단 + 요약만 수행
    통계는 GPT가 본 리뷰 기준으로 계산
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

    # 비용 방어: 최대 50개
    sample_reviews = reviews[:50]

    prompt = f"""
아래는 고객 설문 및 리뷰 응답 목록입니다.
응답은 한국어, 영어 또는 혼합 언어일 수 있습니다.

리뷰 목록:
{chr(10).join(sample_reviews)}

각 리뷰에 대해 감성을 판단하세요.

규칙:
- 각 리뷰마다 하나의 감성만 선택
- 선택지는 반드시 아래 중 하나:
  - positive
  - neutral
  - negative
- 개수 계산은 하지 말 것
- 결과 설명은 반드시 한국어로 작성
- 키워드는 원문 언어 유지

아래 JSON 형식으로만 답변하세요.

{{
  "sentiments": ["positive", "neutral", ...],
  "score": 전체 만족도를 0~10점 사이 숫자로 평가 (소수점 1자리),
  "keywords": ["핵심 키워드 5개"],
  "summary": "전체 리뷰 요약 (한국어)"
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "너는 다국어 설문 데이터를 분석하는 전문가다. "
                        "분석 결과는 반드시 한국어로 제공한다."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content
        match = re.search(r"\{.*\}", content, re.DOTALL)
        gpt_result = json.loads(match.group())

    except Exception:
        return {
            "total": len(sample_reviews),
            "positive": 0,
            "neutral": 0,
            "negative": 0,
            "score": 0.0,
            "keywords": [],
            "summary": "",
        }

    sentiments = gpt_result.get("sentiments", [])
    sentiments = sentiments[:len(sample_reviews)]

    return {
        "total": len(sentiments),
        "positive": sentiments.count("positive"),
        "neutral": sentiments.count("neutral"),
        "negative": sentiments.count("negative"),
        "score": float(gpt_result.get("score", 0.0) or 0.0),
        "keywords": gpt_result.get("keywords", []) or [],
        "summary": gpt_result.get("summary", "") or "",
    }