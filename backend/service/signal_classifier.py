from __future__ import annotations

from typing import Optional, Dict


def classify_signal(text: str) -> Optional[Dict[str, str]]:
    value = (text or "").strip()

    if not value:
        return None

    lower_value = value.lower()

    # -----------------
    # RISK 먼저 체크
    # -----------------

    if any(keyword in value for keyword in [
        "리콜", "회수", "리콜 조치", "자발적 회수"
    ]):
        return {
            "signal_keyword": "리콜",
            "signal_category": "품질",
            "signal_level": "HIGH",
            "signal_type": "RISK",
            "event_type": "리콜",
            "summary": "회수 또는 리콜 관련 이슈가 감지되었습니다. 품질 문제와 시장 영향 분석이 필요합니다.",
            "industry_label": "품질/리스크",
        }

    if any(keyword in value for keyword in [
        "허가취소", "행정처분", "GMP 위반", "부적합", "판매중지", "사용중지", "제조정지", "업무정지"
    ]):
        return {
            "signal_keyword": "규제이슈",
            "signal_category": "규제",
            "signal_level": "HIGH",
            "signal_type": "RISK",
            "event_type": "규제",
            "summary": "규제 또는 품질 관련 제재성 이슈가 감지되었습니다. 영업 및 공급 영향 여부를 확인할 필요가 있습니다.",
            "industry_label": "규제/리스크",
        }

    if any(keyword in value for keyword in [
        "소송", "고발", "압수수색", "검찰", "기소", "피소"
    ]):
        return {
            "signal_keyword": "법무이슈",
            "signal_category": "법무",
            "signal_level": "HIGH",
            "signal_type": "RISK",
            "event_type": "법무",
            "summary": "법적 분쟁 또는 수사 관련 이슈가 감지되었습니다. 기업 리스크 확대 여부를 확인할 필요가 있습니다.",
            "industry_label": "법무/리스크",
        }

    if any(keyword in value for keyword in [
        "영업정지", "생산중단", "공급차질", "공장 화재", "가동중단", "가동 중단", "라인 중단"
    ]):
        return {
            "signal_keyword": "운영차질",
            "signal_category": "운영",
            "signal_level": "HIGH",
            "signal_type": "RISK",
            "event_type": "운영차질",
            "summary": "운영 또는 생산 차질 이슈가 감지되었습니다. 공급 안정성과 시장 영향 검토가 필요합니다.",
            "industry_label": "운영/리스크",
        }

    if any(keyword in value for keyword in [
        "감자", "감사의견 거절", "상장폐지", "관리종목", "자본잠식", "적자 확대", "유동성 위기"
    ]):
        return {
            "signal_keyword": "재무이슈",
            "signal_category": "재무",
            "signal_level": "HIGH",
            "signal_type": "RISK",
            "event_type": "재무",
            "summary": "재무 관련 리스크 신호가 감지되었습니다. 재무 건전성과 사업 지속성을 확인할 필요가 있습니다.",
            "industry_label": "재무/리스크",
        }

    if any(keyword in value for keyword in [
        "논란", "부작용", "민원", "여론 악화", "이미지 타격", "평판 악화", "잡음", "도마"
    ]):
        return {
            "signal_keyword": "평판이슈",
            "signal_category": "평판",
            "signal_level": "MEDIUM",
            "signal_type": "RISK",
            "event_type": "평판",
            "summary": "평판 관련 이슈가 감지되었습니다. 소비자 반응과 대외 영향 여부를 확인할 필요가 있습니다.",
            "industry_label": "평판/리스크",
        }

    if any(keyword in value for keyword in [
        "지연", "차질", "실패", "중단", "악화", "하락", "부진", "위기", "불확실성", "철회"
    ]):
        return {
            "signal_keyword": "부정이슈",
            "signal_category": "운영",
            "signal_level": "MEDIUM",
            "signal_type": "RISK",
            "event_type": "부정이슈",
            "summary": "사업 또는 운영에 부정적인 이슈가 감지되었습니다. 후속 영향 여부를 모니터링할 필요가 있습니다.",
            "industry_label": "운영/리스크",
        }

    # -----------------
    # OPPORTUNITY
    # -----------------

    if "유상증자" in value:
        level = "HIGH" if any(k in value for k in ["대규모", "수천억", "수백억"]) else "HIGH"
        return {
            "signal_keyword": "유상증자",
            "signal_category": "투자",
            "signal_level": level,
            "signal_type": "OPPORTUNITY",
            "event_type": "투자",
            "summary": "유상증자를 통한 자금 조달 움직임이 감지되었습니다. 사업 확장이나 생산 투자 가능성을 확인할 필요가 있습니다.",
            "industry_label": "제약/바이오",
        }

    if any(keyword in value for keyword in [
        "투자판단관련 주요경영사항", "대규모 투자", "시설 투자", "시설투자", "R&D 센터", "연구소 설립"
    ]):
        level = "HIGH" if any(k in value for k in ["대규모", "수천억", "수백억"]) else "MEDIUM"
        return {
            "signal_keyword": "투자",
            "signal_category": "투자",
            "signal_level": level,
            "signal_type": "OPPORTUNITY",
            "event_type": "투자",
            "summary": "투자 관련 움직임이 감지되었습니다. 신규 설비, 생산 확대, 전략적 확장 여부를 모니터링할 필요가 있습니다.",
            "industry_label": "제약/바이오",
        }

    if any(keyword in value for keyword in [
        "신규시설", "신규 시설", "증설", "생산능력 확대", "CAPA 확대", "공장 신설", "공장 증설"
    ]):
        level = "HIGH"
        return {
            "signal_keyword": "생산확대",
            "signal_category": "생산",
            "signal_level": level,
            "signal_type": "OPPORTUNITY",
            "event_type": "생산확대",
            "summary": "생산 확대 관련 이슈가 감지되었습니다. 향후 수요 확대 또는 공급 확대와 연결될 수 있습니다.",
            "industry_label": "제약/생산",
        }

    if any(keyword in value for keyword in [
        "계약", "라이선스", "공급계약", "협약", "MOU", "기술이전", "판권 계약", "독점 계약"
    ]):
        level = "HIGH" if any(k in value for k in ["독점", "대규모", "글로벌"]) else "MEDIUM"
        return {
            "signal_keyword": "계약",
            "signal_category": "계약",
            "signal_level": level,
            "signal_type": "OPPORTUNITY",
            "event_type": "계약",
            "summary": "계약 또는 라이선스 관련 이슈가 감지되었습니다. 신규 사업 기회나 협업 확대 가능성을 검토할 수 있습니다.",
            "industry_label": "제약/계약",
        }

    if any(keyword in value for keyword in [
        "승인", "허가", "품목허가", "IND 승인", "허가 획득", "승인 획득", "임상 승인"
    ]):
        level = "HIGH" if any(k in value for k in ["최초", "국내 최초", "미국", "유럽"]) else "MEDIUM"
        return {
            "signal_keyword": "승인",
            "signal_category": "규제",
            "signal_level": level,
            "signal_type": "OPPORTUNITY",
            "event_type": "승인",
            "summary": "허가 또는 승인 관련 이슈가 감지되었습니다. 제품 출시나 사업 확대 가능성을 확인할 필요가 있습니다.",
            "industry_label": "규제/기회",
        }

    if any(keyword in value for keyword in [
        "이사회 진입", "전문가 영입", "대표 선임", "조직 개편", "거버넌스 강화"
    ]):
        return {
            "signal_keyword": "조직강화",
            "signal_category": "운영",
            "signal_level": "MEDIUM",
            "signal_type": "OPPORTUNITY",
            "event_type": "운영개선",
            "summary": "조직 및 운영 강화 신호가 감지되었습니다. 전략 추진력 강화 여부를 지켜볼 필요가 있습니다.",
            "industry_label": "운영/기회",
        }

    # 일반적인 투자/계약 표현은 마지막에 느슨하게
    if "투자" in value:
        return {
            "signal_keyword": "투자",
            "signal_category": "투자",
            "signal_level": "MEDIUM",
            "signal_type": "OPPORTUNITY",
            "event_type": "투자",
            "summary": "투자 관련 움직임이 감지되었습니다. 후속 확장 여부를 확인할 필요가 있습니다.",
            "industry_label": "제약/바이오",
        }

    return None