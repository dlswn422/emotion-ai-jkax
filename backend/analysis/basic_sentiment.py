from backend.analysis.engine import call_llm

def analyze_basic_sentiment(reviews: list[str]) -> dict:
    """
    📊 CX 통합 리포트 분석 (최종 안정판)

    ✔ RAW 리뷰 개수 기준으로 sentiment 분포 보장
    ✔ LLM은 '해석'만 담당
    ✔ call_llm은 그대로 사용 (다른 서비스 영향 없음)
    """

    # ===============================
    # 1. 입력 방어
    # ===============================
    if not reviews:
        return {
            "total": 0,
            "positive": 0,
            "neutral": 0,
            "negative": 0,
            "score": 0.0,
            "keywords": [],
            "summary": "",
            "cx_report": {
                "strengths": [],
                "improvements": [],
                "action_plans": [],
                "issue_matrix": [],
            },
        }

    sample_reviews = reviews[:50]
    total_reviews = len(sample_reviews)

    # ===============================
    # 2. LLM 프롬프트 (해석 전용)
    # ===============================
    prompt = f"""
아래는 고객 리뷰 텍스트 목록입니다.

리뷰:
{chr(10).join(sample_reviews)}

아래 규칙을 반드시 지켜 JSON만 반환하세요.

[규칙]
1. sentiments는 리뷰 수와 동일한 길이로 작성
2. 각 리뷰는 positive / neutral / negative 중 하나
3. score는 전체 만족도 0~10점 (소수점 1자리)
4. keywords는 핵심 키워드 5개
5. strengths: 긍정적으로 반복 언급된 요소
6. improvements: 부정적으로 반복 언급된 요소
7. action_plans: 실행 계획 3개
8. issue_matrix: 주요 이슈 (label, frequency 0~100, impact -5~5)

[JSON 형식]

{{
  "sentiments": ["positive", "neutral", "..."],
  "score": 7.5,
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "summary": "전체 리뷰 요약",
  "strengths": ["강점1", "강점2"],
  "improvements": ["개선1", "개선2"],
  "action_plans": [
    {{ "title": "즉시 실행", "desc": "..." }},
    {{ "title": "운영 개선", "desc": "..." }},
    {{ "title": "중장기 전략", "desc": "..." }}
  ],
  "issue_matrix": [
    {{ "label": "이슈명", "frequency": 80, "impact": -4 }}
  ]
}}
"""

    result = call_llm(prompt)

    # ===============================
    # 3. LLM 에러 방어
    # ===============================
    if result.get("error"):
        return {
            "total": total_reviews,
            "positive": 0,
            "neutral": total_reviews,
            "negative": 0,
            "score": 0.0,
            "keywords": [],
            "summary": "",
            "cx_report": {
                "strengths": [],
                "improvements": [],
                "action_plans": [],
                "issue_matrix": [],
            },
        }

    # ===============================
    # 4. sentiment 개수 강제 보정 (🔥 핵심)
    # ===============================
    sentiments = result.get("sentiments", [])

    # 부족하면 neutral로 채움
    if len(sentiments) < total_reviews:
        sentiments += ["neutral"] * (total_reviews - len(sentiments))

    # 초과하면 자름
    sentiments = sentiments[:total_reviews]

    positive = sentiments.count("positive")
    neutral = sentiments.count("neutral")
    negative = sentiments.count("negative")

    # ===============================
    # 5. Issue Matrix type 자동 보정
    # ===============================
    issue_matrix = []
    for item in result.get("issue_matrix", []):
        impact = item.get("impact", 0)
        issue_matrix.append({
            "label": item.get("label", ""),
            "frequency": int(item.get("frequency", 0)),
            "impact": impact,
            "type": "negative" if impact < 0 else "positive",
        })

    # ===============================
    # 6. 최종 응답 (프론트 완전 호환)
    # ===============================
    return {
        # 🔹 기존 프론트 호환 필드
        "total": total_reviews,
        "positive": positive,
        "neutral": neutral,
        "negative": negative,
        "score": float(result.get("score", 0.0)),
        "keywords": result.get("keywords", []),
        "summary": result.get("summary", ""),

        # 🔹 확장 CX 리포트
        "cx_report": {
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", []),
            "action_plans": result.get("action_plans", []),
            "issue_matrix": issue_matrix,
        },
    }