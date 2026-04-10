import json
from openai import OpenAI

client = OpenAI()


def call_llm(prompt: str) -> dict:
    """
    LLM 단일 호출 엔진
    - response_format json_object로 JSON 강제 (regex 파싱 불필요)
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "너는 고객 리뷰 데이터를 분석하는 CX 분석 전문가다. "
                        "모든 응답은 반드시 한국어로 작성한다. "
                        "반드시 JSON 형식으로만 응답한다."
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
        return json.loads(content)

    except Exception as e:
        return {
            "error": True,
            "message": str(e),
        }