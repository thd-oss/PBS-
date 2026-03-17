const App = {
    currentView: 'record-panel',
    currentSubTab: 'abc',

    // ABC 기록용 임시 상태
    abcSession: {
        settingEvent: '',
        a: '',
        bDetail: '',
        c: ''
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

    init() {
        this.session = Storage.get(Storage.KEYS.SETTINGS);

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
    },

    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.switchView(item.getAttribute('data-view')));
        });
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sub-tab')) {
                this.switchSubTab(e.target.getAttribute('data-sub'));
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

    renderCurrentView() {
        this.renderSharedContext(); // 헤더 정보는 항상 최신화
        if (this.currentView === 'record-panel') {
            this.renderRecordPanel();
        }
        else if (this.currentView === 'insight-panel') this.renderInsightPanel();
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

    // Helper: 현재 날짜/시간 (분리 입력용)
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
        this.headerContext.innerHTML = `
            <div class="compact-context">
                <div class="compact-row">
                    <input type="date" id="global-date" value="${rc.date}" onchange="App.recordContext.date=this.value" />
                    <input type="time" id="global-time" value="${rc.time}" onchange="App.recordContext.time=this.value" />
                </div>
                <div class="compact-row">
                    <select id="global-period" class="period-select-sm" onchange="App.recordContext.period=this.value">
                        <option value=""${rc.period === '' ? ' selected' : ''}>교시</option>
                        ${[1, 2, 3, 4, 5, 6].map(p => `<option value="${p}"${rc.period == p ? ' selected' : ''}>${p}교시</option>`).join('')}
                        <option value="쉬는시간"${rc.period === '쉬는시간' ? ' selected' : ''}>쉬는시간</option>
                        <option value="점심"${rc.period === '점심' ? ' selected' : ''}>점심</option>
                    </select>
                    <select id="global-subject" class="subject-select-sm" onchange="App.recordContext.subject=this.value">
                        <option value="">과목</option>
                        ${['국어', '수학', '영어', '사회', '과학', '음악', '미술', '체육', '도덕', '실과', '창체', '기타']
                .map(s => `<option${rc.subject === s ? ' selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
    },

    // --- 리팩토링된 ABC UI 헬퍼 ---
    getChipHtml(group, items, selectedValue) {
        return `
            <div class="chip-group ${group === 'settingEvent' ? 'chip-scroll' : ''}">
                ${items.map(item => `
                    <div class="chip ${selectedValue === item ? 'active' : ''}" 
                         onclick="App.selectChip('${group}', '${item}')">
                        ${item}
                    </div>
                `).join('')}
            </div>`;
    },

    // 현재 시간 기반 교시 자동 추정
    getCurrentPeriod() {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        const ranges = [
            [520, 560], [570, 610], [620, 660], [670, 710], [780, 820], [830, 870]
        ]; // 1~6교시
        for (let i = 0; i < ranges.length; i++) {
            if (mins >= ranges[i][0] && mins < ranges[i][1]) return (i + 1).toString();
        }
        return '';
    },

    selectChip(group, value) {
        // 이미 선택된 걸 다시 누르면 해제 (기능적 요구사항에 따라 조절 가능)
        if (this.abcSession[group] === value) {
            this.abcSession[group] = '';
        } else {
            this.abcSession[group] = value;
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
        return `
            <div class="fab-container">
                <div class="card" style="padding: 20px 16px; margin-bottom: 80px;">
                    <div class="abc-field">
                        <label>1. 배경 사건 (Condition)</label>
                        ${this.getChipHtml('settingEvent', ['평소와 같음', '수면 부족', '약 미복용', '가정 내 사건', '날씨 영향', '피로함'], s.settingEvent)}
                    </div>

                    <div class="abc-field">
                        <label>2. 선행사건 (Antecedent)</label>
                        ${this.getChipHtml('a', ['개별 과제 시작', '교사 지시', '교실 소음', '강화물 제거', '쉬는 시간 종료', '또래 갈등'], s.a)}
                    </div>

                    <div class="abc-field">
                        <label>3. 행동 세부 유형 (Behavior Type)</label>
                        ${this.getChipHtml('bDetail', ['언어적 폭발', '신체적 공격', '수업 이탈', '기물 파손', '지시 불이행'], s.bDetail)}
                    </div>

                    <div class="abc-field">
                        <label>4. 결과 (Consequence)</label>
                        ${this.getChipHtml('c', ['교사의 훈육', '과제 중단/수정', '강화물 제거', '친구들의 반응', '타임아웃/격리', '무시하기'], s.c)}
                    </div>

                    <div class="abc-field">
                        <label>5. 메모 (선택)</label>
                        <div class="note-container">
                            <textarea id="abc-note" placeholder="추가 설명..." rows="2"></textarea>
                            <button class="btn-stt" onclick="App.showToast('음성 인식 기능을 준비 중입니다')">
                                <i class="lucide-mic"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <button class="fab-save" onclick="App.saveABC()">
                    <i class="lucide-check"></i> ABC 스냅샷 저장
                </button>
            </div>
        `;
    },

    getQuickHtml() {
        const running = this.quickTimer.running;

        const logs = Storage.getLogs().filter(l =>
            l.studentId === this.session.currentStudentId &&
            l.behaviorId === this.session.currentBehaviorId &&
            new Date(l.timestamp).toDateString() === new Date().toDateString()
        );

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
        if (e && e.type === 'touchstart') e.preventDefault();
        if (this.quickTimer.running) return;

        // Long press detection: after 500ms, start duration timer
        this.quickTimer.longPressTimer = setTimeout(() => {
            this.startQuickDuration();
        }, 500);
    },

    handleQuickEnd(e) {
        if (e && e.type === 'touchend') e.preventDefault();
        clearTimeout(this.quickTimer.longPressTimer);

        if (this.quickTimer.running) {
            this.stopQuickDuration();
        } else {
            // If released before 500ms, it's a simple click (frequency)
            this.logQuickEvent();
        }
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
            details: {
                period: period,
                subject: subject
            }
        });
        this.showToast('빈도가 기록되었습니다.');
        this.renderRecordPanel();
    },

    startQuickDuration() {
        this.quickTimer.running = true;
        this.quickTimer.startTime = Date.now();

        // DOM을 통째로 갈아끼우지 않고 페이지만 살짝 변경 (이벤트 끊김 방지)
        const btn = document.getElementById('quick-btn');
        if (btn) {
            btn.classList.add('running');
            btn.innerText = '측정 중...';
        }

        const display = document.getElementById('quick-timer-display');
        const logs = Storage.getLogs().filter(l =>
            l.studentId === this.session.currentStudentId &&
            l.behaviorId === this.session.currentBehaviorId &&
            new Date(l.timestamp).toDateString() === new Date().toDateString()
        );
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
            details: {
                durationSeconds: elapsed,
                period: period,
                subject: subject
            }
        });

        this.quickTimer.running = false;
        clearInterval(this.quickTimer.timerId);
        this.showToast(`${elapsed}초 지속시간이 기록되었습니다.`);
        this.renderRecordPanel(); // 종료 시에는 전체 리렌더링 허용
    },

    getFrequencyHtml() {
        return `
            <div class="counter-ui">
                <div class="abc-field" style="text-align:left;margin-bottom:16px;">
                <label>발생 시각 · 교시 · 과목</label>
                <div class="datetime-row">
                    <input type="date" id="freq-date" value="${this.getNowDate()}" />
                    <input type="time" id="freq-time" value="${this.getNowTime()}" />
                </div>
                ${this.getPeriodSubjectHtml('freq')}
            </div>
                <button class="btn btn-large-plus" onclick="App.logFrequency()">+</button>
                <div style="margin-top:20px;">
                    <span style="font-size:0.9rem;color:var(--text-muted);">오늘 누적: </span>
                    <span id="f-today-count" style="font-weight:800;color:var(--primary);font-size:2rem;">0</span>
                </div>
                <button class="btn btn-undo" onclick="App.undoLastLog()">
                    <i class="lucide-undo-2"></i> 마지막 기록 취소
                </button>
            </div>
        `;
    },

    getDurationHtml() {
        const timer = this.timers.duration;
        return `
            <div class="timer-ui">
                <div id="d-display" class="timer-display">00:00</div>
                <button id="d-btn" class="btn btn-primary" style="width:100%;height:60px;" onclick="App.toggleDuration()">
                    ${timer.running ? '종료 및 저장' : '시작'}
                </button>
            </div>
        `;
    },

    getAccumulationHtml() {
        const timer = this.timers.accumulated;
        return `
            <div class="timer-ui">
                <div id="a-display" class="timer-display">${this.formatTime(timer.totalSeconds)}</div>
                <button id="a-btn" class="btn btn-primary" style="width:100%;height:60px;" onclick="App.toggleAccumulation()">
                    ${timer.running ? '일시정지 (PAUSE)' : '재생 (RESUME)'}
                </button>
                <button class="btn" style="width:100%;margin-top:12px;border:1px solid #ddd;" onclick="App.saveAccumulation()">
                    현재까지 기록 저장하기
                </button>
            </div>
        `;
    },

    postRenderRecord() {
        if (this.currentSubTab === 'quick') {
            const qs = this.quickSession;
            if (qs.period) document.getElementById('quick-period').value = qs.period;
            if (qs.subject) document.getElementById('quick-subject').value = qs.subject;

            if (this.quickTimer.running) {
                // Restore timer display if running
                const display = document.getElementById('quick-timer-display');
                const logs = Storage.getLogs().filter(l =>
                    l.studentId === this.session.currentStudentId &&
                    l.behaviorId === this.session.currentBehaviorId &&
                    new Date(l.timestamp).toDateString() === new Date().toDateString()
                );
                const prevTotal = logs.reduce((sum, l) => sum + (l.details.durationSeconds || 0), 0);

                clearInterval(this.quickTimer.timerId);
                this.quickTimer.timerId = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.quickTimer.startTime) / 1000);
                    if (display) display.innerText = this.formatTime(prevTotal + elapsed);
                }, 1000);
            }
        }
    },

    // ========================
    //  BUSINESS LOGIC
    // ========================

    saveABC() {
        const ts = this.readDateTimeFromInputs('global-date', 'global-time');
        const s = this.abcSession;

        Storage.addLog({
            studentId: this.session.currentStudentId,
            behaviorId: this.session.currentBehaviorId,
            behaviorType: this.targetBehavior.innerText,
            recordMethod: 'abc',
            timestamp: ts,
            details: {
                settingEvent: s.settingEvent,
                antecedent: s.a,
                behaviorDetail: s.bDetail,
                consequence: s.c,
                note: document.getElementById('abc-note').value,
                period: document.getElementById('global-period').value,
                subject: document.getElementById('global-subject').value
            }
        });

        this.showToast('ABC 데이터가 기록되었습니다.');

        // 입력 폼 초기화
        this.abcSession = { settingEvent: '', a: '', bDetail: '', c: '' };
        this.renderRecordPanel();
    },

    undoLastLog() {
        const todayStr = new Date().toDateString();
        const logs = Storage.getLogs();
        const myLogs = logs.filter(l =>
            l.studentId === this.session.currentStudentId &&
            l.behaviorId === this.session.currentBehaviorId &&
            new Date(l.timestamp).toDateString() === todayStr  // 오늘 기록만 대상
        );
        if (myLogs.length === 0) return this.showToast('취소할 기록이 없습니다.');
        const last = myLogs[myLogs.length - 1];
        Storage.removeLog(last.id);
        this.renderRecordPanel();
        this.showToast('마지막 기록이 취소되었습니다.');
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },

    // 레거시 타이머 함수 제거됨 (toggleDuration, toggleAccumulation, saveAccumulation, startTimerUI)

    // ========================
    //  SETTINGS (Student/Behavior Management)
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
                    <div class="behavior-item ${isBActive ? 'active' : ''}" onclick="App.selectBehavior('${s.id}','${b.id}')">
                        <span>${b.name}</span>
                        <button class="btn-icon-sm" onclick="event.stopPropagation(); App.removeBehavior('${b.id}')">✕</button>
                    </div>`;
            }).join('');

            return `
                <div class="card student-card ${isActive ? 'student-active' : ''}">
                    <div class="student-header">
                        <div>
                            <strong>${s.name}</strong>
                            <span class="student-info">${s.info || ''}</span>
                        </div>
                        <div>
                            <button class="btn-icon-sm" onclick="App.editStudent('${s.id}')">✏️</button>
                            <button class="btn-icon-sm" onclick="App.removeStudent('${s.id}')">🗑️</button>
                        </div>
                    </div>
                    <div class="behavior-list">${behaviorsHtml}</div>
                    <button class="btn btn-sm" onclick="App.addBehaviorPrompt('${s.id}')">+ 관찰행동 추가</button>
                </div>`;
        }).join('');

        document.getElementById('settings-content').innerHTML = `
            <div class="section-title">학생 · 관찰행동 관리</div>
            ${studentsHtml}
            <div style="padding:0 20px 12px;">
                <button class="btn btn-primary" style="width:100%;" onclick="App.addStudentPrompt()">
                    <i class="lucide-user-plus"></i> 새 학생 추가
                </button>
            </div>
            <div class="section-title">데이터 관리</div>
            <div class="card">
                <button class="btn btn-primary" style="width:100%;margin-bottom:10px;" onclick="App.exportCSV()">
                    <i class="lucide-file-text"></i> CSV 내보내기
                </button>
                <button class="btn btn-danger" style="width:100%;" onclick="App.clearData()">
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
        const name = prompt('학생 이름:');
        if (!name) return;
        const info = prompt('학급 정보 (예: 2학년 1반):') || '';
        const id = Storage.addStudent(name, info);
        // 기본 행동 하나 추가
        const bid = Storage.addBehavior(id, '기본 행동');
        this.session.currentStudentId = id;
        this.session.currentBehaviorId = bid;
        Storage.save(Storage.KEYS.SETTINGS, this.session);
        this.updateHeaderInfo();
        this.renderSettingsPanel();
    },

    editStudent(id) {
        const students = Storage.get(Storage.KEYS.STUDENTS);
        const s = students.find(s => s.id === id);
        const name = prompt('학생 이름:', s.name);
        if (!name) return;
        const info = prompt('학급 정보:', s.info || '');
        Storage.updateStudent(id, name, info);
        this.updateHeaderInfo();
        this.renderSettingsPanel();
    },

    removeStudent(id) {
        if (!confirm('이 학생의 모든 데이터가 삭제됩니다. 계속하시겠습니까?')) return;
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
    },

    addBehaviorPrompt(studentId) {
        const name = prompt('관찰 타겟 행동명:');
        if (!name) return;
        const bid = Storage.addBehavior(studentId, name);
        // 자동 선택
        this.session.currentStudentId = studentId;
        this.session.currentBehaviorId = bid;
        Storage.save(Storage.KEYS.SETTINGS, this.session);
        this.updateHeaderInfo();
        this.renderSettingsPanel();
    },

    removeBehavior(id) {
        if (!confirm('이 행동을 삭제하시겠습니까?')) return;
        Storage.deleteBehavior(id);
        this.renderSettingsPanel();
    },

    // ========================
    //  EXPORT
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

            // Simplified export format
            csv += `${l.id},"\"${st ? st.name : l.studentId}\"","\"${bh ? bh.name : l.behaviorId}\"","${l.recordMethod}","${dt.toLocaleDateString('ko-KR')}","${dt.toLocaleTimeString('ko-KR')}",` +
                `"${d.period || ''}","${d.settingEvent || ''}","${d.antecedent || ''}","${d.behaviorDetail || ''}","${d.consequence || ''}",${d.durationSeconds || ''},"\"${d.note || ''}\"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pbs_data_${new Date().toISOString().split('T')[0]}.csv`);
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

    // ========================
    //  AI PROMPT
    // ========================

    generateAIPrompt() {
        const logs = Storage.getLogs().filter(l =>
            l.studentId === this.session.currentStudentId &&
            l.behaviorId === this.session.currentBehaviorId
        );
        if (logs.length === 0) return alert('현재 선택된 학생/행동에 대한 데이터가 없습니다.');

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

        const prompt = `다음은 학생 "${studentName}"의 문제행동 "${behaviorName}"에 대한 PBS 관찰 기록입니다.\n\n이 데이터를 바탕으로:\n1. 행동의 기능(Function) 분석\n2. 기능평가(FBA) 가설 설정\n3. 긍정적 행동지원 개입 전략 제시\n를 수행해 주세요.\n\n---\n■ 빈도 기록:\n${freqSummary}\n\n■ 지속시간:\n${durSummary}\n\n■ ABC 사건 기록:\n${abcSummary}\n---\n총 ${logs.length}건 (${new Date(logs[0].timestamp).toLocaleDateString('ko-KR')} ~ ${new Date(logs[logs.length - 1].timestamp).toLocaleDateString('ko-KR')})`;

        navigator.clipboard.writeText(prompt).then(() => {
            alert('✅ AI 프롬프트가 클립보드에 복사되었습니다!');
        }).catch(() => {
            const ta = document.createElement('textarea'); ta.value = prompt;
            document.body.appendChild(ta); ta.select(); document.execCommand('copy');
            document.body.removeChild(ta); alert('✅ 복사 완료!');
        });
    },

    // ========================
    //  INSIGHT (Charts + Real Heatmap)
    // ========================

    renderInsightPanel() {
        setTimeout(() => { this.initCharts(); this.renderHeatmap(); }, 100);
    },

    initCharts() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;

        const logs = Storage.getLogs().filter(l =>
            l.studentId === this.session.currentStudentId &&
            l.behaviorId === this.session.currentBehaviorId
        );

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

        const abcLogs = logs.filter(l => l.recordMethod === 'abc');
        const cMap = {};
        abcLogs.forEach(l => { const c = l.details.consequence || '기타'; cMap[c] = (cMap[c] || 0) + 1; });
        const abcCtx = document.getElementById('abcChart');
        if (Object.keys(cMap).length > 0) {
            new Chart(abcCtx, {
                type: 'doughnut',
                data: { labels: Object.keys(cMap), datasets: [{ data: Object.values(cMap), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] },
                options: { cutout: '70%' }
            });
        }
    },

    renderHeatmap() {
        const heatmap = document.getElementById('heatmap');
        if (!heatmap) return;
        heatmap.innerHTML = '';
        heatmap.style.display = 'grid';
        heatmap.style.gridTemplateColumns = 'repeat(6, 1fr)';
        heatmap.style.gap = '6px';

        const logs = Storage.getLogs().filter(l =>
            l.studentId === this.session.currentStudentId &&
            l.behaviorId === this.session.currentBehaviorId
        );

        // 교시별 시간 매핑 (08:40 ~ 14:50)
        const periodRanges = [
            { start: 8 * 60 + 40, end: 9 * 60 + 20 },   // 1교시
            { start: 9 * 60 + 30, end: 10 * 60 + 10 },   // 2교시
            { start: 10 * 60 + 20, end: 11 * 60 },        // 3교시
            { start: 11 * 60 + 10, end: 11 * 60 + 50 },   // 4교시
            { start: 13 * 60, end: 13 * 60 + 40 },        // 5교시
            { start: 13 * 60 + 50, end: 14 * 60 + 30 }    // 6교시
        ];

        // Count per (dayOfWeek, period)
        const grid = {};
        for (let p = 0; p < 6; p++) for (let d = 1; d <= 5; d++) grid[`${d}-${p}`] = 0;

        logs.forEach(l => {
            const dt = new Date(l.timestamp);
            const dow = dt.getDay();
            if (dow < 1 || dow > 5) return;

            // Use explicitly recorded period if available
            let periodIdx = -1;
            if (l.details && l.details.period && !isNaN(l.details.period)) {
                periodIdx = parseInt(l.details.period) - 1;
            } else {
                // Fallback: guess from timestamp
                const mins = dt.getHours() * 60 + dt.getMinutes();
                for (let p = 0; p < 6; p++) {
                    if (mins >= periodRanges[p].start && mins < periodRanges[p].end) {
                        periodIdx = p;
                        break;
                    }
                }
            }
            if (periodIdx >= 0 && periodIdx < 6) {
                grid[`${dow}-${periodIdx}`]++;
            }
        });

        const maxVal = Math.max(1, ...Object.values(grid));

        // Header
        ['', '월', '화', '수', '목', '금'].forEach(d => {
            const div = document.createElement('div');
            div.innerText = d;
            div.style.cssText = 'font-size:0.7rem;text-align:center;font-weight:700;';
            heatmap.appendChild(div);
        });

        for (let p = 0; p < 6; p++) {
            const pLabel = document.createElement('div');
            pLabel.innerText = `${p + 1}교시`;
            pLabel.style.cssText = 'font-size:0.6rem;text-align:center;display:flex;align-items:center;justify-content:center;';
            heatmap.appendChild(pLabel);

            for (let d = 1; d <= 5; d++) {
                const count = grid[`${d}-${p}`];
                const cell = document.createElement('div');
                const intensity = count / maxVal;
                cell.style.height = '28px';
                cell.style.borderRadius = '6px';
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

    clearData() {
        if (confirm('모든 데이터를 초기화하시겠습니까?')) { Storage.clearAll(); location.reload(); }
    }
};

window.onload = () => App.init();
