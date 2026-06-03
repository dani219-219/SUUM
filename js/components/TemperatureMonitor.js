/**
 * ============================================
 * 파일: TemperatureMonitor.js
 * 위치: js/components/TemperatureMonitor.js
 * 역할: Apple Watch 스타일 체온 모니터링 컴포넌트
 *       - 시계열 체온 그래프 (Custom SVG)
 *       - 현재 체온 표시
 *       - 직전 기록 표시
 * 연결: 
 *   - WorkerDetail.js에서 import
 *   - sensorData.js에서 데이터 fetch
 *   - temperature-monitor.css 스타일 적용
 * ============================================
 * 
 * [데이터 ↔ UI 매핑]
 * 
 * GET /sensors/workers/:workerId (기록 조회):
 *   Temperature  → Y축 값, 오렌지 수직 바 높이
 *   Measured_at  → X축 시간 레이블
 *   max(Temperature) → 우측 상단 수치
 *   min(Temperature) → 우측 하단 수치
 *   마지막 데이터 → 흰색 점으로 표시
 *   마지막-1 데이터 → 하단 기록 표시
 * 
 * GET /sensors/:workerId/:helmetId (최신 조회):
 *   temperature → 하단 큰 체온 숫자
 * ============================================
 */

import { sensorDataService } from '../services/sensorData.js';

export class TemperatureMonitor {
    /**
     * @param {HTMLElement} container - 렌더링할 DOM 컨테이너
     * @param {number} workerId - 작업자 ID
     * @param {number} helmetId - 헬멧 ID (기본값 1)
     */
    constructor(container, workerId, helmetId = 1) {
        this.container = container;
        this.workerId = workerId;
        this.helmetId = helmetId;

        // 상태
        this.currentTemp = null;       // 현재 체온 (null = 데이터 없음)
        this.previousTemp = null;      // 직전 체온
        this.previousTime = null;      // 직전 측정 시간
        this.maxTemp = null;           // 기록 최대 체온
        this.minTemp = null;           // 기록 최소 체온
        this.historyData = [];         // 시계열 데이터 배열

        // 타이머
        this.clockInterval = null;
        this.refreshInterval = null;
    }

    /**
     * 컴포넌트 초기화 및 렌더링
     */
    async init() {
        // 스켈레톤 렌더링 (데이터 로딩 전)
        this.renderSkeleton();

        // 데이터 로드
        await this.loadData();

        // UI 업데이트
        this.renderFull();

        // 1초마다 시계 업데이트
        this.clockInterval = setInterval(() => {
            this.updateClock();
        }, 1000);

        // 5분마다 데이터 갱신 (서버 부하 방지)
        this.refreshInterval = setInterval(async () => {
            await this.loadData();
            this.renderFull();
        }, 300000);
    }

    /**
     * API에서 데이터 로드
     */
    async loadData() {
        try {
            // 병렬로 최신 데이터 + 기록 데이터 조회
            const [latest, history] = await Promise.all([
                sensorDataService.fetchLatestSensorData(this.workerId, this.helmetId),
                sensorDataService.fetchSensorHistory(this.workerId)
            ]);

            // 최신 체온 (조건부: 유효한 값만 사용)
            this.currentTemp = (latest && latest.temperature !== null && !isNaN(latest.temperature))
                ? latest.temperature
                : null;

            // 기록 데이터 저장
            this.historyData = history || [];

            if (this.historyData.length > 0) {
                // 유효한 체온만 필터링하여 최대/최소 계산
                const validTemps = this.historyData
                    .map(d => d.temperature)
                    .filter(t => t !== null && !isNaN(t));

                if (validTemps.length > 0) {
                    this.maxTemp = Math.max(...validTemps);
                    this.minTemp = Math.min(...validTemps);
                } else {
                    this.maxTemp = null;
                    this.minTemp = null;
                }

                // 직전 데이터 (마지막에서 두 번째)
                if (this.historyData.length >= 2) {
                    const prev = this.historyData[this.historyData.length - 2];
                    this.previousTemp = prev.temperature;
                    this.previousTime = prev.measuredAt;
                } else {
                    this.previousTemp = null;
                    this.previousTime = null;
                }

                // currentTemp가 없으면 최신 기록에서 가져오기
                if (this.currentTemp === null) {
                    const lastRecord = this.historyData[this.historyData.length - 1];
                    this.currentTemp = lastRecord.temperature;
                }
            } else {
                this.maxTemp = null;
                this.minTemp = null;
                this.previousTemp = null;
                this.previousTime = null;
            }
        } catch (e) {
            console.error('[TemperatureMonitor] 데이터 로드 실패:', e);
        }
    }

    /**
     * 로딩 스켈레톤 렌더링
     */
    renderSkeleton() {
        this.container.innerHTML = `
            <div class="tmp">
                <div class="tmp__header">
                    <div class="tmp__clock">${this._getCurrentTime()}</div>
                </div>
                <div class="tmp__graph-area">
                    <div class="tmp__loading">
                        <div class="tmp__loading-pulse"></div>
                        <span>센서 데이터 로딩 중...</span>
                    </div>
                </div>
                <div class="tmp__details">
                    <div class="tmp__label">Temperature</div>
                    <div class="tmp__value-row">
                        <span class="tmp__value-number">--</span>
                        <span class="tmp__value-icon">🌡️</span>
                        <span class="tmp__value-unit">°C</span>
                    </div>
                    <div class="tmp__prev-record">-- °C, --m ago</div>
                </div>
            </div>
        `;
        this.updateClock();
    }

    /**
     * 전체 UI 렌더링 (데이터 로드 완료 후)
     */
    renderFull() {
        // 안전한 값 표시 (null → 0)
        const displayTemp = this._safeTemp(this.currentTemp);
        const displayMax = this._safeTemp(this.maxTemp);
        const displayMin = this._safeTemp(this.minTemp);
        const displayPrevTemp = this._safeTemp(this.previousTemp);
        const displayPrevTime = this._formatTimeAgo(this.previousTime);

        this.container.innerHTML = `
            <div class="tmp">
                <div class="tmp__header">
                    <div class="tmp__clock" id="tmpClock">${this._getCurrentTime()}</div>
                </div>

                <!-- 시계열 그래프 영역 -->
                <div class="tmp__graph-area">
                    ${this._renderGraph()}
                </div>

                <!-- 하단: 체온 상세 정보 -->
                <div class="tmp__details">
                    <div class="tmp__label">Temperature</div>
                    <div class="tmp__value-row">
                        <span class="tmp__value-number">${displayTemp}</span>
                        <span class="tmp__value-icon">🌡️</span>
                        <span class="tmp__value-unit">°C</span>
                    </div>
                    <div class="tmp__prev-record">${displayPrevTemp} °C, ${displayPrevTime}</div>
                </div>
            </div>
        `;
    }

    /**
     * SVG 시계열 그래프 렌더링
     * @private
     */
    _renderGraph() {
        const validData = this.historyData.filter(d => d.temperature !== null && !isNaN(d.temperature));

        // 데이터 없으면 빈 그래프 표시
        if (validData.length === 0) {
            return this._renderEmptyGraph();
        }

        // --- 그래프 차원 설정 ---
        const svgWidth = 320;
        const svgHeight = 140;
        const graphPadding = { top: 10, right: 45, bottom: 30, left: 10 };
        const graphWidth = svgWidth - graphPadding.left - graphPadding.right;
        const graphHeight = svgHeight - graphPadding.top - graphPadding.bottom;

        // --- Y축 범위 계산 ---
        const temps = validData.map(d => d.temperature);
        const dataMax = Math.max(...temps);
        const dataMin = Math.min(...temps);
        // 약간의 여백 추가
        const yMax = dataMax + 0.5;
        const yMin = Math.max(34, dataMin - 0.5);
        const yRange = yMax - yMin || 1;

        // --- X축 범위 (시간) ---
        const timeMin = validData[0].measuredAt.getTime();
        const timeMax = validData[validData.length - 1].measuredAt.getTime();
        const timeRange = timeMax - timeMin || 1;

        // --- 바 너비 계산 ---
        const barWidth = Math.max(1.5, Math.min(6, graphWidth / validData.length * 0.6));

        // --- 수직 바 + 점 생성 ---
        let barsHTML = '';
        let dotsHTML = '';
        const lastIndex = validData.length - 1;

        validData.forEach((d, i) => {
            const x = graphPadding.left + ((d.measuredAt.getTime() - timeMin) / timeRange) * graphWidth;
            const normalizedY = (d.temperature - yMin) / yRange;
            const barHeight = normalizedY * graphHeight;
            const barY = graphPadding.top + graphHeight - barHeight;

            // 수직 바 (오렌지 그라데이션)
            barsHTML += `
                <rect 
                    x="${x - barWidth / 2}" 
                    y="${barY}" 
                    width="${barWidth}" 
                    height="${barHeight}"
                    fill="url(#tempBarGradient)"
                    rx="0.75"
                    opacity="${i === lastIndex ? 1 : 0.85}"
                />
            `;

            // 각 바 상단에 점
            dotsHTML += `
                <circle 
                    cx="${x}" 
                    cy="${barY}" 
                    r="${i === lastIndex ? 3.5 : 1.5}"
                    fill="${i === lastIndex ? '#FFFFFF' : '#FF9500'}"
                    ${i === lastIndex ? 'class="tmp__current-dot"' : ''}
                />
            `;
        });

        // --- X축 시간 레이블 생성 ---
        const xLabels = this._generateTimeLabels(validData, graphPadding.left, graphWidth, timeMin, timeRange);

        return `
            <div class="tmp__graph-wrapper">
                <svg class="tmp__graph-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="tempBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#FF9500" stop-opacity="1"/>
                            <stop offset="100%" stop-color="#FF9500" stop-opacity="0.3"/>
                        </linearGradient>
                    </defs>
                    ${barsHTML}
                    ${dotsHTML}
                    ${xLabels}
                </svg>

                <div class="tmp__y-labels">
                    <span class="tmp__y-max">${this._safeTemp(this.maxTemp)}</span>
                    <span class="tmp__y-min">${this._safeTemp(this.minTemp)}</span>
                </div>
            </div>
        `;
    }

    /**
     * 빈 그래프 렌더링
     * @private
     */
    _renderEmptyGraph() {
        return `
            <div class="tmp__graph-wrapper">
                <svg class="tmp__graph-svg" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid meet">
                    <line x1="10" y1="110" x2="275" y2="110" 
                          stroke="#333" stroke-width="0.5" stroke-dasharray="4,4"/>
                    <text x="30" y="135" fill="#8E8E93" font-size="10" text-anchor="middle">12 AM</text>
                    <text x="100" y="135" fill="#8E8E93" font-size="10" text-anchor="middle">6 AM</text>
                    <text x="170" y="135" fill="#8E8E93" font-size="10" text-anchor="middle">12 PM</text>
                    <text x="240" y="135" fill="#8E8E93" font-size="10" text-anchor="middle">6 PM</text>
                </svg>

                <div class="tmp__y-labels">
                    <span class="tmp__y-max">0</span>
                    <span class="tmp__y-min">0</span>
                </div>

                <div class="tmp__no-data-overlay">
                    <span>데이터 없음</span>
                </div>
            </div>
        `;
    }

    /**
     * X축 시간 레이블 생성
     * @private
     */
    _generateTimeLabels(data, paddingLeft, graphWidth, timeMin, timeRange) {
        if (data.length === 0) return '';

        const firstTime = data[0].measuredAt;
        const lastTime = data[data.length - 1].measuredAt;
        const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);

        let labelTimes = [];

        if (hoursDiff <= 1) {
            const start = new Date(firstTime);
            start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0);
            for (let t = new Date(start); t <= lastTime; t.setMinutes(t.getMinutes() + 15)) {
                if (t >= firstTime) labelTimes.push(new Date(t));
            }
        } else if (hoursDiff <= 6) {
            const start = new Date(firstTime);
            start.setMinutes(0, 0, 0);
            for (let t = new Date(start); t <= lastTime; t.setHours(t.getHours() + 1)) {
                if (t >= firstTime) labelTimes.push(new Date(t));
            }
        } else if (hoursDiff <= 24) {
            const start = new Date(firstTime);
            start.setHours(Math.floor(start.getHours() / 6) * 6, 0, 0, 0);
            for (let t = new Date(start); t <= lastTime; t.setHours(t.getHours() + 6)) {
                if (t >= firstTime) labelTimes.push(new Date(t));
            }
        } else {
            const start = new Date(firstTime);
            start.setHours(Math.floor(start.getHours() / 12) * 12, 0, 0, 0);
            for (let t = new Date(start); t <= lastTime; t.setHours(t.getHours() + 12)) {
                if (t >= firstTime) labelTimes.push(new Date(t));
            }
        }

        if (labelTimes.length < 2) {
            labelTimes = [firstTime, lastTime];
        }

        if (labelTimes.length > 5) {
            const step = Math.ceil(labelTimes.length / 5);
            labelTimes = labelTimes.filter((_, i) => i % step === 0);
        }

        return labelTimes.map(t => {
            const x = paddingLeft + ((t.getTime() - timeMin) / timeRange) * graphWidth;
            const label = this._formatTimeLabel(t);
            return `<text x="${x}" y="135" fill="#8E8E93" font-size="10" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">${label}</text>`;
        }).join('\n');
    }

    /**
     * 시간 레이블 포맷
     * @private
     */
    _formatTimeLabel(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();

        if (hours === 0 && minutes === 0) return '12 AM';
        if (hours === 12 && minutes === 0) return '12 PM';

        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;

        if (minutes === 0) {
            return `${displayHour} ${period}`;
        }

        return `${displayHour}:${String(minutes).padStart(2, '0')}`;
    }

    /**
     * 시간차 포맷
     * @private
     */
    _formatTimeAgo(date) {
        if (!date || isNaN(date.getTime())) return '0m ago';

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    /**
     * 현재 시간 포맷
     * @private
     */
    _getCurrentTime() {
        const now = new Date();
        return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    /**
     * 시계 업데이트
     */
    updateClock() {
        const clockEl = this.container.querySelector('#tmpClock');
        if (clockEl) {
            clockEl.textContent = this._getCurrentTime();
        }
    }

    /**
     * 체온 안전 표시 (null → 0, 유효하면 소수점 1자리)
     * @private
     */
    _safeTemp(value) {
        if (value === null || value === undefined || isNaN(value)) return 0;
        return Number(value).toFixed(1);
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}
