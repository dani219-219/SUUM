/**
 * ============================================
 * 파일: AlertBanner.js
 * 위치: js/components/AlertBanner.js
 * 역할: 작업자 상태 경고 배너
 * 연결: Dashboard.js에서 import
 * ============================================
 */

export class AlertBanner {
    /**
     * 경고 배너 렌더링
     * @param {Object} statusCounts - { normal, warning, danger }
     * @returns {string} HTML 문자열
     */
    static render(statusCounts) {
        const { warning, danger } = statusCounts;
        const totalAlerts = warning + danger;

        if (totalAlerts === 0) {
            return `
                <div class="alert-banner alert-banner--normal" style="background: rgba(0, 255, 242, 0.1); border: 1px solid rgba(0, 255, 242, 0.3);">
                    <span class="alert-banner__icon">✅</span>
                    <div class="alert-banner__content">
                        <div class="alert-banner__title">모든 작업자 정상</div>
                        <div class="alert-banner__message">현재 모든 작업자의 상태가 정상입니다.</div>
                    </div>
                </div>
            `;
        }

        if (danger > 0) {
            return `
                <div class="alert-banner alert-banner--danger">
                    <span class="alert-banner__icon">🚨</span>
                    <div class="alert-banner__content">
                        <div class="alert-banner__title">긴급: 위험 상태 작업자 발생</div>
                        <div class="alert-banner__message">
                            위험 ${danger}명, 주의 ${warning}명 - 즉시 조치가 필요합니다
                        </div>
                    </div>
                    <div class="alert-banner__count">${totalAlerts}</div>
                </div>
            `;
        }

        return `
            <div class="alert-banner alert-banner--warning">
                <span class="alert-banner__icon">⚠️</span>
                <div class="alert-banner__content">
                    <div class="alert-banner__title">주의: ${warning}명 모니터링 필요</div>
                    <div class="alert-banner__message">체온 또는 심박수가 주의 수준입니다. 상태를 지속 관찰하세요.</div>
                </div>
                <div class="alert-banner__count">${warning}</div>
            </div>
        `;
    }
}
