/**
 * ============================================
 * 파일: Login.js
 * 위치: js/pages/Login.js
 * 역할: 로그인 페이지 (3단계 인증)
 * 연결: 
 *   - app.js에서 라우팅
 *   - login.css, login-light.css 스타일 적용
 *   - theme-manager.js, theme-toggle-ui.js 테마 관리
 * ============================================
 */

import { authService } from '../services/authService.js';
import { themeManager } from '../features/theme/theme-manager.js';
import { themeToggleUI } from '../features/theme/theme-toggle-ui.js';

export class Login {
    constructor(container) {
        this.container = container;
    }

    /**
     * 페이지 렌더링
     */
    async render() {
        this.container.innerHTML = `
            <div class="login-page">
                <div class="login-background"></div>
                
                <!-- 좌우 2분할 컨테이너 -->
                <div class="login-split-container">
                    <!-- 왼쪽: 로그인 폼 -->
                    <div class="login-left">
                        <div class="login-form-wrapper">
                            <!-- 헤더 -->
                            <div class="login-header">
                                <h1 class="login-title">SUUM</h1>
                                <p class="login-subtitle">스마트 안전 모니터링 시스템</p>
                            </div>

                            <!-- 로그인 폼 -->
                            <form class="login-form" id="loginForm">
                                <div class="form-group">
                                    <label class="form-label" for="username">아이디</label>
                                    <input type="text" 
                                           class="form-input" 
                                           id="username" 
                                           name="username"
                                           placeholder="아이디를 입력하세요"
                                           required
                                           autocomplete="username"
                                           autofocus>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="password">비밀번호</label>
                                    <div class="password-input-wrapper">
                                        <input type="password" 
                                               class="form-input" 
                                               id="password" 
                                               name="password"
                                               placeholder="비밀번호를 입력하세요"
                                               required
                                               autocomplete="current-password">
                                        <button type="button" class="password-toggle" id="passwordToggle" title="비밀번호 보기/숨기기">
                                            👁️
                                        </button>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="accessCode">접속 코드</label>
                                    <input type="text" 
                                           class="form-input" 
                                           id="accessCode" 
                                           name="accessCode"
                                           placeholder="회사에서 발급받은 접속 코드"
                                           required
                                           autocomplete="off">
                                </div>

                                <div class="form-group form-group--checkbox">
                                    <label class="checkbox-label">
                                        <input type="checkbox" 
                                               class="checkbox-input" 
                                               id="rememberMe" 
                                               name="rememberMe">
                                        <span class="checkbox-text">로그인 상태 유지</span>
                                    </label>
                                </div>

                                <!-- 에러 메시지 -->
                                <div class="login-error" id="loginError"></div>

                                <!-- 로그인 버튼 -->
                                <button type="submit" class="btn btn--login" id="loginBtn">
                                    <span class="btn__text">로그인</span>
                                </button>
                            </form>

                            <!-- 테스트 계정 안내 -->
                            <div class="login-help">
                                <details class="login-help__details">
                                    <summary class="login-help__summary">테스트 계정 정보</summary>
                                    <div class="login-help__content">
                                        <table class="account-table">
                                            <thead>
                                                <tr>
                                                    <th>역할</th>
                                                    <th>아이디</th>
                                                    <th>비밀번호</th>
                                                    <th>접속 코드</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>시스템 관리자</td>
                                                    <td>admin</td>
                                                    <td>admin123</td>
                                                    <td>ADMIN-2024</td>
                                                </tr>
                                                <tr>
                                                    <td>총괄 안전관리자</td>
                                                    <td>safety</td>
                                                    <td>safety123</td>
                                                    <td>SAFETY-2024</td>
                                                </tr>
                                                <tr>
                                                    <td>1팀 팀장</td>
                                                    <td>leader1</td>
                                                    <td>leader123</td>
                                                    <td>TEAM1-2024</td>
                                                </tr>
                                                <tr>
                                                    <td>2팀 팀장</td>
                                                    <td>leader2</td>
                                                    <td>leader123</td>
                                                    <td>TEAM2-2024</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            </div>

                            <!-- 버전 정보 -->
                            <div class="login-footer">
                                <p>v1.0.0 © 2026 Aegis Connect</p>
                            </div>
                        </div>
                    </div>

                    <!-- 오른쪽: 로고 -->
                    <div class="login-right">
                        <div class="login-logo-container">
                            <img src="assets/icons/SUUM-icon.svg" class="login-logo-image" alt="SUUM Logo">
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 테마 초기화
        themeManager.init();

        // 테마 토글 버튼 렌더링 (로그인 페이지에 추가)
        const loginPage = this.container.querySelector('.login-page');
        if (loginPage) {
            themeToggleUI.render(loginPage);
        }

        this.bindEvents();
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        const form = this.container.querySelector('#loginForm');
        const loginBtn = this.container.querySelector('#loginBtn');
        const passwordToggle = this.container.querySelector('#passwordToggle');
        const passwordInput = this.container.querySelector('#password');

        // 비밀번호 보기/숨기기 토글
        if (passwordToggle && passwordInput) {
            passwordToggle.addEventListener('click', () => {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    passwordToggle.textContent = '🙈';
                } else {
                    passwordInput.type = 'password';
                    passwordToggle.textContent = '👁️';
                }
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const accessCode = document.getElementById('accessCode').value.trim();
            const rememberMe = document.getElementById('rememberMe').checked;

            // 버튼 비활성화
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="btn__text">로그인 중...</span>';

            // 짧은 딜레이 (로딩 효과)
            await new Promise(resolve => setTimeout(resolve, 500));

            // 로그인 시도
            const result = authService.login(username, password, accessCode, rememberMe);

            if (result.success) {
                // 성공 메시지 표시
                this.showSuccess(result.message);

                // 대시보드로 이동
                setTimeout(() => {
                    window.location.hash = '#/dashboard';
                }, 800);
            } else {
                // 에러 표시
                this.showError(result.message);

                // 버튼 활성화
                loginBtn.disabled = false;
                loginBtn.innerHTML = `
                    <span class="btn__icon">🛡️</span>
                    <span class="btn__text">로그인</span>
                `;
            }
        });
    }

    /**
     * 에러 메시지 표시
     */
    showError(message) {
        const errorEl = this.container.querySelector('#loginError');
        errorEl.textContent = message;
        errorEl.classList.add('login-error--visible');

        setTimeout(() => {
            errorEl.classList.remove('login-error--visible');
        }, 5000);
    }

    /**
     * 성공 메시지 표시
     */
    showSuccess(message) {
        const errorEl = this.container.querySelector('#loginError');
        errorEl.textContent = message;
        errorEl.classList.add('login-error--visible', 'login-error--success');

        setTimeout(() => {
            errorEl.classList.remove('login-error--visible', 'login-error--success');
        }, 5000);
    }



    /**
     * 페이지 정리
     */
    destroy() {
        // 컴포넌트 해제 로직
    }
}
