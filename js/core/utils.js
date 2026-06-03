/**
 * Utils - 유틸리티 함수
 */

// DOM 셀렉터
export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => document.querySelectorAll(selector);

// HTML 생성
export const html = (strings, ...values) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
};

// 디바운스
export const debounce = (fn, delay = 300) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

// 날짜 포맷
export const formatDate = (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    const map = {
        YYYY: d.getFullYear(),
        MM: String(d.getMonth() + 1).padStart(2, '0'),
        DD: String(d.getDate()).padStart(2, '0'),
        HH: String(d.getHours()).padStart(2, '0'),
        mm: String(d.getMinutes()).padStart(2, '0')
    };
    return format.replace(/YYYY|MM|DD|HH|mm/g, m => map[m]);
};

// 숫자 포맷
export const formatNumber = (num) => {
    return new Intl.NumberFormat('ko-KR').format(num);
};

// 클래스 토글
export const toggleClass = (el, className) => el?.classList.toggle(className);
