/**
 * ============================================
 * 파일: sensorData.js
 * 위치: js/services/sensorData.js
 * 역할: 센서 데이터 API 호출 전담 서비스
 * 연결: HeartRateMonitor.js에서 import
 * 
 * 기존 workerDataService와 완전히 분리된 독립 모듈입니다.
 * 작업자 데이터 로직에는 어떠한 영향도 주지 않습니다.
 * ============================================
 */

import { config } from '../core/config.js';

class SensorDataService {
    /**
     * 최근 센서 데이터 조회
     * API: GET /sensors/:workerId/:helmetId
     * 
     * @param {number} workerId - 작업자 ID
     * @param {number} helmetId - 헬멧 ID (기본값 1)
     * @returns {Object|null} 최신 센서 데이터 또는 null
     * 
     * 반환 예시:
     * {
     *   heart_rate: 82,
     *   temperature: 36.5,
     *   status: 2,
     *   updated_at: "2026-05-16T12:00:00.000Z"
     * }
     */
    async fetchLatestSensorData(workerId, helmetId = 1) {
        try {
            const response = await fetch(
                `${config.api.baseUrl}/sensors/${workerId}/${helmetId}`
            );

            if (!response.ok) {
                console.warn(`[SensorService] 최신 센서 조회 실패: ${response.status}`);
                return null;
            }

            const result = await response.json();

            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                const sensor = result.data[0];
                return {
                    heartRate: sensor.heart_rate ?? sensor.Heart_rate ?? null,
                    temperature: sensor.temperature ?? sensor.Temperature ?? null,
                    status: sensor.status ?? sensor.Status ?? null,
                    updatedAt: sensor.updated_at ?? sensor.Updated_at ?? null
                };
            }

            return null;
        } catch (e) {
            console.warn('[SensorService] 최신 센서 데이터 조회 실패:', e.message);
            return null;
        }
    }

    /**
     * 특정 작업자의 센서 기록 조회 (시계열 그래프용)
     * API: GET /sensors/workers/:workerId
     * 
     * @param {number} workerId - 작업자 ID
     * @returns {Array} 센서 기록 배열 (빈 배열 가능)
     * 
     * 반환 배열 요소 예시:
     * {
     *   heartRate: 82,
     *   temperature: 36.5,
     *   measuredAt: Date 객체,
     *   status: 2
     * }
     */
    async fetchSensorHistory(workerId) {
        try {
            const response = await fetch(
                `${config.api.baseUrl}/sensors/workers/${workerId}`
            );

            if (!response.ok) {
                console.warn(`[SensorService] 센서 기록 조회 실패: ${response.status}`);
                return [];
            }

            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                return result.data
                    .map(record => {
                        // API 응답 필드명 매핑 (대소문자 혼용 대응)
                        const hr = record.Heart_rate ?? record.heart_rate ?? null;
                        const temp = record.Temperature ?? record.temperature ?? null;
                        const measuredAt = record.Measured_at ?? record.measured_at ?? null;
                        const status = record.Status ?? record.status ?? null;

                        return {
                            heartRate: this._validateNumber(hr),
                            temperature: this._validateNumber(temp),
                            measuredAt: measuredAt ? new Date(measuredAt) : null,
                            status: status
                        };
                    })
                    // 유효한 시간 데이터가 있는 레코드만 필터링
                    .filter(r => r.measuredAt && !isNaN(r.measuredAt.getTime()))
                    // 시간순 정렬 (오래된 → 최신)
                    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
            }

            return [];
        } catch (e) {
            console.warn('[SensorService] 센서 기록 조회 실패:', e.message);
            return [];
        }
    }

    /**
     * 숫자 유효성 검증 헬퍼
     * null, undefined, NaN → null 반환
     * @private
     */
    _validateNumber(value) {
        if (value === null || value === undefined) return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
    }
}

export const sensorDataService = new SensorDataService();
