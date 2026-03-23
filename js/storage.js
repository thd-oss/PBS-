const Storage = {
    KEYS: {
        STUDENTS: 'pbs_v2_students',
        BEHAVIORS: 'pbs_v2_behaviors',
        LOGS: 'pbs_v2_logs',
        SETTINGS: 'pbs_v2_settings',
        ABC_TAGS: 'pbs_v2_abc_tags'
    },

    cache: {},

    save(key, data) {
        this.cache[key] = data;
        localStorage.setItem(key, JSON.stringify(data));
    },

    get(key) {
        if (this.cache[key] !== undefined) {
            return this.cache[key];
        }
        const data = localStorage.getItem(key);
        const parsed = data ? JSON.parse(data) : null;
        this.cache[key] = parsed;
        return parsed;
    },

    init() {
        if (!this.get(this.KEYS.STUDENTS)) {
            const defaultStudents = [{ id: 's1', name: '김철수', info: '1학년 2반' }];
            const defaultBehaviors = [
                { id: 'b1', studentId: 's1', name: '자리 이탈' },
                { id: 'b2', studentId: 's1', name: '불쑥 말하기' }
            ];
            this.save(this.KEYS.STUDENTS, defaultStudents);
            this.save(this.KEYS.BEHAVIORS, defaultBehaviors);
            this.save(this.KEYS.LOGS, []);
            this.save(this.KEYS.SETTINGS, { currentStudentId: 's1', currentBehaviorId: 'b1' });
        }

        // ABC 태그 초기화 (v7)
        if (!this.get(this.KEYS.ABC_TAGS)) {
            const defaultTags = {
                settingEvent: ['평소와 같음', '수면 부족', '약 미복용', '가정 내 사건', '날씨 영향', '피로함'],
                a: ['개별 과제 시작', '교사 지시', '교실 소음', '강화물 제거', '쉬는 시간 종료', '또래 갈등'],
                bDetail: ['언어적 폭발', '신체적 공격', '수업 이탈', '기물 파손', '지시 불이행'],
                c: ['교사의 훈육', '과제 중단/수정', '강화물 제거', '친구들의 반응', '타임아웃/격리', '무시하기']
            };
            this.save(this.KEYS.ABC_TAGS, defaultTags);
        }
    },

    addLog(logEntry) {
        const logs = this.get(this.KEYS.LOGS) || [];
        const entry = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: logEntry.timestamp || new Date().toISOString(),
            ...logEntry
        };
        // Don't duplicate timestamp if already provided
        logs.push(entry);
        this.save(this.KEYS.LOGS, logs);
        return entry;
    },

    removeLog(logId) {
        console.log('Storage.removeLog called with:', logId);
        const logs = this.get(this.KEYS.LOGS) || [];
        console.log('Current logs count:', logs.length);
        const filtered = logs.filter(l => l.id !== logId);
        console.log('Filtered logs count:', filtered.length);
        this.save(this.KEYS.LOGS, filtered);
    },

    updateLog(logId, updatedData) {
        const logs = this.get(this.KEYS.LOGS) || [];
        const index = logs.findIndex(l => l.id === logId);
        if (index !== -1) {
            logs[index] = { ...logs[index], ...updatedData };
            this.save(this.KEYS.LOGS, logs);
            return true;
        }
        return false;
    },

    getLogs() {
        return this.get(this.KEYS.LOGS) || [];
    },

    // Student CRUD
    addStudent(name, info) {
        const students = this.get(this.KEYS.STUDENTS) || [];
        const id = 's_' + Date.now();
        students.push({ id, name, info });
        this.save(this.KEYS.STUDENTS, students);
        return id;
    },

    updateStudent(id, name, info) {
        const students = this.get(this.KEYS.STUDENTS) || [];
        const s = students.find(s => s.id === id);
        if (s) { s.name = name; s.info = info; }
        this.save(this.KEYS.STUDENTS, students);
    },

    deleteStudent(id) {
        let students = this.get(this.KEYS.STUDENTS) || [];
        students = students.filter(s => s.id !== id);
        this.save(this.KEYS.STUDENTS, students);
        // Also remove behaviors & logs for this student
        let behaviors = this.get(this.KEYS.BEHAVIORS) || [];
        behaviors = behaviors.filter(b => b.studentId !== id);
        this.save(this.KEYS.BEHAVIORS, behaviors);
        let logs = this.get(this.KEYS.LOGS) || [];
        logs = logs.filter(l => l.studentId !== id);
        this.save(this.KEYS.LOGS, logs);
    },

    // Behavior CRUD
    addBehavior(studentId, name) {
        const behaviors = this.get(this.KEYS.BEHAVIORS) || [];
        const id = 'b_' + Date.now();
        behaviors.push({ id, studentId, name });
        this.save(this.KEYS.BEHAVIORS, behaviors);
        return id;
    },

    deleteBehavior(id) {
        let behaviors = this.get(this.KEYS.BEHAVIORS) || [];
        behaviors = behaviors.filter(b => b.id !== id);
        this.save(this.KEYS.BEHAVIORS, behaviors);
    },

    clearAll() {
        localStorage.clear();
        this.cache = {};
        this.init();
    },

    // ABC Tag Management (v7)
    getABCTags() {
        return this.get(this.KEYS.ABC_TAGS) || {};
    },

    addABCTag(category, tag) {
        const tags = this.getABCTags();
        if (!tags[category]) tags[category] = [];
        if (!tags[category].includes(tag)) {
            tags[category].push(tag);
            this.save(this.KEYS.ABC_TAGS, tags);
        }
    },

    removeABCTag(category, tag) {
        const tags = this.getABCTags();
        if (tags[category]) {
            tags[category] = tags[category].filter(t => t !== tag);
            this.save(this.KEYS.ABC_TAGS, tags);
        }
    }
};

Storage.init();
