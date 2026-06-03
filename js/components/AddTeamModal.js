/**
 * ============================================
 * 파일: AddTeamModal.js
 * 위치: js/components/AddTeamModal.js
 * 역할: 새 팀 추가 모달 컴포넌트
 * 연결: Dashboard.js에서 import, modal.css 스타일 적용
 * ============================================
 */

import { teamDataService, teamColors } from '../services/teamData.js';

export class AddTeamModal {
    /**
     * 모달 HTML 생성
     * @returns {string} HTML 문자열
     */
    static render() {
        const colorsHTML = teamColors.map((color, index) => `
            <button type="button" 
                    class="color-picker__option ${index === 0 ? 'color-picker__option--selected' : ''}"
                    data-color="${color.value}"
                    style="background-color: ${color.value}"
                    title="${color.name}">
            </button>
        `).join('');

        return `
            <div class="modal-overlay" id="addTeamModal">
                <div class="modal">
                    <div class="modal__header">
                        <span class="modal__icon">🏢</span>
                        <h2 class="modal__title">새 팀 추가</h2>
                        <button class="modal__close" id="closeTeamModal">&times;</button>
                    </div>
                    <form class="modal__body" id="addTeamForm">
                        <div class="form-group">
                            <label class="form-label" for="teamName">팀 이름</label>
                            <input type="text" 
                                   class="form-input" 
                                   id="teamName" 
                                   name="teamName"
                                   placeholder="예: 3팀"
                                   required
                                   maxlength="20"
                                   autocomplete="off">
                        </div>
                        <div class="form-group">
                            <label class="form-label">팀 색상</label>
                            <div class="color-picker" id="colorPicker">
                                ${colorsHTML}
                            </div>
                            <input type="hidden" id="teamColor" name="teamColor" value="${teamColors[0].value}">
                        </div>
                        <div class="modal__actions">
                            <button type="button" class="btn btn--outline" id="cancelTeamModal">취소</button>
                            <button type="submit" class="btn btn--primary">
                                <span>✓</span> 팀 추가하기
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * 모달 표시
     */
    static show() {
        const modal = document.getElementById('addTeamModal');
        if (modal) {
            modal.classList.add('modal-overlay--visible');
            // 포커스
            setTimeout(() => {
                document.getElementById('teamName')?.focus();
            }, 100);
        }
    }

    /**
     * 모달 숨기기
     */
    static hide() {
        const modal = document.getElementById('addTeamModal');
        if (modal) {
            modal.classList.remove('modal-overlay--visible');
            // 폼 리셋
            document.getElementById('addTeamForm')?.reset();
            // 색상 선택 초기화
            const colorOptions = document.querySelectorAll('.color-picker__option');
            colorOptions.forEach((opt, i) => {
                opt.classList.toggle('color-picker__option--selected', i === 0);
            });
            document.getElementById('teamColor').value = teamColors[0].value;
        }
    }

    /**
     * 이벤트 바인딩
     * @param {Function} onSuccess - 팀 추가 성공 콜백 (team) => void
     */
    static bindEvents(onSuccess) {
        // 닫기 버튼
        document.getElementById('closeTeamModal')?.addEventListener('click', AddTeamModal.hide);
        document.getElementById('cancelTeamModal')?.addEventListener('click', AddTeamModal.hide);

        // 오버레이 클릭으로 닫기
        document.getElementById('addTeamModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                AddTeamModal.hide();
            }
        });

        // 색상 선택
        document.getElementById('colorPicker')?.addEventListener('click', (e) => {
            const option = e.target.closest('.color-picker__option');
            if (option) {
                document.querySelectorAll('.color-picker__option').forEach(opt => {
                    opt.classList.remove('color-picker__option--selected');
                });
                option.classList.add('color-picker__option--selected');
                document.getElementById('teamColor').value = option.dataset.color;
            }
        });

        // 폼 제출
        document.getElementById('addTeamForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('teamName').value.trim();
            const color = document.getElementById('teamColor').value;

            if (!name) {
                alert('팀 이름을 입력해주세요.');
                return;
            }

            // 팀 생성 (서버와 통신)
            const newTeam = await teamDataService.create(name, color);

            // 모달 닫기
            AddTeamModal.hide();

            // 성공 콜백
            if (onSuccess) {
                onSuccess(newTeam);
            }
        });

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('addTeamModal');
                if (modal?.classList.contains('modal-overlay--visible')) {
                    AddTeamModal.hide();
                }
            }
        });
    }
}
