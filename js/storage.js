const Storage = {
    KEYS: {
        STUDENTS: 'pbs_v2_students',
        BEHAVIORS: 'pbs_v2_behaviors',
        LOGS: 'pbs_v2_logs',
        SETTINGS: 'pbs_v2_settings'
    },

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
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
        const logs = this.get(this.KEYS.LOGS) || [];
        const filtered = logs.filter(l => l.id !== logId);
        this.save(this.KEYS.LOGS, filtered);
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
        this.init();
    }
};

Storage.init();
