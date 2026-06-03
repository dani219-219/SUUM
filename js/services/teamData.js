/**
 * ============================================
 * 파일: teamData.js
 * 위치: js/services/teamData.js
 * 역할: 팀 데이터 관리 서비스 (CRUD + localStorage)
 * 연결: Dashboard.js, TeamTabs.js에서 import
 * ============================================
 */

import { config } from '../core/config.js';

// 기본 팀 데이터 없음 (서버에서 로드)
const defaultTeams = [];

// 사용 가능한 팀 색상 목록
export const teamColors = [
    { name: 'Cyan', value: '#00fff2' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#ff9500' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Green', value: '#10b981' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' }
];

/**
 * TeamDataService 클래스
 */
class TeamDataService {
    constructor() {
        this.storageKey = `${config.storage.prefix}teams`;
        this.teams = []; // 로컬 캐시
        this.listeners = new Set();
        this.isSyncing = false;
        
        // 초기화
        this.init();
    }

    /**
     * 초기화: 로컬 데이터를 먼저 보여주고 서버와 동기화
     */
    async init() {
        this.teams = this.loadFromStorage();
        this.notifyListeners();
        await this.syncWithServer();
    }

    /**
     * 서버와 팀(부서) 데이터 동기화
     */
    async syncWithServer() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            console.log('[TeamService] 서버 부서 데이터 동기화 시도...');
            const response = await fetch(`${config.api.baseUrl}/departments`);
            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                if (result.data.length > 0) {
                    // README: 응답 필드명이 'ID', 'Department_Name' (PascalCase)
                    // 필드명 안전 추출: 여러 형식 대응
                    this.teams = result.data
                        .map(d => ({
                            id: d.ID ?? d.id ?? d.departmentId ?? null,
                            name: d.Department_Name ?? d.departmentName ?? d.name ?? '',
                            color: d.color || teamColors[0].value,
                            createdAt: d.createdAt || new Date().toISOString().split('T')[0]
                        }))
                        .filter(t => t.id !== null && t.id !== undefined && !isNaN(t.id)); // ID 값 유효성 엄감
                    
                    console.log(`[TeamService] ${this.teams.length}개의 팀 로드 완료`);
                    this.saveToStorage();
                    this.notifyListeners();
                }
            }
        } catch (e) {
            console.error('[TeamService] 팀 데이터 서버 동기화 실패:', e);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * localStorage에서 데이터 로드
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('팀 데이터 로드 실패:', e);
        }
        // 저장된 데이터 없으면 기본값 사용
        return [...defaultTeams];
    }

    /**
     * localStorage에 데이터 저장
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.teams));
        } catch (e) {
            console.error('팀 데이터 저장 실패:', e);
        }
    }

    /**
     * 전체 팀 목록 반환
     */
    getAll() {
        return this.teams;
    }

    /**
     * ID로 팀 조회
     */
    getById(id) {
        return this.teams.find(t => t.id === parseInt(id));
    }

    /**
     * 새 팀 생성
     * @param {string} name - 팀 이름
     * @param {string} color - 팀 색상 (hex)
     * @returns {Object} 생성된 팀
     */
    async create(name, color) {
        const tempId = Math.max(0, ...this.teams.map(t => t.id)) + 1;
        const newTeam = {
            id: tempId,
            name: name.trim(),
            color: color || teamColors[0].value,
            createdAt: new Date().toISOString().split('T')[0]
        };

        // 로컴 업데이트 먼저 (서버 실패도 화면에서 동작하도록)
        this.teams.push(newTeam);
        this.saveToStorage();
        this.notifyListeners();

        // 서버 전송: API에서 요구하는 필드로 변환하여 전송
        try {
            // branchId: 서버에 등록된 첫 번째 지점 ID 자동 조회 (undefined 방지를 위한 안전한 추출)
            let branchId = 1;
            try {
                const branchRes = await fetch(`${config.api.baseUrl}/branches`);
                const branchResult = await branchRes.json();
                if (branchResult.success && Array.isArray(branchResult.data) && branchResult.data.length > 0) {
                    // README: branches 응답 필드명은 'ID' (PascalCase)
                    const firstBranch = branchResult.data[0];
                    branchId = firstBranch.ID || firstBranch.id || firstBranch.branchId || 1;
                }
            } catch (e) {
                console.warn('[TeamService] 지점 목록 조회 실패, branchId=1 사용:', e);
            }

            const response = await fetch(`${config.api.baseUrl}/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    departmentName: newTeam.name,   // API 필드명 매칭
                    description: '',
                    phone: '',
                    branchId: branchId              // 연결된 지점 ID
                })
            });
            const result = await response.json();

            if (result.success) {
                // 서버 저장 성공 후 서버에서 할당된 실제 ID를 반영하도록 재동기화
                await this.syncWithServer();
                // 재동기화된 팔에서 방금 작성한 이름의 팀 찾기
                const savedTeam = this.teams.find(t => t.name === newTeam.name);
                return savedTeam || newTeam;
            } else {
                console.error('[TeamService] 서버 팀 생성 실패:', result.message);
            }
        } catch (e) {
            console.error('[TeamService] 서버 팀 생성 실패:', e);
        }

        return newTeam;
    }

    /**
     * 팀 삭제
     * @param {number} id - 팀 ID
     * @returns {boolean} 삭제 성공 여부
     */
    async delete(id) {
        const teamId = parseInt(id);
        const index = this.teams.findIndex(t => t.id === teamId);
        if (index === -1) return false;

        // 로컬 삭제
        this.teams.splice(index, 1);
        this.saveToStorage();
        this.notifyListeners();

        // 서버 삭제
        try {
            const response = await fetch(`${config.api.baseUrl}/departments/${teamId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            return result.success;
        } catch (e) {
            console.error('서버 팀 삭제 실패:', e);
            return false;
        }
    }

    /**
     * 팀 정보 수정
     * @param {number} id - 팀 ID
     * @param {Object} updates - 수정할 필드들
     * @returns {Object|null} 수정된 팀
     */
    update(id, updates) {
        const team = this.getById(id);
        if (!team) return null;

        Object.assign(team, updates);
        this.saveToStorage();
        this.notifyListeners();

        return team;
    }

    /**
     * 데이터 변경 리스너 등록
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * 리스너에게 변경 알림
     */
    notifyListeners() {
        this.listeners.forEach(cb => cb(this.teams));
    }
}

export const teamDataService = new TeamDataService();
