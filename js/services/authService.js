/**
 * ============================================
 * 파일: authService.js
 * 위치: js/services/authService.js
 * 역할: 인증 및 권한 관리 서비스
 * 연결: Login.js, Dashboard.js에서 import
 * ============================================
 */

import { config } from '../core/config.js';

// 역할 상수
export const ROLES = {
    ADMIN: 'admin',           // 시스템 관리자
    SAFETY: 'safety',         // 총괄 안전관리자
    LEADER: 'leader'          // 현장 팀장
};

// 테스트 계정 데이터
const accounts = [
    {
        username: 'admin',
        password: 'admin123',
        accessCode: 'ADMIN-2024',
        role: ROLES.ADMIN,
        name: '시스템 관리자',
        teamId: null
    },
    {
        username: 'safety',
        password: 'safety123',
        accessCode: 'SAFETY-2024',
        role: ROLES.SAFETY,
        name: '총괄 안전관리자',
        teamId: null
    },
    {
        username: 'leader1',
        password: 'leader123',
        accessCode: 'TEAM1-2024',
        role: ROLES.LEADER,
        name: '1팀 팀장',
        teamId: 1
    },
    {
        username: 'leader2',
        password: 'leader123',
        accessCode: 'TEAM2-2024',
        role: ROLES.LEADER,
        name: '2팀 팀장',
        teamId: 2
    }
];

/**
 * AuthService 클래스
 */
class AuthService {
    constructor() {
        this.storageKey = `${config.storage.prefix}auth`;
        this.currentUser = this.loadSession();
    }

    /**
     * 로그인
     * @param {string} username - 아이디
     * @param {string} password - 비밀번호
     * @param {string} accessCode - 접속 코드
     * @param {boolean} rememberMe - 로그인 상태 유지
     * @returns {Object} { success, user, message }
     */
    login(username, password, accessCode, rememberMe = false) {
        // 계정 찾기
        const account = accounts.find(
            acc => acc.username === username &&
                acc.password === password &&
                acc.accessCode === accessCode
        );

        if (!account) {
            return {
                success: false,
                message: '아이디, 비밀번호 또는 접속 코드가 올바르지 않습니다.'
            };
        }

        // 세션 정보 생성
        const user = {
            username: account.username,
            name: account.name,
            role: account.role,
            teamId: account.teamId,
            loginTime: new Date().toISOString()
        };

        this.currentUser = user;

        // 로그인 상태 저장
        if (rememberMe) {
            this.saveSession(user);
        } else {
            // 세션 스토리지에만 저장 (브라우저 닫으면 삭제)
            sessionStorage.setItem(this.storageKey, JSON.stringify(user));
        }

        console.log(`[Auth] 로그인 성공: ${user.name} (${user.role})`);

        return {
            success: true,
            user,
            message: `${user.name}님, 환영합니다.`
        };
    }

    /**
     * 로그아웃
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(this.storageKey);
        console.log('[Auth] 로그아웃');
    }

    /**
     * 로그인 여부 확인
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * 현재 사용자 정보 반환
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 세션 저장 (localStorage)
     */
    saveSession(user) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(user));
        } catch (e) {
            console.error('세션 저장 실패:', e);
        }
    }

    /**
     * 세션 로드
     */
    loadSession() {
        try {
            // localStorage 먼저 확인
            let stored = localStorage.getItem(this.storageKey);
            if (!stored) {
                // sessionStorage 확인
                stored = sessionStorage.getItem(this.storageKey);
            }

            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('세션 로드 실패:', e);
        }
        return null;
    }

    /**
     * 권한 체크
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;

        const permissions = {
            // 시스템 설정
            'system.manage': [ROLES.ADMIN],

            // 작업자 관리
            'worker.create': [ROLES.ADMIN],
            'worker.update': [ROLES.ADMIN],
            'worker.delete': [ROLES.ADMIN],
            'worker.view': [ROLES.ADMIN, ROLES.SAFETY, ROLES.LEADER],

            // 팀 관리
            'team.create': [ROLES.ADMIN],
            'team.update': [ROLES.ADMIN],
            'team.delete': [ROLES.ADMIN],
            'team.view': [ROLES.ADMIN, ROLES.SAFETY, ROLES.LEADER],

            // 민감정보 (평상시)
            'sensitive.view': [ROLES.ADMIN],

            // 민감정보 (비상시)
            'sensitive.emergency': [ROLES.ADMIN, ROLES.SAFETY, ROLES.LEADER]
        };

        const allowedRoles = permissions[permission] || [];
        return allowedRoles.includes(this.currentUser.role);
    }

    /**
     * 민감정보 열람 가능 여부
     * @param {Object} worker - 작업자 정보
     * @param {boolean} isEmergency - 비상 상황 여부 (danger 상태)
     */
    canViewSensitiveInfo(worker, isEmergency = false) {
        if (!this.currentUser) return false;

        // 관리자는 항상 가능
        if (this.currentUser.role === ROLES.ADMIN) {
            return true;
        }

        // 비상 상황일 때
        if (isEmergency) {
            // 안전관리자: 모두 가능
            if (this.currentUser.role === ROLES.SAFETY) {
                return true;
            }
            // 팀장: 본인 팀만 가능
            if (this.currentUser.role === ROLES.LEADER) {
                return worker.teamId === this.currentUser.teamId;
            }
        }

        return false;
    }

    /**
     * 팀 접근 권한 확인
     * @param {number} teamId - 팀 ID
     */
    canAccessTeam(teamId) {
        if (!this.currentUser) return false;

        // 관리자, 안전관리자는 모든 팀 접근 가능
        if (this.currentUser.role === ROLES.ADMIN ||
            this.currentUser.role === ROLES.SAFETY) {
            return true;
        }

        // 팀장은 본인 팀만
        if (this.currentUser.role === ROLES.LEADER) {
            return this.currentUser.teamId === teamId;
        }

        return false;
    }
}

export const authService = new AuthService();
