/**
 * ============================================
 * 파일: app.js
 * 위치: js/core/app.js
 * 역할: 앱 초기화 및 라우팅 관리 (인증 포함)
 * 연결: 
 *   - main.js에서 초기화
 *   - Login.js, Dashboard.js, WorkerDetail.js 페이지 라우팅
 * ============================================
 */

import { config } from './config.js';
import { authService } from '../services/authService.js';

class App {
    constructor() {
        this.currentPage = null;
        this.container = null;
    }

    /**
     * 앱 초기화
     */
    async init() {
        console.log(`[App] Initializing ${config.appName}`);

        this.container = document.querySelector('#app');

        // 라우터 설정
        this.setupRouter();

        // 초기 라우트 처리
        const initialHash = window.location.hash || '#/login';
        await this.handleRoute(initialHash);
    }

    /**
     * 라우터 설정
     */
    setupRouter() {
        window.addEventListener('hashchange', async () => {
            await this.handleRoute(window.location.hash);
        });
    }

    /**
     * 라우트 핸들링
     */
    async handleRoute(hash) {
        // 기존 페이지 정리
        if (this.currentPage?.destroy) {
            this.currentPage.destroy();
        }

        // 라우트 파싱
        const route = hash.replace('#/', '') || 'login';

        // 인증 확인 (로그인 페이지 제외)
        if (route !== 'login' && !authService.isAuthenticated()) {
            console.log('[App] 인증되지 않음 - 로그인 페이지로 리다이렉트');
            window.location.hash = '#/login';
            return;
        }

        try {
            // 로그인 페이지
            if (route === 'login') {
                // 이미 로그인되어 있으면 대시보드로
                if (authService.isAuthenticated()) {
                    window.location.hash = '#/dashboard';
                    return;
                }
                const { Login } = await import('../pages/Login.js');
                this.currentPage = new Login(this.container);
            }
            // 작업자 상세 페이지 (/worker/:id)
            else if (route.startsWith('worker/')) {
                const workerId = route.split('/')[1];
                const { WorkerDetail } = await import('../pages/WorkerDetail.js');
                this.currentPage = new WorkerDetail(this.container, workerId);
            }
            // 대시보드
            else if (route === 'dashboard' || route === '') {
                const { Dashboard } = await import('../pages/Dashboard.js');
                this.currentPage = new Dashboard(this.container);
            }
            // 로그아웃
            else if (route === 'logout') {
                authService.logout();
                window.location.hash = '#/login';
                return;
            }
            // 기본: 대시보드
            else {
                const { Dashboard } = await import('../pages/Dashboard.js');
                this.currentPage = new Dashboard(this.container);
            }

            // 페이지 렌더링
            await this.currentPage.render();

        } catch (error) {
            console.error('[App] 페이지 로드 실패:', error);
            this.renderError(error);
        }
    }

    /**
     * 에러 페이지 렌더링
     */
    renderError(error) {
        this.container.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 1rem;">
                <h1 style="color: var(--neon-red);">오류 발생</h1>
                <p style="color: var(--text-secondary);">${error.message}</p>
                <button class="btn btn--primary" onclick="window.location.hash='#/dashboard'">
                    대시보드로 이동
                </button>
            </div>
        `;
    }

    /**
     * 페이지 이동
     */
    navigateTo(hash) {
        window.location.hash = hash;
    }
}

export const app = new App();

