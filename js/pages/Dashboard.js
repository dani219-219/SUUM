/**
 * ============================================
 * 파일: Dashboard.js
 * 위치: js/pages/Dashboard.js
 * 역할: 메인 대시보드 - 팀별 작업자 현황 (페이지네이션)
 * 연결: 
 *   - app.js에서 라우팅
 *   - WorkerCard.js, WeatherWidget.js, AlertBanner.js, DisasterAlert.js 컴포넌트 사용
 *   - TeamTabs.js, AddTeamModal.js, AddWorkerModal.js 컴포넌트 사용
 *   - workerData.js, teamData.js 데이터 사용
 * ============================================
 */

import { workerDataService } from '../services/workerData.js';
import { teamDataService } from '../services/teamData.js';
import { WorkerCard } from '../components/WorkerCard.js';
import { WeatherWidget } from '../components/WeatherWidget.js';
import { AlertBanner } from '../components/AlertBanner.js';
import { DisasterAlert } from '../components/DisasterAlert.js';
import { TeamTabs } from '../components/TeamTabs.js';
import { AddTeamModal } from '../components/AddTeamModal.js';
import { AddWorkerModal } from '../components/AddWorkerModal.js';
import { authService, ROLES } from '../services/authService.js';

export class Dashboard {
    constructor(container) {
        this.container = container;
        this.unsubscribe = null;
        this.teamUnsubscribe = null;
        this.currentTeamId = this.getInitialTeamId();
        
        // 뷰 모드 초기화 (기본값 'grid') 주석 추가
        // localStorage에 저장된 사용자 설정을 불러오며, 없으면 'grid' 모드로 설정합니다.
        this.viewMode = localStorage.getItem('aegis-view-mode') || 'grid';
    }

    /**
     * 초기 팀 ID 결정 (권한에 따라)
     */
    getInitialTeamId() {
        const user = authService.getCurrentUser();

        // 팀장은 자기 팀만
        if (user && user.role === ROLES.LEADER && user.teamId) {
            return user.teamId;
        }

        // 관리자/안전관리자는 첫 번째 팀
        const teams = teamDataService.getAll();
        return teams.length > 0 ? teams[0].id : 1;
    }

    /**
     * 페이지 렌더링
     */
    async render() {
        // 현재 팀 작업자 로드
        const workers = this.getCurrentTeamWorkers();
        const statusCounts = workerDataService.getStatusCounts(this.currentTeamId);
        const currentTeam = teamDataService.getById(this.currentTeamId);
        
        // 날씨 위젯은 기다리지 않고 나중에 업데이트 (비동기)
        const weatherPlaceholder = `<div id="weatherWidget" class="weather-widget--loading">날씨 정보를 확인 중...</div>`;

        const user = authService.getCurrentUser();
        const canManage = authService.hasPermission('worker.create');

        this.container.innerHTML = `
            <div class="app-layout">
                <header class="app-header">
                    <div class="app-header__logo">
                        <span class="app-header__logo-icon">🏭</span>
                        <span>스마트 안전 모니터링</span>
                    </div>
                    <nav class="app-header__nav">
                        <span class="app-header__user">
                            <span class="app-header__user-name">${user?.name || '사용자'}</span>
                            <span class="app-header__user-role">${this.getRoleDisplayName(user?.role)}</span>
                        </span>
                        <span class="app-header__time" id="currentTime"></span>
                        <button class="btn btn--outline btn--logout" onclick="window.location.hash='#/logout'" title="로그아웃">
                            🚪
                        </button>
                    </nav>
                </header>
                
                <main class="app-content">
                    <!-- 재난문자 배너 -->
                    ${DisasterAlert.render()}
                    
                    <!-- 날씨 위젯 -->
                    ${weatherPlaceholder}
                    
                    <!-- 작업자 경고 배너 -->
                    <div id="alertBanner">
                        ${AlertBanner.render(statusCounts)}
                    </div>
                    
                    <!-- 팀 탭 -->
                    <div id="teamTabs">
                        ${TeamTabs.render(this.currentTeamId)}
                    </div>
                    
                    <!-- 작업자 목록 타이틀 -->
                    <div class="section-title">
                        <span class="section-title__icon">👷</span>
                        <span id="teamTitle">${currentTeam?.name || '팀'}</span> 작업자 현황
                        <span style="margin-left: auto; display: flex; align-items: center; gap: var(--spacing-md);">
                            <span style="font-size: var(--font-size-sm); font-weight: 400; color: var(--text-muted);">
                                총 <span id="workerCount">${workers.length}</span>명
                            </span>
                            
                            <!-- 뷰 모드 토글 (격자/리스트) -->
                            <div class="view-mode-toggle" style="display: flex; background: rgba(255,255,255,0.05); border-radius: var(--radius-md); padding: 4px; gap: 4px;">
                                <button class="btn btn--icon" id="viewGridBtn" style="padding: 4px 8px; border-radius: var(--radius-sm); border: none; background: ${this.viewMode === 'grid' ? 'var(--bg-card)' : 'transparent'}; color: ${this.viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)'}; cursor: pointer;" title="격자 뷰">
                                    ⊞
                                </button>
                                <button class="btn btn--icon" id="viewListBtn" style="padding: 4px 8px; border-radius: var(--radius-sm); border: none; background: ${this.viewMode === 'list' ? 'var(--bg-card)' : 'transparent'}; color: ${this.viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)'}; cursor: pointer;" title="리스트 뷰">
                                    ☰
                                </button>
                            </div>

                            ${canManage ? `
                                <button class="btn btn--primary" id="addWorkerBtn">
                                    <span>+</span> 작업자 추가
                                </button>
                            ` : ''}
                        </span>
                    </div>
                    
                    <!-- 작업자 카드 그리드 -->
                    <div id="workersGrid">
                        ${this.renderWorkersGrid(workers)}
                    </div>
                </main>
            </div>
            
            <!-- 모달 -->
            ${AddTeamModal.render()}
            ${AddWorkerModal.render(this.currentTeamId)}
        `;

        // 이벤트 바인딩
        this.bindEvents();

        // 날씨 정보 비동기 로드
        this.loadWeather();

        // 시간 업데이트 시작
        this.startClock();

        // 실시간 데이터 시뮬레이션 시작
        workerDataService.startSimulation(3000);

        // 데이터 변경 구독
        this.unsubscribe = workerDataService.subscribe(() => {
            this.updateWorkersGrid();
            this.updateAlertBanner();
        });

        // 팀 데이터 변경 구독
        this.teamUnsubscribe = teamDataService.subscribe(() => {
            const teams = teamDataService.getAll();
            // 현재 팀 ID가 갱신된 목록에 없으면 (tempId → 실제 ID 교체) 첫 번째 팀으로 전환
            const currentStillValid = teams.some(t => t.id === this.currentTeamId);
            if (!currentStillValid && teams.length > 0) {
                this.currentTeamId = teams[0].id;
            }
            this.updateTeamTabs();
            AddWorkerModal.updateTeamOptions();
        });
    }

    /**
     * 날씨 정보 비동기 로드 및 업데이트
     */
    async loadWeather() {
        try {
            const weatherContainer = this.container.querySelector('#weatherWidget');
            if (weatherContainer) {
                const widget = new WeatherWidget(weatherContainer);
                await widget.render();
            }
        } catch (e) {
            console.error('[Dashboard] 날씨 로드 실패:', e);
        }
    }

    /**
     * 현재 팀 작업자 목록 반환
     */
    getCurrentTeamWorkers() {
        return workerDataService.getByTeamId(this.currentTeamId);
    }

    /**
     * 작업자 그리드 렌더링
     */
    renderWorkersGrid(workers) {
        if (workers.length === 0) {
            const canManage = authService.hasPermission('worker.create');

            return `
                <div class="empty-state">
                    <div class="empty-state__icon">👷</div>
                    <div class="empty-state__title">작업자가 없습니다</div>
                    <div class="empty-state__desc">이 팀에 아직 작업자가 등록되지 않았습니다.</div>
                    ${canManage ? `
                        <button class="btn btn--primary empty-state__btn" id="emptyAddWorkerBtn">
                            <span>+</span> 작업자 추가하기
                        </button>
                    ` : ''}
                </div>
            `;
        }
        // WorkerCard.renderList를 호출할 때 현재 뷰 모드 전달
        return WorkerCard.renderList(workers, this.viewMode);
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 팀 탭 이벤트
        TeamTabs.bindEvents(
            this.container,
            (teamId) => this.selectTeam(teamId),
            () => AddTeamModal.show(),
            (teamId) => this.handleDeleteTeam(teamId)
        );

        // 팀 추가 모달 이벤트
        AddTeamModal.bindEvents((newTeam) => {
            // 새 팀 선택
            this.selectTeam(newTeam.id);
        });

        // 작업자 추가 버튼
        const addWorkerBtn = this.container.querySelector('#addWorkerBtn');
        if (addWorkerBtn) {
            addWorkerBtn.addEventListener('click', () => {
                AddWorkerModal.show(this.currentTeamId);
            });
        }

        // 빈 상태에서 작업자 추가 버튼
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('#emptyAddWorkerBtn')) {
                AddWorkerModal.show(this.currentTeamId);
            }
        });

        // 작업자 삭제 버튼
        this.container.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('[data-delete-worker]');
            if (deleteBtn) {
                e.stopPropagation();
                const workerId = parseInt(deleteBtn.dataset.deleteWorker);
                this.handleDeleteWorker(workerId);
            }
        });

        // 작업자 추가 모달 이벤트
        AddWorkerModal.bindEvents((newWorker) => {
            // 해당 팀으로 이동
            if (newWorker.teamId !== this.currentTeamId) {
                this.selectTeam(newWorker.teamId);
            } else {
                this.updateWorkersGrid();
            }
        });

        // 뷰 모드 토글 이벤트
        const viewGridBtn = this.container.querySelector('#viewGridBtn');
        const viewListBtn = this.container.querySelector('#viewListBtn');

        if (viewGridBtn && viewListBtn) {
            viewGridBtn.addEventListener('click', () => this.setViewMode('grid'));
            viewListBtn.addEventListener('click', () => this.setViewMode('list'));
        }
    }

    /**
     * 뷰 모드 설정 (격자/리스트 토글)
     * @param {string} mode - 'grid' 또는 'list'
     */
    setViewMode(mode) {
        // 이미 같은 모드라면 무시
        if (this.viewMode === mode) return;
        
        // 상태 업데이트 및 로컬 스토리지 저장
        this.viewMode = mode;
        localStorage.setItem('aegis-view-mode', mode);
        
        // 전체 화면 다시 그리지 않고 버튼 상태와 그리드만 업데이트
        const viewGridBtn = this.container.querySelector('#viewGridBtn');
        const viewListBtn = this.container.querySelector('#viewListBtn');
        
        if (viewGridBtn && viewListBtn) {
            viewGridBtn.style.background = mode === 'grid' ? 'var(--bg-card)' : 'transparent';
            viewGridBtn.style.color = mode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)';
            
            viewListBtn.style.background = mode === 'list' ? 'var(--bg-card)' : 'transparent';
            viewListBtn.style.color = mode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)';
        }

        // 그리드 재렌더링
        this.updateWorkersGrid();
    }

    /**
     * 작업자 삭제 처리
     */
    handleDeleteWorker(workerId) {
        const worker = workerDataService.getById(workerId);
        if (!worker) return;

        const confirmed = confirm(`정말 "${worker.name}" 작업자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
        if (confirmed) {
            workerDataService.delete(workerId);
            this.updateWorkersGrid();
            this.updateTeamTabs();
        }
    }

    /**
     * 팀 삭제 처리
     */
    handleDeleteTeam(teamId) {
        const team = teamDataService.getById(teamId);
        if (!team) return;

        const workerCount = workerDataService.getCountByTeamId(teamId);

        let message = `정말 "${team.name}"을(를) 삭제하시겠습니까?`;
        if (workerCount > 0) {
            message += `\n\n⚠️ 주의: 이 팀에 ${workerCount}명의 작업자가 있습니다.\n팀을 삭제하면 해당 작업자들도 함께 삭제됩니다.`;
        }
        message += '\n\n이 작업은 되돌릴 수 없습니다.';

        const confirmed = confirm(message);
        if (confirmed) {
            // 해당 팀 작업자들 먼저 삭제
            const workers = workerDataService.getByTeamId(teamId);
            workers.forEach(w => workerDataService.delete(w.id));

            // 팀 삭제
            teamDataService.delete(teamId);

            // 다른 팀으로 이동
            const teams = teamDataService.getAll();
            if (teams.length > 0) {
                this.selectTeam(teams[0].id);
            } else {
                // 팀이 없으면 새 팀 생성 유도
                this.currentTeamId = null;
                this.updateTeamTabs();
                this.updateWorkersGrid();
            }
        }
    }

    /**
     * 팀 선택
     */
    selectTeam(teamId) {
        this.currentTeamId = teamId;
        this.updateTeamTabs();
        this.updateWorkersGrid();
        this.updateAlertBanner();
        this.updateTeamTitle();
    }

    /**
     * 팀 탭 업데이트
     */
    updateTeamTabs() {
        const tabsContainer = this.container.querySelector('#teamTabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = TeamTabs.render(this.currentTeamId);
            TeamTabs.bindEvents(
                this.container,
                (teamId) => this.selectTeam(teamId),
                () => AddTeamModal.show(),
                (teamId) => this.handleDeleteTeam(teamId)
            );
        }
    }

    /**
     * 팀 타이틀 업데이트
     */
    updateTeamTitle() {
        const titleEl = this.container.querySelector('#teamTitle');
        const countEl = this.container.querySelector('#workerCount');
        const team = teamDataService.getById(this.currentTeamId);
        const workers = this.getCurrentTeamWorkers();

        if (titleEl) {
            titleEl.textContent = team?.name || '팀';
        }
        if (countEl) {
            countEl.textContent = workers.length;
        }
    }

    /**
     * 작업자 그리드 업데이트
     */
    updateWorkersGrid() {
        const grid = this.container.querySelector('#workersGrid');
        if (grid) {
            const workers = this.getCurrentTeamWorkers();
            grid.innerHTML = this.renderWorkersGrid(workers);

            // 빈 상태일 때 버튼 이벤트 재바인딩
            const emptyBtn = grid.querySelector('#emptyAddWorkerBtn');
            if (emptyBtn) {
                emptyBtn.addEventListener('click', () => {
                    AddWorkerModal.show(this.currentTeamId);
                });
            }
        }
        this.updateTeamTitle();
    }

    /**
     * 경고 배너 업데이트
     */
    updateAlertBanner() {
        const banner = this.container.querySelector('#alertBanner');
        if (banner) {
            const statusCounts = workerDataService.getStatusCounts(this.currentTeamId);
            banner.innerHTML = AlertBanner.render(statusCounts);
        }
    }

    /**
     * 현재 시간 표시
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
     * 역할 표시 이름
     */
    getRoleDisplayName(role) {
        const roleNames = {
            [ROLES.ADMIN]: '👑 시스템 관리자',
            [ROLES.SAFETY]: '🛡️ 안전관리자',
            [ROLES.LEADER]: '👷 현장 팀장'
        };
        return roleNames[role] || '사용자';
    }

    /**
     * 페이지 정리
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.teamUnsubscribe) {
            this.teamUnsubscribe();
        }
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        workerDataService.stopSimulation();
    }
}
