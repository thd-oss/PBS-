const App = {
    currentView: 'record-panel',
    currentSubTab: 'abc',
    selectedLogs: [],

    escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // ABC 기록용 임시 상태
    abcSession: {
        settingEvent: [],
        a: [],
        bDetail: [],
        c: [],
        settingEventCustom: '',
        aCustom: '',
        bDetailCustom: '',
        cCustom: ''
    },
    session: null,

    // Quick 기록용 상태
    quickTimer: {
        startTime: null,
        running: false,
        timerId: null,
        longPressTimer: null
    },
    // 통합 기록 시점 상태
    recordContext: {
        date: '',
        time: '',
        period: '',
        subject: ''
    },
    historySelectedStudentId: null,

    init() {
        this.session = Storage.get(Storage.KEYS.SETTINGS);
        this.historySelectedStudentId = this.session.currentStudentId;

        // 날짜/시간 초기화
        this.recordContext.date = this.getNowDate();
        this.recordContext.time = this.getNowTime();
        this.recordContext.period = this.getCurrentPeriod();

        this.cacheDOM();
        this.bindEvents();
        this.updateHeaderInfo();
        this.renderCurrentView();
    },

    cacheDOM() {
        this.headerContext = document.getElementById('global-context-header');
        this.recordContent = document.getElementById('record-content');
        this.targetStudent = document.getElementById('target-student');
        this.targetBehavior = document.getElementById('target-behavior');
        this.modal = document.getElementById('modal-container');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.modalCancel = document.getElementById('modal-cancel');
        this.modalSave = document.getElementById('modal-save');
    },

    bindEvents() {
        this.modalCancel.onclick = () => this.closeModal();

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.switchView(item.getAttribute('data-view')));
        });

        // Global Action Delegation
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.getAttribute('data-action');
            const id = target.getAttribute('data-id');
            const group = target.getAttribute('data-group');
            const value = target.getAttribute('data-value');

            console.log('Action Clicked:', action, { id, group, value });

            if (action === 'switch-sub-tab') {
                this.switchSubTab(target.getAttribute('data-sub'));
            } else if (action === 'history-edit') {
                this.toggleEditLog(id);
            } else if (action === 'history-delete') {
                this.deleteLogConfirm(id);
            } else if (action === 'history-save-edit') {
                this.saveLogEdit(id);
            } else if (action === 'history-cancel-edit') {
                this.toggleEditLog(null);
            } else if (action === 'export-csv') {
                this.exportCSV();
            } else if (action === 'select-chip') {
                this.selectChip(group, value);
            } else if (action === 'add-abc-tag') {
                this.addABCTagPrompt(group);
            } else if (action === 'remove-abc-tag') {
                e.stopPropagation();
                this.removeABCTag(group, value);
            } else if (action === 'add-student') {
                this.addStudentPrompt();
            } else if (action === 'edit-student') {
                e.stopPropagation();
                this.editStudent(id);
            } else if (action === 'remove-student') {
                e.stopPropagation();
                this.removeStudent(id);
            } else if (action === 'add-behavior') {
                this.addBehaviorPrompt(id);
            } else if (action === 'remove-behavior') {
                e.stopPropagation();
                this.removeBehavior(id);
            } else if (action === 'select-behavior') {
                const sid = target.getAttribute('data-student-id');
                this.selectBehavior(sid, id);
            } else if (action === 'clear-data') {
                this.clearData();
            } else if (action === 'save-abc') {
                this.saveABC();
            } else if (action === 'capture-report') {
                this.captureReport();
            } else if (action === 'generate-ai-prompt') {
                this.generateAIPrompt();
            }
        });
    },

    switchView(viewId) {
        this.currentView = viewId;
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === viewId);
        });
        this.renderCurrentView();
    },

    switchSubTab(subId) {
        this.currentSubTab = subId;
        document.querySelectorAll('.sub-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-sub') === subId);
        });
        this.renderRecordPanel();
    },

    updateHeaderInfo() {
        const students = Storage.get(Storage.KEYS.STUDENTS);
        const behaviors = Storage.get(Storage.KEYS.BEHAVIORS);
        const student = students ? students.find(s => s.id === this.session.currentStudentId) : null;
        const behavior = behaviors ? behaviors.find(b => b.id === this.session.currentBehaviorId) : null;
        this.targetStudent.innerText = student ? student.name : '학생 없음';
        this.targetBehavior.innerText = behavior ? behavior.name : '행동 없음';
    },

    getTargetLogs() {
        return Storage.getLogs().filter(l =>
            l.studentId === this.session.currentStudentId &&
            l.behaviorId === this.session.currentBehaviorId
        );
    },

    getTodayLogsForCurrentTarget() {
        const todayStr = new Date().toDateString();
        return this.getTargetLogs().filter(l => new Date(l.timestamp).toDateString() === todayStr);
    },

    renderCurrentView() {
        this.renderSharedContext();
        if (this.currentView === 'record-panel') {
            this.renderRecordPanel();
        }
        else if (this.currentView === 'insight-panel') this.renderInsightPanel();
        else if (this.currentView === 'history-panel') this.renderHistoryPanel();
        else if (this.currentView === 'settings-panel') this.renderSettingsPanel();
    },

    // ========================
    //  RECORD PANEL
    // ========================

    renderRecordPanel() {
        let html = '';
        switch (this.currentSubTab) {
            case 'abc': html = this.getABCHtml(); break;
            case 'quick': html = this.getQuickHtml(); break;
        }
        this.recordContent.innerHTML = html;
        this.postRenderRecord();
    },

    getNowDate() {
        const now = new Date();
        return now.toISOString().slice(0, 10);
    },
    getNowTime() {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    },
    readDateTimeFromInputs(dateId, timeId) {
        const d = document.getElementById(dateId).value;
        const t = document.getElementById(timeId).value;
        if (d && t) return new Date(`${d}T${t}`).toISOString();
        if (d) return new Date(`${d}T00:00`).toISOString();
        return new Date().toISOString();
    },

    renderSharedContext() {
        const rc = this.recordContext;
        const dateInput = document.getElementById('global-date');
        if (dateInput) {
            dateInput.value = rc.date;
            document.getElementById('global-time').value = rc.time;
            document.getElementById('global-period').value = rc.period;
            document.getElementById('global-subject').value = rc.subject;
            return;
        }
        this.headerContext.innerHTML = `
            <div class="compact-context">
                <div class="compact-row">
                    <input type="date" id="global-date" value="${rc.date}" onchange="App.recordContext.date=this.value" />
                    <input type="time" id="global-time" value="${rc.time}" onchange="App.recordContext.time=this.value" />
                </div>
                <div class="compact-row">
                    <select id="global-period" class="period-select-sm" onchange="App.recordContext.period=this.value">
                        <option value=""${rc.period === '' ? ' selected' : ''}>교시</option>
                        <option value="아침활동"${rc.period === '아침활동' ? ' selected' : ''}>아침활동</option>
                        <option value="조회"${rc.period === '조회' ? ' selected' : ''}>조회</option>
                        ${[1, 2, 3, 4].map(p => `<option value="${p}"${rc.period == p ? ' selected' : ''}>${p}교시</option>`).join('')}
                        <option value="점심"${rc.period === '점심' ? ' selected' : ''}>점심시간</option>
                        ${[5, 6].map(p => `<option value="${p}"${rc.period == p ? ' selected' : ''}>${p}교시</option>`).join('')}
                        <option value="쉬는시간"${rc.period === '쉬는시간' ? ' selected' : ''}>쉬는시간</option>
                        <option value="종례"${rc.period === '종례' ? ' selected' : ''}>종례</option>
                    </select>
                    <select id="global-subject" class="subject-select-sm" onchange="App.recordContext.subject=this.value">
                        <option value="">과목</option>
                        ${['국어', '수학', '영어', '사회', '과학', '음악', '미술', '체육', '도덕', '실과', '창체', '기타']
                .map(s => `<option${rc.subject === s ? ' selected' : ''}>${this.escapeHTML(s)}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
    },

    getChipHtml(group, items, selectedValues) {
        return `
            <div class="chip-group">
                ${items.map(item => `
                    <div class="chip ${selectedValues.includes(item) ? 'active' : ''}" 
                         data-action="select-chip" data-group="${group}" data-value="${this.escapeHTML(item)}">
                        <span class="chip-text">${this.escapeHTML(item)}</span>
                        <div class="chip-delete" data-action="remove-abc-tag" data-group="${group}" data-value="${this.escapeHTML(item)}">
                            &times;
                        </div>
                    </div>
                `).join('')}
            </div>`;
    },

    getCurrentPeriod() {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        const ranges = [
            [520, 560], [570, 610], [620, 660], [670, 710], [780, 820], [830, 870]
        ];
        for (let i = 0; i < ranges.length; i++) {
            if (mins >= ranges[i][0] && mins < ranges[i][1]) return (i + 1).toString();
        }
        return '';
    },

    selectChip(group, value) {
        const arr = this.abcSession[group];
        if (arr.includes(value)) {
            this.abcSession[group] = arr.filter(v => v !== value);
        } else {
            this.abcSession[group].push(value);
        }
        this.renderRecordPanel();
    },

    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    },

    getABCHtml() {
        const s = this.abcSession;
        const tags = Storage.getABCTags();

        const section = (id, label, category) => `
            <div class="abc-field">
                <div class="abc-label-row">
                    <label>${label}</label>
                    <button class="btn-add-tag" data-action="add-abc-tag" data-group="${category}">+</button>
                </div>
                ${this.getChipHtml(category, tags[category] || [], s[category])}
                <input type="text" class="abc-custom-input" placeholder="직접 입력..." 
                       value="${this.escapeHTML(s[category + 'Custom'] || '')}" oninput="App.abcSession['${category}Custom']=this.value">
            </div>
        `;

        return `
            <div class="fab-container">
                <div class="card" style="padding: 20px 16px; margin-bottom: 80px;">
                    ${section(1, '1. 배경 사건 (Condition)', 'settingEvent')}
                    ${section(2, '2. 선행사건 (Antecedent)', 'a')}
                    ${section(3, '3. 행동 세부 유형 (Behavior Type)', 'bDetail')}
                    ${section(4, '4. 결과 (Consequence)', 'c')}

                    <div class="abc-field">
                        <label>5. 메모 (선택)</label>
                        <div class="note-container">
                            <textarea id="abc-note" placeholder="추가 설명..." rows="2" 
                                      oninput="App.abcSession.note=this.value">${this.escapeHTML(s.note || '')}</textarea>
                        </div>
                    </div>
                </div>
                
                <button class="fab-save" data-action="save-abc">
                    <i class="lucide-check"></i> ABC 스냅샷 저장
                </button>
            </div>
        `;
    },

    getQuickHtml() {
        const running = this.quickTimer.running;
        const logs = this.getTodayLogsForCurrentTarget();
        const count = logs.length;
        const totalDur = logs.reduce((sum, l) => sum + (l.details.durationSeconds || 0), 0);

        return `
            <div class="quick-ui">
                <button id="quick-btn" class="btn-quick ${running ? 'running' : ''}" 
                        onmousedown="App.handleQuickStart(event)" 
                        onmouseup="App.handleQuickEnd(event)"
                        ontouchstart="App.handleQuickStart(event)"
                        ontouchend="App.handleQuickEnd(event)">
                    ${running ? '측정 중...' : '기록 / 타이머'}
                </button>
                
                <div class="quick-stats">
                    <div class="stat-item">
                        <span class="stat-val">${count}</span>
                        <span class="stat-label">오늘 빈도</span>
                    </div>
                    <div class="stat-item">
                        <span id="quick-timer-display" class="stat-val">${this.formatTime(totalDur)}</span>
                        <span class="stat-label">총 지속시간</span>
                    </div>
                </div>
                
                <p style="margin-top:20px; font-size:0.8rem; color:var(--text-muted);">
                    한 번 클릭: 빈도(+1) <br> 길게 누르기: 지속시간 측정
                </p>
                
                <button class="btn-undo" style="margin-top:20px;" onclick="App.undoLastLog()">
                    <i class="lucide-undo-2"></i> 마지막 기록 취소
                </button>
            </div>
        `;
    },

    handleQuickStart(e) {
        if (this.quickTimer.running) return;
        this.quickTimer.longPressTimer = setTimeout(() => { this.startQuickDuration(); }, 500);
    },

    handleQuickEnd(e) {
        clearTimeout(this.quickTimer.longPressTimer);
        if (this.quickTimer.running) { this.stopQuickDuration(); }
        else { this.logQuickEvent(); }
    },

    logQuickEvent() {
        const ts = this.readDateTimeFromInputs('global-date', 'global-time');
        const period = document.getElementById('global-period').value;
        const subject = document.getElementById('global-subject').value;
        Storage.addLog({
            studentId: this.session.currentStudentId,
            behaviorId: this.session.currentBehaviorId,
            behaviorType: this.targetBehavior.innerText,
            recordMethod: 'event',
            timestamp: ts,
            details: { period, subject }
        });
        this.showToast('빈도가 기록되었습니다.');
        this.renderRecordPanel();
    },

    startQuickDuration() {
        this.quickTimer.running = true;
        this.quickTimer.startTime = Date.now();
        const btn = document.getElementById('quick-btn');
        if (btn) {
            btn.classList.add('running');
            btn.innerText = '측정 중...';
        }
        const display = document.getElementById('quick-timer-display');
        const logs = this.getTodayLogsForCurrentTarget();
        const prevTotal = logs.reduce((sum, l) => sum + (l.details.durationSeconds || 0), 0);
        this.quickTimer.timerId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.quickTimer.startTime) / 1000);
            if (display) display.innerText = this.formatTime(prevTotal + elapsed);
        }, 1000);
    },

    stopQuickDuration() {
        const elapsed = Math.floor((Date.now() - this.quickTimer.startTime) / 1000);
        const ts = this.readDateTimeFromInputs('global-date', 'global-time');
        const period = document.getElementById('global-period').value;
        const subject = document.getElementById('global-subject').value;
        Storage.addLog({
            studentId: this.session.currentStudentId,
            behaviorId: this.session.currentBehaviorId,
            behaviorType: this.targetBehavior.innerText,
            recordMethod: 'event',
            timestamp: ts,
            details: { durationSeconds: elapsed, period, subject }
        });
        this.quickTimer.running = false;
        clearInterval(this.quickTimer.timerId);
        this.showToast(`${elapsed}초 지속시간이 기록되었습니다.`);
        this.renderRecordPanel();
    },

    postRenderRecord() {
        if (this.currentSubTab === 'quick' && this.quickTimer.running) {
            const display = document.getElementById('quick-timer-display');
            const logs = this.getTodayLogsForCurrentTarget();
            const prevTotal = logs.reduce((sum, l) => sum + (l.details.durationSeconds || 0), 0);
            clearInterval(this.quickTimer.timerId);
            this.quickTimer.timerId = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.quickTimer.startTime) / 1000);
                if (display) display.innerText = this.formatTime(prevTotal + elapsed);
            }, 1000);
        }
    },

    saveABC() {
        const ts = this.readDateTimeFromInputs('global-date', 'global-time');
        const s = this.abcSession;
        const note = document.getElementById('abc-note').value;
        const hasData = s.settingEvent.length > 0 || s.a.length > 0 || s.bDetail.length > 0 || s.c.length > 0 ||
            s.settingEventCustom.trim() || s.aCustom.trim() || s.bDetailCustom.trim() || s.cCustom.trim() ||
            note.trim();

        if (!hasData) return this.showToast('기록할 내용을 최소 하나 이상 입력하거나 선택해 주세요.');

        const joinData = (tags, custom) => {
            const all = [...tags];
            if (custom.trim()) all.push(custom.trim());
            return all.join(', ');
        };
        Storage.addLog({
            studentId: this.session.currentStudentId,
            behaviorId: this.session.currentBehaviorId,
            behaviorType: this.targetBehavior.innerText,
            recordMethod: 'abc',
            timestamp: ts,
            details: {
                settingEvent: joinData(s.settingEvent, s.settingEventCustom),
                antecedent: joinData(s.a, s.aCustom),
                behaviorDetail: joinData(s.bDetail, s.bDetailCustom),
                consequence: joinData(s.c, s.cCustom),
                note: note,
                period: document.getElementById('global-period').value,
                subject: document.getElementById('global-subject').value
            }
        });
        this.showToast('ABC 데이터가 기록되었습니다.');
        this.abcSession = {
            settingEvent: [], a: [], bDetail: [], c: [],
            settingEventCustom: '', aCustom: '', bDetailCustom: '', cCustom: ''
        };
        this.renderRecordPanel();
    },

    undoLastLog() {
        const logs = this.getTodayLogsForCurrentTarget();
        if (logs.length === 0) return this.showToast('취소할 기록이 없습니다.');
        Storage.removeLog(logs[logs.length - 1].id);
        this.renderRecordPanel();
        this.showToast('마지막 기록이 취소되었습니다.');
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },

    // ========================
    //  SETTINGS
    // ========================

    renderSettingsPanel() {
        const students = Storage.get(Storage.KEYS.STUDENTS) || [];
        const behaviors = Storage.get(Storage.KEYS.BEHAVIORS) || [];
        const currentSid = this.session.currentStudentId;
        const currentBid = this.session.currentBehaviorId;

        let studentsHtml = students.map(s => {
            const isActive = s.id === currentSid;
            const sBehaviors = behaviors.filter(b => b.studentId === s.id);
            let behaviorsHtml = sBehaviors.map(b => {
                const isBActive = b.id === currentBid && isActive;
                return `
                    <div class="behavior-item ${isBActive ? 'active' : ''}" data-action="select-behavior" data-student-id="${s.id}" data-id="${b.id}">
                        <span>${this.escapeHTML(b.name)}</span>
                        <button class="btn-icon-sm" data-action="remove-behavior" data-id="${b.id}">✕</button>
                    </div>`;
            }).join('');

            return `
                <div class="card student-card ${isActive ? 'student-active' : ''}">
                    <div class="student-header">
                        <div>
                            <strong>${this.escapeHTML(s.name)}</strong>
                            <span class="student-info">${this.escapeHTML(s.info || '')}</span>
                        </div>
                        <div>
                            <button class="btn-icon-sm" data-action="edit-student" data-id="${s.id}">✏️</button>
                            <button class="btn-icon-sm" data-action="remove-student" data-id="${s.id}">🗑️</button>
                        </div>
                    </div>
                    <div class="behavior-list">${behaviorsHtml}</div>
                    <button class="btn btn-sm" data-action="add-behavior" data-id="${s.id}">+ 관찰행동 추가</button>
                </div>`;
        }).join('');

        document.getElementById('settings-content').innerHTML = `
            <div class="section-title">학생 · 관찰행동 관리</div>
            ${studentsHtml}
            <div style="padding:0 20px 12px;">
                <button class="btn btn-primary" style="width:100%;" data-action="add-student">
                    <i class="lucide-user-plus"></i> 새 학생 추가
                </button>
            </div>
            <div class="section-title">데이터 관리</div>
            <div class="card">
                <button class="btn btn-primary" style="width:100%;margin-bottom:10px;" data-action="export-csv">
                    <i class="lucide-file-text"></i> CSV 내보내기
                </button>
                <button class="btn btn-danger" style="width:100%;" data-action="clear-data">
                    <i class="lucide-trash-2"></i> 전체 초기화
                </button>
            </div>
        `;
    },

    selectBehavior(studentId, behaviorId) {
        this.session.currentStudentId = studentId;
        this.session.currentBehaviorId = behaviorId;
        Storage.save(Storage.KEYS.SETTINGS, this.session);
        this.updateHeaderInfo();
        this.renderSettingsPanel();
    },

    addStudentPrompt() {
        this.showModal('새 학생 추가', [
            { id: 'name', label: '학생 이름', placeholder: '이름 입력', required: true },
            { id: 'info', label: '학급 정보', placeholder: '예: 2학년 1반' }
        ], (data) => {
            const id = Storage.addStudent(data.name, data.info);
            const bid = Storage.addBehavior(id, '기본 행동');
            this.session.currentStudentId = id;
            this.session.currentBehaviorId = bid;
            Storage.save(Storage.KEYS.SETTINGS, this.session);
            this.updateHeaderInfo();
            this.renderSettingsPanel();
            this.showToast('학생이 추가되었습니다.');
        });
    },

    editStudent(id) {
        const students = Storage.get(Storage.KEYS.STUDENTS);
        const s = students.find(x => x.id === id);
        this.showModal('학생 정보 수정', [
            { id: 'name', label: '학생 이름', value: s.name, required: true },
            { id: 'info', label: '학급 정보', value: s.info || '' }
        ], (data) => {
            Storage.updateStudent(id, data.name, data.info);
            this.updateHeaderInfo();
            this.renderSettingsPanel();
        });
    },

    removeStudent(id) {
        this.showConfirm('학생 삭제', '이 학생의 모든 데이터가 삭제됩니다. 계속하시겠습니까?', () => {
            Storage.deleteStudent(id);
            const students = Storage.get(Storage.KEYS.STUDENTS);
            if (students.length > 0) {
                this.session.currentStudentId = students[0].id;
                const behaviors = Storage.get(Storage.KEYS.BEHAVIORS).filter(b => b.studentId === students[0].id);
                this.session.currentBehaviorId = behaviors.length > 0 ? behaviors[0].id : '';
            }
            Storage.save(Storage.KEYS.SETTINGS, this.session);
            this.updateHeaderInfo();
            this.renderSettingsPanel();
            this.showToast('학생이 삭제되었습니다.');
        });
    },

    addBehaviorPrompt(studentId) {
        this.showModal('관찰행동 추가', [
            { id: 'name', label: '관찰 타겟 행동명', placeholder: '행동명 입력', required: true }
        ], (data) => {
            const bid = Storage.addBehavior(studentId, data.name);
            this.session.currentStudentId = studentId;
            this.session.currentBehaviorId = bid;
            Storage.save(Storage.KEYS.SETTINGS, this.session);
            this.updateHeaderInfo();
            this.renderSettingsPanel();
        });
    },

    removeBehavior(id) {
        this.showConfirm('행동 삭제', '이 행동을 삭제하시겠습니까?', () => {
            Storage.deleteBehavior(id);
            this.renderSettingsPanel();
        });
    },

    // ========================
    //  EXPORT & REPORT
    // ========================

    exportCSV() {
        const logs = Storage.getLogs();
        if (logs.length === 0) return alert('기록된 데이터가 없습니다.');
        const students = Storage.get(Storage.KEYS.STUDENTS) || [];
        const behaviors = Storage.get(Storage.KEYS.BEHAVIORS) || [];
        let csv = '\uFEFFID,학생,행동,기록유형,날짜,시간,교시,배경사건,선행사건,행동세부,결과,지속시간(초),메모\n';
        logs.forEach(l => {
            const d = l.details || {};
            const st = students.find(s => s.id === l.studentId);
            const bh = behaviors.find(b => b.id === l.behaviorId);
            const dt = new Date(l.timestamp);
            csv += `${l.id},"\"${st ? st.name : l.studentId}\"","\"${bh ? bh.name : l.behaviorId}\"","${l.recordMethod}","${dt.toLocaleDateString('ko-KR')}","${dt.toLocaleTimeString('ko-KR')}",` +
                `"${d.period || ''}","${d.settingEvent || ''}","${d.antecedent || ''}","${d.behaviorDetail || ''}","${d.consequence || ''}",${d.durationSeconds || ''},"\"${d.note || ''}\"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pbs_data_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    },

    captureReport() {
        const target = document.getElementById('capture-area');
        html2canvas(target).then(canvas => {
            const link = document.createElement('a');
            link.download = 'pbs_report.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    },

    generateAIPrompt() {
        const logs = this.getTargetLogs();
        if (logs.length === 0) return alert('데이터가 없습니다.');
        const studentName = this.targetStudent.innerText;
        const behaviorName = this.targetBehavior.innerText;
        const freqLogs = logs.filter(l => l.recordMethod === 'event');
        const durLogs = logs.filter(l => l.recordMethod === 'event' && l.details.durationSeconds);
        const abcLogs = logs.filter(l => l.recordMethod === 'abc');
        const freqByDate = {};
        freqLogs.forEach(l => { const d = new Date(l.timestamp).toLocaleDateString('ko-KR'); freqByDate[d] = (freqByDate[d] || 0) + 1; });
        let freqSummary = Object.entries(freqByDate).map(([d, c]) => `  - ${d}: ${c}회`).join('\n') || '  (없음)';
        let durSummary = durLogs.map(l => {
            const s = l.details.durationSeconds || 0;
            return `  - ${new Date(l.timestamp).toLocaleDateString('ko-KR')} [${l.recordMethod}]: ${Math.floor(s / 60)}분 ${s % 60}초`;
        }).join('\n') || '  (없음)';
        let abcSummary = abcLogs.map(l => {
            return `  - ${new Date(l.timestamp).toLocaleDateString('ko-KR')}: A(${l.details.antecedent}) → B(${behaviorName}) → C(${l.details.consequence})${l.details.note ? ' [' + l.details.note + ']' : ''}`;
        }).join('\n') || '  (없음)';
        const prompt = `학생 "${studentName}"의 행동 "${behaviorName}" PBS 기록입니다.\n\n1. 기능 분석\n2. 가설 설정\n3. 개입 전략\n\n■ 빈도:\n${freqSummary}\n■ 지속시간:\n${durSummary}\n■ ABC:\n${abcSummary}`;
        navigator.clipboard.writeText(prompt).then(() => { alert('✅ 복사되었습니다!'); });
    },

    // ========================
    //  INSIGHT
    // ========================

    renderInsightPanel() {
        setTimeout(() => { this.initCharts(); this.renderHeatmap(); }, 100);
    },

    initCharts() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;
        const logs = this.getTargetLogs();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
        const freqData = last7.map(date => logs.filter(l => l.recordMethod === 'event' && new Date(l.timestamp).toDateString() === date.toDateString()).length);
        const durData = last7.map(date => {
            const dl = logs.filter(l => l.recordMethod === 'event' && l.details.durationSeconds && new Date(l.timestamp).toDateString() === date.toDateString());
            return +(dl.reduce((s, l) => s + (l.details.durationSeconds || 0), 0) / 60).toFixed(1);
        });
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7.map(d => days[d.getDay()]),
                datasets: [
                    { label: '빈도 (회)', data: freqData, backgroundColor: 'rgba(99,102,241,0.5)', yAxisID: 'y' },
                    { label: '지속시간 (분)', data: durData, type: 'line', borderColor: '#10b981', yAxisID: 'y1' }
                ]
            },
            options: { scales: { y: { position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } } }
        });
    },

    renderHeatmap() {
        const heatmap = document.getElementById('heatmap-grid');
        if (!heatmap) return;
        heatmap.innerHTML = '';
        const logs = this.getTargetLogs();
        const grid = {};
        let maxVal = 1;
        logs.forEach(l => {
            const d = new Date(l.timestamp);
            const day = d.getDay();
            const hour = d.getHours();
            if (day >= 1 && day <= 5) {
                const p = this.getPeriodByHour(hour);
                if (p) {
                    const k = `${day}-${p}`;
                    grid[k] = (grid[k] || 0) + 1;
                    if (grid[k] > maxVal) maxVal = grid[k];
                }
            }
        });
        for (let p = 1; p <= 6; p++) {
            for (let d = 1; d <= 5; d++) {
                const count = grid[`${d}-${p}`] || 0;
                const cell = document.createElement('div');
                const intensity = count / maxVal;
                cell.className = 'heatmap-cell';
                cell.style.background = count > 0 ? `rgba(99, 102, 241, ${0.15 + intensity * 0.85})` : '#f1f5f9';
                cell.title = `${count}건`;
                if (count > 0) {
                    cell.innerText = count;
                    cell.style.cssText += 'display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:white;font-weight:700;';
                }
                heatmap.appendChild(cell);
            }
        }
    },

    getPeriodByHour(h) {
        if (h === 9) return 1; if (h === 10) return 2; if (h === 11) return 3;
        if (h === 13) return 4; if (h === 14) return 5; if (h === 15) return 6;
        return null;
    },

    // ========================
    //  HISTORY PANEL
    // ========================

    renderHistoryPanel() {
        const selector = document.getElementById('history-student-selector');
        const historyList = document.getElementById('history-list');
        if (!selector || !historyList) return;
        const students = Storage.get(Storage.KEYS.STUDENTS) || [];
        if (!this.historySelectedStudentId && students.length > 0) {
            this.historySelectedStudentId = students[0].id;
        }
        selector.innerHTML = students.map(s => `
            <div class="student-chip ${this.historySelectedStudentId === s.id ? 'active' : ''}" 
                 onclick="App.setHistoryStudent('${s.id}')">
                ${s.name}
            </div>
        `).join('');
        const logs = Storage.getLogs()
            .filter(l => l.studentId === this.historySelectedStudentId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let headerActionsHtml = '';
        if (logs.length > 0) {
            const allSelected = this.selectedLogs.length === logs.length && logs.length > 0;
            headerActionsHtml = `
                <div class="history-bulk-actions">
                    <label class="custom-checkbox">
                        <input type="checkbox" onchange="App.toggleAllLogs(this.checked)" ${allSelected ? 'checked' : ''}>
                        <span class="checkmark"></span> 전체 선택
                    </label>
                    ${this.selectedLogs.length > 0 ?
                    `<button class="btn-history-action" style="color:white; background:var(--danger);" onclick="App.bulkDeleteLogs()">
                            선택 삭제 (${this.selectedLogs.length})
                        </button>` : ''
                }
                </div>
            `;
        }

        if (logs.length === 0) {
            historyList.innerHTML = '<p style="text-align:center; padding:100px 40px; color:var(--text-muted);">기록이 없습니다.</p>';
            return;
        }
        historyList.innerHTML = headerActionsHtml + logs.map(l => this.editingLogId === l.id ? this.getHistoryEditHtml(l) : this.getHistoryCardHtml(l)).join('');
    },

    setHistoryStudent(sid) {
        this.historySelectedStudentId = sid;
        this.selectedLogs = [];
        this.renderHistoryPanel();
    },

    getHistoryCardHtml(log) {
        const d = log.details || {};
        const dateStr = new Date(log.timestamp).toLocaleDateString('ko-KR');
        const timeStr = new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const badgeClass = log.recordMethod === 'abc' ? 'm-abc' : 'm-quick';
        const badgeText = log.recordMethod === 'abc' ? 'ABC SNAPSHOT' : 'QUICK EVENT';
        const isSelected = this.selectedLogs.includes(log.id);

        return `
            <div class="history-card ${isSelected ? 'selected' : ''}">
                <div class="history-card-header">
                    <div style="display:flex; align-items:flex-start; gap:12px;">
                        <label class="custom-checkbox" style="margin-top:4px;">
                            <input type="checkbox" onchange="App.toggleLogSelection('${log.id}', this.checked)" ${isSelected ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                        <div class="history-time-box">
                            <span class="history-time">${timeStr}</span>
                            <span class="history-meta">${dateStr} · ${d.period ? d.period + '교시' : '-'} · ${d.subject || '-'}</span>
                        </div>
                    </div>
                    <div class="history-badges"><span class="badge-method ${badgeClass}">${badgeText}</span></div>
                </div>
                <div class="history-behavior-row">
                    <span class="history-behavior">${this.escapeHTML(log.behaviorType)}</span>
                    ${d.durationSeconds ? `<span class="history-duration"><i class="lucide-clock" style="font-size:0.8rem;"></i> ${this.formatTime(d.durationSeconds)}</span>` : ''}
                </div>
                ${log.recordMethod === 'abc' ? `
                    <div class="history-section">
                        <span class="section-label">ABC ANALYSIS</span>
                        <div class="abc-data-grid">
                            ${d.settingEvent ? `<div class="abc-item"><strong>배경:</strong> ${this.formatABCItem(d.settingEvent)}</div>` : ''}
                            ${d.antecedent ? `<div class="abc-item"><strong>선행:</strong> ${this.formatABCItem(d.antecedent)}</div>` : ''}
                            ${d.behaviorDetail ? `<div class="abc-item"><strong>내용:</strong> ${this.formatABCItem(d.behaviorDetail)}</div>` : ''}
                            ${d.consequence ? `<div class="abc-item"><strong>결과:</strong> ${this.formatABCItem(d.consequence)}</div>` : ''}
                        </div>
                    </div>
                ` : ''}
                ${d.note ? `<div class="history-note">${this.escapeHTML(d.note)}</div>` : ''}
                <div class="history-actions">
                    <button class="btn-history-action" data-action="history-edit" data-id="${log.id}">수정</button>
                    <button class="btn-history-action" data-action="history-delete" data-id="${log.id}">삭제</button>
                </div>
            </div>`;
    },

    getHistoryEditHtml(l) {
        const d = l.details || {};
        const dt = new Date(l.timestamp).toISOString();
        return `
            <div class="history-card editing">
                <div class="edit-grid">
                    <input type="date" id="edit-date-${l.id}" value="${dt.split('T')[0]}">
                    <input type="time" id="edit-time-${l.id}" value="${dt.split('T')[1].slice(0, 5)}">
                </div>
                <div class="edit-fields">
                    <input type="text" id="edit-b-${l.id}" value="${this.escapeHTML(l.behaviorType)}" placeholder="행동명">
                    <textarea id="edit-note-${l.id}" placeholder="메모">${this.escapeHTML(d.note || '')}</textarea>
                </div>
                <div class="history-actions">
                    <button class="btn-history-action btn-primary" data-action="history-save-edit" data-id="${l.id}">저장</button>
                    <button class="btn-history-action" data-action="history-cancel-edit">취소</button>
                </div>
            </div>`;
    },

    formatABCItem(text) {
        if (!text) return '-';
        return text.split(', ').map(t => `<span class="abc-tag-sm">${this.escapeHTML(t)}</span>`).join('');
    },

    toggleEditLog(logId) {
        this.editingLogId = logId;
        this.renderHistoryPanel();
    },

    saveLogEdit(logId) {
        const newDate = document.getElementById(`edit-date-${logId}`).value;
        const newTime = document.getElementById(`edit-time-${logId}`).value;
        const newB = document.getElementById(`edit-b-${logId}`).value;
        const newNote = document.getElementById(`edit-note-${logId}`).value;
        const newTimestamp = new Date(`${newDate}T${newTime}`).toISOString();
        const originalLog = Storage.getLogs().find(l => l.id === logId);
        Storage.updateLog(logId, { timestamp: newTimestamp, behaviorType: newB, details: { ...originalLog.details, note: newNote } });
        this.editingLogId = null;
        this.renderHistoryPanel();
        this.showToast('기록이 수정되었습니다.');
    },

    addABCTagPrompt(category) {
        this.showModal('새 태그 추가', [{ id: 'tag', label: '태그 내용', required: true }], (data) => {
            Storage.addABCTag(category, data.tag.trim());
            this.renderRecordPanel();
            this.showToast('태그가 추가되었습니다.');
        });
    },

    removeABCTag(category, tag) {
        this.showConfirm('태그 삭제', `'${tag}' 태그를 삭제하시겠습니까?`, () => {
            Storage.removeABCTag(category, tag);
            const arr = this.abcSession[category] || [];
            this.abcSession[category] = arr.filter(v => v !== tag);
            this.renderRecordPanel();
            this.showToast('태그가 삭제되었습니다.');
        });
    },

    deleteLogConfirm(logId) {
        this.showConfirm('기록 삭제', '정말 삭제하시겠습니까?', () => {
            Storage.removeLog(logId);
            this.renderHistoryPanel();
            this.showToast('삭제되었습니다.');
        });
    },

    toggleLogSelection(logId, isChecked) {
        if (isChecked) {
            if (!this.selectedLogs.includes(logId)) this.selectedLogs.push(logId);
        } else {
            this.selectedLogs = this.selectedLogs.filter(id => id !== logId);
        }
        this.renderHistoryPanel();
    },

    toggleAllLogs(isChecked) {
        if (isChecked) {
            const logs = Storage.getLogs().filter(l => l.studentId === this.historySelectedStudentId);
            this.selectedLogs = logs.map(l => l.id);
        } else {
            this.selectedLogs = [];
        }
        this.renderHistoryPanel();
    },

    bulkDeleteLogs() {
        if (this.selectedLogs.length === 0) return;
        this.showConfirm('선택 삭제', `선택한 ${this.selectedLogs.length}개의 기록을 계속 삭제하시겠습니까?`, () => {
            this.selectedLogs.forEach(id => Storage.removeLog(id));
            this.selectedLogs = [];
            this.renderHistoryPanel();
            this.showToast('선택한 기록이 모두 삭제되었습니다.');
        });
    },

    clearData() {
        this.showConfirm('전체 초기화', '모든 데이터가 삭제됩니다. 계속하시겠습니까?', () => {
            Storage.clearAll();
            location.reload();
        });
    },

    // Modal Helpers
    showModal(title, fields, onSave) {
        this.modalTitle.innerText = title;
        this.modalBody.innerHTML = fields.map(f => `
            <div style="margin-bottom:12px;">
                <label>${this.escapeHTML(f.label)}</label>
                <input type="text" id="modal-input-${f.id}" value="${this.escapeHTML(f.value || '')}" placeholder="${this.escapeHTML(f.placeholder || '')}">
            </div>
        `).join('');
        this.modal.classList.remove('hidden');
        this.modalSave.onclick = () => {
            const res = {};
            for (let f of fields) {
                const val = document.getElementById(`modal-input-${f.id}`).value;
                if (f.required && !val.trim()) return alert(`${f.label}을(를) 입력해주세요.`);
                res[f.id] = val;
            }
            onSave(res);
            this.closeModal();
        };
    },

    showConfirm(title, message, onOk) {
        this.modalTitle.innerText = title;
        this.modalBody.innerHTML = `<p style="text-align:center; padding:10px 0;">${this.escapeHTML(message)}</p>`;
        this.modal.classList.remove('hidden');
        this.modalSave.onclick = () => { onOk(); this.closeModal(); };
    },

    closeModal() {
        this.modal.classList.add('hidden');
    }
};

window.App = App;
window.onload = () => App.init();
