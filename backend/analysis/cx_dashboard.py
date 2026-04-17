from backend.analysis.engine import call_llm


def analyze_cx_dashboard(reviews: list[str]) -> dict:
    """
    CX Nexus 대시보드용 리뷰 분석
    UI에 바로 표시 가능한 JSON 구조 반환
    """

    if not reviews:
        return {}

    sample_reviews = reviews[:200]

    prompt = f"""
너는 음식점 고객경험(CX) 분석 전문 컨설턴트다.

아래는 실제 고객이 작성한 Google 리뷰 텍스트 데이터이다.
반드시 리뷰 텍스트에 직접 근거하여 분석하고,
리뷰에 없는 사실은 절대 추측하지 마라.

이 결과는 CX Nexus 대시보드 UI에 바로 표시될 데이터다.
따라서 반드시 JSON만 반환하라.
설명, 마크다운, 코드블록, 부가 문장은 절대 출력하지 마라.

리뷰:
{chr(10).join(sample_reviews)}

==============================
최상위 분석 원칙
==============================

이 보고서는 서로 따로 노는 카드 묶음이 아니라
하나의 일관된 CX 스토리여야 한다.

반드시 아래 순서로 사고하라.

1. 리뷰에서 반복되는 강점(repeated strengths)과 반복되는 불만(repeated pains)을 먼저 찾는다.
2. 그중 가장 중요한 핵심 축(primary focus)을 1개 정한다.
3. executive_summary.summary는 강점, 약점, 핵심 집중 방향을 함께 요약해야 한다.
4. executive_summary.opportunity는 primary focus를 한 줄로 압축한 문구여야 한다.
5. drivers_of_satisfaction는 실제 강점 축만 반영해야 한다.
6. areas_for_improvement는 executive_summary에서 언급한 실제 약점 축과 연결되어야 한다.
7. strategic_insights는 drivers_of_satisfaction, areas_for_improvement, opportunity를 경영 관점으로 해석한 내용이어야 한다.
8. action_plan은 areas_for_improvement 또는 opportunity를 실행으로 옮긴 내용이어야 한다.
9. 서로 다른 섹션이 서로 다른 주제를 말하면 안 된다.
10. 새 주제를 발명하지 마라.

예시 일관성 규칙
- Executive Summary에 "웨이팅 시간"이 핵심 문제라고 쓰면
  Areas for Improvement와 Action Plan에도 그 축이 반드시 반영되어야 한다.
- Executive Summary에 "음식 품질"과 "매장 분위기"가 핵심 강점이라고 쓰면
  Drivers of Satisfaction에도 그 축이 반영되어야 한다.
- Strategic Insights는 기존에 도출된 강점/약점/핵심 기회를 해석하는 것이어야 하며,
  리뷰에 없는 새로운 화제를 추가하면 안 된다.

==============================
표현 다양화 및 반복 방지 규칙
==============================
- 보고서 전체는 같은 의미를 유지하되, 동일 단어와 동일 문장 패턴을 기계적으로 반복하지 마라.
- summary, opportunity, strategic_insights, action_plan에서는 상투적 표현을 그대로 복제하지 말고, 리뷰 맥락에 맞게 자연스럽게 바꿔 써라.
- "~에 대해 긍정적인 평가를 하고 있습니다", "일부 고객은 ~에 불만을 제기합니다", "따라서 ~할 필요가 있습니다" 같은 문장 구조를 매번 반복하지 마라.
- 같은 의미라도 아래와 같은 유사 표현을 상황에 맞게 교차 사용하라:
  - 음식 품질 / 메뉴 만족도 / 맛의 완성도 / 음식 완성도
  - 서비스 친절도 / 응대 만족도 / 접객 경험 / 친절 경험
  - 서비스 응대 / 응대 품질 / 직원 대응 / 접객 대응
  - 매장 분위기 / 식사 분위기 / 공간 분위기
  - 서비스 품질 개선 / 응대 안정화 / 접객 경험 보완 / 운영 보완 포인트
- 단, 표현만 바꿀 뿐 의미를 바꾸거나 리뷰에 없는 새로운 주제를 만들면 안 된다.
- 같은 뜻의 표현은 분석 논리상 하나의 축으로 통합하되, 최종 출력 문구는 너무 뻔한 고정 표현을 반복하지 말고 자연스럽게 변주하라.
- 같은 단어가 summary, drivers_of_satisfaction, areas_for_improvement, opportunity, strategic_insights, action_plan 전반에 과도하게 반복되면 가능한 범위에서 유사 표현으로 조정하라.

==============================
출력 안정성 규칙
==============================

- 반드시 유효한 JSON 객체만 반환하라.
- null 금지
- 빈 문자열 금지
- 빈 배열 금지
- 숫자 필드는 모두 0보다 크거나, 비율 계산상 필요한 경우 0일 수 있으나 전체 논리와 모순되면 안 된다.
- 근거가 약한 항목을 억지로 여러 개 만들지 마라.
- 항목 수는 최소만 채우되, 반드시 리뷰 근거가 있어야 한다.
- 같은 뜻의 표현은 반드시 하나의 카테고리로 통합하라.
- 다만 최종 출력 문구(label, title, summary 표현)는 의미가 유지되는 범위에서 너무 뻔한 고정 표현을 반복하지 말고, 리뷰 맥락에 맞는 자연스러운 유사 표현을 사용할 수 있다.
- 너무 넓고 추상적인 표현은 쓰지 마라.

==============================
0️⃣ INTERNAL REASONING RULE
==============================

최종 JSON을 만들기 전에 반드시 내부적으로 아래를 먼저 판단하라.

- repeated_strengths: 리뷰에서 반복되는 강점 2~4개
- repeated_pains: 리뷰에서 반복되는 불만 1~3개
- primary_focus_type: "STRENGTH" 또는 "IMPROVEMENT"
- primary_focus_label: 이 보고서를 관통하는 핵심 축 1개

중요:
- 이 내부 판단은 최종 JSON의 report_logic 필드로 함께 반환하라.
- 최종 모든 섹션은 이 report_logic과 모순되면 안 된다.

==============================
1️⃣ EXECUTIVE SUMMARY
==============================

목적
- 사장님이 이 매장의 전체 리뷰 흐름을 한 번에 이해하게 한다.

summary 작성 규칙
- 반드시 2~3문장
- 아래 3요소를 반드시 포함하라
  1) 반복 강점 1~2개
  2) 반복 약점 1~2개
  3) 그래서 어디에 집중해야 하는지에 대한 결론
- 마지막 문장은 opportunity와 같은 방향을 가리켜야 한다.
- 문장은 자연스럽게 쓰되, 보고서 전체의 중심축이 드러나야 한다.

표현 규칙
- summary는 항상 같은 문장 패턴을 반복하지 마라.
- 아래와 같은 상투적 문장은 그대로 반복 사용하지 마라.
  - "~에 대해 긍정적인 평가를 하고 있습니다"
  - "그러나 일부 고객은 ~에 불만을 제기하고 있습니다"
  - "따라서 ~할 필요가 있습니다"
- 강점, 약점, 시사점을 말할 때 아래 표현군을 상황에 맞게 교차 사용하라.
  - 강점 표현: 만족도가 높다 / 좋은 반응이 반복된다 / 호평이 이어진다 / 강점으로 드러난다 / 긍정 언급이 많다
  - 약점 표현: 아쉬움이 반복된다 / 불편 의견이 보인다 / 개선 필요성이 드러난다 / 불만이 일부 확인된다 / 운영상 보완점이 보인다
  - 결론 표현: 우선 보완이 필요하다 / 집중 관리가 필요하다 / 해당 지점을 먼저 손보는 것이 효과적이다 / 강점을 더 선명하게 살릴 필요가 있다
- summary 안에서 동일 명사나 동일 어근을 2회 이상 반복하면 가능한 범위에서 유사 표현으로 바꿔라.
- 단, 문장만 자연스럽게 바꿀 뿐 리뷰 근거와 핵심 축은 바꾸지 마라.

==============================
2️⃣ OPPORTUNITY TAGLINE
==============================

리뷰를 바탕으로 이 매장에 맞는 "핵심 기회"를 한 줄로 작성한다.

정의
- opportunity는 단순 카드 문구가 아니다.
- 이 보고서 전체를 관통하는 핵심 집중 방향이다.
- strong point를 더 키울지,
  improvement point를 먼저 해결할지
  가장 효과가 큰 하나의 방향만 잡아야 한다.

작성 원칙
- 반드시 리뷰 텍스트에 직접 근거할 것
- executive_summary.summary의 결론과 같은 방향이어야 한다
- areas_for_improvement, strategic_insights, action_plan의 기준점이 되어야 한다
- 예시 문구 복사 금지
- 추상어 금지
- 리뷰에 없는 고객층/시장 특성/수요 상상 금지
- 10~20자 내외
- 문장형보다 명사형/전략형 표현 우선

좋은 예의 조건
- 왜 이 문구가 나왔는지 리뷰를 보면 납득 가능해야 한다
- 강점 확장형이면 무엇을 더 살릴지가 보여야 한다
- 개선 우선형이면 무엇을 먼저 해결해야 효과가 큰지가 보여야 한다

opportunity 표현 규칙
- opportunity는 15~25자 한 줄 문구로 작성하되, 너무 범용적이고 반복적인 표현만 쓰지 마라.
- "서비스 품질 개선", "고객 만족 향상", "운영 개선 필요" 같은 지나치게 일반적인 문구만 반복하지 마라.
- 가능하면 리뷰 맥락이 드러나는 구체 표현을 우선하라.
  예:
  - 응대 안정화
  - 대기 경험 완화
  - 재방문 강점 강화
  - 메뉴 만족도 유지
  - 친절 경험 일관화
  - 매장 분위기 차별화
- 단, 리뷰에 직접 근거 없는 문구는 쓰지 마라.

==============================
3️⃣ OVERALL RATING (0~5)
==============================

리뷰 전반의 체감 만족도를 종합하여 산출한다.

기준
- 강한 만족 / 칭찬 반복 → 상승
- 불만 / 실망 / 대기 문제 / 응대 문제 반복 → 하락

중요
- Google 별점 평균이 아니라 텍스트 기반 만족도 지수다.
- executive_summary와 모순되지 않게 산출하라.

==============================
4️⃣ SENTIMENT ANALYSIS
==============================

리뷰를 positive / neutral / negative로 분류한다.

분류 기준

positive
- 맛있다
- 만족
- 친절하다
- 분위기 좋다
- 다시 오고 싶다
- 추천한다

neutral
- 괜찮다
- 무난하다
- 보통이다
- 장단점이 섞여 있으나 불만이 강하지 않다

negative
- 오래 기다렸다
- 실망했다
- 불친절했다
- 가격이 부담된다
- 다시 방문 의사가 낮다

규칙
- 세 값의 합은 반드시 100
- executive_summary에서 불만이 분명한데 negative가 지나치게 낮으면 안 된다
- 강한 칭찬이 많은데 positive가 지나치게 낮으면 안 된다

==============================
5️⃣ NPS (0~10)
==============================

각 리뷰를 Promoter / Passive / Detractor 중 하나로 분류한다.

Promoter (9~10)
- 강한 추천/재방문 의사
- 매우 만족
- 뚜렷한 칭찬

Passive (7~8)
- 전반적으로 무난
- 장단점 혼재
- 나쁘지 않음

Detractor (0~6)
- 불만
- 실망
- 불친절
- 대기/가격/서비스 문제로 만족도 저하

엄격 규칙
- 각 리뷰는 반드시 하나의 그룹에만 속해야 한다
- promoters, passives, detractors는 실제 분류 개수 기반 비율이어야 한다
- 비율 합은 100이어야 한다
- score는 세 비율과 모순되지 않아야 한다
- segment는 아래 기준으로 결정
  - 0~6 → DETRACTORS
  - 7~8 → PASSIVES
  - 9~10 → PROMOTERS

추가 일관성 규칙
- areas_for_improvement가 강하게 잡혔는데 detractors가 지나치게 낮으면 안 된다
- 전반적으로 무난하지만 일부 불만이 섞인 경우는 passive 비중이 높아질 수 있다

==============================
6️⃣ DRIVERS OF SATISFACTION
==============================

긍정 리뷰에서 반복 언급된 만족 요인을 도출한다.

카테고리 통합 예시
- 맛있다 / 음식 좋다 / 메뉴 좋다 → 음식 품질
- 친절하다 / 서비스 좋다 → 서비스 친절도
- 분위기 좋다 / 인테리어 좋다 → 매장 분위기
- 가성비 좋다 / 가격 괜찮다 → 가성비

규칙
- 항목 수 2~4개
- 모두 실제 리뷰 근거가 있어야 함
- value 합은 100
- 각 value는 0보다 커야 함
- executive_summary에서 언급한 대표 강점은 가능한 한 여기에 반영해야 함
- primary_focus_type이 STRENGTH라면 primary_focus_label 또는 그 핵심 강점이 반드시 포함되어야 한다

라벨 표현 규칙
- label은 너무 기계적인 고정어만 반복하지 마라.
- 리뷰 표현에 따라 의미가 유지되는 범위에서 아래와 같은 자연스러운 라벨을 선택할 수 있다:
  - 음식 품질 / 메뉴 만족도 / 맛의 만족감 / 음식 완성도
  - 서비스 친절도 / 응대 만족도 / 접객 경험 / 친절 경험
  - 매장 분위기 / 공간 분위기 / 식사 분위기
  - 가성비 / 가격 만족도 / 가격 체감 만족
- 단, 서로 완전히 다른 의미로 바꾸면 안 되며 실제 리뷰에 근거한 표현만 사용하라.
- 같은 보고서 안에서 동일 라벨이 반복될 경우, 의미가 유지되는 범위에서 표현을 약간 다르게 조정할 수 있다.

==============================
7️⃣ AREAS FOR IMPROVEMENT
==============================

부정 리뷰 또는 아쉬움이 있는 리뷰에서 개선 포인트를 추출한다.

카테고리 통합 예시
- 웨이팅 / 대기 / 기다림 → 웨이팅 시간
- 불친절 / 응대 아쉬움 / 서비스 별로 → 서비스 응대
- 비싸다 / 가격 부담 / 가성비 아쉬움 → 가격 체감
- 청결 아쉬움 / 위생 불만 → 위생 상태

엄격 규칙
- 항목 수 1~3개
- 모두 실제 리뷰 근거가 있어야 함
- value 합은 100
- 각 value는 0보다 커야 함
- reason은 반드시 리뷰 텍스트에 근거한 짧은 설명이어야 함
- urgency는 HIGH / MEDIUM / LOW 중 하나

강한 제약
- executive_summary에서 언급한 핵심 약점은 여기에 반드시 반영되어야 한다
- primary_focus_type이 IMPROVEMENT라면 primary_focus_label 또는 그 핵심 약점이 반드시 포함되어야 한다
- 직접 근거가 없는 개선 항목은 절대 넣지 마라
- action_plan은 여기 나온 항목을 해결하는 방향이어야 한다

라벨 표현 규칙
- label은 항상 똑같은 단어만 반복하지 마라.
- 리뷰 표현에 따라 의미가 유지되는 범위에서 아래와 같이 자연스럽게 바꿔 쓸 수 있다:
  - 서비스 응대 / 응대 품질 / 직원 대응 / 접객 대응
  - 웨이팅 시간 / 대기 경험 / 대기 부담
  - 가격 체감 / 가격 부담 / 가성비 아쉬움
  - 위생 상태 / 청결 관리 / 매장 청결도
- 단, 실제 리뷰 근거를 벗어난 새로운 의미를 만들지는 마라.
- reason 문구 역시 label을 기계적으로 반복하지 말고, 리뷰에서 드러난 불편 포인트를 자연스럽게 풀어 써라.

==============================
8️⃣ STRATEGIC INSIGHTS
==============================

경영 관점에서 중요한 인사이트를 2~3개 작성한다.

정의
- 새로운 주제를 만드는 섹션이 아니다.
- 이미 도출된 강점, 약점, opportunity를 "왜 중요한가" 관점에서 해석하는 섹션이다.

필수 규칙
- 반드시 아래 셋 중 하나를 해석하는 형태여야 한다
  1) drivers_of_satisfaction에 나온 강점
  2) areas_for_improvement에 나온 약점
  3) executive_summary.opportunity에 담긴 핵심 기회
- 2~3개 인사이트는 서로 다른 표현일 수 있으나,
  모두 같은 보고서 축 안에 있어야 한다
- 리뷰에 없는 새 주제를 만들지 마라
- 단순 반복 문장 금지
- 왜 중요한지, 어떤 의미가 있는지 보여줘야 한다

작성 방식
- title: 한 줄 요약
- description: 왜 중요한지 설명
- description은 액션플랜으로 자연스럽게 이어질 수 있어야 한다

==============================
9️⃣ ACTION PLAN
==============================

사장님이 바로 실행할 수 있는 액션을 2~3개 작성한다.

핵심 정의
- action_plan은 독립적인 좋은 아이디어 모음이 아니다.
- areas_for_improvement를 해결하거나
  opportunity를 실제 실행으로 옮기는 항목이어야 한다.

필수 규칙
- 각 action item은 반드시 아래 둘 중 하나와 직접 연결되어야 한다
  1) areas_for_improvement의 특정 항목
  2) executive_summary.opportunity
- areas_for_improvement에 없는 문제를 action_plan에서 새로 만들지 마라
- strategic_insights와 자연스럽게 이어져야 한다
- 너무 추상적인 실행안 금지
- 실제 매장 운영자가 이해할 수 있는 수준으로 작성

필드 규칙
- priority: HIGH / MEDIUM / LOW
- title: 실행 과제 제목
- description: 구체적인 실행 방안
- expected_effect: 기대 효과
- timeline: "1주 이내", "2주 이내", "1개월 이내" 등
- linked_to: 반드시 어떤 개선 항목 또는 기회와 연결되는지 명시

우선순위 규칙
- primary_focus와 직접 연결된 액션은 우선 HIGH 또는 MEDIUM 우선 고려
- 보고서 전체의 핵심 축과 멀면 안 된다

==============================
🔟 키워드 워드클라우드
==============================
1. 리뷰 텍스트에서 반복 등장하는 대표 키워드를 추출하라.
2. 반드시 positive_keywords, negative_keywords, neutral_keywords, all_keywords 4개 배열을 반환하라.
3. positive_keywords, negative_keywords, neutral_keywords는 각각 최대 15개까지 반환하라.
4. all_keywords는 최대 25개까지 반환하라.
5. 각 항목은 text, size 키를 가진 객체 형식으로 반환하라.
6. size는 상대 빈도 기반 정수값으로 18~48 범위 안에서 자연스럽게 분포시켜라.
7. positive_keywords는 긍정 맥락 키워드만, negative_keywords는 부정 맥락 키워드만, neutral_keywords는 중립/주제성 키워드만 넣어라.
8. all_keywords는 positive, negative, neutral_keywords를 단순 병합하지 말고, 전체 리뷰에서 실제로 많이 반복된 키워드를 기준으로 별도로 다시 구성하라.
9. 동일한 text가 positive_keywords와 negative_keywords에 동시에 등장하는 경우는 허용하지 말고, 더 적절한 감성 한쪽에만 배치하라.
10. neutral_keywords에는 정치, 경제, 부동산, 전세, 월세, 아파트처럼 감정보다 주제성이 강한 키워드를 포함할 수 있다.
11. 한 단어 위주로 추출하되, 리뷰 맥락상 의미가 분명할 경우 2단어 키워드도 허용한다.
12. 너무 일반적인 단어(사람, 진짜, 그냥, 너무, 여기, 이번, 관련, 부분, 느낌)는 제외하라.
13. 조사/어미가 붙은 형태는 정리해서 핵심 명사 형태로 반환하라.
14. 리뷰에 직접 없는 단어를 임의로 만들지 마라.
15. 특정 키워드가 많이 반복되면 size를 확실히 크게 주어 워드클라우드에서 눈에 띄게 하라.
16. 각 배열은 가능한 한 풍성하게 채워라. 근거가 충분하면 최대 개수에 가깝게 반환하라.

==============================
최종 검증 규칙
==============================

JSON을 반환하기 전에 반드시 스스로 아래를 검증하라.

1. executive_summary.summary의 강점이 drivers_of_satisfaction에 반영되었는가?
2. executive_summary.summary의 약점이 areas_for_improvement에 반영되었는가?
3. opportunity가 보고서 전체의 핵심 축으로 읽히는가?
4. strategic_insights가 기존 강점/약점/opportunity를 해석한 내용인가?
5. action_plan이 areas_for_improvement 또는 opportunity를 실행으로 옮긴 내용인가?
6. 각 섹션이 서로 다른 주제를 말하고 있지 않은가?
7. 리뷰에 없는 사실을 상상해서 넣지 않았는가?
8. summary, label, title, opportunity에서 같은 표현이 과도하게 반복되지 않았는가?

하나라도 어기면 다시 맞춰서 JSON을 작성하라.

==============================
출력 형식
==============================

반드시 아래 JSON 스키마만 반환하라.

{{
  "report_logic": {{
    "repeated_strengths": ["반복 강점 1", "반복 강점 2"],
    "repeated_pains": ["반복 불만 1"],
    "primary_focus_type": "STRENGTH",
    "primary_focus_label": "핵심 축"
  }},
  "executive_summary": {{
    "summary": "2~3문장 요약",
    "opportunity": "15~25자 한 줄 기회 문구"
  }},
  "rating": 0.0,
  "sentiment": {{
    "positive": 0.0,
    "neutral": 0.0,
    "negative": 0.0
  }},
  "nps": {{
    "score": 0.0,
    "promoters": 0.0,
    "passives": 0.0,
    "detractors": 0.0,
    "segment": "PASSIVES"
  }},
  "drivers_of_satisfaction": [
    {{
      "label": "만족 요인",
      "value": 0.0
    }}
  ],
  "areas_for_improvement": [
    {{
      "label": "개선 요인",
      "value": 0.0,
      "urgency": "HIGH",
      "reason": "리뷰 근거 설명"
    }}
  ],
  "strategic_insights": [
    {{
      "title": "인사이트 제목",
      "description": "왜 중요한지 설명"
    }}
  ],
  "action_plan": [
    {{
      "priority": "HIGH",
      "title": "실행 과제",
      "description": "구체적 실행 방안",
      "expected_effect": "기대 효과",
      "timeline": "2주 이내",
      "linked_to": "개선 요인 또는 기회"
    }}
  ],
  "positive_keywords": [
    {
      "text": "대표 긍정 키워드",
      "size": 34
    }
  ],
  "negative_keywords": [
    {
      "text": "대표 부정 키워드",
      "size": 34
    }
  ],
  "neutral_keywords": [
    {
      "text": "대표 중립 키워드",
      "size": 34
    }
  ],
  "all_keywords": [
    {
      "text": "대표 전체 키워드",
      "size": 34
    }
  ]
}}
"""

    return call_llm(prompt)
