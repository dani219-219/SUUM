/**
 * ============================================
 * 파일: weatherService.js
 * 위치: js/services/weatherService.js
 * 역할: Open-Meteo API 연동 - 실시간 날씨 데이터
 * 연결: WeatherWidget.js, Dashboard.js에서 import
 * ============================================
 */

class WeatherService {
    constructor() {
        // 서울 좌표 (기본값)
        this.latitude = 37.5665;
        this.longitude = 126.9780;
        this.cache = null;
        this.cacheTime = null;
        this.cacheDuration = 5 * 60 * 1000; // 5분 캐시
    }

    /**
     * Open-Meteo API로 현재 날씨 조회
     */
    async fetchWeather() {
        // 캐시 확인
        if (this.cache && this.cacheTime && (Date.now() - this.cacheTime < this.cacheDuration)) {
            return this.cache;
        }

        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.latitude}&longitude=${this.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=Asia/Seoul`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('날씨 데이터를 가져올 수 없습니다');

            const data = await response.json();

            const weather = {
                temperature: data.current.temperature_2m,
                apparentTemperature: data.current.apparent_temperature,
                humidity: data.current.relative_humidity_2m,
                weatherCode: data.current.weather_code,
                heatLevel: this.calculateHeatLevel(data.current.temperature_2m),
                lastUpdated: new Date()
            };

            this.cache = weather;
            this.cacheTime = Date.now();

            return weather;
        } catch (error) {
            console.error('[WeatherService] API 오류:', error);
            // API 실패 시 Mock 데이터 반환
            return this.getMockWeather();
        }
    }

    /**
     * 폭염 단계 계산
     */
    calculateHeatLevel(temperature) {
        if (temperature >= 35) return { level: 'danger', label: '폭염경보', color: 'danger' };
        if (temperature >= 33) return { level: 'warning', label: '폭염주의보', color: 'warning' };
        if (temperature >= 30) return { level: 'caution', label: '무더위', color: 'warning' };
        return { level: 'normal', label: '보통', color: 'normal' };
    }

    /**
     * Mock 데이터 (API 실패 시 또는 테스트용)
     */
    getMockWeather() {
        return {
            temperature: 35.2,
            apparentTemperature: 38.5,
            humidity: 65,
            weatherCode: 1,
            heatLevel: { level: 'danger', label: '폭염경보', color: 'danger' },
            lastUpdated: new Date()
        };
    }

    /**
     * 날씨 코드를 아이콘으로 변환
     */
    getWeatherIcon(code) {
        if (code <= 3) return '☀️';
        if (code <= 48) return '☁️';
        if (code <= 67) return '🌧️';
        if (code <= 77) return '❄️';
        if (code <= 82) return '🌧️';
        if (code <= 86) return '🌨️';
        return '⛈️';
    }
}

export const weatherService = new WeatherService();
