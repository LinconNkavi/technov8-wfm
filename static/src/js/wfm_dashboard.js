/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

function getTodaySastDateStr() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Johannesburg",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year").value;
    const m = parts.find((p) => p.type === "month").value;
    const d = parts.find((p) => p.type === "day").value;
    return `${y}-${m}-${d}`;
}

function getNowSastTimeStr() {
    return (
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Africa/Johannesburg",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(new Date()) + " SAST"
    );
}

function countInclusiveDays(startStr, endStr) {
    if (!startStr || !endStr) {
        return 0;
    }
    const s = new Date(`${startStr}T00:00:00`);
    const e = new Date(`${endStr}T00:00:00`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
        return 0;
    }
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

const SECTION_LABELS = {
    employees: "Employees",
    attendance: "Attendance",
    reports: "Reports",
    settings: "Settings",
};

class Technov8WfmDashboard extends Component {
    static template = "technov8_wfm.DashboardTemplate";

    setup() {
        const todayStr = getTodaySastDateStr();
        this.state = useState({
            activeNav: "dashboard",
            dashboardTab: "overview",
            employeeTab: "view_employees",
            attendanceTab: "view_attendance",
            leaveTab: "apply_leave",
            reportTab: "generate_reports",

            // Top-right profile icon dropdown state
            accountMenuOpen: false,

            // Auth & Pass Key state
            authMode: "login",
            loggedInAccountId: null,
            loginEmail: "",
            loginPassword: "",
            signupName: "",
            signupEmail: "",
            signupPassword: "",
            signupConfirmPassword: "",
            pendingConfirmEmail: "",
            confirmationInputCode: "",
            authError: "",
            authSuccess: "",

            // Pass Key Code standalone gate (completely hidden once confirmed)
            passkeyInput: "",
            passkeyError: "",
            passkeyUnlocked: false,

            accounts: [
                {
                    id: 1,
                    employeeId: 1,
                    name: "Lerato Dlamini",
                    email: "lerato.dlamini@technov8.co.za",
                    password: "Password123!",
                    emailConfirmed: true,
                    confirmationCode: "TNV-1001",
                    passkeyCode: "PK-LERATO-8492",
                },
                {
                    id: 2,
                    employeeId: 2,
                    name: "Thabo Nkosi",
                    email: "thabo.nkosi@technov8.co.za",
                    password: "Password123!",
                    emailConfirmed: true,
                    confirmationCode: "TNV-1002",
                    passkeyCode: "PK-THABO-3910",
                },
                {
                    id: 3,
                    employeeId: 3,
                    name: "Naledi Mokoena",
                    email: "naledi.mokoena@technov8.co.za",
                    password: "Password123!",
                    emailConfirmed: true,
                    confirmationCode: "TNV-1003",
                    passkeyCode: "PK-NALEDI-7204",
                },
            ],

            // Strict daily attendance tracking
            currentDateStr: todayStr,
            clockNotice: "",
            leaveBalance: 18,
            teamMembersCount: 4,

            recentActivity: [
                { id: 1, title: "Clocked in", subtitle: "09:00 AM ? Sandton Gate" },
                { id: 2, title: "Leave request approved", subtitle: "Yesterday ? Annual Leave" },
                { id: 3, title: "Facial terminal check synced", subtitle: "2 days ago ? Office Biometric" },
            ],

            employees: [
                {
                    id: 1,
                    name: "Lerato Dlamini",
                    role: "Portal Controller & Software Engineer",
                    department: "Engineering",
                    email: "lerato.dlamini@technov8.co.za",
                    phone: "+27 11 555 0141",
                    location: "Sandton",
                    facialRegistered: false,
                    photoFile: "",
                    access: {
                        dashboard: true,
                        leave: true,
                        employees: true,
                        attendance: true,
                        reports: true,
                        settings: true,
                    },
                },
                {
                    id: 2,
                    name: "Thabo Nkosi",
                    role: "Systems & Infrastructure Specialist",
                    department: "IT & Operations",
                    email: "thabo.nkosi@technov8.co.za",
                    phone: "+27 41 555 0182",
                    location: "Gqeberha",
                    facialRegistered: true,
                    photoFile: "thabo_gate_face.jpg",
                    access: {
                        dashboard: true,
                        leave: true,
                        employees: false,
                        attendance: false,
                        reports: false,
                        settings: false,
                    },
                },
                {
                    id: 3,
                    name: "Naledi Mokoena",
                    role: "People & WFM Coordinator",
                    department: "People & Operations",
                    email: "naledi.mokoena@technov8.co.za",
                    phone: "+27 11 555 0195",
                    location: "WFH",
                    facialRegistered: false,
                    photoFile: "",
                    access: {
                        dashboard: true,
                        leave: true,
                        employees: false,
                        attendance: false,
                        reports: false,
                        settings: false,
                    },
                },
                {
                    id: 4,
                    name: "Sipho Khumalo",
                    role: "Line Manager - Engineering",
                    department: "Engineering",
                    email: "sipho.khumalo@technov8.co.za",
                    phone: "+27 11 555 0164",
                    location: "Sandton",
                    facialRegistered: true,
                    photoFile: "sipho_gate_face.jpg",
                    access: {
                        dashboard: true,
                        leave: true,
                        employees: false,
                        attendance: false,
                        reports: false,
                        settings: false,
                    },
                },
            ],

            accessRequests: [],
            accessRequestNotice: "",

            loggedInUserId: 1,
            selectedEmployeeForRegisterId: 1,
            accessSearchQuery: "",
            selectedAccessEmployeeId: 2,
            accessSavedNotice: "",

            selectedMonth: todayStr.slice(0, 7),
            monthlyAttendance: [
                {
                    id: 101,
                    employeeId: 1,
                    date: "2026-11-18",
                    dayName: "Wed",
                    status: "In Office",
                    timeIn: "08:42:00 SAST",
                    timeOut: "17:08:00 SAST",
                    recordState: "Good Record",
                    site: "Sandton",
                },
                {
                    id: 102,
                    employeeId: 1,
                    date: "2026-11-19",
                    dayName: "Thu",
                    status: "In Office",
                    timeIn: "08:50:00 SAST",
                    timeOut: "17:12:00 SAST",
                    recordState: "Good Record",
                    site: "Sandton",
                },
                {
                    id: 103,
                    employeeId: 1,
                    date: "2026-11-04",
                    dayName: "Wed",
                    status: "Day Off",
                    timeIn: "-",
                    timeOut: "-",
                    recordState: "Approved Leave",
                    site: "Approved Leave",
                },
                {
                    id: 104,
                    employeeId: 1,
                    date: "2026-11-05",
                    dayName: "Thu",
                    status: "In Office",
                    timeIn: "08:38:00 SAST",
                    timeOut: "17:05:00 SAST",
                    recordState: "Good Record",
                    site: "Sandton",
                },
                {
                    id: 105,
                    employeeId: 1,
                    date: "2026-11-06",
                    dayName: "Fri",
                    status: "Absent",
                    timeIn: "-",
                    timeOut: "-",
                    recordState: "Unscheduled Absence",
                    site: "Unscheduled Absence",
                },
                {
                    id: 106,
                    employeeId: 2,
                    date: "2026-11-19",
                    dayName: "Thu",
                    status: "In Office",
                    timeIn: "08:45:00 SAST",
                    timeOut: "17:04:00 SAST",
                    recordState: "Good Record",
                    site: "Gqeberha",
                },
                {
                    id: 107,
                    employeeId: 3,
                    date: "2026-11-19",
                    dayName: "Thu",
                    status: "Day Off",
                    timeIn: "-",
                    timeOut: "-",
                    recordState: "Approved Leave",
                    site: "WFH",
                },
            ],

            leaveType: "Annual Leave",
            leaveDays: 2,
            leaveNotice: "",
            leaveRequests: [
                {
                    ref: "LV-101",
                    employeeName: "Lerato Dlamini",
                    type: "Annual Leave",
                    days: 2,
                    department: "Engineering",
                    movedToSpecialist: true,
                    specialistStatus: "Specialist Approved",
                    managerStatus: "Line Manager Approved",
                    finalStatus: "Approved",
                },
            ],

            reportStartDate: todayStr,
            reportEndDate: todayStr,
            appliedStartDate: todayStr,
            appliedEndDate: todayStr,
            reportVersion: 1,
            reportStatusMessage: "Showing latest clock-in and clock-out records.",

            settings: {
                singleClockInPerDay: true,
                requireClockOutForGoodRecord: true,
                lateGraceMinutes: 15,
                biometricWebhookUrl: "/technov8/biometric/scan",
                autoSyncBiometricPunches: true,
                requireFacePhotoBeforeGate: false,
                routeLeaveToSpecialistFirst: true,
                requireLineManagerAfterSpecialist: true,
                defaultReportRange: "today",
                includeIncompleteInExcel: true,
                requirePasskeyAfterLogin: true,
                timezone: "Africa/Johannesburg (SAST)",
            },
            settingsSavedNotice: "",
        });

        this.reconcileMissedClockOuts();
    }

    reconcileMissedClockOuts() {
        const today = this.state.currentDateStr;
        for (const row of this.state.monthlyAttendance) {
            if (row.date < today && row.timeIn !== "-" && row.timeOut === "-") {
                row.recordState = "Not Updated (Missed Clock Out)";
            }
        }
    }

    get todayAttendanceRecord() {
        this.reconcileMissedClockOuts();
        return (
            this.state.monthlyAttendance.find(
                (r) =>
                    r.employeeId === this.state.loggedInUserId &&
                    r.date === this.state.currentDateStr
            ) || null
        );
    }

    get todayClockStage() {
        const rec = this.todayAttendanceRecord;
        if (!rec) {
            return "not_clocked_in";
        }
        if (rec.timeIn !== "-" && rec.timeOut === "-") {
            return "clocked_in_awaiting_out";
        }
        return "completed_today";
    }

    get hoursTodayLabel() {
        const stage = this.todayClockStage;
        if (stage === "not_clocked_in") {
            return "0h";
        }
        if (stage === "clocked_in_awaiting_out") {
            return "In Progress";
        }
        return "8h";
    }

    get goodRecordsCount() {
        return this.state.monthlyAttendance.filter(
            (r) =>
                r.employeeId === this.state.loggedInUserId &&
                r.date.startsWith(this.state.selectedMonth) &&
                r.recordState === "Good Record"
        ).length;
    }

    get currentAccount() {
        if (!this.state.loggedInAccountId) {
            return null;
        }
        return this.state.accounts.find((a) => a.id === this.state.loggedInAccountId) || null;
    }

    get pendingAccount() {
        if (!this.state.pendingConfirmEmail) {
            return null;
        }
        return (
            this.state.accounts.find(
                (a) => a.email.toLowerCase() === this.state.pendingConfirmEmail.trim().toLowerCase()
            ) || null
        );
    }

    get loggedInEmployee() {
        return (
            this.state.employees.find((e) => e.id === this.state.loggedInUserId) ||
            this.state.employees[0]
        );
    }

    get isLeratoController() {
        const emp = this.loggedInEmployee;
        return Boolean(
            emp &&
                (emp.id === 1 ||
                    emp.email.toLowerCase() === "lerato.dlamini@technov8.co.za" ||
                    emp.name.toLowerCase() === "lerato dlamini")
        );
    }

    hasDirectAccess(sectionKey) {
        if (sectionKey === "dashboard" || sectionKey === "leave") {
            return true;
        }
        if (this.isLeratoController) {
            return true;
        }
        const emp = this.loggedInEmployee;
        return Boolean(emp && emp.access && emp.access[sectionKey]);
    }

    getSectionLabel(sectionKey) {
        return SECTION_LABELS[sectionKey] || sectionKey;
    }

    getMyAccessRequestFor(sectionKey) {
        return (
            this.state.accessRequests.find(
                (r) => r.employeeId === this.loggedInEmployee.id && r.sectionKey === sectionKey
            ) || null
        );
    }

    getMyRequestsList() {
        return this.state.accessRequests.filter((r) => r.employeeId === this.loggedInEmployee.id);
    }

    requestAccessToSection(sectionKey) {
        if (this.isLeratoController || this.hasDirectAccess(sectionKey)) {
            return;
        }
        const existing = this.getMyAccessRequestFor(sectionKey);
        const label = this.getSectionLabel(sectionKey);
        if (existing) {
            existing.status = "Pending";
            existing.requestedAt = getNowSastTimeStr();
            this.state.accessRequestNotice = `Live access request for ${label} sent to Lerato Dlamini ? Status: Pending.`;
            return;
        }
        this.state.accessRequests.unshift({
            id: Date.now(),
            employeeId: this.loggedInEmployee.id,
            employeeName: this.loggedInEmployee.name,
            sectionKey,
            sectionLabel: label,
            status: "Pending",
            requestedAt: getNowSastTimeStr(),
        });
        this.state.accessRequestNotice = `Live access request for ${label} sent to Lerato Dlamini ? Status: Pending.`;
        this.state.recentActivity.unshift({
            id: Date.now(),
            title: `Requested ${label} access`,
            subtitle: `${this.loggedInEmployee.name} ? Pending Lerato Dlamini approval`,
        });
    }

    approveAccessRequest(req) {
        if (!this.isLeratoController) {
            return;
        }
        req.status = "Approved";
        const emp = this.state.employees.find((e) => e.id === req.employeeId);
        if (emp && emp.access) {
            emp.access[req.sectionKey] = true;
        }
    }

    denyAccessRequest(req) {
        if (!this.isLeratoController) {
            return;
        }
        req.status = "Denied";
        const emp = this.state.employees.find((e) => e.id === req.employeeId);
        if (emp && emp.access) {
            emp.access[req.sectionKey] = false;
        }
    }

    get hasUnregisteredFacial() {
        return this.state.employees.some((e) => !e.facialRegistered);
    }

    get filteredAccessEmployees() {
        const q = (this.state.accessSearchQuery || "").trim().toLowerCase();
        if (!q) {
            return this.state.employees;
        }
        return this.state.employees.filter(
            (e) =>
                e.name.toLowerCase().includes(q) ||
                e.role.toLowerCase().includes(q) ||
                e.department.toLowerCase().includes(q)
        );
    }

    get selectedAccessEmployee() {
        const list = this.filteredAccessEmployees;
        const match = list.find((e) => e.id === this.state.selectedAccessEmployeeId);
        return match || list[0] || null;
    }

    get myMonthlyAttendance() {
        this.reconcileMissedClockOuts();
        return this.state.monthlyAttendance.filter(
            (row) =>
                row.employeeId === this.state.loggedInUserId &&
                row.date.startsWith(this.state.selectedMonth)
        );
    }

    get myAttendanceSummary() {
        const rows = this.myMonthlyAttendance;
        return {
            inOffice: rows.filter((r) => r.status === "In Office" && r.recordState === "Good Record").length,
            daysOff: rows.filter((r) => r.status === "Day Off").length,
            absent: rows.filter((r) => r.status === "Absent").length,
            incomplete: rows.filter((r) => r.recordState === "Not Updated (Missed Clock Out)").length,
        };
    }

    get selectedReportDaysCount() {
        return countInclusiveDays(this.state.reportStartDate, this.state.reportEndDate);
    }

    get filteredReportRows() {
        void this.state.reportVersion;
        this.reconcileMissedClockOuts();
        const startStr = this.state.appliedStartDate;
        const endStr = this.state.appliedEndDate;
        if (!startStr || !endStr || endStr < startStr) {
            return [];
        }
        return this.state.monthlyAttendance.filter((r) => {
            if (r.date < startStr || r.date > endStr) {
                return false;
            }
            if (!this.state.settings.includeIncompleteInExcel && r.timeOut === "-") {
                return false;
            }
            return true;
        });
    }

    getEmployeeName(employeeId) {
        const found = this.state.employees.find((e) => e.id === employeeId);
        return found ? found.name : "Employee";
    }

    getEmployeeRole(employeeId) {
        const found = this.state.employees.find((e) => e.id === employeeId);
        return found ? found.role : "";
    }

    toggleAccountMenu() {
        this.state.accountMenuOpen = !this.state.accountMenuOpen;
    }

    switchAuthMode(mode) {
        this.state.authMode = mode;
        this.state.authError = "";
        this.state.authSuccess = "";
    }

    handleSignup() {
        this.state.authError = "";
        this.state.authSuccess = "";

        const name = (this.state.signupName || "").trim();
        const email = (this.state.signupEmail || "").trim().toLowerCase();
        const password = this.state.signupPassword || "";
        const confirmPassword = this.state.signupConfirmPassword || "";

        if (!name || !email || !password) {
            this.state.authError = "Please enter your name, email, and password to sign up.";
            return;
        }
        if (password.length < 6) {
            this.state.authError = "Password must be at least 6 characters long.";
            return;
        }
        if (password !== confirmPassword) {
            this.state.authError = "Passwords do not match.";
            return;
        }

        const existing = this.state.accounts.find((a) => a.email.toLowerCase() === email);
        if (existing) {
            if (!existing.emailConfirmed) {
                this.state.pendingConfirmEmail = existing.email;
                this.state.authMode = "confirm";
                this.state.authError = "This email is registered but not confirmed yet. Confirm your email first.";
                return;
            }
            this.state.authError = "An account with this email already exists. Please log in.";
            return;
        }

        const isLeratoSignup = email === "lerato.dlamini@technov8.co.za" || name.toLowerCase() === "lerato dlamini";
        const newEmpId = this.state.employees.length + 1;
        this.state.employees.push({
            id: newEmpId,
            name,
            role: isLeratoSignup ? "Portal Controller & Software Engineer" : "Team Member",
            department: "Engineering",
            email,
            phone: "+27 11 555 0199",
            location: "Sandton",
            facialRegistered: false,
            photoFile: "",
            access: isLeratoSignup
                ? {
                      dashboard: true,
                      leave: true,
                      employees: true,
                      attendance: true,
                      reports: true,
                      settings: true,
                  }
                : {
                      dashboard: true,
                      leave: true,
                      employees: false,
                      attendance: false,
                      reports: false,
                      settings: false,
                  },
        });

        const code = `TNV-${Math.floor(1000 + Math.random() * 9000)}`;
        const prefix = name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 6) || "USER";
        const passkey = `PK-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

        this.state.accounts.push({
            id: this.state.accounts.length + 1,
            employeeId: newEmpId,
            name,
            email,
            password,
            emailConfirmed: false,
            confirmationCode: code,
            passkeyCode: passkey,
        });

        this.state.pendingConfirmEmail = email;
        this.state.confirmationInputCode = code;
        this.state.authMode = "confirm";
        this.state.signupPassword = "";
        this.state.signupConfirmPassword = "";
        this.state.authSuccess = `Account created for ${email}. Confirm your email before logging in.`;
    }

    handleConfirmEmail() {
        this.state.authError = "";
        this.state.authSuccess = "";

        const acct = this.pendingAccount;
        if (!acct) {
            this.state.authError = "No pending email confirmation found. Sign up first.";
            return;
        }

        const entered = (this.state.confirmationInputCode || "").trim();
        if (!entered || entered !== acct.confirmationCode) {
            this.state.authError = `Invalid confirmation code. Expected code: ${acct.confirmationCode}`;
            return;
        }

        acct.emailConfirmed = true;
        this.state.loginEmail = acct.email;
        this.state.loginPassword = "";
        this.state.authMode = "login";
        this.state.authSuccess = `Email confirmed for ${acct.email}. Now log in with your email and password.`;
    }

    handleEmailPasswordLogin() {
        this.state.authError = "";
        this.state.authSuccess = "";

        const email = (this.state.loginEmail || "").trim().toLowerCase();
        const password = this.state.loginPassword || "";

        if (!email || !password) {
            this.state.authError = "Please enter both your email and password.";
            return;
        }

        const acct = this.state.accounts.find((a) => a.email.toLowerCase() === email);
        if (!acct) {
            this.state.authError = "Account not found. Please sign up first and confirm your email.";
            return;
        }

        if (!acct.emailConfirmed) {
            this.state.pendingConfirmEmail = acct.email;
            this.state.confirmationInputCode = acct.confirmationCode;
            this.state.authMode = "confirm";
            this.state.authError = "You must confirm your email before logging in.";
            return;
        }

        if (acct.password !== password) {
            this.state.authError = "Incorrect password for this account.";
            return;
        }

        this.state.loggedInAccountId = acct.id;
        this.state.loggedInUserId = acct.employeeId;
        this.state.activeNav = "dashboard";
        this.state.accessRequestNotice = "";
        this.state.loginPassword = "";
        this.state.passkeyInput = "";
        this.state.passkeyError = "";
        this.state.passkeyUnlocked = !this.state.settings.requirePasskeyAfterLogin;
        this.state.accountMenuOpen = false;
        this.state.clockNotice = "";
    }

    logoutAccount() {
        this.state.loggedInAccountId = null;
        this.state.activeNav = "dashboard";
        this.state.accessRequestNotice = "";
        this.state.accountMenuOpen = false;
        this.state.passkeyInput = "";
        this.state.passkeyError = "";
        this.state.passkeyUnlocked = false;
        this.state.authMode = "login";
        this.state.authError = "";
        this.state.authSuccess = "";
    }

    regenerateMyPasskey() {
        const acct = this.currentAccount;
        if (!acct) {
            return;
        }
        const prefix = acct.name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 6) || "USER";
        acct.passkeyCode = `PK-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        this.state.passkeyUnlocked = !this.state.settings.requirePasskeyAfterLogin;
        this.state.passkeyInput = "";
        this.state.passkeyError = "";
        this.state.accountMenuOpen = false;
    }

    verifyPasskeyAlone() {
        this.state.passkeyError = "";

        const acct = this.currentAccount;
        if (!acct || !acct.emailConfirmed) {
            this.state.passkeyError = "Please sign up, confirm your email, and log in with email and password first.";
            return;
        }

        const code = (this.state.passkeyInput || "").trim();
        if (!code) {
            this.state.passkeyError = "Enter your pass key code to continue.";
            return;
        }

        if (code !== acct.passkeyCode) {
            this.state.passkeyUnlocked = false;
            this.state.passkeyError = `Pass key code does not match the logged-in account (${acct.email}).`;
            return;
        }

        this.state.passkeyUnlocked = true;
        this.state.passkeyInput = "";
        this.state.passkeyError = "";
    }

    selectNav(navKey) {
        this.state.activeNav = navKey;
        this.state.accessSavedNotice = "";
        this.state.settingsSavedNotice = "";
        this.state.accessRequestNotice = "";
    }

    toggleSetting(key) {
        if (!this.isLeratoController) {
            return;
        }
        this.state.settings[key] = !this.state.settings[key];
        this.state.settingsSavedNotice = "";
    }

    onLateGraceChange(ev) {
        if (!this.isLeratoController) {
            return;
        }
        const val = parseInt(ev.target.value, 10);
        this.state.settings.lateGraceMinutes = Number.isNaN(val) || val < 0 ? 0 : val;
        this.state.settingsSavedNotice = "";
    }

    onWebhookUrlChange(ev) {
        if (!this.isLeratoController) {
            return;
        }
        this.state.settings.biometricWebhookUrl = ev.target.value;
        this.state.settingsSavedNotice = "";
    }

    onDefaultReportRangeChange(ev) {
        if (!this.isLeratoController) {
            return;
        }
        this.state.settings.defaultReportRange = ev.target.value;
        const today = getTodaySastDateStr();
        if (ev.target.value === "today") {
            this.state.reportStartDate = today;
            this.state.reportEndDate = today;
        } else if (ev.target.value === "last_7_days") {
            const startObj = new Date(`${today}T00:00:00`);
            startObj.setDate(startObj.getDate() - 6);
            this.state.reportStartDate = startObj.toISOString().slice(0, 10);
            this.state.reportEndDate = today;
        }
        this.state.settingsSavedNotice = "";
    }

    savePortalSettings() {
        if (!this.isLeratoController) {
            return;
        }
        this.state.settingsSavedNotice = `Portal settings saved by Controller Lerato Dlamini (${getNowSastTimeStr()}).`;
    }

    handleClockIn() {
        this.state.clockNotice = "";
        if (this.state.settings.singleClockInPerDay && this.todayClockStage !== "not_clocked_in") {
            this.state.clockNotice = "You have already clocked in today. Wait until the following day to clock in again.";
            return;
        }
        const nowTime = getNowSastTimeStr();
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dObj = new Date(`${this.state.currentDateStr}T08:00:00`);
        const dayName = dayNames[dObj.getDay()];

        this.state.monthlyAttendance.unshift({
            id: Date.now(),
            employeeId: this.state.loggedInUserId,
            date: this.state.currentDateStr,
            dayName,
            status: "In Office",
            timeIn: nowTime,
            timeOut: "-",
            recordState: this.state.settings.requireClockOutForGoodRecord
                ? "Pending Clock Out (Must Clock Out Today)"
                : "Good Record",
            site: this.loggedInEmployee.location,
        });

        this.state.clockNotice = `Clocked in at ${nowTime}. You must Clock Out today to have a Good Record.`;
        this.state.recentActivity.unshift({
            id: Date.now(),
            title: `Clocked in at ${nowTime}`,
            subtitle: `${this.loggedInEmployee.name} ? Awaiting mandatory Clock Out`,
        });
    }

    handleClockOut() {
        this.state.clockNotice = "";
        const rec = this.todayAttendanceRecord;
        if (!rec || rec.timeOut !== "-") {
            this.state.clockNotice = "No open clock-in found for today.";
            return;
        }
        const nowTime = getNowSastTimeStr();
        rec.timeOut = nowTime;
        rec.recordState = "Good Record";

        this.state.clockNotice = `Clocked out at ${nowTime}. Today's attendance is saved as a Good Record. Next clock-in opens tomorrow.`;
        this.state.recentActivity.unshift({
            id: Date.now(),
            title: `Clocked out at ${nowTime} (Good Record)`,
            subtitle: `${this.loggedInEmployee.name} ? ${this.loggedInEmployee.location}`,
        });
    }

    triggerFacialUpload(ev) {
        if (!this.hasDirectAccess("employees")) {
            return;
        }
        const file = ev.target.files && ev.target.files[0];
        if (!file) {
            return;
        }
        const targetEmp =
            this.state.employees.find((e) => e.id === this.state.selectedEmployeeForRegisterId) ||
            this.state.employees.find((e) => !e.facialRegistered);
        if (targetEmp) {
            targetEmp.facialRegistered = true;
            targetEmp.photoFile = file.name;
            this.state.recentActivity.unshift({
                id: Date.now(),
                title: `Facial biometric registered (${file.name})`,
                subtitle: `${targetEmp.name} ? Ready for office gate check-in/out`,
            });
        }
        ev.target.value = "";
    }

    onSelectRegisterEmployee(ev) {
        this.state.selectedEmployeeForRegisterId = parseInt(ev.target.value, 10);
    }

    onAccessSearchInput(ev) {
        this.state.accessSearchQuery = ev.target.value;
        const firstMatch = this.filteredAccessEmployees[0];
        if (firstMatch) {
            this.state.selectedAccessEmployeeId = firstMatch.id;
        }
    }

    pickAccessEmployee(empId) {
        this.state.selectedAccessEmployeeId = empId;
        this.state.accessSavedNotice = "";
    }

    toggleAccessFlag(emp, key) {
        if (!this.isLeratoController) {
            return;
        }
        emp.access[key] = !emp.access[key];
        this.state.accessSavedNotice = "";
    }

    saveEmployeeAccess() {
        if (!this.isLeratoController) {
            return;
        }
        const emp = this.selectedAccessEmployee;
        if (emp) {
            this.state.accessSavedNotice = `Saved access permissions for ${emp.name}.`;
        }
    }

    onMonthChange(ev) {
        this.state.selectedMonth = ev.target.value;
    }

    onLeaveTypeChange(ev) {
        this.state.leaveType = ev.target.value;
    }

    onLeaveDaysChange(ev) {
        const n = parseInt(ev.target.value, 10);
        this.state.leaveDays = Number.isNaN(n) || n < 1 ? 1 : n;
    }

    submitLeaveRequest() {
        const nextRef = `LV-${101 + this.state.leaveRequests.length}`;
        const toSpecialist = this.state.settings.routeLeaveToSpecialistFirst;
        this.state.leaveRequests.unshift({
            ref: nextRef,
            employeeName: this.loggedInEmployee.name,
            type: this.state.leaveType,
            days: this.state.leaveDays,
            department: this.loggedInEmployee.department,
            movedToSpecialist: toSpecialist,
            specialistStatus: toSpecialist ? "Waiting for Approval" : "Skipped",
            managerStatus: toSpecialist ? "Pending Specialist" : "Waiting for Approval",
            finalStatus: "Pending",
        });
        this.state.leaveNotice = toSpecialist
            ? `Your leave application (${nextRef}) has moved to the Specialist and is waiting for approval.`
            : `Your leave application (${nextRef}) has moved directly to the Line Manager for approval.`;
        this.state.recentActivity.unshift({
            id: Date.now(),
            title: `Leave ${nextRef} submitted`,
            subtitle: `${this.loggedInEmployee.name} ? ${toSpecialist ? "Waiting for Specialist approval" : "Waiting for Line Manager approval"}`,
        });
    }

    approveSpecialist(req) {
        req.specialistStatus = "Specialist Approved";
        if (this.state.settings.requireLineManagerAfterSpecialist) {
            req.managerStatus = "Waiting for Approval";
            req.finalStatus = "Pending";
        } else {
            req.managerStatus = "Not Required";
            req.finalStatus = "Approved";
            this.state.leaveBalance = Math.max(0, this.state.leaveBalance - req.days);
        }
    }

    rejectSpecialist(req) {
        req.specialistStatus = "Specialist Rejected";
        req.managerStatus = "Not Required";
        req.finalStatus = "Rejected";
    }

    approveLineManager(req) {
        if (req.specialistStatus === "Specialist Approved" || req.specialistStatus === "Skipped") {
            req.managerStatus = "Line Manager Approved";
            req.finalStatus = "Approved";
            this.state.leaveBalance = Math.max(0, this.state.leaveBalance - req.days);
        }
    }

    rejectLineManager(req) {
        req.managerStatus = "Line Manager Rejected";
        req.finalStatus = "Rejected";
    }

    selectTodayForReport() {
        const today = getTodaySastDateStr();
        this.state.currentDateStr = today;
        this.state.reportStartDate = today;
        this.state.reportEndDate = today;
    }

    onReportStartDateChange(ev) {
        this.state.reportStartDate = ev.target.value;
        if (this.state.reportEndDate < this.state.reportStartDate) {
            this.state.reportEndDate = this.state.reportStartDate;
        }
    }

    onReportEndDateChange(ev) {
        this.state.reportEndDate = ev.target.value;
    }

    generateEmployeeReport() {
        this.state.appliedStartDate = this.state.reportStartDate;
        this.state.appliedEndDate = this.state.reportEndDate;
        this.state.reportVersion += 1;
        this.state.reportStatusMessage = `Updated with latest clock-in and clock-out records (${this.state.appliedStartDate} to ${this.state.appliedEndDate}).`;
    }

    downloadReportExcel() {
        const rows = this.filteredReportRows;
        const headers = [
            "Employee",
            "Role",
            "Date",
            "Status",
            "Check In",
            "Check Out",
            "Record State",
            "Site / Mode",
        ];

        const headerXml = headers
            .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
            .join("");

        const bodyXml = rows
            .map((r) => {
                const cells = [
                    this.getEmployeeName(r.employeeId),
                    this.getEmployeeRole(r.employeeId),
                    r.date,
                    r.status,
                    r.timeIn,
                    r.timeOut,
                    r.recordState,
                    r.site,
                ];
                return `<Row>${cells
                    .map((val) => `<Cell><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`)
                    .join("")}</Row>`;
            })
            .join("");

        const spreadsheetXml =
            `<?xml version="1.0"?>\n` +
            `<?mso-application progid="Excel.Sheet"?>\n` +
            `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n` +
            ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n` +
            ` <Worksheet ss:Name="Attendance Report">\n` +
            `  <Table>\n` +
            `   <Row>${headerXml}</Row>\n` +
            `   ${bodyXml}\n` +
            `  </Table>\n` +
            ` </Worksheet>\n` +
            `</Workbook>`;

        const blob = new Blob([spreadsheetXml], {
            type: "application/vnd.ms-excel;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Technov8_Attendance_Report_${this.state.appliedStartDate}_to_${this.state.appliedEndDate}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

registry.category("actions").add("technov8_wfm.dashboard", Technov8WfmDashboard);
