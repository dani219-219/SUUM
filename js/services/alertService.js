/**
 * ============================================
 * 파일: alertService.js
 * 위치: js/services/alertService.js
 * 역할: 정부 재난문자 Mock 데이터 서비스
 * 연결: DisasterAlert.js, Dashboard.js에서 import
 * ============================================
 */

// Mock 재난문자 데이터
const mockDisasterAlerts = [
    {
        id: 1,
        type: 'heat',
        level: 'danger',
        title: '폭염경보',
        message: '오늘 낮 최고기온 35도 이상, 야외활동을 자제하고 충분한 수분을 섭취하세요.',
        region: '서울특별시',
        timestamp: new Date()
    },
    {
        id: 2,
        type: 'heat',
        level: 'warning',
        title: '폭염주의보',
        message: '온열질환에 주의하세요. 어르신과 야외근로자는 특히 주의가 필요합니다.',
        region: '경기도',
        timestamp: new Date(Date.now() - 3600000)
    },
    {
        id: 3,
        type: 'safety',
        level: 'info',
        title: '안전수칙 안내',
        message: '폭염 시 야외작업은 10시~16시를 피하고, 30분 작업 후 10분 휴식을 권장합니다.',
        region: '전국',
        timestamp: new Date(Date.now() - 7200000)
    }
];

class AlertService {
    constructor() {
        this.alerts = [...mockDisasterAlerts];
    }

    /**
     * 전체 재난문자 조회
     */
    getAll() {
        return this.alerts;
    }

    /**
     * 최신 재난문자 조회
     */
    getLatest() {
        return this.alerts[0] || null;
    }

    /**
     * 레벨별 재난문자 필터
     */
    getByLevel(level) {
        return this.alerts.filter(a => a.level === level);
    }

    /**
     * 경고 레벨 아이콘 반환
     */
    getLevelIcon(level) {
        switch (level) {
            case 'danger': return '🚨';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📢';
        }
    }

    /**
     * 새 재난문자 추가 (시뮬레이션용)
     */
    addAlert(alert) {
        const newAlert = {
            id: Date.now(),
            timestamp: new Date(),
            ...alert
        };
        this.alerts.unshift(newAlert);
        return newAlert;
    }
}

export const alertService = new AlertService();
