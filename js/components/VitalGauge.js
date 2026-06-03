/**
 * ============================================
 * 파일: VitalGauge.js
 * 위치: js/components/VitalGauge.js
 * 역할: 체온/심박수 원형 게이지 컴포넌트
 * 연결: WorkerDetail.js에서 import, vitals.css 스타일 적용
 * ============================================
 */

export class VitalGauge {
    /**
     * 체온 게이지 렌더링
     * @param {number} temperature - 체온
     * @param {string} status - 상태 (normal, warning, danger)
     */
    static renderTemperature(temperature, status) {
        // 36~40도 범위를 0~100%로 변환
        const percentage = Math.min(100, Math.max(0, ((temperature - 36) / 4) * 100));
        const dashOffset = 440 - (440 * percentage / 100);

        return `
            <div class="vital-gauge vital-gauge--${status}">
                <div class="vital-gauge__circle">
                    <svg class="vital-gauge__svg" viewBox="0 0 160 160">
                        <circle class="vital-gauge__bg" cx="80" cy="80" r="70" />
                        <circle class="vital-gauge__progress" cx="80" cy="80" r="70" 
                            style="stroke-dashoffset: ${dashOffset}" />
                    </svg>
                    <div class="vital-gauge__value">
                        <div class="vital-gauge__number">${temperature.toFixed(1)}</div>
                        <div class="vital-gauge__unit">°C</div>
                    </div>
                </div>
                <div class="vital-gauge__label">
                    <span class="vital-gauge__icon">🌡️</span>
                    체온
                </div>
            </div>
        `;
    }

    /**
     * 심박수 게이지 렌더링
     * @param {number} heartRate - 심박수
     * @param {string} status - 상태
     */
    static renderHeartRate(heartRate, status) {
        // 60~140 bpm 범위를 0~100%로 변환
        const percentage = Math.min(100, Math.max(0, ((heartRate - 60) / 80) * 100));
        const dashOffset = 440 - (440 * percentage / 100);

        return `
            <div class="vital-gauge vital-gauge--${status}">
                <div class="vital-gauge__circle">
                    <svg class="vital-gauge__svg" viewBox="0 0 160 160">
                        <circle class="vital-gauge__bg" cx="80" cy="80" r="70" />
                        <circle class="vital-gauge__progress" cx="80" cy="80" r="70" 
                            style="stroke-dashoffset: ${dashOffset}" />
                    </svg>
                    <div class="vital-gauge__value">
                        <div class="vital-gauge__number">${heartRate}</div>
                        <div class="vital-gauge__unit">bpm</div>
                    </div>
                </div>
                <div class="vital-gauge__label">
                    <span class="vital-gauge__icon">❤️</span>
                    심박수
                </div>
            </div>
        `;
    }

    /**
     * ECG 파형 렌더링
     */
    static renderECG() {
        // SVG 경로로 ECG 파형 시뮬레이션
        const path = "M0,60 L20,60 L25,60 L30,50 L35,70 L40,20 L45,100 L50,60 L55,60 L60,60 L80,60 L85,60 L90,50 L95,70 L100,20 L105,100 L110,60 L115,60 L120,60 L140,60 L145,60 L150,50 L155,70 L160,20 L165,100 L170,60 L175,60 L180,60 L200,60 L205,60 L210,50 L215,70 L220,20 L225,100 L230,60 L235,60 L240,60";

        return `
            <div class="ecg-container">
                <div class="ecg-header">
                    <div class="ecg-title">
                        <span>📊</span>
                        심전도 (ECG)
                    </div>
                    <div class="ecg-live">
                        <span class="ecg-live-dot"></span>
                        LIVE
                    </div>
                </div>
                <div class="ecg-wave">
                    <svg class="ecg-line" viewBox="0 0 480 120" preserveAspectRatio="none">
                        <path class="ecg-path" d="${path}" />
                        <path class="ecg-path" d="${path}" transform="translate(240, 0)" />
                    </svg>
                </div>
            </div>
        `;
    }
}
