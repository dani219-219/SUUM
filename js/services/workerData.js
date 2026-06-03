/**
 * ============================================
 * 파일: workerData.js
 * 위치: js/services/workerData.js
 * 역할: 작업자 Mock 데이터 및 실시간 시뮬레이션 (팀별 관리)
 * 연결: Dashboard.js, WorkerDetail.js에서 import
 * ============================================
 */

import { config } from '../core/config.js';
import { teamDataService } from './teamData.js';

// 기본 작업자 데이터 없음 (서버에서 로드)
const defaultWorkers = [];

// 혈액형 목록
export const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * 서버 데이터를 클라이언트 형식으로 변환 (Mapping)
 */
function mapServerWorkerToClient(sw) {
    // departmentName을 기반으로 teamId 매핑 (서버에서 Department_id를 주지 않는 경우 대응)
    let teamId = sw.Department_id;
    if (!teamId && sw.departmentName) {
        const teams = teamDataService.getAll();
        // 대소문자, 공백 및 "팀" 접미사를 무시하고 매핑하는 fuzzy matching 적용
        const cleanName = (name) => name.replace(/팀$/, '').trim().toLowerCase();
        const foundTeam = teams.find(t => cleanName(t.name) === cleanName(sw.departmentName));
        if (foundTeam) {
            teamId = foundTeam.id;
        }
    }
    if (!teamId) {
        const teams = teamDataService.getAll();
        teamId = teams.length > 0 ? teams[0].id : 1;
    }

    // age(나이) 정보를 사용해 대략적인 birthDate 복원 (서버가 생년월일을 직접 돌려주지 않는 경우 대응)
    let birthDate = sw.birthDate || '';
    if (!birthDate && sw.age !== undefined && sw.age !== null) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - sw.age;
        birthDate = `${birthYear}-01-01`;
    }

    // Disease(콤마 분리 문자열)을 conditions 배열로 변환
    let conditions = [];
    if (sw.Disease) {
        conditions = sw.Disease.split(',')
            .map(c => c.trim())
            .filter(c => c && c !== '없음');
    } else if (sw.conditions) {
        conditions = Array.isArray(sw.conditions) ? sw.conditions : [sw.conditions];
    }

    return {
        id: sw.workerId || sw.ID,
        teamId: parseInt(teamId),
        name: sw.workerName || sw.name,
        gender: sw.Gender || sw.gender || '남성',
        nationality: sw.nationality || '대한민국',
        birthDate: birthDate,
        phoneNumber: sw.Phone || sw.phoneNumber || '',
        position: sw.Position || sw.position || '작업자',
        bloodType: sw.Blood_type || sw.bloodType || 'A+',
        conditions: conditions,
        emergencyContact: sw.Emergency_contact || sw.emergencyContact || '',
        emergencyName: sw.emergencyName || '',
        temperature: sw.temperature || 36.5,
        heartRate: sw.heartRate || 75,
        status: sw.status || 'normal',
        helmetId: sw.helmetId || 1 // 기본 헬멧 ID
    };
}

/**
 * 체온/심박수로 상태 계산
 */
function calculateStatus(temp, hr) {
    if (temp >= 38.5 || hr >= 120 || hr <= 50) return 'danger';
    if (temp >= 37.5 || hr >= 100 || hr <= 55) return 'warning';
    return 'normal';
}

/**
 * 랜덤 변동 적용 (시뮬레이션용)
 */
function applyRandomVariation(worker) {
    const tempVariation = (Math.random() - 0.5) * 0.3;
    const hrVariation = Math.floor((Math.random() - 0.5) * 10);

    const newTemp = Math.round((worker.temperature + tempVariation) * 10) / 10;
    const newHR = Math.max(60, Math.min(140, worker.heartRate + hrVariation));

    return {
        ...worker,
        temperature: Math.max(36.0, Math.min(40.0, newTemp)),
        heartRate: newHR,
        status: calculateStatus(newTemp, newHR)
    };
}

/**
 * WorkerDataService 클래스
 */
class WorkerDataService {
    constructor() {
        this.storageKey = `${config.storage.prefix}workers`;
        this.workers = []; // 로컬 캐시
        this.rawServerWorkers = []; // 서버에서 수신한 원본 데이터 보관
        this.listeners = new Set();
        this.simulationInterval = null;
        this.isSyncing = false;

        // 부서(팀) 데이터 갱신 시 작업자 목록의 teamId를 동적으로 재매핑
        teamDataService.subscribe(() => {
            if (this.rawServerWorkers && this.rawServerWorkers.length > 0) {
                console.log('[WorkerService] 부서 정보 갱신 감지 -> 작업자 데이터 재매핑');
                this.workers = this.rawServerWorkers.map(mapServerWorkerToClient);
                this.saveToStorage();
                this.notifyListeners();
            }
        });

        // 초기 데이터 로드 (로컬 -> 서버 순)
        this.init();
    }

    /**
     * 초기화: 로컬 데이터를 먼저 보여주고 서버와 동기화
     */
    async init() {
        this.workers = this.loadFromStorage();
        this.notifyListeners();
        await this.syncWithServer();
    }

    /**
     * 서버와 데이터 동기화
     */
    async syncWithServer() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            console.log('[WorkerService] 서버 데이터 동기화 시도...');

            // 부서(팀) 데이터가 먼저 로드되도록 대기하여 매핑 시 race condition 방지
            if (teamDataService.getAll().length === 0) {
                await teamDataService.syncWithServer();
            }

            const response = await fetch(`${config.api.baseUrl}/workers`);
            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                if (result.data.length > 0) {
                    this.rawServerWorkers = result.data; // 원본 서버 데이터 캐싱
                    // 서버 데이터를 클라이언트 형식으로 매핑하여 저장
                    this.workers = result.data.map(mapServerWorkerToClient);
                    console.log(`[WorkerService] ${this.workers.length}명의 작업자 로드 완료`);
                    this.saveToStorage();
                    this.notifyListeners();
                }
            }
        } catch (e) {
            console.error('[WorkerService] 서버 동기화 실패:', e);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * localStorage에서 데이터 로드
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('작업자 데이터 로드 실패:', e);
        }
        // 저장된 데이터 없으면 기본값 사용
        return [...defaultWorkers];
    }

    /**
     * localStorage에 데이터 저장
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.workers));
        } catch (e) {
            console.error('작업자 데이터 저장 실패:', e);
        }
    }

    /**
     * 전체 작업자 목록 반환
     */
    getAll() {
        return this.workers;
    }

    /**
     * ID로 작업자 조회
     */
    getById(id) {
        return this.workers.find(w => w.id === parseInt(id));
    }

    /**
     * 팀별 작업자 목록 반환
     * @param {number} teamId - 팀 ID
     * @returns {Array} 해당 팀 작업자 목록
     */
    getByTeamId(teamId) {
        return this.workers.filter(w => w.teamId === parseInt(teamId));
    }

    /**
     * 팀별 작업자 수 반환
     * @param {number} teamId - 팀 ID
     * @returns {number} 작업자 수
     */
    getCountByTeamId(teamId) {
        return this.workers.filter(w => w.teamId === parseInt(teamId)).length;
    }

    /**
     * 상태별 작업자 수 반환 (전체 또는 팀별)
     * @param {number|null} teamId - 팀 ID (없으면 전체)
     */
    getStatusCounts(teamId = null) {
        const targetWorkers = teamId !== null
            ? this.getByTeamId(teamId)
            : this.workers;

        return {
            normal: targetWorkers.filter(w => w.status === 'normal').length,
            warning: targetWorkers.filter(w => w.status === 'warning').length,
            danger: targetWorkers.filter(w => w.status === 'danger').length
        };
    }

    /**
     * 위험/주의 상태 작업자 목록
     */
    getAlertsWorkers() {
        return this.workers.filter(w => w.status !== 'normal');
    }

    /**
     * 새 작업자 추가
     * @param {Object} workerData - 작업자 데이터
     * @returns {Object} 생성된 작업자
     */
    async create(workerData) {
        // 서버에 먼저 전송 — 성공 시에만 로컬에 반영
        const tempWorker = {
            teamId: parseInt(workerData.teamId),
            name: workerData.name.trim(),
            gender: workerData.gender,
            nationality: workerData.nationality,
            birthDate: workerData.birthDate || '',
            phoneNumber: workerData.phoneNumber || '',
            position: workerData.position ? workerData.position.trim() : '',
            bloodType: workerData.bloodType,
            conditions: workerData.conditions || [],
            emergencyContact: workerData.emergencyContact || '',
            emergencyName: workerData.emergencyName || '',
            temperature: Math.round((36.5 + Math.random() * 0.5) * 10) / 10,
            heartRate: 70 + Math.floor(Math.random() * 15),
            status: 'normal',
            createdAt: new Date().toISOString()
        };

        // 1. 소속 팀(부서) ID가 올바른지 검증 (NaN 또는 0인 경우만 차단, 서버에서 최종 검증)
        if (!tempWorker.teamId || isNaN(tempWorker.teamId)) {
            throw new Error('올바른 소속 팀(부서)을 선택해 주세요.');
        }

        // 2. 혈액형 포맷팅 (DB 스키마는 A, B, AB, O 등 기본 영문명만 지원하므로 +, - 기호 제거)
        const formattedBloodType = tempWorker.bloodType
            ? tempWorker.bloodType.replace(/[+-]/g, '').trim()
            : 'A';

        // 서버 전송 페이로드 (README API 명세 기준 필드만 전송)
        const payload = {
            name: tempWorker.name,                                      // 필수
            birthDate: tempWorker.birthDate || '2000-01-01',            // 필수
            gender: tempWorker.gender,                                  // 필수
            position: tempWorker.position || '작업자',
            bloodType: formattedBloodType,
            emergencyContact: tempWorker.emergencyContact || null,      // undefined 대신 null
            disease: tempWorker.conditions.join(', ') || '없음',
            departmentId: tempWorker.teamId                             // 필수
        };
        console.log('[WorkerService] 작업자 추가 요청 페이로드:', payload);

        // 서버 전송 (성공해야만 로컬에 반영)
        const response = await fetch(`${config.api.baseUrl}/workers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = `서버 오류: ${response.status} ${response.statusText}`;
            try {
                const errData = await response.json();
                if (errData && errData.message) {
                    errorMessage = errData.message;
                }
            } catch (e) {
                // JSON 파싱 실패 시 기본 오류 메시지 사용
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '서버에서 작업자 생성을 거부했습니다.');
        }

        // 서버 성공 → 서버에서 실제 데이터 다시 동기화
        await this.syncWithServer();

        // 서버에서 받아온 최신 목록에서 방금 추가된 작업자 반환
        const created = this.workers[this.workers.length - 1];
        console.log('[WorkerService] 작업자 생성 성공:', created);
        return created;
    }

    /**
     * 작업자 삭제
     * @param {number} id - 작업자 ID
     * @returns {boolean} 삭제 성공 여부
     */
    async delete(id) {
        const workerId = parseInt(id);
        const index = this.workers.findIndex(w => w.id === workerId);
        if (index === -1) return false;

        // 서버 삭제 먼저 — 성공해야만 로컬에서도 제거
        const response = await fetch(`${config.api.baseUrl}/workers/${workerId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            let errorMessage = `서버 오류: ${response.status} ${response.statusText}`;
            try {
                const errData = await response.json();
                if (errData && errData.message) {
                    errorMessage = errData.message;
                }
            } catch (e) {
                // JSON 파싱 실패 시 기본 오류 메시지 사용
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '서버에서 삭제를 거부했습니다.');
        }

        // 서버 성공 → 로컬에서 제거
        this.workers.splice(index, 1);
        this.saveToStorage();
        this.notifyListeners();
        console.log(`[WorkerService] 작업자(id=${workerId}) 삭제 성공`);
        return true;
    }

    /**
     * 작업자 팀 변경
     * @param {number} workerId - 작업자 ID
     * @param {number} newTeamId - 새 팀 ID
     */
    async changeTeam(workerId, newTeamId) {
        const worker = this.getById(workerId);
        if (worker) {
            const teamId = parseInt(newTeamId);
            try {
                // 서버에 부서 ID 변경 반영 (PATCH)
                const response = await fetch(`${config.api.baseUrl}/workers/${workerId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        departmentId: teamId
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log(`[WorkerService] 작업자(id=${workerId}) 부서 변경 성공: ${teamId}`);
                    }
                }
            } catch (e) {
                console.error('[WorkerService] 부서 변경 서버 반영 실패:', e);
            }

            // 로컬 캐시 업데이트 및 알림
            worker.teamId = teamId;
            this.saveToStorage();
            this.notifyListeners();
        }
    }

    /**
     * 특정 작업자의 바이탈 정보(체온, 심박수) 강제 갱신
     * (상세 모달 등에서 실제 최신 센서 API 데이터를 불러왔을 때 동기화 용도)
     */
    updateWorkerVitals(workerId, temperature, heartRate) {
        const worker = this.getById(workerId);
        if (worker) {
            let changed = false;
            if (temperature !== null && temperature !== undefined && worker.temperature !== temperature) {
                worker.temperature = temperature;
                changed = true;
            }
            if (heartRate !== null && heartRate !== undefined && worker.heartRate !== heartRate) {
                worker.heartRate = heartRate;
                changed = true;
            }
            
            if (changed) {
                worker.status = calculateStatus(worker.temperature, worker.heartRate);
                this.saveToStorage();
                this.notifyListeners(); // 뒷 배경(WorkerDetail 등) 리렌더링 유발
            }
        }
    }

    /**
     * 실시간 시뮬레이션 시작 (서버 요청 주기를 5분으로 연장)
     */
    startSimulation(interval = 300000) {
        if (this.simulationInterval) return;

        // Dashboard.js 등에서 3000ms를 전달하더라도 서버 부하 방지를 위해 5분(300000ms)으로 적용합니다.
        const actualInterval = Math.max(300000, interval);

        this.simulationInterval = setInterval(async () => {
            // 각 작업자별로 최신 센서 데이터 가져오기
            const updatedWorkers = await Promise.all(this.workers.map(async (worker) => {
                try {
                    // README1.md: GET /sensors/:workerId/:helmetId
                    const helmetId = worker.helmetId || 1;
                    const response = await fetch(`${config.api.baseUrl}/sensors/${worker.id}/${helmetId}`);
                    const result = await response.json();

                    if (result.success && result.data && result.data.length > 0) {
                        const sensor = result.data[0];
                        // 0(danger)과 같은 falsy한 값의 누락을 방지하기 위해 보다 엄격하게 검증
                        const tempVal = (sensor.temperature !== undefined && sensor.temperature !== null) ? sensor.temperature : sensor.Temperature;
                        const hrVal = (sensor.heart_rate !== undefined && sensor.heart_rate !== null) ? sensor.heart_rate : sensor.Heart_rate;
                        const statusVal = (sensor.status !== undefined && sensor.status !== null) ? sensor.status : sensor.Status;

                        return {
                            ...worker,
                            temperature: tempVal !== undefined && tempVal !== null ? tempVal : worker.temperature,
                            heartRate: hrVal !== undefined && hrVal !== null ? hrVal : worker.heartRate,
                            status: this.mapStatus(statusVal)
                        };
                    }
                } catch (e) {
                    // 실패 시 랜덤 시뮬레이션
                }
                return applyRandomVariation(worker);
            }));

            this.workers = updatedWorkers;
            this.notifyListeners();
        }, actualInterval);
    }

    /**
     * 서버 상태 코드를 클라이언트 상태 문자열로 변환
     */
    mapStatus(status) {
        if (status === 0) return 'danger';
        if (status === 1) return 'warning';
        return 'normal';
    }

    /**
     * 시뮬레이션 중지
     */
    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }

    /**
     * 데이터 변경 리스너 등록
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * 리스너에게 변경 알림
     */
    notifyListeners() {
        this.listeners.forEach(cb => cb(this.workers));
    }
}

export const workerDataService = new WorkerDataService();

