/**
 * ============================================
 * 파일: AddWorkerModal.js
 * 위치: js/components/AddWorkerModal.js
 * 역할: 새 작업자 추가 모달 컴포넌트
 * 연결: Dashboard.js에서 import, modal.css 스타일 적용
 * ============================================
 */

import { workerDataService, bloodTypes } from '../services/workerData.js';
import { teamDataService } from '../services/teamData.js';

export class AddWorkerModal {
    /**
     * 모달 HTML 생성
     * @param {number} defaultTeamId - 기본 선택될 팀 ID
     * @returns {string} HTML 문자열
     */
    static render(defaultTeamId = 1) {
        const teams = teamDataService.getAll();

        const teamsOptionsHTML = teams.map(team => `
            <option value="${team.id}" ${team.id === defaultTeamId ? 'selected' : ''}>
                ${team.name}
            </option>
        `).join('');

        const bloodTypeOptionsHTML = bloodTypes.map(type => `
            <option value="${type}">${type}</option>
        `).join('');

        return `
            <div class="modal-overlay" id="addWorkerModal">
                <div class="modal modal--large">
                    <div class="modal__header">
                        <span class="modal__icon">👷</span>
                        <h2 class="modal__title">새 작업자 추가</h2>
                        <button class="modal__close" id="closeWorkerModal">&times;</button>
                    </div>
                    <form class="modal__body" id="addWorkerForm">
                        <!-- 1번 줄: 이름, 성별 -->
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="workerName">이름 *</label>
                                <input type="text" class="form-input" id="workerName" name="name" placeholder="작업자 이름" required autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="workerGender">성별 *</label>
                                <select class="form-select" id="workerGender" name="gender" required>
                                    <option value="남성">남성</option>
                                    <option value="여성">여성</option>
                                </select>
                            </div>
                        </div>

                        <!-- 2번 줄: 국적, 생년월일, 혈액형 -->
                        <div class="form-row--3">
                            <div class="form-group">
                                <label class="form-label" for="workerNationality">국적 *</label>
                                <input type="text" class="form-input" id="workerNationality" name="nationality" placeholder="예: 대한민국" required autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="workerBirthDate">생년월일 *</label>
                                <input type="date" class="form-input" id="workerBirthDate" name="birthDate" required max="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="workerBloodType">혈액형 *</label>
                                <select class="form-select" id="workerBloodType" name="bloodType" required>
                                    ${bloodTypeOptionsHTML}
                                </select>
                            </div>
                        </div>
                        
                        <!-- 3번 줄: 전화번호 -->
                        <div class="form-group">
                            <label class="form-label" for="workerPhone">전화번호 *</label>
                            <input type="tel" class="form-input" id="workerPhone" name="phoneNumber" placeholder="010-0000-0000" required maxlength="13" autocomplete="off">
                        </div>

                        <!-- 4번 줄: 지병 -->
                        <div class="form-group">
                            <label class="form-label" for="workerConditions">지병 (없으면 '없음' 작성)</label>
                            <input type="text" class="form-input" id="workerConditions" name="conditions" placeholder="예: 고혈압, 당뇨 또는 없음" autocomplete="off">
                        </div>

                        <!-- 비상연락처 정보 -->
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="workerEmergencyContact">비상연락처</label>
                                <input type="tel" class="form-input" id="workerEmergencyContact" name="emergencyContact" placeholder="010-0000-0000" maxlength="13" autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="workerEmergencyName">비상연락인</label>
                                <input type="text" class="form-input" id="workerEmergencyName" name="emergencyName" placeholder="예: 홍길동 (배우자)" autocomplete="off">
                            </div>
                        </div>

                        <!-- 5번 줄: 팀원 선택, 직무 작성 -->
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="workerTeam">소속 팀 선택 *</label>
                                <select class="form-select" id="workerTeam" name="teamId" required>
                                    ${teamsOptionsHTML}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="workerPosition">직무 *</label>
                                <input type="text" class="form-input" id="workerPosition" name="position" placeholder="예: 용접공" required autocomplete="off">
                            </div>
                        </div>

                        <!-- 6번 줄: 개인정보 동의 -->
                        <div class="form-group">
                            <label class="form-label">개인정보 수집 동의 *</label>
                            <label class="form-group--checkbox">
                                <input type="checkbox" class="form-checkbox" name="consent" required>
                                <span class="checkbox-text">동의합니다 (작업자 안전 관리를 위한 필수 항목)</span>
                            </label>
                        </div>

                        <div class="modal__actions">
                            <button type="button" class="btn btn--outline" id="cancelWorkerModal">취소</button>
                            <button type="submit" class="btn btn--primary">
                                <span>✓</span> 작업자 추가하기
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * 모달 표시
     * @param {number} teamId - 기본 선택될 팀 ID
     */
    static show(teamId) {
        const modal = document.getElementById('addWorkerModal');
        if (modal) {
            modal.classList.add('modal-overlay--visible');

            // 팀 선택 업데이트 (show() 시점에 최신 팀 목록으로 갱신)
            AddWorkerModal.updateTeamOptions();

            // 팀 ID가 전달되면 해당 팀 선택, 없으면 첫 번째 팀 선택
            const teamSelect = document.getElementById('workerTeam');
            if (teamSelect && teamSelect.options.length > 0) {
                if (teamId) {
                    const found = [...teamSelect.options].some(o => o.value === String(teamId));
                    teamSelect.value = found ? String(teamId) : teamSelect.options[0].value;
                }
            }

            // 포커스
            setTimeout(() => {
                document.getElementById('workerName')?.focus();
            }, 100);
        }
    }

    /**
     * 모달 숨기기
     */
    static hide() {
        const modal = document.getElementById('addWorkerModal');
        if (modal) {
            modal.classList.remove('modal-overlay--visible');
            // 폼 리셋
            document.getElementById('addWorkerForm')?.reset();
        }
    }

    /**
     * 팀 옵션 업데이트 (새 팀 추가 시)
     */
    static updateTeamOptions() {
        const teamSelect = document.getElementById('workerTeam');
        if (!teamSelect) return;

        const teams = teamDataService.getAll()
            .filter(t => t.id !== null && t.id !== undefined && !isNaN(Number(t.id))); // 유효한 ID만 포함
        if (teams.length === 0) return;

        const currentValue = teamSelect.value;

        // 옵션 재생성
        teamSelect.innerHTML = teams.map(team =>
            `<option value="${team.id}">${team.name}</option>`
        ).join('');

        // 기존 선택값이 새 옵션 목록에 없으면 첫 번째 옵션 자동 선택
        const valueExists = teams.some(t => String(t.id) === String(currentValue));
        if (currentValue && valueExists) {
            teamSelect.value = currentValue;
        } else {
            teamSelect.value = String(teams[0].id);
        }
        console.log('[AddWorkerModal] 팀 옵션 업데이트:', teamSelect.value, '(팀수:', teams.length, ')');
    }

    /**
     * 이벤트 바인딩
     * @param {Function} onSuccess - 작업자 추가 성공 콜백 (worker) => void
     */
    static bindEvents(onSuccess) {
        // 닫기 버튼
        document.getElementById('closeWorkerModal')?.addEventListener('click', AddWorkerModal.hide);
        document.getElementById('cancelWorkerModal')?.addEventListener('click', AddWorkerModal.hide);

        // 전화번호 자동 하이픈 및 길이 제한
        const phoneInput = document.getElementById('workerPhone');
        const emergencyInput = document.getElementById('workerEmergencyContact');

        const formatPhone = (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            let formatted = val;
            if (val.length > 3 && val.length <= 7) {
                formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
            } else if (val.length > 7) {
                formatted = `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7, 11)}`;
            }
            e.target.value = formatted;
        };

        phoneInput?.addEventListener('input', formatPhone);
        emergencyInput?.addEventListener('input', formatPhone);

        // 오버레이 클릭으로 닫기
        document.getElementById('addWorkerModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                AddWorkerModal.hide();
            }
        });

        // 폼 제출
        document.getElementById('addWorkerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const name = formData.get('name')?.trim();
            const position = formData.get('position')?.trim();

            if (!name || !position) {
                alert('이름과 직무를 입력해주세요.');
                return;
            }

            // 지병 파싱
            const conditionsStr = formData.get('conditions')?.trim();
            const conditions = conditionsStr
                ? conditionsStr.split(',').map(c => c.trim()).filter(c => c)
                : [];

            // 작업자 생성 데이터 준비
            // FormData로 가져오고, 만약 비어있으면 DOM에서 직접 읽기 (이중 도안)
            const rawTeamId = formData.get('teamId') || document.getElementById('workerTeam')?.value;
            console.log('[AddWorkerModal] 제출 teamId 원본값:', rawTeamId);
            const workerData = {
                teamId: parseInt(rawTeamId),
                name,
                gender: formData.get('gender'),
                nationality: formData.get('nationality'),
                birthDate: formData.get('birthDate'),
                phoneNumber: formData.get('phoneNumber'),
                position: formData.get('position')?.trim() || '작업자',
                bloodType: formData.get('bloodType'),
                conditions,
                emergencyContact: formData.get('emergencyContact')?.trim() || '',
                emergencyName: formData.get('emergencyName')?.trim() || ''
            };

            // 서버와 통신 (비동기) — 성공 시에만 모달 닫기
            const submitBtn = e.target.querySelector('[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '저장 중...';
            }

            try {
                const newWorker = await workerDataService.create(workerData);

                // 모달 닫기 (서버 성공 후에만)
                AddWorkerModal.hide();

                // 성공 콜백
                if (onSuccess) {
                    onSuccess(newWorker);
                }
            } catch (err) {
                console.error('[AddWorkerModal] 작업자 추가 실패:', err);
                alert(`작업자 추가에 실패했습니다.\n${err.message}`);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>✓</span> 작업자 추가하기';
                }
            }
        });

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('addWorkerModal');
                if (modal?.classList.contains('modal-overlay--visible')) {
                    AddWorkerModal.hide();
                }
            }
        });
    }
}
