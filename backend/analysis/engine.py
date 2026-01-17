import json
import re
from openai import OpenAI

client = OpenAI()


def call_llm(prompt: str) -> dict:
    """
    🔥 LLM 단일 호출 엔진 (최종본)
    - JSON 강제
    - 파싱 안정성 확보
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "너는 고객 리뷰 데이터를 분석하는 CX 분석 전문가다. "
                        "모든 응답은 반드시 한국어로 작성한다."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content

        # 🔒 JSON만 안전하게 추출
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            raise ValueError("LLM JSON 응답 파싱 실패")

        return json.loads(match.group())

    except Exception as e:
        return {
            "error": True,
            "message": str(e),
        }
