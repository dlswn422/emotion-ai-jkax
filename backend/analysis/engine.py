import json
import re
from openai import OpenAI

client = OpenAI()


def call_llm(prompt: str) -> dict:
    """
    🔥 모든 LLM 호출의 단일 엔진
    - 모델
    - temperature
    - JSON 파싱
    - 예외 처리
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "너는 고객 리뷰 데이터를 분석하는 CX 분석 전문가다. "
                        "모든 응답은 반드시 한국어로 제공한다."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content
        match = re.search(r"\{.*\}", content, re.DOTALL)

        if not match:
            raise ValueError("LLM JSON 응답 파싱 실패")

        return json.loads(match.group())

    except Exception as e:
        return {
            "error": True,
            "message": str(e),
        }