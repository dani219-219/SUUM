/**
 * ============================================
 * 파일: HeartRateMonitor.js
 * 위치: js/components/HeartRateMonitor.js
 * 역할: Apple Watch 스타일 심박수 모니터링 컴포넌트
 *       - 시계열 심박수 그래프 (Custom SVG)
 *       - 현재 BPM 표시
 *       - 직전 기록 표시
 * 연결: 
 *   - WorkerDetail.js에서 import
 *   - sensorData.js에서 데이터 fetch
 *   - heart-rate-monitor.css 스타일 적용
 * ============================================
 * 
 * [데이터 ↔ UI 매핑]
 * 
 * GET /sensors/workers/:workerId (기록 조회):
 *   Heart_rate  → Y축 값, 빨간 수직 바 높이
 *   Measured_at → X축 시간 레이블 (12 AM, 6 AM, 12 PM, 6 PM)
 *   max(Heart_rate) → 우측 상단 빨간 수치
 *   min(Heart_rate) → 우측 하단 빨간 수치
 *   마지막 데이터 → 흰색 점으로 표시
 *   마지막-1 데이터 → "75 BPM, 2m ago" 하단 기록
 * 
 * GET /sensors/:workerId/:helmetId (최신 조회):
 *   heart_rate → 하단 큰 BPM 숫자 (68)
 * ============================================
 */

import { sensorDataService } from '../services/sensorData.js';
import { workerDataService } from '../services/workerData.js';

export class HeartRateMonitor {
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
        this.currentBPM = null;        // 현재 심박수 (null = 데이터 없음)
        this.previousBPM = null;       // 직전 심박수
        this.previousTime = null;      // 직전 측정 시간
        this.maxBPM = null;            // 기록 최대 심박수
        this.minBPM = null;            // 기록 최소 심박수
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

        // 1분마다 시계 업데이트
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

            // 최신 BPM (조건부: 유효한 값만 사용)
            this.currentBPM = (latest && latest.heartRate !== null && !isNaN(latest.heartRate))
                ? latest.heartRate
                : null;

            // 모달에 로드된 실제 센서 데이터를 배경(대시보드) 화면에도 동기화
            if (this.currentBPM !== null) {
                workerDataService.updateWorkerVitals(this.workerId, null, this.currentBPM);
            }

            // 기록 데이터 저장
            this.historyData = history || [];

            if (this.historyData.length > 0) {
                // 유효한 심박수만 필터링하여 최대/최소 계산
                const validRates = this.historyData
                    .map(d => d.heartRate)
                    .filter(hr => hr !== null && !isNaN(hr));

                if (validRates.length > 0) {
                    this.maxBPM = Math.max(...validRates);
                    this.minBPM = Math.min(...validRates);
                } else {
                    this.maxBPM = null;
                    this.minBPM = null;
                }

                // 직전 데이터 (마지막에서 두 번째)
                if (this.historyData.length >= 2) {
                    const prev = this.historyData[this.historyData.length - 2];
                    this.previousBPM = prev.heartRate;
                    this.previousTime = prev.measuredAt;
                } else {
                    this.previousBPM = null;
                    this.previousTime = null;
                }

                // currentBPM이 없으면 최신 기록에서 가져오기
                if (this.currentBPM === null) {
                    const lastRecord = this.historyData[this.historyData.length - 1];
                    this.currentBPM = lastRecord.heartRate;
                }
            } else {
                this.maxBPM = null;
                this.minBPM = null;
                this.previousBPM = null;
                this.previousTime = null;
            }
        } catch (e) {
            console.error('[HeartRateMonitor] 데이터 로드 실패:', e);
        }
    }

    /**
     * 로딩 스켈레톤 렌더링
     */
    renderSkeleton() {
        this.container.innerHTML = `
            <div class="hrm">
                <div class="hrm__header">
                    <div class="hrm__clock">${this._getCurrentTime()}</div>
                </div>
                <div class="hrm__graph-area">
                    <div class="hrm__loading">
                        <div class="hrm__loading-pulse"></div>
                        <span>센서 데이터 로딩 중...</span>
                    </div>
                </div>
                <div class="hrm__details">
                    <div class="hrm__label">Heart Rate</div>
                    <div class="hrm__bpm-row">
                        <span class="hrm__bpm-number">--</span>
                        <span class="hrm__bpm-heart">
                            <svg class="hrm__heart-icon" viewBox="0 0 24 24" fill="#FF3B30" width="28" height="28">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
                                         2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                                         C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                                         c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </span>
                        <span class="hrm__bpm-unit">BPM</span>
                    </div>
                    <div class="hrm__prev-record">-- BPM, --m ago</div>
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
        const displayBPM = this._safe(this.currentBPM);
        const displayMax = this._safe(this.maxBPM);
        const displayMin = this._safe(this.minBPM);
        const displayPrevBPM = this._safe(this.previousBPM);
        const displayPrevTime = this._formatTimeAgo(this.previousTime);

        this.container.innerHTML = `
            <div class="hrm">
                <div class="hrm__header">
                    <div class="hrm__clock" id="hrmClock">${this._getCurrentTime()}</div>
                </div>

                <!-- 시계열 그래프 영역 -->
                <div class="hrm__graph-area">
                    ${this._renderGraph()}
                </div>

                <!-- 하단: BPM 상세 정보 -->
                <div class="hrm__details">
                    <div class="hrm__label">Heart Rate</div>
                    <div class="hrm__bpm-row">
                        <span class="hrm__bpm-number">${displayBPM}</span>
                        <span class="hrm__bpm-heart">
                            <svg class="hrm__heart-icon" viewBox="0 0 24 24" fill="#FF3B30" width="32" height="32">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
                                         2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                                         C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                                         c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </span>
                        <span class="hrm__bpm-unit">BPM</span>
                    </div>
                    <div class="hrm__prev-record">${displayPrevBPM} BPM, ${displayPrevTime}</div>
                </div>
            </div>
        `;
    }

    /**
     * SVG 시계열 그래프 렌더링
     * Apple Watch 스타일: 수직 바 + 상단 점
     * @private
     */
    _renderGraph() {
        const validData = this.historyData.filter(d => d.heartRate !== null && !isNaN(d.heartRate));

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
        const heartRates = validData.map(d => d.heartRate);
        const dataMax = Math.max(...heartRates);
        const dataMin = Math.min(...heartRates);
        // 약간의 여백 추가
        const yMax = dataMax + 10;
        const yMin = Math.max(0, dataMin - 10);
        const yRange = yMax - yMin || 1; // 0 나누기 방지

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
            const normalizedY = (d.heartRate - yMin) / yRange;
            const barHeight = normalizedY * graphHeight;
            const barY = graphPadding.top + graphHeight - barHeight;

            // 수직 바 (빨간색 그라데이션 효과 - 하단 어둡게)
            barsHTML += `
                <rect 
                    x="${x - barWidth / 2}" 
                    y="${barY}" 
                    width="${barWidth}" 
                    height="${barHeight}"
                    fill="url(#barGradient)"
                    rx="0.75"
                    opacity="${i === lastIndex ? 1 : 0.85}"
                />
            `;

            // 각 바 상단에 작은 빨간 점
            dotsHTML += `
                <circle 
                    cx="${x}" 
                    cy="${barY}" 
                    r="${i === lastIndex ? 3.5 : 1.5}"
                    fill="${i === lastIndex ? '#FFFFFF' : '#FF3B30'}"
                    ${i === lastIndex ? 'class="hrm__current-dot"' : ''}
                />
            `;
        });

        // --- X축 시간 레이블 생성 ---
        const xLabels = this._generateTimeLabels(validData, graphPadding.left, graphWidth, timeMin, timeRange);

        // --- 전체 SVG 조합 ---
        return `
            <div class="hrm__graph-wrapper">
                <svg class="hrm__graph-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <!-- 바 그라데이션: 상단 밝은 빨강 → 하단 어두운 빨강 -->
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#FF3B30" stop-opacity="1"/>
                            <stop offset="100%" stop-color="#FF3B30" stop-opacity="0.3"/>
                        </linearGradient>
                    </defs>

                    <!-- 수직 바 -->
                    ${barsHTML}

                    <!-- 데이터 점 (현재 시점 = 흰색) -->
                    ${dotsHTML}

                    <!-- X축 시간 레이블 -->
                    ${xLabels}
                </svg>

                <!-- Y축 최대/최소 수치 (우측) -->
                <div class="hrm__y-labels">
                    <span class="hrm__y-max">${this._safe(this.maxBPM)}</span>
                    <span class="hrm__y-min">${this._safe(this.minBPM)}</span>
                </div>
            </div>
        `;
    }

    /**
     * 빈 그래프 렌더링 (데이터 없음)
     * @private
     */
    _renderEmptyGraph() {
        return `
            <div class="hrm__graph-wrapper">
                <svg class="hrm__graph-svg" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid meet">
                    <!-- 빈 기준선 -->
                    <line x1="10" y1="110" x2="275" y2="110" 
                          stroke="#333" stroke-width="0.5" stroke-dasharray="4,4"/>
                    
                    <!-- X축 레이블 (기본) -->
                    <text x="30" y="135" fill="#8E8E93" font-size="10" text-anchor="middle">12 AM</text>
                    <text x="100" y="135" fill="#8E8E93" font-size="10" text-anchor="middle">6 AM</text>
                    <text x="170" y="135" fill="#8E8E93" font-size="10" text-anchor="middle">12 PM</text>
                    <text x="240" y="135" fill="#8E8E93" font-size="10" text-anchor="middle">6 PM</text>
                </svg>

                <div class="hrm__y-labels">
                    <span class="hrm__y-max">0</span>
                    <span class="hrm__y-min">0</span>
                </div>

                <div class="hrm__no-data-overlay">
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

        // 시간 범위에 따라 적절한 레이블 간격 결정
        const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);

        let labelTimes = [];

        if (hoursDiff <= 1) {
            // 1시간 이내: 15분 간격
            const start = new Date(firstTime);
            start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0);
            for (let t = new Date(start); t <= lastTime; t.setMinutes(t.getMinutes() + 15)) {
                if (t >= firstTime) labelTimes.push(new Date(t));
            }
        } else if (hoursDiff <= 6) {
            // 6시간 이내: 1시간 간격
            const start = new Date(firstTime);
            start.setMinutes(0, 0, 0);
            for (let t = new Date(start); t <= lastTime; t.setHours(t.getHours() + 1)) {
                if (t >= firstTime) labelTimes.push(new Date(t));
            }
        } else if (hoursDiff <= 24) {
            // 24시간 이내: 6시간 간격 (Apple Watch 스타일)
            const start = new Date(firstTime);
            start.setHours(Math.floor(start.getHours() / 6) * 6, 0, 0, 0);
            for (let t = new Date(start); t <= lastTime; t.setHours(t.getHours() + 6)) {
                if (t >= firstTime) labelTimes.push(new Date(t));
            }
        } else {
            // 24시간 초과: 12시간 간격
            const start = new Date(firstTime);
            start.setHours(Math.floor(start.getHours() / 12) * 12, 0, 0, 0);
            for (let t = new Date(start); t <= lastTime; t.setHours(t.getHours() + 12)) {
                if (t >= firstTime) labelTimes.push(new Date(t));
            }
        }

        // 레이블이 너무 적으면 시작/끝 시간 추가
        if (labelTimes.length < 2) {
            labelTimes = [firstTime, lastTime];
        }

        // 최대 5개 레이블로 제한
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
     * 시간 레이블 포맷 (Apple Watch 스타일: "12 AM", "6 PM")
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
     * 시간차 계산하여 "Xm ago" 형식으로 포맷
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
     * 현재 시간 포맷 (HH:MM)
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
        const clockEl = this.container.querySelector('#hrmClock');
        if (clockEl) {
            clockEl.textContent = this._getCurrentTime();
        }
    }

    /**
     * null/NaN → 0 변환 (안전 표시)
     * @private
     */
    _safe(value) {
        return (value !== null && value !== undefined && !isNaN(value)) ? value : 0;
    }

    /**
     * 컴포넌트 정리 (메모리 누수 방지)
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
