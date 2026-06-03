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
        this.activeMonitor = null; // 현재 열려있는 모니터 인스턴스 (모달용)
        this.handleShowSensorModal = this.handleShowSensorModal.bind(this);
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
                    
                    <!-- 상태 및 권장 조치 -->
                    <div class="mt-lg" style="background: var(--theme-card-bg); border-radius: var(--radius-lg); border: 1px solid var(--theme-card-border); padding: var(--spacing-lg); box-shadow: var(--theme-shadow-sm);">
                        <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                            <span style="font-size: var(--font-size-2xl);">${statusIcon[worker.status]}</span>
                            <div>
                                <div style="font-size: var(--font-size-lg); font-weight: 600; color: var(--status-${worker.status});">
                                    상태: ${statusText[worker.status]}
                                </div>
                            </div>
                        </div>
                        <div style="padding: var(--spacing-md); background: var(--theme-bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--theme-card-border);">
                            <div style="font-size: var(--font-size-sm); color: var(--theme-text-muted); margin-bottom: var(--spacing-xs);">
                                권장 조치
                            </div>
                            <div style="color: var(--theme-text-secondary);">
                                ${recommendations[worker.status]}
                            </div>
                        </div>
                    </div>
                </main>

                <!-- 센서 팝업 모달 -->
                <div class="modal-overlay" id="sensorModalOverlay">
                    <div class="modal">
                        <div class="modal__header">
                            <h3 class="modal__title" id="sensorModalTitle">센서 상세 정보</h3>
                            <button class="modal__close" id="closeSensorModal">✕</button>
                        </div>
                        <div class="modal__body" id="sensorModalBody">
                            <!-- 동적 렌더링 -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.startClock();

        // 모달 이벤트 리스너 등록
        window.addEventListener('showSensorModal', this.handleShowSensorModal);
        
        const closeBtn = this.container.querySelector('#closeSensorModal');
        const overlay = this.container.querySelector('#sensorModalOverlay');
        
        const closeModal = () => {
            overlay.classList.remove('modal-overlay--visible');
            if (this.activeMonitor) {
                this.activeMonitor.destroy();
                this.activeMonitor = null;
            }
            this.container.querySelector('#sensorModalBody').innerHTML = '';
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
        }
    }

    /**
     * 센서 모달 띄우기
     */
    async handleShowSensorModal(e) {
        const type = e.detail.type;
        const worker = workerDataService.getById(this.workerId);
        if (!worker) return;

        const overlay = this.container.querySelector('#sensorModalOverlay');
        const modalTitle = this.container.querySelector('#sensorModalTitle');
        const modalBody = this.container.querySelector('#sensorModalBody');
        
        if (!overlay || !modalTitle || !modalBody) return;

        // 기존 모니터 정리
        if (this.activeMonitor) {
            this.activeMonitor.destroy();
            this.activeMonitor = null;
        }

        modalBody.innerHTML = ''; // 초기화
        overlay.classList.add('modal-overlay--visible');

        const helmetId = worker.helmetId || 1;

        if (type === 'temperature') {
            modalTitle.textContent = '체온 상세 기록';
            this.activeMonitor = new TemperatureMonitor(modalBody, worker.id, helmetId);
        } else if (type === 'heartRate') {
            modalTitle.textContent = '심박수 상세 기록';
            this.activeMonitor = new HeartRateMonitor(modalBody, worker.id, helmetId);
        }

        if (this.activeMonitor) {
            try {
                await this.activeMonitor.init();
            } catch (error) {
                console.error('[WorkerDetail] 모니터 초기화 실패:', error);
                modalBody.innerHTML = '<p style="color: #FF3B30;">센서 데이터를 불러오는 데 실패했습니다.</p>';
            }
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
        
        window.removeEventListener('showSensorModal', this.handleShowSensorModal);

        // 센서 모니터 정리
        if (this.activeMonitor) {
            this.activeMonitor.destroy();
            this.activeMonitor = null;
        }
    }
}
