/**
 * ============================================
 * 파일: WeatherWidget.js
 * 위치: js/components/WeatherWidget.js
 * 역할: 현재 날씨 정보 표시 위젯
 * 연결: Dashboard.js에서 import, weatherService.js 데이터 사용
 * ============================================
 */

import { weatherService } from '../services/weatherService.js';

export class WeatherWidget {
    constructor(container) {
        this.container = container;
        this.data = null;
    }

    /**
     * 날씨 데이터 로드 및 렌더링
     */
    async render() {
        this.data = await weatherService.fetchWeather();
        this.container.innerHTML = this.getHTML();
    }

    /**
     * HTML 생성
     */
    getHTML() {
        if (!this.data) {
            return `<div class="weather-widget">날씨 정보를 불러오는 중...</div>`;
        }

        const { temperature, apparentTemperature, humidity, heatLevel } = this.data;
        const icon = weatherService.getWeatherIcon(this.data.weatherCode);

        return `
            <div class="weather-widget">
                <div class="weather-widget__temp">
                    <span class="weather-widget__temp-value">${temperature.toFixed(1)}</span>
                    <span class="weather-widget__temp-unit">°C ${icon}</span>
                </div>
                <div class="weather-widget__details">
                    <div class="weather-widget__detail">
                        <span>🌡️</span>
                        <span>체감 ${apparentTemperature.toFixed(1)}°C</span>
                    </div>
                    <div class="weather-widget__detail">
                        <span>💧</span>
                        <span>습도 ${humidity}%</span>
                    </div>
                </div>
                <div class="weather-widget__status weather-widget__status--${heatLevel.color}">
                    ${heatLevel.level === 'danger' ? '🔴' : heatLevel.level === 'warning' ? '🟠' : '🟢'} 
                    ${heatLevel.label}
                </div>
            </div>
        `;
    }

    /**
     * 정적 렌더링 (컨테이너 없이)
     */
    static async renderStatic() {
        const data = await weatherService.fetchWeather();
        const icon = weatherService.getWeatherIcon(data.weatherCode);

        return `
            <div class="weather-widget">
                <div class="weather-widget__temp">
                    <span class="weather-widget__temp-value">${data.temperature.toFixed(1)}</span>
                    <span class="weather-widget__temp-unit">°C ${icon}</span>
                </div>
                <div class="weather-widget__details">
                    <div class="weather-widget__detail">
                        <span>🌡️</span>
                        <span>체감 ${data.apparentTemperature.toFixed(1)}°C</span>
                    </div>
                    <div class="weather-widget__detail">
                        <span>💧</span>
                        <span>습도 ${data.humidity}%</span>
                    </div>
                </div>
                <div class="weather-widget__status weather-widget__status--${data.heatLevel.color}">
                    ${data.heatLevel.level === 'danger' ? '🔴' : data.heatLevel.level === 'warning' ? '🟠' : '🟢'} 
                    ${data.heatLevel.label}
                </div>
            </div>
        `;
    }
}
