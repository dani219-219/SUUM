/**
 * ============================================
 * 파일: main.js
 * 위치: js/main.js
 * 역할: JavaScript 진입점 - 앱 초기화
 * 연결: index.html에서 로드, app.js 초기화
 * ============================================
 */

import { app } from './core/app.js';

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
