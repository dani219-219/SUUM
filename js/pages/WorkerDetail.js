/**
 * ============================================
 * 파일: WorkerDetail.js
 * 위치: js/pages/WorkerDetail.js
 * 역할: 개별 작업자 상세 페이지
 * 연결: 
 *   - app.js에서 라우팅 (#/worker/:id)
 *   - VitalGauge.js, HealthPanel.js 컴포넌트 사용
 *   - workerData.js 데이터 사용
 * ============================================
 */

import { workerDataService } from '../services/workerData.js';
import { VitalGauge } from '../components/VitalGauge.js';
import { HealthPanel } from '../components/HealthPanel.js';
import { HeartRateMonitor } from '../components/HeartRateMonitor.js';
import { TemperatureMonitor } from '../components/TemperatureMonitor.js';

export class WorkerDetail {
    constructor(container, workerId) {
        this.container = container;
        this.workerId = workerId;
        this.unsubscribe = null;
        this.heartRateMonitor = null;  // 심박수 모니터 인스턴스
        this.temperatureMonitor = null; // 체온 모니터 인스턴스
    }

    /**
     * 페이지 렌더링
     */
    render() {
        const worker = workerDataService.getById(this.workerId);

        if (!worker) {
            this.container.innerHTML = `
                <div class="app-layout">
                    <header class="app-header">
                        <button class="btn btn--back" onclick="window.location.hash='#/dashboard'">
                            ← 뒤로
                        </button>
                    </header>
                    <main class="app-content">
                        <div style="text-align: center; padding: 4rem;">
                            <h2>작업자를 찾을 수 없습니다</h2>
                            <p style="color: var(--text-muted); margin-top: 1rem;">
                                ID: ${this.workerId}
                            </p>
                        </div>
                    </main>
                </div>
            `;
            return;
        }

        this.renderWorker(worker);

        // 실시간 업데이트 구독
        this.unsubscribe = workerDataService.subscribe((workers) => {
            const updated = workers.find(w => w.id === parseInt(this.workerId));
            if (updated) {
                this.updateVitals(updated);
            }
        });
    }

    /**
     * 작업자 상세 정보 렌더링
     */
    renderWorker(worker) {
        const statusText = {
            normal: '정상',
            warning: '주의 필요',
            danger: '위험 - 즉시 조치 필요'
        };

        const statusIcon = {
            normal: '✅',
            warning: '⚠️',
            danger: '🚨'
        };

        const recommendations = {
            normal: '현재 상태가 양호합니다. 정기적인 휴식과 수분 섭취를 유지하세요.',
            warning: '체온 또는 심박수가 상승 중입니다. 그늘에서 휴식을 취하고 수분을 섭취하세요.',
            danger: '즉시 작업을 중단하고 시원한 곳으로 이동하세요. 의료진에게 연락이 필요할 수 있습니다.'
        };

        this.container.innerHTML = `
            <div class="app-layout">
                <header class="app-header">
                    <button class="btn btn--back" onclick="window.location.hash='#/dashboard'">
                        ← 목록으로
                    </button>
                    <div class="app-header__logo">
                        <span>${worker.name}</span>
                        <span style="font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 400;">
                            ${worker.position} · #${worker.id}
                        </span>
                    </div>
                    <nav class="app-header__nav">
                        <span class="app-header__time" id="currentTime"></span>
                    </nav>
                </header>
                
                <main class="app-content">
                    <!-- 바이탈 게이지 -->
                    <div class="vital-gauges" id="vitalGauges">
                        ${VitalGauge.renderTemperature(worker.temperature, worker.status)}
                        ${VitalGauge.renderHeartRate(worker.heartRate, worker.status)}
                    </div>
                    
                    <!-- 건강 정보 패널 -->
                    <div class="mt-lg">
                        ${HealthPanel.render(worker)}
                    </div>
                    
                    <!-- 센서 모니터 (Apple Watch 스타일) -->
                    <div class="mt-lg sensor-monitors-grid">
                        <div id="heartRateMonitorContainer">
                            <!-- HeartRateMonitor가 비동기로 렌더링됩니다 -->
                        </div>
                        <div id="temperatureMonitorContainer">
                            <!-- TemperatureMonitor가 비동기로 렌더링됩니다 -->
                        </div>
                    </div>
                    
                    <!-- 상태 및 권장 조치 -->
                    <div class="mt-lg" style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); padding: var(--spacing-lg);">
                        <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                            <span style="font-size: var(--font-size-2xl);">${statusIcon[worker.status]}</span>
                            <div>
                                <div style="font-size: var(--font-size-lg); font-weight: 600; color: var(--status-${worker.status});">
                                    상태: ${statusText[worker.status]}
                                </div>
                            </div>
                        </div>
                        <div style="padding: var(--spacing-md); background: rgba(0,0,0,0.2); border-radius: var(--radius-md);">
                            <div style="font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: var(--spacing-xs);">
                                권장 조치
                            </div>
                            <div style="color: var(--text-secondary);">
                                ${recommendations[worker.status]}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `;

        this.startClock();

        // 센서 모니터 비동기 초기화 (기존 로직과 독립적)
        this.initSensorMonitors(worker);
    }

    /**
     * 센서 모니터 초기화 (심박수 + 체온)
     * 기존 workerDataService 로직과 완전히 분리된 독립 비동기 작업
     */
    async initSensorMonitors(worker) {
        const helmetId = worker.helmetId || 1;

        // 심박수 모니터 초기화
        try {
            const hrContainer = this.container.querySelector('#heartRateMonitorContainer');
            if (hrContainer) {
                this.heartRateMonitor = new HeartRateMonitor(hrContainer, worker.id, helmetId);
                await this.heartRateMonitor.init();
            }
        } catch (e) {
            console.error('[WorkerDetail] 심박수 모니터 초기화 실패:', e);
        }

        // 체온 모니터 초기화
        try {
            const tmpContainer = this.container.querySelector('#temperatureMonitorContainer');
            if (tmpContainer) {
                this.temperatureMonitor = new TemperatureMonitor(tmpContainer, worker.id, helmetId);
                await this.temperatureMonitor.init();
            }
        } catch (e) {
            console.error('[WorkerDetail] 체온 모니터 초기화 실패:', e);
        }
    }

    /**
     * 바이탈 정보 업데이트
     */
    updateVitals(worker) {
        const gauges = this.container.querySelector('#vitalGauges');
        if (gauges) {
            gauges.innerHTML = `
                ${VitalGauge.renderTemperature(worker.temperature, worker.status)}
                ${VitalGauge.renderHeartRate(worker.heartRate, worker.status)}
            `;
        }
    }

    /**
     * 시계 시작
     */
    startClock() {
        const updateTime = () => {
            const timeEl = this.container.querySelector('#currentTime');
            if (timeEl) {
                const now = new Date();
                timeEl.textContent = now.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        };

        updateTime();
        this.clockInterval = setInterval(updateTime, 1000);
    }

    /**
     * 페이지 정리
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        // 센서 모니터 정리 (인터벌 해제)
        if (this.heartRateMonitor) {
            this.heartRateMonitor.destroy();
            this.heartRateMonitor = null;
        }
        if (this.temperatureMonitor) {
            this.temperatureMonitor.destroy();
            this.temperatureMonitor = null;
        }
    }
}
