from datetime import datetime

def calculate_churn_score(
    avg_rating: float,
    negative_ratio: float,
    last_review_at: datetime,
) -> int:
    """
    고객 이탈 위험 점수 계산 (0 ~ 100)

    계산 기준:
    - 리뷰 기반 고객 행동 패턴을 점수화하여
      '다시 방문하지 않을 가능성'을 정량적으로 표현한다.

    구성 요소:
    1. 평균 평점 점수        (최대 40점)
    2. 부정 리뷰 비율 점수   (최대 30점)
    3. 최근 활동 공백 점수   (최대 30점)

    총점은 100점을 넘지 않도록 제한한다.
    """

    score = 0

    # 1️⃣ 평균 평점 점수 (최대 40점)
    # - 평점은 고객 만족도를 가장 직접적으로 나타내는 지표
    # - 5점 만점 기준으로, 평점이 낮을수록 이탈 위험 증가
    # - (5 - 평균 평점) × 8
    #   예) 5.0점 → 0점, 4.0점 → 8점, 3.0점 → 16점
    score += (5 - avg_rating) * 8

    # 2️⃣ 부정 리뷰 비율 점수 (최대 30점)
    # - 반복된 부정 경험은 이탈 가능성을 크게 높임
    # - 부정 리뷰 비율(0~1)을 기준으로 선형 점수 부여
    #   예) 0% → 0점, 50% → 15점, 100% → 30점
    score += negative_ratio * 30

    # 3️⃣ 최근 활동 공백 점수 (최대 30점)
    # - 최근 방문(리뷰) 기록이 오래될수록 이탈 위험 증가
    # - 30일 이내는 정상 활동으로 간주 (점수 부여 없음)
    # - 30일 초과 시, 최대 90일까지 선형 증가
    #   예) 45일 → 약 5점, 60일 → 약 10점, 90일 이상 → 30점
    days_inactive = (datetime.utcnow() - last_review_at).days
    if days_inactive > 30:
        score += min(days_inactive, 90) / 90 * 30

    # 총점은 100점을 초과하지 않도록 제한
    return min(int(score), 100)


def churn_level(score: int) -> str:
    """
    이탈 점수 구간에 따른 위험 등급 분류

    기준:
    - LOW    : 이탈 위험 낮음
    - MEDIUM : 주의 필요
    - HIGH   : 이탈 가능성 높음
    """

    if score >= 70:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    return "LOW"
