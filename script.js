/**
 * ASCENT Core System Engine Architecture
 * Handles State Hydration, LocalStorage Protocols, Rendering, Gamification Mechanics and Analytics.
 */

// 1. DATE BOUNDARY & BASE CONFIGURATIONS
const START_DATE_STR = "2026-06-28";
const END_DATE_STR = "2026-10-27";

const HABIT_KEYS = [
    'noPmo', 'noUnhealthyFood', 'noSugar', 'gym', 'noSocialMedia', 
    'workedHard', 'tasbih', 'quran', 'tahajjud', 'salah', 'wakeUp', 'sleep'
];

const MOTIVATIONAL_QUOTES = [
    "He who has a why to live can bear almost any how.",
    "Discipline is choosing between what you want now and what you want most.",
    "The first and best victory is to conquer self.",
    "Uncomplicate your goals. Execute the micro metrics perfectly every day.",
    "Great things are done by a series of small things brought together.",
    "Your energy is too sacred to be wasted on ephemeral instant-gratification paradigms.",
    "Suffering is the forge of absolute psychological resilience."
];

// 2. TIMELINE ENGINE GENERATION DEFINITIONS
function generateDateArray(start, end) {
    let arr = [];
    let dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
        arr.push(new Date(dt).toISOString().split('T')[0]);
        dt.setDate(dt.getDate() + 1);
    }
    return arr;
}
const MASTER_TIMELINE = generateDateArray(START_DATE_STR, END_DATE_STR);

// 3. HARD RECOVERY STATE HYDRATION OR FALLBACK INITIALIZATION
let AppState = {
    days: {}, // Encapsulates date-string mappings: { "2026-06-28": { habits: {...}, notes: "" } }
    meta: {
        theme: 'dark',
        longestStreak: 0
    }
};

function initStorageStructure() {
    const data = localStorage.getItem('ascent_detox_state');
    if (data) {
        try {
            AppState = JSON.parse(data);
            // Dynamic sync step if user has missing timeline assets
            MASTER_TIMELINE.forEach(d => {
                if (!AppState.days[d]) AppState.days[d] = { habits: createBlankHabitSet(), notes: "" };
            });
        } catch(e) {
            console.error("State corrupt. Generating structural layout.", e);
            generateBlankBaseState();
        }
    } else {
        generateBlankBaseState();
    }
}

function generateBlankBaseState() {
    AppState.days = {};
    MASTER_TIMELINE.forEach(d => {
        AppState.days[d] = {
            habits: createBlankHabitSet(),
            notes: ""
        };
    });
    AppState.meta = { theme: 'dark', longestStreak: 0 };
    saveStateToLocalStorage();
}

function createBlankHabitSet() {
    let obj = {};
    HABIT_KEYS.forEach(k => obj[k] = false);
    return obj;
}

function saveStateToLocalStorage() {
    localStorage.setItem('ascent_detox_state', JSON.stringify(AppState));
}

// 4. DATE MANIPULATION ENGINE UTILITIES
function getTodayString() {
    const isoStr = new Date().toISOString().split('T')[0];
    if (MASTER_TIMELINE.includes(isoStr)) return isoStr;
    return START_DATE_STR; // Fail-secure gracefully to start index during preview bounds
}
let activeViewingDate = getTodayString();

// 5. APPLICATION CENTRAL RUNTIME CONTROLLER
class AscentApplication {
    constructor() {
        initStorageStructure();
        this.charts = {};
        this.initUIElements();
        this.bindEvents();
        this.setupNavigation();
        this.switchTheme(AppState.meta.theme || 'dark');
        
        // Asynchronous load animation dismissal
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 500);
        }, 800);

        this.syncSystemState(activeViewingDate);
        this.renderCalendarMatrices();
    }

    initUIElements() {
        this.dom = {
            menuItems: document.querySelectorAll('.menu-item'),
            sections: document.querySelectorAll('.view-section'),
            themeToggle: document.getElementById('theme-toggle'),
            search: document.getElementById('date-search'),
            jumpToday: document.getElementById('jump-to-today'),
            prevDay: document.getElementById('prev-day-btn'),
            nextDay: document.getElementById('next-day-btn'),
            habitsForm: document.getElementById('habits-form'),
            notesTextarea: document.getElementById('daily-notes-textarea'),
            perfectBanner: document.getElementById('perfect-day-banner'),
            calendarContainer: document.getElementById('calendar-months-container'),
            achievementsGrid: document.getElementById('achievements-flex-grid')
        };
    }

    setupNavigation() {
        this.dom.menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('data-target');
                
                this.dom.menuItems.forEach(i => i.classList.remove('active'));
                this.dom.sections.forEach(s => s.classList.remove('active'));
                
                item.classList.add('active');
                document.getElementById(`${target}-section`).classList.add('active');
                
                if(target === 'analytics') this.renderPerformanceCharts();
            });
        });

        document.querySelectorAll('.navigate-to-focus').forEach(el => {
            el.addEventListener('click', () => {
                const focusMenu = Array.from(this.dom.menuItems).find(i => i.getAttribute('data-target') === 'focus');
                if(focusMenu) focusMenu.click();
            });
        });
    }

    bindEvents() {
        this.dom.themeToggle.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';
            this.switchTheme(next);
        });

        // Search engine index binding
        this.dom.search.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                const query = this.dom.search.value.trim();
                if(AppState.days[query]) {
                    activeViewingDate = query;
                    this.syncSystemState(activeViewingDate);
                    this.showToast(`Mapsd matrix to ${query}`, 'info');
                    this.dom.search.value = '';
                } else {
                    this.showToast("Date out of detox scope bounds", 'danger');
                }
            }
        });

        this.dom.jumpToday.addEventListener('click', () => {
            activeViewingDate = getTodayString();
            this.syncSystemState(activeViewingDate);
            this.showToast("Snapped focus to tracking anchor date.", "info");
        });

        this.dom.prevDay.addEventListener('click', () => this.offsetActiveDate(-1));
        this.dom.nextDay.addEventListener('click', () => this.offsetActiveDate(1));

        // Form checkbox reactivity interceptor
        this.dom.habitsForm.addEventListener('change', (e) => {
            const chk = e.target;
            const key = chk.getAttribute('data-habit');
            if(key) {
                AppState.days[activeViewingDate].habits[key] = chk.checked;
                saveStateToLocalStorage();
                this.calculateMetricsAndStreakEngine();
                this.updateFocusInterfacePercentageOnly();
                this.refreshCalendarCellNode(activeViewingDate);
            }
        });

        // Journal input persistence architecture
        let debounceTimer;
        this.dom.notesTextarea.addEventListener('input', () => {
            document.getElementById('notes-save-status').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing to state buffer...`;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                AppState.days[activeViewingDate].notes = this.dom.notesTextarea.value;
                saveStateToLocalStorage();
                document.getElementById('notes-save-status').innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Automatically saved to state`;
            }, 500);
        });

        // Global recovery management bindings
        document.getElementById('btn-export').addEventListener('click', () => this.exportStateDataJson());
        document.getElementById('btn-import-trigger').addEventListener('click', () => document.getElementById('file-import-input').click());
        document.getElementById('file-import-input').addEventListener('change', (e) => this.importStateDataJson(e));
        
        document.getElementById('btn-backup-download').addEventListener('click', () => this.exportStateDataJson());
        document.getElementById('btn-backup-restore-trigger').addEventListener('click', () => document.getElementById('file-restore-input').click());
        document.getElementById('file-restore-input').addEventListener('change', (e) => this.importStateDataJson(e));

        document.getElementById('btn-reset-system').addEventListener('click', () => {
            if(confirm("CRITICAL WARNING: This will permanently purge your local engine analytics state. Proceed?")) {
                generateBlankBaseState();
                window.location.reload();
            }
        });
    }

    switchTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        AppState.meta.theme = theme;
        saveStateToLocalStorage();
        const icon = this.dom.themeToggle.querySelector('i');
        if(theme === 'dark') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    }

    offsetActiveDate(days) {
        const idx = MASTER_TIMELINE.indexOf(activeViewingDate);
        const nextIdx = idx + days;
        if(nextIdx >= 0 && nextIdx < MASTER_TIMELINE.length) {
            activeViewingDate = MASTER_TIMELINE[nextIdx];
            this.syncSystemState(activeViewingDate);
        } else {
            this.showToast("Boundary of program timeline achieved.", "info");
        }
    }

    // 6. SYNCHRONIZATION RUNTIME CALCULATOR & RENDERING
    syncSystemState(dateStr) {
        // Hydrate checklist DOM states
        const node = AppState.days[dateStr];
        const chks = this.dom.habitsForm.querySelectorAll('input[type="checkbox"]');
        chks.forEach(chk => {
            const key = chk.getAttribute('data-habit');
            chk.checked = node.habits[key] || false;
        });

        this.dom.notesTextarea.value = node.notes || "";
        
        // Date strings label layout parsing
        const parsedDate = new Date(dateStr + "T00:00:00");
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const displayStr = parsedDate.toLocaleDateString('en-US', options);
        
        document.getElementById('current-date-badge').innerText = displayStr;
        this.dom.focusViewDateString.innerText = `Viewing Focus Matrix: ${displayStr}`;
        
        // Randomize non-disruptive quotes across top header nodes
        const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        document.getElementById('daily-quote').innerText = `"${MOTIVATIONAL_QUOTES[hash % MOTIVATIONAL_QUOTES.length]}"`;

        this.calculateMetricsAndStreakEngine();
        this.updateFocusInterfacePercentageOnly();
        this.highlightActiveCalendarCell(dateStr);
    }

    updateFocusInterfacePercentageOnly() {
        const node = AppState.days[activeViewingDate];
        let total = HABIT_KEYS.length;
        let checked = 0;
        HABIT_KEYS.forEach(k => { if(node.habits[k]) checked++; });
        
        const pct = Math.round((checked / total) * 100);
        document.getElementById('widget-today-pct').innerText = `${pct}%`;
        document.getElementById('today-status-label').innerText = pct === 100 ? "🏆 Perfect" : (pct > 0 ? "In Progress" : "Not Started");
        
        this.setCircleProgress('today-progress-circle', pct, 55);

        if(pct === 100) {
            this.dom.perfectBanner.classList.remove('hidden');
            triggerConfettiExplosion();
        } else {
            this.dom.perfectBanner.classList.add('hidden');
        }
    }

    calculateMetricsAndStreakEngine() {
        let metrics = {
            totalPossibleActions: MASTER_TIMELINE.length * HABIT_KEYS.length,
            completedActions: 0,
            perfectDays: 0,
            currentStreak: 0,
            daysDeep: 0
        };

        let currentStreakChain = 0;
        let computedLongestStreak = AppState.meta.longestStreak || 0;
        let todayStr = new Date().toISOString().split('T')[0];

        MASTER_TIMELINE.forEach((d) => {
            const dayNode = AppState.days[d];
            let done = 0;
            HABIT_KEYS.forEach(k => { if(dayNode.habits[k]) done++; });
            
            metrics.completedActions += done;
            
            // Evaluates execution status color codes
            let status = 'future';
            if(d <= todayStr || done > 0) {
                status = done === HABIT_KEYS.length ? 'perfect' : (done > 0 ? 'partial' : 'missed');
            }

            if(status === 'perfect') {
                metrics.perfectDays++;
                currentStreakChain++;
                if(currentStreakChain > computedLongestStreak) computedLongestStreak = currentStreakChain;
            } else {
                // Streaks are sustained exclusively via flawless execution validation chains
                if(d < todayStr) {
                    currentStreakChain = 0; 
                }
            }

            if(d <= todayStr) metrics.daysDeep++;
        });

        // Set structural tracking parameters back inside global arrays
        AppState.meta.longestStreak = computedLongestStreak;
        metrics.currentStreak = currentStreakChain;
        
        // Push computed visual metrics into operational dashboard indicators
        const overallProgressPct = Math.round((metrics.completedActions / metrics.totalPossibleActions) * 100) || 0;
        document.getElementById('metric-progress-pct').innerText = overallProgressPct;
        document.getElementById('metric-days-completed').innerText = metrics.daysDeep;
        document.getElementById('metric-current-streak').innerText = metrics.currentStreak;
        document.getElementById('metric-longest-streak').innerText = computedLongestStreak;
        document.getElementById('metric-perfect-days').innerText = metrics.perfectDays;
        
        const consistency = Math.round((metrics.perfectDays / Math.max(metrics.daysDeep, 1)) * 100);
        document.getElementById('metric-consistency-score').innerText = consistency;
        
        document.getElementById('metric-total-completed').innerText = metrics.completedActions;
        document.getElementById('metric-total-remaining').innerText = metrics.totalPossibleActions - metrics.completedActions;

        document.getElementById('cd-days-num').innerText = metrics.daysDeep;
        const remainingDays = Math.max(MASTER_TIMELINE.length - metrics.daysDeep, 0);
        document.getElementById('cd-rem-num').innerText = remainingDays;
        
        const timelinePct = Math.min((metrics.daysDeep / MASTER_TIMELINE.length) * 100, 100);
        document.getElementById('timeline-fill').style.width = `${timelinePct}%`;

        document.getElementById('sb-day-num').innerText = metrics.daysDeep;
        document.getElementById('floating-widget-pct').innerText = `${overallProgressPct}%`;

        this.setCircleProgress('global-progress-circle', overallProgressPct, 40);
        
        // Execute dynamic modules asynchronously during system cycle ticks
        this.renderAchievementsDashboardView(metrics.perfectDays, computedLongestStreak);
    }

    setCircleProgress(id, percentage, radius) {
        const circle = document.getElementById(id);
        if(!circle) return;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    // 7. CALENDAR ARCHITECTURE LAYOUT COMPILER ENGINE
    renderCalendarMatrices() {
        this.dom.calendarContainer.innerHTML = "";
        
        // Map timelines inside segmented structural tracking arrays based on structural calendar breaks
        let structuralMonths = {};
        MASTER_TIMELINE.forEach(d => {
            const mKey = d.substring(0, 7); // "2026-06"
            if(!structuralMonths[mKey]) structuralMonths[mKey] = [];
            structuralMonths[mKey].push(d);
        });

        Object.keys(structuralMonths).forEach(mKey => {
            const daysInMonthArray = structuralMonths[mKey];
            const firstDateObj = new Date(daysInMonthArray[0] + "T00:00:00");
            const startDayOfWeek = firstDateObj.getDay(); // 0 = Sun, etc.

            const monthCardNode = document.createElement('div');
            monthCardNode.className = "month-card";
            
            const monthHeaderTitle = firstDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            let html = `<h4>${monthHeaderTitle}</h4>`;
            html += `<div class="calendar-days-header-grid">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>`;
            html += `<div class="calendar-days-interactive-grid">`;

            // Backfill initial empty placeholders to handle aligned positioning offsets
            for(let i=0; i<startDayOfWeek; i++) {
                html += `<div class="cal-day empty"></div>`;
            }

            daysInMonthArray.forEach(d => {
                const dayNum = d.split('-')[2];
                html += `<div class="cal-day" id="cal-node-${d}" data-date="${d}">${parseInt(dayNum)}</div>`;
            });

            html += `</div>`;
            monthCardNode.innerHTML = html;
            this.dom.calendarContainer.appendChild(monthCardNode);
        });

        // Event intercept delegation attachment mapping
        this.dom.calendarContainer.addEventListener('click', (e) => {
            const cell = e.target.closest('.cal-day:not(.empty)');
            if(cell) {
                activeViewingDate = cell.getAttribute('data-date');
                this.syncSystemState(activeViewingDate);
                this.showToast(`Active vector focus target transformed: ${activeViewingDate}`, 'info');
            }
        });

        // Hydrate contextual execution states inside grid layout structures
        MASTER_TIMELINE.forEach(d => this.refreshCalendarCellNode(d));
        this.highlightActiveCalendarCell(activeViewingDate);
    }

    refreshCalendarCellNode(dateStr) {
        const node = document.getElementById(`cal-node-${dateStr}`);
        if(!node) return;
        
        const dayNode = AppState.days[dateStr];
        let done = 0;
        HABIT_KEYS.forEach(k => { if(dayNode.habits[k]) done++; });
        
        let status = 'future';
        let todayStr = new Date().toISOString().split('T')[0];
        if(dateStr <= todayStr || done > 0) {
            status = done === HABIT_KEYS.length ? 'perfect' : (done > 0 ? 'partial' : 'missed');
        }

        node.className = `cal-day ${status}`;
        if(dateStr === activeViewingDate) node.classList.add('active-viewing');
    }

    highlightActiveCalendarCell(dateStr) {
        document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('active-viewing'));
        const node = document.getElementById(`cal-node-${dateStr}`);
        if(node) node.classList.add('active-viewing');
    }

    // 8. CHART.JS INTEGRATION MODULE
    renderPerformanceCharts() {
        // Safe disposal loops to scale interface frames cleanly without memory bloat leaks
        if(this.charts.radar) this.charts.radar.destroy();
        if(this.charts.trend) this.charts.trend.destroy();

        // Accumulate mathematical metrics mapping completion indexes
        let habitTotals = {};
        HABIT_KEYS.forEach(k => habitTotals[k] = 0);
        
        let weeklyBundles = {};
        
        MASTER_TIMELINE.forEach(d => {
            const node = AppState.days[d];
            HABIT_KEYS.forEach(k => { if(node.habits[k]) habitTotals[k]++; });

            // Segment chronological data strings into quick operational tracking matrices
            const dt = new Date(d + "T00:00:00");
            const baseIsoStr = new Date(START_DATE_STR+"T00:00:00");
            const diffDays = Math.floor((dt - baseIsoStr) / (1000*60*60*24));
            const weekNum = Math.floor(diffDays / 7) + 1;
            
            if(!weeklyBundles[weekNum]) weeklyBundles[weekNum] = { completed: 0, total: 0 };
            HABIT_KEYS.forEach(k => {
                weeklyBundles[weekNum].total++;
                if(node.habits[k]) weeklyBundles[weekNum].completed++;
            });
        });

        // UI Dashboard Stats Calculation Blocks
        let gymDays = habitTotals['gym'] || 0;
        document.getElementById('stat-gym-hours').innerText = `${gymDays * 2} Hours`;
        
        let sortedHabitKeys = [...HABIT_KEYS].sort((a,b) => habitTotals[b] - habitTotals[a]);
        document.getElementById('stat-most-successful').innerText = transformCamelCase(sortedHabitKeys[0]);
        document.getElementById('stat-least-successful').innerText = transformCamelCase(sortedHabitKeys[sortedHabitKeys.length - 1]);
        
        let totalPossible = MASTER_TIMELINE.length * HABIT_KEYS.length;
        let totalDone = Object.values(habitTotals).reduce((a,b)=>a+b, 0);
        document.getElementById('stat-discipline-score').innerText = `${Math.round((totalDone/totalPossible)*100)} / 100`;

        // Instantiating Chart.js Configurations Engine Structures
        const ctxRadar = document.getElementById('habitRadarChart').getContext('2d');
        const radarLabels = HABIT_KEYS.map(k => transformCamelCase(k));
        const radarData = HABIT_KEYS.map(k => Math.round((habitTotals[k] / MASTER_TIMELINE.length) * 100));

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        const textColor = isDark ? '#f3f4f6' : '#111827';

        this.charts.radar = new Chart(ctxRadar, {
            type: 'radar',
            data: {
                labels: radarLabels,
                datasets: [{
                    label: 'Execution Percentage (%)',
                    data: radarData,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    pointBackgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        grid: { color: gridColor },
                        angleLines: { color: gridColor },
                        pointLabels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } },
                        suggestedMin: 0, suggestedMax: 100
                    }
                }
            }
        });

        const ctxTrend = document.getElementById('weeklyTrendChart').getContext('2d');
        const trendLabels = Object.keys(weeklyBundles).map(w => `Wk ${w}`);
        const trendData = Object.keys(weeklyBundles).map(w => Math.round((weeklyBundles[w].completed / weeklyBundles[w].total) * 100));

        this.charts.trend = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    data: trendData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor }, min: 0, max: 100 }
                }
            }
        });
    }

    // 9. REWARD METRIC ARCHIVE DECOY BUILDER
    renderAchievementsDashboardView(perfectDays, longestStreak) {
        this.dom.achievementsGrid.innerHTML = "";
        
        // Metric Evaluation Blueprint arrays
        const roster = [
            { id: 's7', icon: '🔥', title: '7-Day Streak', desc: 'Secure 7 continuous perfect programmatic vectors.', check: () => longestStreak >= 7 },
            { id: 's30', icon: '💎', title: '30-Day Streak', desc: 'Maintain perfect execution metrics for 30 cycles.', check: () => longestStreak >= 30 },
            { id: 's120', icon: '💯', title: '120-Day Legend', desc: 'Conquer the master timeline with unyielding grit.', check: () => longestStreak >= 120 },
            { id: 'p10', icon: '🏆', title: 'Discipline Master', desc: 'Log 10 perfect independent days inside the ledger.', check: () => perfectDays >= 10 },
            { id: 'gymW', icon: '🏋️', title: 'Gym Warrior', desc: 'Exert physical force across high-intensity brackets.', check: () => (AppState.meta.longestStreak > 2) } // Abstract baseline unlocked automatically during activity tracking
        ];

        roster.forEach(ach => {
            const unlocked = ach.check();
            const card = document.createElement('div');
            card.className = `achievement-card glass ${unlocked ? 'unlocked' : ''}`;
            card.innerHTML = `
                <div class="achievement-icon">${ach.icon}</div>
                <div class="achievement-meta">
                    <h4>${ach.title}</h4>
                    <p>${ach.desc}</p>
                </div>
            `;
            this.dom.achievementsGrid.appendChild(card);
        });
    }

    // 10. SYSTEM BACKUP EXPORT & RECOVERY CONTROLLER PIPELINES
    exportStateDataJson() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `ascent_detox_state_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        this.showToast("Local architecture backup state exported successfully.", "info");
    }

    importStateDataJson(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                if(parsed.days) {
                    AppState = parsed;
                    saveStateToLocalStorage();
                    this.showToast("Structural operational parameters parsed. Syncing database context...", "info");
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    this.showToast("Invalid data structure layout constraints.", "danger");
                }
            } catch(err) {
                this.showToast("Parsing protocol failures experienced during compilation.", "danger");
            }
        };
        reader.readAsText(file);
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        
        let icon = 'fa-info-circle';
        if(type === 'danger') icon = 'fa-exclamation-triangle';
        
        el.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(el);
        
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 400);
        }, 3500);
    }
}

// 11. HIGH-PERFORMANCE LIGHTWEIGHT CONFETTI PARTICLE SYSTEM ENGINE
function triggerConfettiExplosion() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2 + 50,
            radius: Math.random() * 4 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.7) * 15 - 5,
            alpha: 1
        });
    }

    function renderFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeParticles = false;

        particles.forEach(p => {
            if (p.alpha > 0) {
                activeParticles = true;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.25; // Simulated gravitational acceleration mechanics
                p.alpha -= 0.015;

                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                ctx.restore();
            }
        });

        if (activeParticles) requestAnimationFrame(renderFrame);
    }
    renderFrame();
}

function transformCamelCase(str) {
    if(!str) return "";
    let res = str.replace(/([A-Z])/g, " $1");
    return res.charAt(0).toUpperCase() + res.slice(1);
}

// Initialization runtime kickoff trigger
document.addEventListener('DOMContentLoaded', () => {
    window.AscentInstance = new AscentApplication();
});