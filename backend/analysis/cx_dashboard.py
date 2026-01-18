from backend.analysis.engine import call_llm


def analyze_cx_dashboard(reviews: list[str]) -> dict:
    """
    📈 CX 전략 대시보드용 LLM 분석 (프로덕션 최종본)

    - 리뷰 텍스트 기반 체감 만족도 rating 산출
    - NPS 추정
    - Sentiment / Drivers / Improvements
    - Strategic Insights / Action Plan

    ⚠️ 입력 reviews는 이미
    - 매장 선택 완료
    - 날짜 필터 완료
    된 상태여야 한다.
    """

    if not reviews:
        return {}

    # 🔹 토큰 / 비용 / 품질 균형
    sample_reviews = reviews[:80]

    prompt = f"""
너는 고객 경험(CX) 전문 컨설턴트다.
아래는 특정 매장의 Google 리뷰 텍스트 데이터이다.

이 리뷰들은 특정 기간 동안 실제 고객이 작성한 리뷰이며,
리뷰 텍스트만을 근거로 고객 만족도와 추천 의사를
정량적 지표로 추정해야 한다.

⚠️ 리뷰에 명시되지 않은 내용은 절대 가정하거나 추측하지 말고,
반드시 텍스트 근거가 있는 정보만 사용한다.

리뷰:
{chr(10).join(sample_reviews)}

==============================
분석 기준 (반드시 따를 것)
==============================

1. OVERALL RATING (0~5)
- 리뷰 전반의 체감 만족도를 종합하여 산출한다.
- 긍정 감정, 재방문 의사, 강한 추천 표현이 많을수록 점수가 높다.
- 반복되는 불만, 실망, 부정 경험은 점수를 낮춘다.
- 실제 Google 별점이 아니라, 리뷰 텍스트 기반 내부 만족도 지수다.

2. NPS (0~10)
- 리뷰 텍스트에서 추천 의사를 추정한다.
- 기준:
  - Promoter (9~10): 추천, 또 올게요, 단골, 매우 만족
  - Passive (7~8): 무난, 괜찮다, 보통
  - Detractor (0~6): 불만, 실망, 재방문 의사 없음
- 각 리뷰를 Promoter / Passive / Detractor로 분류한 뒤,
  Promoter 비율과 Detractor 비율의 차이를 고려하여
  0~10 스케일로 환산한다.

3. SENTIMENT ANALYSIS (%)
- 리뷰를 긍정 / 중립 / 부정으로 분류한다.
- 감정의 강도와 언급 빈도를 함께 고려한다.
- positive + neutral + negative의 합은 반드시 100이 되어야 한다.

4. DRIVERS OF SATISFACTION
- 긍정 리뷰에서 반복적으로 언급된 핵심 만족 요인을 도출한다.
- 실제 언급 빈도를 기준으로 상대적 비중을 계산한다.
- 모든 항목의 value 합은 반드시 100이 되어야 한다.

5. AREAS FOR IMPROVEMENT
- 부정 또는 아쉬움이 포함된 리뷰에서만 개선 포인트를 추출한다.
- 리뷰 근거가 부족한 경우 항목 수를 최소화한다.
- 모든 항목의 value 합은 반드시 100이 되어야 한다.

6. STRATEGIC INSIGHTS
- 위 모든 결과를 종합하여
  경영 관점에서 의미 있는 인사이트를 정확히 3개 도출한다.
- 단순 요약이 아니라
  "왜 이 인사이트가 중요한지"를 설명한다.

7. ACTION PLAN
- 사장님이 실제 현장에서 바로 실행할 수 있는 행동 위주로 제안한다.
- 추상적인 조언은 피하고,
  직원 교육, 운영 방식, 응대 프로세스 등
  구체적인 실행 단위로 작성한다.

==============================
출력 규칙 (중요)
==============================

- 반드시 JSON 형식으로만 응답한다.
- 설명, 주석, 마크다운을 포함하지 않는다.
- 모든 텍스트는 한국어로 작성한다.
- 숫자는 소수점 1자리까지 사용한다.
- 아래 JSON 스키마와 정확히 일치해야 한다.

출력 JSON 스키마:

{{
  "executive_summary": {{
    "summary": "2~3문장의 경영진 요약"
  }},
  "rating": 0.0,
  "kpi": {{
    "sentiment": {{
      "positive": 0.0,
      "neutral": 0.0,
      "negative": 0.0
    }},
    "nps": 0.0
  }},
  "drivers_of_satisfaction": [
    {{ "label": "만족 요인", "value": 0.0 }}
  ],
  "areas_for_improvement": [
    {{ "label": "개선 요인", "value": 0.0 }}
  ],
  "strategic_insights": [
    {{
      "title": "인사이트 제목",
      "description": "2~3문장의 설명"
    }}
  ],
  "risk_and_action_plan": {{
    "churn_risk": "LOW | MEDIUM | HIGH",
    "actions": [
      {{
        "area": "개선 영역",
        "action": "구체적인 실행 방안"
      }}
    ]
  }}
}}
"""

    return call_llm(prompt)
