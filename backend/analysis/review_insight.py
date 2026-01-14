import json
import re
from openai import OpenAI

client = OpenAI()


def analyze_review_insight(reviews: list[str]) -> dict:
    """
    고객 리뷰를 주제/감정 단위로 묶어
    CX 인사이트 리포트 생성
    """
    if not reviews:
        return {
            "total": 0,
            "items": [],
            "overall_summary": ""
        }

    sample = reviews[:50]

    prompt = f"""
아래는 고객 리뷰 목록입니다.

리뷰:
{chr(10).join(sample)}

조건:
- 모든 설명은 한국어
- 리뷰에서 반복되는 경험/이슈를 묶을 것
- 감성은 positive | neutral | negative 중 하나
- JSON 외 텍스트 출력 금지

형식:
{{
  "items": [
    {{
      "sentiment": "positive | neutral | negative",
      "topics": ["주제1", "주제2"],
      "summary": "요약"
    }}
  ],
  "overall_summary": "전체 요약"
}}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "너는 CX 분석 전문가다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )

    content = response.choices[0].message.content
    match = re.search(r"\{.*\}", content, re.DOTALL)

    return json.loads(match.group())
