/**
 * ============================================
 * 파일: HealthPanel.js
 * 위치: js/components/HealthPanel.js
 * 역할: 작업자 건강 정보 패널 (혈액형, 지병, 긴급연락처)
 * 연결: WorkerDetail.js에서 import, health-info.css 스타일 적용
 * ============================================
 */

export class HealthPanel {
    /**
     * 건강 정보 패널 렌더링
     * @param {Object} worker - 작업자 데이터
     */
    static render(worker) {
        const conditionsHTML = worker.conditions.length > 0
            ? worker.conditions.map(c => `<span class="condition-tag">${c}</span>`).join('')
            : '<span style="color: var(--text-muted);">없음</span>';

        // 지병에 따른 경고 메시지 생성
        const warningMessage = HealthPanel.getConditionWarning(worker);

        return `
            <div class="health-panel">
                <div class="health-panel__title">
                    <span>🏥</span>
                    건강 정보
                </div>
                <div class="health-panel__grid">
                    <div class="health-item health-item--blood">
                        <div class="health-item__icon">🩸</div>
                        <div class="health-item__content">
                            <div class="health-item__label">혈액형</div>
                            <div class="health-item__value">${worker.bloodType}</div>
                        </div>
                    </div>
                    <div class="health-item health-item--conditions">
                        <div class="health-item__icon">⚕️</div>
                        <div class="health-item__content">
                            <div class="health-item__label">기저질환</div>
                            <div class="health-item__value">${conditionsHTML}</div>
                        </div>
                    </div>
                    <div class="health-item health-item--emergency">
                        <div class="health-item__icon">📞</div>
                        <div class="health-item__content">
                            <div class="health-item__label">긴급연락처</div>
                            <div class="health-item__value">${worker.emergencyContact}</div>
                            <div style="font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--spacing-xs);">
                                ${worker.emergencyName}
                            </div>
                            <button class="emergency-call-btn" onclick="window.location.href='tel:${worker.emergencyContact}'">
                                <span>📱</span>
                                긴급 전화
                            </button>
                        </div>
                    </div>
                </div>
                ${warningMessage}
            </div>
        `;
    }

    /**
     * 지병에 따른 경고 메시지 생성
     */
    static getConditionWarning(worker) {
        if (worker.status !== 'danger' || worker.conditions.length === 0) {
            return '';
        }

        const warnings = [];

        if (worker.conditions.includes('고혈압')) {
            warnings.push('고혈압 환자 - 급격한 체온 상승 시 뇌졸중 위험 증가');
        }
        if (worker.conditions.includes('당뇨')) {
            warnings.push('당뇨 환자 - 탈수 시 혈당 조절 어려움, 충분한 수분 섭취 필요');
        }
        if (worker.conditions.includes('심장질환')) {
            warnings.push('심장질환 환자 - 심박수 급등 시 즉시 휴식 및 의료진 호출');
        }
        if (worker.conditions.includes('천식')) {
            warnings.push('천식 환자 - 고온 환경에서 호흡 곤란 가능성');
        }

        if (warnings.length === 0) return '';

        return `
            <div class="health-warning">
                <div class="health-warning__icon">⚠️</div>
                <div class="health-warning__content">
                    <div class="health-warning__title">기저질환 주의사항</div>
                    <div class="health-warning__message">
                        ${warnings.join('<br>')}
                    </div>
                </div>
            </div>
        `;
    }
}
