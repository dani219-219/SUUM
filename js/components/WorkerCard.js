/**
 * ============================================
 * 파일: WorkerCard.js
 * 위치: js/components/WorkerCard.js
 * 역할: 개별 작업자 카드 UI 컴포넌트
 * 연결: Dashboard.js에서 import, worker-card.css 스타일 적용
 * ============================================
 */

import { authService } from '../services/authService.js';

export class WorkerCard {
    /**
     * 작업자 카드 HTML 생성
     * @param {Object} worker - 작업자 데이터
     * @returns {string} HTML 문자열
     */
    static render(worker, viewMode = 'grid') {
        const statusText = {
            normal: '정상',
            warning: '주의',
            danger: '위험'
        };

        const initials = worker.name.slice(0, 1);
        const canDelete = authService.hasPermission('worker.delete');

        // 년도 숫자만 추출 (예: 2003-08-11 -> 2003)
        let birthYearText = '';
        if (worker.birthDate) {
            const year = worker.birthDate.split('-')[0]; // '2003' 추출
            birthYearText = year; // 숫자만 할당
        }

        // 지병 여부 확인
        const hasConditions = worker.conditions &&
            worker.conditions.length > 0 &&
            !worker.conditions.includes('없음') &&
            worker.conditions[0] !== '';

        return `
            <div class="worker-card worker-card--${worker.status} ${viewMode === 'list' ? 'worker-card--list' : ''}" 
                 data-worker-id="${worker.id}">
                ${canDelete ? `
                    <button class="worker-card__delete" 
                            data-delete-worker="${worker.id}" 
                            title="작업자 삭제">
                        ✕
                    </button>
                ` : ''}
                <div class="worker-card__content" onclick="window.location.hash='#/worker/${worker.id}'">
                    <div class="worker-card__header">
                        <div class="worker-card__avatar">${initials}</div>
                        <div class="worker-card__info">
                            <div class="worker-card__name">
                                ${worker.name}
                                ${hasConditions ? `
                                    <span class="condition-alert" title="질병있음">
                                        <span class="condition-alert__icon">!</span>
                                    </span>
                                ` : ''}
                            </div>
                            <div class="worker-card__id">
                                ${worker.position} · <strong>${worker.gender || '남성'}</strong> · <strong>${worker.bloodType || 'A+'}</strong> · <strong>${birthYearText}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="worker-card__vitals">
                        <div class="worker-card__vital">
                            <div class="worker-card__vital-value">${worker.temperature.toFixed(1)}°</div>
                            <div class="worker-card__vital-label">체온</div>
                        </div>
                        <div class="worker-card__vital">
                            <div class="worker-card__vital-value">${worker.heartRate}</div>
                            <div class="worker-card__vital-label">심박수</div>
                        </div>
                    </div>
                    <div class="worker-card__status worker-card__status--${worker.status}">
                        <span class="worker-card__status-dot"></span>
                        ${statusText[worker.status]}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 여러 작업자 카드 컨테이너 렌더링 (그리드 또는 리스트 모드 지원)
     * @param {Array} workers - 작업자 배열
     * @param {string} viewMode - 뷰 모드 ('grid' 또는 'list')
     * @returns {string} HTML 문자열
     */
    static renderList(workers, viewMode = 'grid') {
        // viewMode에 따라 클래스명 결정
        const containerClass = viewMode === 'list' ? 'workers-list' : 'workers-grid';

        return `
            <div class="${containerClass}">
                ${workers.map(w => WorkerCard.render(w, viewMode)).join('')}
            </div>
        `;
    }
}

