/**
 * ============================================
 * 파일: theme-manager.js
 * 위치: js/features/theme/theme-manager.js
 * 역할: 테마 상태 관리 및 전환 로직
 * 연결: 
 *   - theme-toggle-ui.js에서 사용
 *   - app.js에서 초기화
 *   - localStorage에 테마 저장
 * ============================================
 */

const THEME_KEY = 'aegis-theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const THEME_ATTRIBUTE = 'data-theme';

/**
 * 테마 관리 클래스
 */
class ThemeManager {
    constructor() {
        this.currentTheme = THEME_LIGHT;
        this.listeners = [];
    }

    /**
     * 테마 초기화 (저장된 테마 불러오기)
     */
    init() {
        const savedTheme = this.getSavedTheme();
        this.setTheme(savedTheme, false); // 초기화시 이벤트 발생 안함
        console.log(`[ThemeManager] Initialized with theme: ${savedTheme}`);
    }

    /**
     * 저장된 테마 가져오기
     * @returns {string} 'dark' 또는 'light'
     */
    getSavedTheme() {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            return saved === THEME_DARK ? THEME_DARK : THEME_LIGHT;
        } catch (error) {
            console.warn('[ThemeManager] Failed to read from localStorage:', error);
            return THEME_LIGHT;
        }
    }

    /**
     * 현재 테마 반환
     * @returns {string} 'dark' 또는 'light'
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 테마 설정
     * @param {string} theme - 'dark' 또는 'light'
     * @param {boolean} notify - 리스너에게 알림 여부 (기본: true)
     */
    setTheme(theme, notify = true) {
        // 유효성 검사
        if (theme !== THEME_DARK && theme !== THEME_LIGHT) {
            console.warn(`[ThemeManager] Invalid theme: ${theme}. Using ${THEME_DARK}`);
            theme = THEME_DARK;
        }

        // 테마 변경이 없으면 종료
        if (theme === this.currentTheme && notify === false) {
            return;
        }

        const previousTheme = this.currentTheme;
        this.currentTheme = theme;

        // HTML 요소에 data-theme 속성 설정
        document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

        // localStorage에 저장
        this.saveTheme(theme);

        console.log(`[ThemeManager] Theme changed: ${previousTheme} → ${theme}`);

        // 리스너에게 알림
        if (notify) {
            this.notifyListeners(theme, previousTheme);
        }
    }

    /**
     * 테마 localStorage에 저장
     * @param {string} theme
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (error) {
            console.warn('[ThemeManager] Failed to save to localStorage:', error);
        }
    }

    /**
     * 테마 토글 (다크 ↔ 라이트)
     */
    toggleTheme() {
        const newTheme = this.currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        this.setTheme(newTheme, true);
    }

    /**
     * 테마 변경 리스너 등록
     * @param {Function} callback - (newTheme, oldTheme) => void
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    /**
     * 테마 변경 리스너 제거
     * @param {Function} callback
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    /**
     * 모든 리스너에게 테마 변경 알림
     * @param {string} newTheme
     * @param {string} oldTheme
     */
    notifyListeners(newTheme, oldTheme) {
        this.listeners.forEach(listener => {
            try {
                listener(newTheme, oldTheme);
            } catch (error) {
                console.error('[ThemeManager] Listener error:', error);
            }
        });
    }

    /**
     * 다크모드 여부 확인
     * @returns {boolean}
     */
    isDark() {
        return this.currentTheme === THEME_DARK;
    }

    /**
     * 라이트모드 여부 확인
     * @returns {boolean}
     */
    isLight() {
        return this.currentTheme === THEME_LIGHT;
    }
}

// 싱글톤 인스턴스 생성 및 export
export const themeManager = new ThemeManager();

// 상수 export
export { THEME_DARK, THEME_LIGHT };
