/**
 * ============================================
 * 파일: theme-toggle-ui.js
 * 위치: js/features/theme/theme-toggle-ui.js
 * 역할: 테마 토글 버튼 UI 컴포넌트
 * 연결: 
 *   - theme-manager.js 사용
 *   - pages/Login.js에서 호출
 *   - 로그인 페이지 우측 상단에 표시
 * ============================================
 */

import { themeManager, THEME_DARK, THEME_LIGHT } from './theme-manager.js';

/**
 * 테마 토글 버튼 UI 클래스
 */
class ThemeToggleUI {
    constructor() {
        this.container = null;
        this.button = null;
    }

    /**
     * 테마 토글 버튼 렌더링
     * @param {HTMLElement} parentElement - 버튼을 추가할 부모 요소
     */
    render(parentElement) {
        if (!parentElement) {
            console.error('[ThemeToggleUI] Parent element is required');
            return;
        }

        // 기존 버튼이 있으면 제거
        this.destroy();

        // 컨테이너 생성
        this.container = document.createElement('div');
        this.container.className = 'theme-toggle-container';

        // 버튼 생성
        this.button = document.createElement('button');
        this.button.className = 'theme-toggle-btn';
        this.button.setAttribute('aria-label', 'Toggle theme');
        this.button.setAttribute('title', 'Toggle Dark/Light Mode');

        // 초기 아이콘 설정
        this.updateIcon();

        // 이벤트 리스너 등록
        this.button.addEventListener('click', this.handleClick.bind(this));

        // DOM 추가
        this.container.appendChild(this.button);
        parentElement.appendChild(this.container);

        // 테마 변경 리스너 등록
        themeManager.addListener(this.onThemeChange.bind(this));

        console.log('[ThemeToggleUI] Rendered');
    }

    /**
     * 버튼 클릭 핸들러
     */
    handleClick() {
        themeManager.toggleTheme();

        // 클릭 애니메이션
        this.button.classList.add('clicked');
        setTimeout(() => {
            this.button.classList.remove('clicked');
        }, 300);
    }

    /**
     * 테마 변경시 호출되는 콜백
     * @param {string} newTheme
     * @param {string} oldTheme
     */
    onThemeChange(newTheme, oldTheme) {
        this.updateIcon();
        console.log(`[ThemeToggleUI] Theme changed: ${oldTheme} → ${newTheme}`);
    }

    /**
     * 현재 테마에 맞는 아이콘 업데이트
     */
    updateIcon() {
        if (!this.button) return;

        const currentTheme = themeManager.getCurrentTheme();

        if (currentTheme === THEME_DARK) {
            // 다크모드 → 라이트모드로 전환 가능 (태양 아이콘 표시)
            this.button.innerHTML = `
                <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
            `;
            this.button.setAttribute('title', 'Switch to Light Mode');
        } else {
            // 라이트모드 → 다크모드로 전환 가능 (달 아이콘 표시)
            this.button.innerHTML = `
                <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            `;
            this.button.setAttribute('title', 'Switch to Dark Mode');
        }
    }

    /**
     * 버튼 제거
     */
    destroy() {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        this.container = null;
        this.button = null;
    }

    /**
     * 버튼 스타일을 동적으로 주입
     */
    static injectStyles() {
        // 이미 스타일이 주입되었는지 확인
        if (document.getElementById('theme-toggle-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'theme-toggle-styles';
        style.textContent = `
            /* 테마 토글 컨테이너 */
            .theme-toggle-container {
                position: absolute;
                top: 2rem;
                right: 2rem;
                z-index: 1000;
            }

            /* 테마 토글 버튼 */
            .theme-toggle-btn {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            /* 다크모드 버튼 스타일 */
            [data-theme="dark"] .theme-toggle-btn {
                background: rgba(255, 255, 255, 0.1);
                color: #00fff2;
                border: 1px solid rgba(0, 255, 242, 0.3);
            }

            [data-theme="dark"] .theme-toggle-btn:hover {
                background: rgba(0, 255, 242, 0.15);
                box-shadow: 0 0 20px rgba(0, 255, 242, 0.3);
                transform: scale(1.05);
            }

            /* 라이트모드 버튼 스타일 */
            [data-theme="light"] .theme-toggle-btn {
                background: rgba(255, 255, 255, 0.9);
                color: hsl(0, 0%, 15%);
                border: 1px solid rgba(0, 0, 0, 0.1);
            }

            [data-theme="light"] .theme-toggle-btn:hover {
                background: white;
                box-shadow: 0 6px 20px rgba(31, 38, 135, 0.2);
                transform: scale(1.05);
            }

            /* 클릭 애니메이션 */
            .theme-toggle-btn.clicked {
                transform: scale(0.9);
            }

            /* 아이콘 스타일 */
            .theme-icon {
                width: 24px;
                height: 24px;
                transition: transform 0.3s ease;
            }

            .theme-toggle-btn:hover .theme-icon {
                transform: rotate(15deg);
            }

            /* 반응형 (모바일) */
            @media (max-width: 768px) {
                .theme-toggle-container {
                    top: 1rem;
                    right: 1rem;
                }

                .theme-toggle-btn {
                    width: 44px;
                    height: 44px;
                }

                .theme-icon {
                    width: 20px;
                    height: 20px;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// 스타일 자동 주입
ThemeToggleUI.injectStyles();

// 싱글톤 인스턴스 생성 및 export
export const themeToggleUI = new ThemeToggleUI();
