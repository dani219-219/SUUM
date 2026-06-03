/**
 * ============================================
 * 파일: DisasterAlert.js
 * 위치: js/components/DisasterAlert.js
 * 역할: 정부 재난문자 스크롤 배너
 * 연결: Dashboard.js에서 import, alertService.js 데이터 사용
 * ============================================
 */

import { alertService } from '../services/alertService.js';

export class DisasterAlert {
    /**
     * 재난문자 스크롤 배너 렌더링
     * @returns {string} HTML 문자열
     */
    static render() {
        const alerts = alertService.getAll();

        if (alerts.length === 0) {
            return '';
        }

        const messagesHTML = alerts.map(alert => `
            <div class="disaster-alert__message">
                <span class="disaster-alert__icon">${alertService.getLevelIcon(alert.level)}</span>
                <span>[${alert.title}] ${alert.message}</span>
            </div>
        `).join('');

        return `
            <div class="disaster-alert">
                <div class="disaster-alert__label">📢 재난문자</div>
                <div class="disaster-alert__content">
                    ${messagesHTML}
                    ${messagesHTML}
                </div>
            </div>
        `;
    }
}
