/**
 * ============================================
 * 파일: TeamTabs.js
 * 위치: js/components/TeamTabs.js
 * 역할: 팀 전환 탭 UI 컴포넌트
 * 연결: Dashboard.js에서 import, team-tabs.css 스타일 적용
 * ============================================
 */

import { teamDataService } from '../services/teamData.js';
import { workerDataService } from '../services/workerData.js';
import { authService, ROLES } from '../services/authService.js';

export class TeamTabs {
    /**
     * 팀 탭 HTML 생성
     * @param {number} activeTeamId - 현재 선택된 팀 ID
     * @param {Function} onAddTeamClick - 팀 추가 버튼 클릭 콜백
     * @returns {string} HTML 문자열
     */
    static render(activeTeamId) {
        const user = authService.getCurrentUser();
        const canManageTeam = authService.hasPermission('team.create');

        let teams = teamDataService.getAll();

        // 팀장은 자기 팀만 보기
        if (user && user.role === ROLES.LEADER && user.teamId) {
            teams = teams.filter(t => t.id === user.teamId);
        }

        const tabsHTML = teams.map(team => {
            const memberCount = workerDataService.getCountByTeamId(team.id);
            const isActive = team.id === activeTeamId;

            return `
                <div class="team-tab-wrapper">
                    <button class="team-tab ${isActive ? 'team-tab--active' : ''}" 
                            data-team-id="${team.id}"
                            style="--team-color: ${team.color}">
                        <span class="team-tab__icon">🏢</span>
                        <span class="team-tab__name">${team.name}</span>
                        <span class="team-tab__count">${memberCount}</span>
                    </button>
                    ${canManageTeam ? `
                        <button class="team-tab__delete" 
                                data-delete-team="${team.id}"
                                title="${team.name} 삭제">
                            ✕
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="team-tabs">
                <div class="team-tabs__list">
                    ${tabsHTML}
                </div>
                ${canManageTeam ? `
                    <button class="team-tabs__add" id="addTeamBtn" title="새 팀 추가">
                        <span>+</span>
                        <span class="team-tabs__add-text">팀 추가</span>
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * 탭 클릭 이벤트 바인딩
     * @param {HTMLElement} container - 이벤트를 바인딩할 컨테이너
     * @param {Function} onTeamSelect - 팀 선택 콜백 (teamId) => void
     * @param {Function} onAddTeam - 팀 추가 버튼 클릭 콜백
     * @param {Function} onDeleteTeam - 팀 삭제 콜백 (teamId) => void
     */
    static bindEvents(container, onTeamSelect, onAddTeam, onDeleteTeam) {
        // 팀 탭 클릭
        container.querySelectorAll('.team-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const teamId = parseInt(tab.dataset.teamId);
                onTeamSelect(teamId);
            });
        });

        // 팀 삭제 버튼 클릭
        container.querySelectorAll('.team-tab__delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const teamId = parseInt(btn.dataset.deleteTeam);
                if (onDeleteTeam) {
                    onDeleteTeam(teamId);
                }
            });
        });

        // 팀 추가 버튼 클릭
        const addBtn = container.querySelector('#addTeamBtn');
        if (addBtn) {
            addBtn.addEventListener('click', onAddTeam);
        }
    }
}

