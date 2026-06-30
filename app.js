(function () {
  "use strict";

  const STORE_KEY = "billmaster-web-data-v1";
  const PROFILES_KEY = "billmaster-web-profiles-v1";
  const ACTIVE_PROFILE_KEY = "billmaster-web-active-profile-v1";
  const SESSION_FALLBACK_PREFIX = "billmaster-session-fallback:";
  const CLOUD_CONFIG_KEY = "billmaster-cloud-config-v1";
  const CLOUD_SESSION_KEY = "billmaster-cloud-session-v1";
  const CLOUD_PENDING_CLEAN_SIGNUP_KEY = "billmaster-cloud-pending-clean-signup-v1";
  const FRIEND_ALPHA_CACHE_VERSION = "20260629-14";
  const SAMPLE_NOW = new Date("2026-05-06T12:00:00");
  const hostedCloudConfig = normalizeCloudConfig(typeof window === "undefined" ? {} : window.BILLMASTER_CLOUD_CONFIG || {});

  const ui = {
    view: "dashboard",
    backStack: [],
    trackingTab: "expenses",
    analyticsTab: "expenses",
    chartType: "pie",
    calendarView: "day",
    calendarColorsOpen: false,
    dashboardPanel: "today",
    selectedDate: todayIso(),
    subscriptionFilter: "all",
    billHubTab: "bills",
    billQuery: "",
    billInboxFilter: "pending",
    taskFilter: "all",
    taskView: "regular",
    taskSort: "newest",
    projectId: null,
    projectSort: "level",
    projectTaskView: "regular",
    projectDragSelectMode: false,
    notesFilter: "all",
    notesSubjectFilter: "all",
    notesView: "stream",
    notesSort: "newest",
    notesQuery: "",
    notebookQuery: "",
    notebookView: "regular",
    selectedNotes: [],
    selectedNotebooks: [],
    contactQuery: "",
    contactGroupFilter: "all",
    taskPicker: null,
    navCollapsed: {},
    goalView: "full",
    goalStatusFilter: "active",
    habitFilter: "all",
    habitView: "regular",
    taskCategoryFilters: { General: true, Habit: true, Finance: true, Project: true, Personal: true },
    lendingFilter: "all",
    loanQuery: "",
    loanContactQuery: "",
    blockHandleStyle: "interactive",
    blockZoom: "1",
    blockTimeFocus: "full",
    blockSelectMode: false,
    blockDrawMode: false,
    daySwapMode: false,
    dayCopyTargetDate: null,
    selectedTasks: [],
    selectedAddresses: [],
    notifyQuery: "",
    blockQuickCreateDraft: null,
    modal: null,
    aiDraft: "",
    aiListening: false,
    aiVoiceError: "",
    voiceTranscript: "",
    voiceParsedTask: null,
    voiceCorrectionDraft: "",
    voiceListening: false,
    voiceCorrectionListening: false,
    voiceError: "",
    habitVoiceTranscript: "",
    habitVoiceParsedHabit: null,
    habitVoiceListening: false,
    habitVoiceError: "",
    habitTemplateDraft: null,
    selectedHabits: [],
    backupRestorePreview: null,
    lastSaveError: "",
    toast: null
  };

  const validViews = new Set(["dashboard", "tracking", "analytics", "bills", "inbox", "sync", "subscriptions", "calendar", "tasks", "habits", "projects", "goals", "notebooks", "notes", "contacts", "addresses", "lending", "ai"]);
  const ADD_TASK_ADDRESS_VALUE = "__add_task_address__";
  const ADD_TASK_CATEGORY_VALUE = "__add_task_category__";
  const ADD_TRANSACTION_CATEGORY_VALUE = "__add_transaction_category__";
  const ADD_NOTEBOOK_VALUE = "__add_note_notebook__";
  const ADD_NOTE_SUBJECT_VALUE = "__add_note_subject__";
  const DELETE_NOTE_SUBJECT_VALUE = "__delete_note_subject__";
  const ADD_LOAN_CONTACT_VALUE = "__add_loan_contact__";
  const taskPriorityOptions = ["Low", "Medium", "High", "Urgent"];
  const taskStatusOptions = ["Not Started", "In Progress", "Completed", "Cancelled"];
  const goalScheduleOptions = ["None", "Weekly", "Bi-weekly", "Monthly"];
  const projectLevelOptions = ["Low", "Medium", "High", "Critical"];
  const baseTaskCategories = ["General", "Habit", "Finance", "Project", "Personal"];
  const taskCategories = [...baseTaskCategories];
const habitTypeOptions = ["Health", "Fitness", "Finance", "Learning", "Work", "Home", "Personal", "Custom"];
const habitScheduleOptions = ["Daily", "Weekdays", "Weekly", "Monthly"];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const calendarDayTones = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const calendarPaletteStorageKey = "billmaster.calendarPalette";
const calendarDayColorKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const calendarPaletteSchemes = {
  soft: {
    label: "Soft",
    tones: {
      sunday: { bg: "#f6fcff", bg2: "#ddf3ff", border: "#9edbff", accent: "#38bdf8" },
      monday: { bg: "#f5fff8", bg2: "#d9f7e6", border: "#86d9a9", accent: "#22c55e" },
      tuesday: { bg: "#f6fbff", bg2: "#dfefff", border: "#92c5ff", accent: "#3b82f6" },
      wednesday: { bg: "#fffdf2", bg2: "#fff0b8", border: "#f3d15f", accent: "#f59e0b" },
      thursday: { bg: "#fffbef", bg2: "#ffe8a6", border: "#efbf4f", accent: "#e8a008" },
      friday: { bg: "#fbf7ff", bg2: "#eadcff", border: "#c4a6f5", accent: "#8b5cf6" },
      saturday: { bg: "#f2fbff", bg2: "#ccecff", border: "#75cff7", accent: "#0ea5e9" },
      weekday: { bg: "#fbfdff", bg2: "#f5f8fc", border: "#dce8f4", accent: "#9ab7d8" },
    },
  },
  calm: {
    label: "Calm",
    tones: {
      sunday: { bg: "#f9fdff", bg2: "#e9f7ff", border: "#b8e5ff", accent: "#7dd3fc" },
      monday: { bg: "#f8fff9", bg2: "#e9f8ee", border: "#b6e4c7", accent: "#62c784" },
      tuesday: { bg: "#f8fbff", bg2: "#ebf3ff", border: "#bad8ff", accent: "#60a5fa" },
      wednesday: { bg: "#fffdf7", bg2: "#fff3cc", border: "#f0d783", accent: "#eab308" },
      thursday: { bg: "#fffcf5", bg2: "#fff0c7", border: "#e8cf7c", accent: "#d99a05" },
      friday: { bg: "#fcfaff", bg2: "#f0e8ff", border: "#d6c3fb", accent: "#a78bfa" },
      saturday: { bg: "#f6fcff", bg2: "#dff3ff", border: "#a6dcf8", accent: "#38bdf8" },
      weekday: { bg: "#ffffff", bg2: "#f7fafc", border: "#e5edf5", accent: "#9fb4c7" },
    },
  },
  clear: {
    label: "Clear",
    tones: {
      sunday: { bg: "#eef9ff", bg2: "#ccecff", border: "#7cc7ee", accent: "#0ea5e9" },
      monday: { bg: "#f0fff4", bg2: "#c8f1d6", border: "#74d89b", accent: "#16a34a" },
      tuesday: { bg: "#eff6ff", bg2: "#cfe4ff", border: "#82b9ff", accent: "#2563eb" },
      wednesday: { bg: "#fffbeb", bg2: "#ffe89d", border: "#f6c443", accent: "#d97706" },
      thursday: { bg: "#fff8e6", bg2: "#ffdf7c", border: "#f5b72d", accent: "#ca8a04" },
      friday: { bg: "#faf5ff", bg2: "#e5d4ff", border: "#b794f6", accent: "#7c3aed" },
      saturday: { bg: "#edf9ff", bg2: "#bae6fd", border: "#67c5ed", accent: "#0284c7" },
      weekday: { bg: "#f8fafc", bg2: "#eef4fb", border: "#cad8e8", accent: "#7f9db6" },
    },
  },
  bold: {
    label: "Bold",
    tones: {
      sunday: { bg: "#eaf8ff", bg2: "#aee4ff", border: "#38bdf8", accent: "#0284c7" },
      monday: { bg: "#eafff0", bg2: "#9be7b2", border: "#22c55e", accent: "#15803d" },
      tuesday: { bg: "#ecf5ff", bg2: "#a8d0ff", border: "#3b82f6", accent: "#1d4ed8" },
      wednesday: { bg: "#fff7db", bg2: "#ffd85e", border: "#f59e0b", accent: "#b45309" },
      thursday: { bg: "#fff4d0", bg2: "#ffcc4d", border: "#eab308", accent: "#a16207" },
      friday: { bg: "#f5edff", bg2: "#cfb4ff", border: "#8b5cf6", accent: "#6d28d9" },
      saturday: { bg: "#e7f7ff", bg2: "#90d6ff", border: "#0ea5e9", accent: "#0369a1" },
      weekday: { bg: "#f4f7fb", bg2: "#e6edf6", border: "#aebfd3", accent: "#64748b" },
    },
  },
  dark: {
    label: "Dark",
    tones: {
      sunday: { bg: "#b9e8ff", bg2: "#38aeea", border: "#0369a1", accent: "#075985" },
      monday: { bg: "#b7f0c7", bg2: "#22b95b", border: "#047438", accent: "#064e3b" },
      tuesday: { bg: "#b8d8ff", bg2: "#3b82f6", border: "#1d4ed8", accent: "#1e3a8a" },
      wednesday: { bg: "#ffe18a", bg2: "#f59e0b", border: "#a85a05", accent: "#78350f" },
      thursday: { bg: "#ffd36a", bg2: "#d97706", border: "#92400e", accent: "#713f12" },
      friday: { bg: "#d9c2ff", bg2: "#8b5cf6", border: "#5b21b6", accent: "#4c1d95" },
      saturday: { bg: "#9bdcff", bg2: "#0284c7", border: "#075985", accent: "#0c4a6e" },
      weekday: { bg: "#d6dee8", bg2: "#718096", border: "#334155", accent: "#1f2937" },
    },
  },
  animated: {
    label: "Animated",
    tones: {
      sunday: { bg: "#e2f6ff", bg2: "#5cc8ff", border: "#0ea5e9", accent: "#0284c7" },
      monday: { bg: "#defce9", bg2: "#56d986", border: "#16a34a", accent: "#15803d" },
      tuesday: { bg: "#e3efff", bg2: "#72a9ff", border: "#2563eb", accent: "#1d4ed8" },
      wednesday: { bg: "#fff1b8", bg2: "#ffc93d", border: "#d97706", accent: "#b45309" },
      thursday: { bg: "#ffe7a3", bg2: "#f5a900", border: "#b66a04", accent: "#92400e" },
      friday: { bg: "#eadbff", bg2: "#a783ff", border: "#7c3aed", accent: "#6d28d9" },
      saturday: { bg: "#d9f4ff", bg2: "#48c5f8", border: "#0284c7", accent: "#0369a1" },
      weekday: { bg: "#f0f7ff", bg2: "#dbeafe", border: "#8bb8ed", accent: "#2563eb" },
    },
  },
};
let activeCalendarPalette = getStoredCalendarPalette();
const defaultCategoryColors = { General: "#8892b0", Habit: "#6c63ff", Finance: "#00bcd4", Project: "#ff9800", Personal: "#4caf50" };
const defaultTransactionCategories = {
  expense: ["Utilities", "Food", "Housing", "Transportation", "Subscriptions", "Other"],
  income: ["Salary", "Freelance", "Side Hustle", "App Income", "Rental Income", "Other"]
};
const DEFAULT_TASK_BG = "#ff7a1a";
  const taskBackgrounds = [DEFAULT_TASK_BG, "#000000", "#1a1f36", "#6c63ff", "#00bcd4", "#4caf50", "#f44336", "#ffc107"];
  const taskFonts = ["System", "Rounded", "Serif", "Mono"];
  const GOOGLE_CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";
  const GOOGLE_CONTACTS_FIELDS = "names,emailAddresses,phoneNumbers,addresses,memberships";
  const initialView = getHashView();
  if (initialView) ui.view = initialView;

  const seed = {
    settings: {
      taskDefaultBgColor: DEFAULT_TASK_BG,
      categoryColors: { ...defaultCategoryColors },
      calendarDayColors: {},
      customTaskCategories: [],
      customTransactionCategories: [],
      interfaceMode: "power",
      cloudAutoSync: false,
      cloudRemoteUpdatedAt: "",
      cloudLastAutoCheckAt: "",
      cloudLastQueuedAt: "",
      cloudLastPushedAt: "",
      cloudLastPulledAt: "",
      cloudSyncState: "idle",
      cloudSyncMessage: "",
      cloudSyncConflictAt: "",
      cloudSyncConflictRemoteAt: "",
      cloudSyncConflictMessage: "",
      cloudLastSetupTestAt: "",
      cloudLastSetupTestOk: false,
      cloudLastSetupTestStatus: 0,
      cloudLastSetupTestHost: "",
      cloudLastSetupTestMessage: "",
      backupFrequency: "weekly",
      backupLastExportAt: "",
      backupLastExportName: "",
      backupLastRestoreAt: "",
      backupLastReminderAt: "",
      googleContactsClientId: "",
      googleContactsLastSyncAt: "",
      googleContactsLastImportCount: 0,
      googleContactsLastGroupImportCount: 0,
      googleContactsLastStatus: "",
      plaidMode: "sandbox",
      plaidSandboxConnected: false,
      plaidLastImportAt: "",
      deletedItems: {}
    },
    accounts: [
      { id: "acct_1", name: "Chase Checking", type: "Checking", last4: "4521", balance: 3245.67, color: "teal" },
      { id: "acct_2", name: "Capital One Credit Card", type: "Credit", last4: "8932", balance: 1234.5, color: "coral" },
      { id: "acct_3", name: "Wells Fargo Savings", type: "Savings", last4: "7621", balance: 12890.23, color: "green" }
    ],
    syncConnections: [
      { id: "sync_1", provider: "Plaid sandbox", name: "Bank & Card Transactions", type: "Transactions", status: "Connected", lastSync: "2026-05-12 11:30", coverage: ["Balances", "Transactions", "Recurring charge detection"], needsAuth: false },
      { id: "sync_2", provider: "Biller network", name: "Bill Pay Rail", type: "Payments", status: "Staged", lastSync: "Not connected", coverage: ["Biller search", "Payment confirmation", "Due-date refresh"], needsAuth: true },
      { id: "sync_3", provider: "BillMaster Inbox", name: "Email, PDF & Screenshot Import", type: "Import", status: "Ready", lastSync: "2026-05-12 11:30", coverage: ["Screenshots", "PDF statements", "Email forwards"], needsAuth: false }
    ],
    payments: [],
    transactions: [
      { id: "tx_1", type: "expense", name: "Phone Bill", merchant: "Verizon", category: "Utilities", amount: 100, projected: 100, date: "2026-05-01", frequency: "Monthly", method: "Capital One Credit Card", status: "Paid", notes: "Family wireless plan." },
      { id: "tx_2", type: "expense", name: "Electrical", merchant: "City Power", category: "Utilities", amount: 100, projected: 100, date: "2026-05-02", frequency: "Monthly", method: "Chase Checking", status: "Paid", notes: "Auto-pay utility." },
      { id: "tx_3", type: "expense", name: "Ginger", merchant: "Whole Foods Market", category: "Food", amount: 10, projected: 10, date: "2026-05-04", frequency: "Monthly", method: "Chase Checking", status: "Paid", notes: "" },
      { id: "tx_4", type: "expense", name: "Rent", merchant: "Property Mgmt", category: "Housing", amount: 100, projected: 100, date: "2026-05-05", frequency: "Monthly", method: "Chase Checking", status: "Paid", notes: "" },
      { id: "tx_5", type: "income", name: "Create App", merchant: "Freelance", category: "Freelance", amount: 10, projected: 11, date: "2026-05-01", frequency: "Monthly", method: "Chase Checking", status: "Received", notes: "Small app payout." },
      { id: "tx_6", type: "income", name: "Side Hustle TV", merchant: "Side Hustle", category: "Side Hustle", amount: 25, projected: 25, date: "2026-05-02", frequency: "Monthly", method: "Chase Checking", status: "Received", notes: "" },
      { id: "tx_7", type: "income", name: "Picking up Garbage", merchant: "Salary", category: "Salary", amount: 200, projected: 200, date: "2026-05-03", frequency: "Monthly", method: "Chase Checking", status: "Received", notes: "" },
      { id: "tx_8", type: "income", name: "Pick up Garbage", merchant: "Side Hustle", category: "Side Hustle", amount: 125, projected: 125, date: "2026-05-05", frequency: "Monthly", method: "Chase Checking", status: "Received", notes: "" },
      { id: "tx_9", type: "expense", name: "Grocery Store", merchant: "Whole Foods Market", category: "Food", amount: 87.43, projected: 75, date: "2026-05-04", frequency: "One time", method: "Chase Checking", status: "Paid", notes: "" },
      { id: "tx_10", type: "income", name: "Salary Deposit", merchant: "Employer Direct Deposit", category: "Salary", amount: 3200, projected: 3200, date: "2026-05-05", frequency: "Bi-weekly", method: "Chase Checking", status: "Received", notes: "" },
      { id: "tx_11", type: "expense", name: "Coffee Shop", merchant: "Starbucks", category: "Food", amount: 6.75, projected: 6, date: "2026-05-04", frequency: "One time", method: "Capital One Credit Card", status: "Paid", notes: "" },
      { id: "tx_12", type: "expense", name: "Gas Station", merchant: "Shell", category: "Transportation", amount: 52, projected: 55, date: "2026-05-05", frequency: "One time", method: "Capital One Credit Card", status: "Paid", notes: "" }
    ],
    bills: [
      { id: "bill_1", name: "Electric Bill", payee: "City Power & Light", category: "Utilities", amount: 127.5, projected: 130, dueDate: "2026-05-07", status: "Due Soon", method: "Chase Checking", autopay: false, addressId: "addr_2" },
      { id: "bill_2", name: "Internet Service", payee: "FastNet Broadband", category: "Utilities", amount: 89.99, projected: 90, dueDate: "2026-05-09", status: "Unpaid", method: "Capital One Credit Card", autopay: true, addressId: null },
      { id: "bill_3", name: "Credit Card", payee: "Chase Sapphire", category: "Credit", amount: 542.18, projected: 500, dueDate: "2026-05-11", status: "Unpaid", method: "Chase Checking", autopay: false, addressId: null },
      { id: "bill_4", name: "Rent", payee: "Property Mgmt", category: "Housing", amount: 1200, projected: 1200, dueDate: "2026-05-13", status: "Unpaid", method: "Chase Checking", autopay: false, addressId: "addr_3" },
      { id: "bill_5", name: "Phone Bill", payee: "Verizon", category: "Phone", amount: 65, projected: 70, dueDate: "2026-05-15", status: "Unpaid", method: "Capital One Credit Card", autopay: true, addressId: null }
    ],
    subscriptions: [
      { id: "sub_1", name: "Netflix", plan: "Standard Plan", category: "Entertainment", amount: 15.99, projected: 15.99, cycle: "monthly", nextDate: "2026-05-10", lastDate: "2026-04-10", status: "Active", autopay: true, method: "Capital One Credit Card" },
      { id: "sub_2", name: "Spotify Premium", plan: "Family", category: "Entertainment", amount: 9.99, projected: 9.99, cycle: "monthly", nextDate: "2026-05-23", lastDate: "2026-04-23", status: "Active", autopay: true, method: "Capital One Credit Card" },
      { id: "sub_3", name: "Adobe Creative Cloud", plan: "Design", category: "Software", amount: 54.99, projected: 49.99, cycle: "monthly", nextDate: "2026-05-30", lastDate: "2026-04-30", status: "Trial", autopay: false, method: "Chase Checking" },
      { id: "sub_4", name: "Microsoft 365", plan: "Personal", category: "Software", amount: 99.99, projected: 99.99, cycle: "yearly", nextDate: "2027-03-21", lastDate: "2026-03-21", status: "Active", autopay: true, method: "Wells Fargo Savings" },
      { id: "sub_5", name: "Amazon Prime", plan: "Annual", category: "Shopping", amount: 139, projected: 139, cycle: "yearly", nextDate: "2026-11-01", lastDate: "2025-11-01", status: "Active", autopay: true, method: "Capital One Credit Card" }
    ],
    billInbox: [
      { id: "inbox_1", type: "bill", status: "pending", source: "Screenshot OCR", title: "Electric Bill", merchant: "City Power & Light", category: "Utilities", amount: 127.5, projected: 130, dueDate: "2026-05-07", confidence: 94, notes: "OCR found amount, due date, and payee from a bill screenshot." },
      { id: "inbox_2", type: "subscription", status: "pending", source: "Card statement", title: "Adobe Creative Cloud", merchant: "Adobe", category: "Software", amount: 54.99, projected: 49.99, dueDate: "2026-05-30", confidence: 88, notes: "Recurring monthly charge detected from imported statement." }
    ],
    dismissedInboxIds: [],
    notificationLog: [],
    alphaFeedback: [],
    cancellations: [],
    subscriptionHistory: [
      { id: "sth_1", subId: "sub_1", name: "Netflix", date: "2026-04-30", amount: 15.99, status: "Paid", code: "CONF-NF-20240402" },
      { id: "sth_2", subId: "sub_2", name: "Spotify Premium", date: "2026-04-23", amount: 9.99, status: "Paid", code: "CONF-SP-20240325" },
      { id: "sth_3", subId: "sub_3", name: "Adobe Creative Cloud", date: "2026-05-03", amount: 54.99, status: "Failed", code: "Insufficient funds" },
      { id: "sth_4", subId: "sub_4", name: "Microsoft 365", date: "2026-03-21", amount: 99.99, status: "Paid", code: "CONF-MS-20240218" },
      { id: "sth_5", subId: "sub_5", name: "Amazon Prime", date: "2025-11-01", amount: 139, status: "Paid", code: "CONF-AP-20230904" },
      { id: "sth_6", subId: "sub_1", name: "Netflix", date: "2026-03-31", amount: 15.99, status: "Failed", code: "Card declined" }
    ],
    tasks: [
      { id: "task_1", title: "Not started.", description: "Description for not starting.", date: "2026-03-29", start: "13:30", end: "14:30", priority: "Medium", status: "Not Started", repeat: "None", includeHours: true, projectId: null, billId: null, goalId: null, contactId: null, addressId: null, tags: ["admin"] },
      { id: "task_2", title: "AVVVVatar", description: "desc", date: "2026-03-30", start: "07:00", end: "08:00", priority: "High", status: "Not Started", repeat: "Weekly", includeHours: true, projectId: null, billId: null, goalId: null, contactId: "contact_1", addressId: "addr_3", tags: ["court"] },
      { id: "task_3", title: "studyyyy", description: "Study documents", date: "2026-03-30", start: "08:05", end: "09:05", priority: "Medium", status: "Not Started", repeat: "None", includeHours: true, projectId: null, billId: null, goalId: null, contactId: null, addressId: "addr_4", tags: ["school"] },
      { id: "task_4", title: "Block Task Test", description: "Calendar block", date: "2026-03-30", start: "10:00", end: "11:00", priority: "High", status: "Not Started", repeat: "None", includeHours: true, projectId: null, billId: null, goalId: null, contactId: null, addressId: null, tags: [] },
      { id: "task_5", title: "Pace Legacy", description: "Quick task", date: "2026-03-30", start: "", end: "", priority: "High", status: "Not Started", repeat: "None", includeHours: false, projectId: "proj_1", billId: null, goalId: null, contactId: null, addressId: null, tags: [] },
      { id: "task_6", title: "test1", description: "test", date: "2026-05-08", start: "15:45", end: "16:39", priority: "Medium", status: "Not Started", repeat: "Daily", includeHours: true, projectId: "proj_2", billId: null, goalId: null, contactId: null, addressId: "addr_1", tags: ["recurring"] },
      { id: "task_7", title: "hey please do this", description: "Follow up", date: "2026-05-08", start: "17:15", end: "18:15", priority: "Medium", status: "Not Started", repeat: "None", includeHours: true, projectId: "proj_2", billId: null, goalId: null, contactId: null, addressId: null, tags: [] },
      { id: "task_8", title: "Pick up Isaiah", description: "Family pickup", date: "2026-04-13", start: "15:00", end: "16:00", priority: "Medium", status: "Not Started", repeat: "None", includeHours: true, projectId: "proj_2", billId: null, goalId: null, contactId: "contact_1", addressId: null, tags: ["family"] }
    ],
    habits: [
      { id: "habit_1", title: "Morning planning", description: "Review the day before work starts.", type: "Work", schedule: "Weekdays", days: [1, 2, 3, 4, 5], startDate: "2026-05-04", endDate: "", start: "08:00", end: "08:30", priority: "Medium", status: "Active", includeHours: true, targetCount: 1, addressId: null, color: "#6c63ff", completions: ["2026-05-04", "2026-05-05", "2026-05-06"] },
      { id: "habit_2", title: "Gym session", description: "Training block with calendar time.", type: "Fitness", schedule: "Weekly", days: [1, 3, 5], startDate: "2026-05-04", endDate: "", start: "06:00", end: "07:00", priority: "High", status: "Active", includeHours: true, targetCount: 1, addressId: null, color: "#14b8a6", completions: ["2026-05-04"] },
      { id: "habit_3", title: "Budget check-in", description: "Quick spending and bill review.", type: "Finance", schedule: "Weekly", days: [0], startDate: "2026-05-03", endDate: "", start: "19:00", end: "19:20", priority: "Low", status: "Active", includeHours: true, targetCount: 1, addressId: null, color: "#00bcd4", completions: ["2026-05-03"] }
    ],
    habitTemplates: [
      { id: "habit_template_1", slot: 1, name: "Morning Focus", payload: { title: "Morning Focus", description: "Start the day with planning and setup.", type: "Work", schedule: "Weekdays", days: [1, 2, 3, 4, 5], start: "08:00", end: "08:30", priority: "Medium", status: "Active", includeHours: true, targetCount: 1, addressId: null, color: "#6c63ff", image: "", imageZoom: 1, imageX: 0, imageY: 0, imageFit: "cover" } },
      { id: "habit_template_2", slot: 2, name: "Workout", payload: { title: "Workout", description: "Training block.", type: "Fitness", schedule: "Weekly", days: [1, 3, 5], start: "06:00", end: "07:00", priority: "High", status: "Active", includeHours: true, targetCount: 1, addressId: null, color: "#14b8a6", image: "", imageZoom: 1, imageX: 0, imageY: 0, imageFit: "cover" } },
      { id: "habit_template_3", slot: 3, name: "Budget Check", payload: { title: "Budget Check", description: "Review bills, subscriptions, and spending.", type: "Finance", schedule: "Weekly", days: [0], start: "19:00", end: "19:20", priority: "Low", status: "Active", includeHours: true, targetCount: 1, addressId: null, color: "#00bcd4", image: "", imageZoom: 1, imageX: 0, imageY: 0, imageFit: "cover" } },
      { id: "habit_template_4", slot: 4, name: "Quick Reset", payload: { title: "Quick Reset", description: "Short reset block.", type: "Personal", schedule: "Daily", days: [0, 1, 2, 3, 4, 5, 6], start: "20:00", end: "20:15", priority: "Medium", status: "Active", includeHours: true, targetCount: 1, addressId: null, color: "#4caf50", image: "", imageZoom: 1, imageX: 0, imageY: 0, imageFit: "cover" } },
      { id: "habit_template_5", slot: 5, name: "Custom Slot", payload: { title: "Custom Habit", description: "", type: "Personal", schedule: "Daily", days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "08:15", priority: "Medium", status: "Active", includeHours: true, targetCount: 1, addressId: null, color: "#ff7a1a", image: "", imageZoom: 1, imageX: 0, imageY: 0, imageFit: "cover" } }
    ],
    goals: [
      { id: "goal_1", name: "Emergency Fund", target: 10000, current: 7000, targetDate: "2026-12-31", color: "green", createdAt: "2026-05-06", contributionSchedule: "Monthly", contributionAmount: 100, contributionAccountId: "acct_1", confirmContributions: true },
      { id: "goal_2", name: "Vacation Fund", target: 5000, current: 2100, targetDate: "2026-06-30", color: "teal", createdAt: "2026-05-06", contributionSchedule: "Bi-weekly", contributionAmount: 75, contributionAccountId: "acct_1", confirmContributions: true },
      { id: "goal_3", name: "New Car Down Payment", target: 8000, current: 3200, targetDate: "2027-03-31", color: "purple", createdAt: "2026-05-06", contributionSchedule: "None", contributionAmount: 0, contributionAccountId: "acct_3", confirmContributions: true }
    ],
    goalContributions: [],
    addresses: [
      { id: "addr_1", label: "LGA", street: "Terminal 1", city: "Queens", state: "NY", zip: "", country: "USA", entity: "task" },
      { id: "addr_2", label: "Big Address", street: "291 Big Blanket Ave", city: "Bronx", state: "NY", zip: "10454", country: "USA", entity: "bill" },
      { id: "addr_3", label: "t tone last name's Address", street: "217 Alexander ave, Apt 16G", city: "Bronx", state: "NY", zip: "10454", country: "USA", entity: "contact" },
      { id: "addr_4", label: "GIna", street: "643 Coster st", city: "Bronx", state: "NY", zip: "10454", country: "USA", entity: "task" },
      { id: "addr_5", label: "Address Test", street: "121 address Test", city: "test", state: "ny", zip: "10454", country: "USA", entity: "project" }
    ],
    loans: [
      { id: "loan_1", borrower: "T", description: "", amount: 10, repaid: 2, forgiven: 0, date: "2026-04-26", dueDate: "2026-04-28", status: "Money Owed", type: "Lent" },
      { id: "loan_2", borrower: "Big", description: "Tow Money", amount: 200, repaid: 0, forgiven: 0, date: "2026-04-26", dueDate: "2026-04-29", status: "Outstanding", type: "Lent" },
      { id: "loan_3", borrower: "Forgiver", description: "just to forgive", amount: 125, repaid: 0, forgiven: 125, date: "2026-04-26", dueDate: "2026-04-27", status: "Forgiven", type: "Lent" },
      { id: "loan_4", borrower: "I", description: "Lend Isaiah Money", amount: 100, repaid: 10, forgiven: 0, date: "2026-04-25", dueDate: "2026-04-27", status: "Money Owed", type: "Lent" }
    ],
    projects: [
      { id: "proj_1", name: "aaaa", description: "General project", status: "Active", level: "Medium", color: "#ff7a1a", dueDate: "2026-05-27" },
      { id: "proj_2", name: "Isaiah", description: "Family project", status: "Active", level: "High", color: "#2196f3", dueDate: "2026-06-01" },
      { id: "proj_3", name: "Big Project note", description: "Big Project note description", status: "On Hold", level: "Low", color: "#6c63ff", dueDate: "2026-06-12" }
    ],
    notebooks: [
      { id: "nb_1", title: "General Notes", description: "Default", projectId: null, color: "#4388f3", icon: "book", subjects: ["Math"] },
      { id: "nb_2", title: "Eating Healthy", description: "Eating Healthy", projectId: null, color: "#14b8a6", icon: "note", cover: "cherries", subjects: [] },
      { id: "nb_3", title: "Cats", description: "CAT", projectId: null, color: "#6c63ff", icon: "book", subjects: [] },
      { id: "nb_4", title: "Big Project note", description: "Big Project note description", projectId: "proj_3", color: "#ff9800", icon: "book", subjects: [] },
      { id: "nb_5", title: "aaaa", description: "", projectId: "proj_1", color: "#3f83f8", icon: "book", subjects: [] },
      { id: "nb_6", title: "Eating bananas", description: "This is a test for eating bananas.", projectId: null, color: "#ffc107", icon: "note", cover: "bananas", subjects: ["Yellow bananas"] }
    ],
    notes: [
      { id: "note_1", notebookId: "nb_1", title: "Get Isaiah", content: "I need to go to court and documents", date: "2026-04-07", subject: "", importance: "Low", color: "#6c63ff", icon: "note" },
      { id: "note_2", notebookId: "nb_2", title: "eating cherry", content: "Eating cherrys notes have some benefits", date: "2026-04-07", subject: "", importance: "Low", color: "#6c63ff", icon: "book", cover: "cherries" },
      { id: "note_3", notebookId: "nb_2", title: "Eating bananas.", content: "This is a test for eating bananas.", date: "2026-04-07", subject: "", importance: "Low", color: "#ffc107", icon: "note", cover: "bananas" },
      { id: "note_4", notebookId: "nb_1", title: "Cleaning Test", content: "TESTing new notes", date: "2026-04-07", subject: "", importance: "Low", color: "#6c63ff", icon: "note" },
      { id: "note_5", notebookId: "nb_1", title: "New Note Testtt", content: "This is a new note test. I'm just testing this to make sure the new note content works.", date: "2026-04-07", subject: "", importance: "Low", color: "#6c63ff", icon: "note" }
    ],
    contacts: [
      { id: "contact_1", name: "Isaiah", email: "isaiah@example.com", addressId: "addr_3", photo: "family" }
    ],
    contactGroups: [
      { id: "group_1", name: "BM", contactIds: ["contact_1"] },
      { id: "group_2", name: "TtOneTT", contactIds: [] }
    ],
    aiMessages: [
      { role: "ai", text: "Your grocery spending is above the monthly pace. Consider moving $45 from subscriptions into food this week." },
      { role: "user", text: "Which subscriptions should I review?" },
      { role: "ai", text: "Adobe is $5 over the projected amount and has a failed charge. Netflix is steady. Start with Adobe, then check annual renewals." }
    ],
    weather: [
      { date: "2026-05-03", condition: "sunny", temp: 72 },
      { date: "2026-05-04", condition: "cloudy", temp: 66 },
      { date: "2026-05-05", condition: "rain", temp: 63, rainStart: "2:00 PM", rainEnd: "5:00 PM" },
      { date: "2026-05-06", condition: "sunny", temp: 71 },
      { date: "2026-05-07", condition: "cloudy", temp: 68 },
      { date: "2026-05-08", condition: "rain", temp: 64, rainStart: "1:00 PM", rainEnd: "4:00 PM" },
      { date: "2026-05-09", condition: "sunny", temp: 75 },
      { date: "2026-05-10", condition: "cloudy", temp: 67 },
      { date: "2026-05-11", condition: "sunny", temp: 73 },
      { date: "2026-05-12", condition: "rain", temp: 61, rainStart: "8:00 AM", rainEnd: "11:00 AM" },
      { date: "2026-05-13", condition: "sunny", temp: 74 }
    ]
  };

  const TASK_ALERT_CHECK_MS = 30 * 1000;
  const TASK_ALERT_GRACE_MS = 5 * 60 * 1000;
  const TASK_ALERT_START_GRACE_MS = 15 * 60 * 1000;
  const TASK_ALERT_CATCHUP_MS = 45 * 60 * 1000;
  const TASK_ALERT_OFFSET_OPTIONS = [15, 0, 5, 30, 60];
  const TASK_ALERT_DEFAULT_OFFSETS = [15, 0];
  const TASK_ALERT_FIRED_LIMIT = 80;

  let profiles = loadProfiles();
  let currentProfileId = loadActiveProfileId(profiles);
  let data = loadData();
  let cloudConfig = loadCloudConfig();
  let cloudSession = loadCloudSession();
  let lastSavedSnapshot = JSON.stringify(data);
  const undoStack = [];
  const app = document.getElementById("app");
  let toastTimer = null;
  let cloudAutoPushTimer = null;
  let cloudAutoPullTimer = null;
  let cloudPushInFlight = false;
  let cloudPullInFlight = false;
  let cloudPushQueued = false;
  let cloudHasLocalUnsyncedChanges = false;
  const tabId = `tab_${Math.random().toString(36).slice(2, 10)}`;
  const LOCAL_SYNC_CHANNEL = "billmaster-local-workspace-sync-v1";
  let localSyncChannel = null;
  let localSyncRenderTimer = null;
  const recentWrites = new Map();
  const pendingActions = new Set();
  let blockDragState = null;
  let blockSelectBrushState = null;
  let blockCreateState = null;
  let blockTapCreateState = null;
  let blockRepeatState = null;
  let blockLastCreateAnchor = null;
  let blockLastTouchAnchor = null;
  let blockDeferredCreateTimer = null;
  let calendarDayColorSaveTimer = null;
  let dayDragState = null;
  let voiceRecognition = null;
  let voiceStopRequested = false;
  let taskAlertSchedulerStarted = false;
  let taskAlertAudioContext = null;
  let suppressCardEditUntil = 0;
  let projectDragSelectState = null;
  let habitTimeDragId = "";
  const dayHoldDelay = 520;
  const blockHoldDelay = 1250;
  const blockSelectHoldDelay = 520;
  const blockHoldMoveTolerance = 8;
  const singleSubmitActions = new Set([
    "save-bill",
    "save-transaction",
    "save-sub-amount",
    "pay-bill",
    "pay-subscription",
    "reset-projected",
    "cancel-subscription",
    "set-sub-status",
    "save-loan",
    "save-repayment",
    "save-forgiveness",
    "forgive-loan",
    "mark-loan-done",
    "restore-loan",
    "delete-loan",
    "delete-bill",
    "delete-transaction",
    "delete-subscription",
    "delete-address",
    "delete-task",
    "delete-habit",
    "delete-note",
    "delete-selected-notes",
    "duplicate-notes",
    "duplicate-notebook",
    "duplicate-selected-notebooks",
    "delete-notebook",
    "delete-notebook-subject",
    "save-notebook-picture",
    "delete-goal",
    "delete-contact",
    "delete-project",
    "save-address",
    "save-task",
    "save-habit",
    "save-habit-fresh-start",
    "save-habit-template-slot",
    "toggle-habit-completion",
    "copy-habit",
    "copy-selected-habits",
    "delete-selected-habits",
    "save-task-defaults",
    "jump-calendar-date",
    "jump-calendar-month",
    "save-voice-task",
    "ask-ai-from-voice",
    "save-voice-habit",
    "complete-task",
    "complete-selected-tasks",
    "priority-selected",
    "set-task-priority",
    "set-task-status",
    "copy-selected-tomorrow",
    "copy-selected-to-date",
    "copy-selected-to-day-target",
    "duplicate-selected-tasks",
    "save-duplicate-selected-tasks",
    "duplicate-calendar-item",
    "save-quick-time",
    "copy-selected-task-route",
    "copy-task-alert",
    "save-task-notify",
    "request-task-alert-permission",
    "test-task-alert",
    "copy-task-route-from-modal",
    "duplicate-block-horizontal",
    "duplicate-block-vertical",
    "save-block-duplicate-horizontal",
    "save-block-duplicate-vertical",
    "save-selected-duplicate-horizontal",
    "save-selected-duplicate-vertical",
    "save-project-name",
    "delete-selected-tasks",
    "save-note",
    "save-notebook",
    "save-goal",
    "save-goal-contribution",
    "save-goal-plan-contribution",
    "delete-selected-notebooks",
    "save-contact",
    "save-alpha-feedback",
    "save-profile",
    "save-block-quick-task",
    "login-profile",
    "delete-profile",
    "save-cloud-config",
    "test-cloud-config",
    "save-google-contacts-config",
    "google-contacts-import",
    "copy-google-contacts-checklist",
    "cloud-sign-in",
    "cloud-sign-up",
    "cloud-sign-out",
    "cloud-push-workspace",
    "cloud-force-push-workspace",
    "cloud-pull-workspace",
    "cloud-smart-merge",
    "copy-media-storage-plan",
    "cloud-upload-local-media",
    "cloud-refresh-media-links",
    "simulate-detect",
    "simulate-import",
    "run-smart-sync",
    "sync-connection",
    "add-inbox-bill",
    "add-inbox-subscription",
    "cancel-inbox-subscription",
    "link-inbox-item",
    "dismiss-inbox-item",
    "save-subscription",
    "save-subscription-media",
    "reset-data"
  ]);
  saveData({ undo: false, cloudSync: false, syncStamp: false });

  function getHashView() {
    if (typeof window === "undefined" || !window.location) return "";
    const view = String(window.location.hash || "").replace("#", "");
    return validViews.has(view) ? view : "";
  }

  function syncHash(view) {
    if (typeof window === "undefined" || !window.location) return;
    if (!validViews.has(view)) return;
    const next = `#${view}`;
    if (window.location.hash === next) return;
    if (window.history && typeof window.history.pushState === "function") window.history.pushState(null, "", next);
    else window.location.hash = view;
  }

  function loadData() {
    const fallbackRaw = getSessionFallback();
    if (fallbackRaw) {
      try {
        const parsedFallback = JSON.parse(fallbackRaw);
        ui.lastSaveError = "Recovered your most recent work from this browser tab. Permanent save still needs browser storage room.";
        return normalizeData(mergeSeed(clone(seed), parsedFallback));
      } catch (error) {
        clearSessionFallback();
      }
    }
    try {
      const raw = localStorage.getItem(profileDataKey());
      if (!raw) {
        const legacyRaw = currentProfileId === profiles[0]?.id ? localStorage.getItem(STORE_KEY) : "";
        if (legacyRaw) {
          const parsedLegacy = JSON.parse(legacyRaw);
          return normalizeData(mergeSeed(clone(seed), parsedLegacy));
        }
        return normalizeData(clone(seed));
      }
      const parsed = JSON.parse(raw);
      return normalizeData(mergeSeed(clone(seed), parsed));
    } catch (error) {
      return normalizeData(clone(seed));
    }
  }

  function loadProfiles() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((profile) => ({
          id: profile.id || id("profile"),
          username: String(profile.username || "user"),
          displayName: String(profile.displayName || profile.username || "User"),
          password: String(profile.password || "")
        }));
      }
    } catch (error) {
      // Use the built-in local demo profile when saved profile data is malformed.
    }
    const fallback = [{ id: "profile_demo", username: "demo", displayName: "Demo User", password: "demo" }];
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(fallback));
    } catch (error) {
      // Local storage can be blocked in some browser modes.
    }
    return fallback;
  }

  function loadActiveProfileId(profileList) {
    try {
      const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (saved && profileList.some((profile) => profile.id === saved)) return saved;
    } catch (error) {
      // Fall back below.
    }
    return profileList[0]?.id || "";
  }

  function loadCloudConfig() {
    try {
      const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return mergeCloudConfig(parsed);
    } catch (error) {
      return mergeCloudConfig({});
    }
  }

  function normalizeCloudConfig(config) {
    const rawUrl = String(config?.url || "").trim();
    let url = rawUrl.replace(/\/+$/, "");
    url = url.replace(/\/(rest|auth|storage|graphql)\/v1\/?$/i, "");
    return {
      url,
      anonKey: normalizeCloudKey(config?.anonKey)
    };
  }

  function normalizeCloudKey(value) {
    let key = String(value || "").trim().replace(/^["']|["'];?$/g, "");
    const publishablePrefix = "sb_publishable_";
    const firstPublishableKey = key.indexOf(publishablePrefix);
    if (firstPublishableKey >= 0) {
      key = key.slice(firstPublishableKey);
      const duplicatePublishableKey = key.indexOf(publishablePrefix, publishablePrefix.length);
      if (duplicatePublishableKey > 0) key = key.slice(0, duplicatePublishableKey);
      key = key.replace(/[^A-Za-z0-9_-].*$/, "");
    }
    return key.trim();
  }

  function mergeCloudConfig(config) {
    const saved = normalizeCloudConfig(config);
    if (hostedCloudConfigReady()) {
      return normalizeCloudConfig(hostedCloudConfig);
    }
    return normalizeCloudConfig({
      url: saved.url || hostedCloudConfig.url,
      anonKey: saved.anonKey || hostedCloudConfig.anonKey
    });
  }

  function hostedCloudConfigStarted() {
    return Boolean(hostedCloudConfig.url || hostedCloudConfig.anonKey);
  }

  function hostedCloudConfigReady() {
    return Boolean(hostedCloudConfig.url && hostedCloudConfig.anonKey);
  }

  function cloudHasProjectUrl() {
    return Boolean(cloudConfig.url);
  }

  function rememberStorageFailure(message, error) {
    console.warn(message, error);
    ui.lastSaveError = message;
    return false;
  }

  function saveCloudConfigLocal(config) {
    cloudConfig = normalizeCloudConfig(config);
    try {
      localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
      return true;
    } catch (error) {
      return rememberStorageFailure("BillMaster could not save cloud setup in this browser. Storage may be full or blocked.", error);
    }
  }

  function loadCloudSession() {
    try {
      const raw = localStorage.getItem(CLOUD_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.accessToken || !parsed?.user?.id) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveCloudSession(session) {
    cloudSession = session || null;
    try {
      if (cloudSession) localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(cloudSession));
      else localStorage.removeItem(CLOUD_SESSION_KEY);
      return true;
    } catch (error) {
      const message = cloudSession
        ? "Cloud sign-in is active for this tab, but BillMaster could not remember it after reload. Browser storage may be full or blocked."
        : "BillMaster could not update the saved cloud session in this browser.";
      return rememberStorageFailure(message, error);
    }
  }

  function normalizedCloudEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function loadPendingCleanSignups() {
    try {
      const raw = localStorage.getItem(CLOUD_PENDING_CLEAN_SIGNUP_KEY);
      return raw ? JSON.parse(raw) || {} : {};
    } catch (error) {
      return {};
    }
  }

  function savePendingCleanSignups(pending) {
    try {
      localStorage.setItem(CLOUD_PENDING_CLEAN_SIGNUP_KEY, JSON.stringify(pending || {}));
    } catch (error) {
      // The sign-in flow still works without this convenience flag.
    }
  }

  function setPendingCleanSignup(email, enabled) {
    const normalizedEmail = normalizedCloudEmail(email);
    if (!normalizedEmail) return;
    const pending = loadPendingCleanSignups();
    if (enabled) pending[normalizedEmail] = true;
    else delete pending[normalizedEmail];
    savePendingCleanSignups(pending);
  }

  function hasPendingCleanSignup(email) {
    const normalizedEmail = normalizedCloudEmail(email);
    if (!normalizedEmail) return false;
    return Boolean(loadPendingCleanSignups()[normalizedEmail]);
  }

  function cloudConfigured() {
    return Boolean(cloudConfig.url && cloudConfig.anonKey);
  }

  function cloudSignedIn() {
    return Boolean(cloudConfigured() && cloudSession?.accessToken && cloudSession?.user?.id);
  }

  function cloudAutoSyncEnabled() {
    return Boolean(cloudSignedIn() && data.settings?.cloudAutoSync);
  }

  function cloudBrowserOffline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }

  function cloudOfflineMessage() {
    return "Offline. Your data is still saved on this device and will sync automatically when internet returns.";
  }

  function cloudStatusLabel() {
    if (!cloudHasProjectUrl()) return "Needs setup";
    if (!cloudConfig.anonKey) return "Needs public key";
    if (!cloudSignedIn()) return "Ready to sign in";
    return "Signed in";
  }

  function cloudStatusClass() {
    if (!cloudConfigured()) return "warn";
    if (!cloudSignedIn()) return "info";
    return "success";
  }

  function cloudSafeEmail() {
    return cloudSession?.user?.email || "No cloud account yet";
  }

  function cloudAutoSyncLabel() {
    if (!cloudConfigured()) return cloudHasProjectUrl() ? "Public key missing" : "Setup needed";
    if (!cloudSignedIn()) return "Ready after sign-in";
    return cloudAutoSyncEnabled() ? "Auto push/pull" : "Manual only";
  }

  function cloudSyncStateClass(state = data.settings?.cloudSyncState) {
    if (data.settings?.cloudSyncConflictAt || state === "conflict") return "danger";
    if (state === "error") return "danger";
    if (["queued", "pushing", "pulling", "checking"].includes(state)) return "info";
    if (["synced", "pushed", "pulled", "checked"].includes(state)) return "success";
    return cloudAutoSyncEnabled() ? "success" : "muted";
  }

  function cloudSyncStateLabel(state = data.settings?.cloudSyncState) {
    if (data.settings?.cloudSyncConflictAt || state === "conflict") return "Needs choice";
    if (state === "queued") return "Queued";
    if (state === "pushing") return "Pushing";
    if (state === "pulling") return "Pulling";
    if (state === "checking") return "Checking";
    if (state === "pushed") return "Pushed";
    if (state === "pulled") return "Pulled";
    if (state === "checked") return "Checked";
    if (state === "error") return "Error";
    if (state === "synced") return "Synced";
    return cloudAutoSyncEnabled() ? "Watching" : "Idle";
  }

  function setCloudSyncState(state, message, extra = {}) {
    const now = extra.at || new Date().toISOString();
    data.settings.cloudSyncState = state || "idle";
    data.settings.cloudSyncMessage = message || "";
    if (extra.queued) data.settings.cloudLastQueuedAt = now;
    if (extra.pushed) data.settings.cloudLastPushedAt = now;
    if (extra.pulled) data.settings.cloudLastPulledAt = now;
    if (extra.checked) data.settings.cloudLastAutoCheckAt = now;
    if (state !== "error") data.settings.cloudSyncError = "";
  }

  function cloudTimeLabel(value) {
    if (!value) return "Not yet";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Not yet";
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }

  function cloudSetupTestReady() {
    return Boolean(cloudConfigured() && data.settings?.cloudLastSetupTestOk && data.settings?.cloudLastSetupTestHost === cloudProjectHost());
  }

  function cloudSetupTestLabel() {
    if (cloudSetupTestReady()) return `Passed ${cloudTimeLabel(data.settings.cloudLastSetupTestAt)}`;
    if (data.settings?.cloudLastSetupTestMessage) {
      const status = data.settings.cloudLastSetupTestStatus ? ` (${data.settings.cloudLastSetupTestStatus})` : "";
      return `Failed ${cloudTimeLabel(data.settings.cloudLastSetupTestAt)}${status}`;
    }
    return "Not tested yet";
  }

  function recordCloudSetupTest(ok, message, status = 0) {
    data.settings.cloudLastSetupTestAt = new Date().toISOString();
    data.settings.cloudLastSetupTestOk = Boolean(ok);
    data.settings.cloudLastSetupTestStatus = Number(status || 0);
    data.settings.cloudLastSetupTestHost = cloudProjectHost();
    data.settings.cloudLastSetupTestMessage = message || "";
    saveData({ undo: false, cloudSync: false, syncStamp: false });
  }

  function finishCloudSetupTest(ok, message, status = 0) {
    recordCloudSetupTest(ok, message, status);
    showToast(message, ok ? "success" : "danger");
  }

  function cloudNextActionLabel() {
    if (!cloudConfigured()) return cloudHasProjectUrl() ? "Add publishable key" : "Add Supabase project";
    if (!cloudSignedIn()) return "Sign in";
    if (data.settings?.cloudSyncConflictAt) return "Use Smart merge";
    if (cloudPushInFlight) return "Saving this device";
    if (cloudPullInFlight) return "Checking cloud";
    if (cloudAutoPushTimer || cloudHasLocalUnsyncedChanges) return "Local save queued";
    if (cloudAutoSyncEnabled()) return "Auto sync watching";
    return "Turn Auto On";
  }

  function clearAppTimer(timer) {
    if (timer && typeof clearTimeout === "function") clearTimeout(timer);
  }

  function setAppTimer(callback, delay) {
    if (typeof setTimeout !== "function") return null;
    return setTimeout(callback, delay);
  }

  function cloudProjectHost() {
    if (!cloudConfig.url) return "";
    try {
      return new URL(cloudConfig.url).host;
    } catch (error) {
      return cloudConfig.url;
    }
  }

  function cloudHeaders(authenticated = true, extra = {}) {
    const headers = {
      apikey: cloudConfig.anonKey,
      "Content-Type": "application/json",
      ...extra
    };
    if (authenticated && cloudSession?.accessToken) headers.Authorization = `Bearer ${cloudSession.accessToken}`;
    return headers;
  }

  function cloudBinaryHeaders(extra = {}) {
    const headers = {
      apikey: cloudConfig.anonKey,
      ...extra
    };
    if (cloudSession?.accessToken) headers.Authorization = `Bearer ${cloudSession.accessToken}`;
    return headers;
  }

  async function cloudStorageFetch(path, options = {}) {
    if (!cloudConfigured()) throw new Error("Supabase is not configured.");
    await refreshCloudSessionIfNeeded();
    const response = await fetch(`${cloudConfig.url}/storage/v1${path}`, {
      ...options,
      headers: cloudBinaryHeaders(options.headers || {})
    });
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (error) {
        body = text;
      }
    }
    if (!response.ok) {
      const message = body?.msg || body?.message || body?.error_description || body?.error || `Supabase storage request failed (${response.status}).`;
      if (/jwt required|jwt expired|invalid jwt|missing authorization|not authenticated/i.test(String(message))) {
        saveCloudSession(null);
        throw new Error("Your cloud sign-in expired. Sign in again, then retry.");
      }
      throw new Error(cloudFriendlyErrorMessage(message, response.status));
    }
    return body;
  }

  async function cloudFetch(path, options = {}, authenticated = true) {
    if (!cloudConfigured()) throw new Error("Supabase is not configured.");
    if (authenticated) await refreshCloudSessionIfNeeded();
    const response = await fetch(`${cloudConfig.url}${path}`, {
      ...options,
      headers: cloudHeaders(authenticated, options.headers || {})
    });
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (error) {
        body = text;
      }
    }
    if (!response.ok) {
      const message = body?.msg || body?.message || body?.error_description || body?.error || `Supabase request failed (${response.status}).`;
      if (/jwt required|jwt expired|invalid jwt|missing authorization|not authenticated/i.test(String(message))) {
        saveCloudSession(null);
        throw new Error("Your cloud sign-in expired. Sign in again, then retry.");
      }
      throw new Error(cloudFriendlyErrorMessage(message, response.status));
    }
    return body;
  }

  async function refreshCloudSessionIfNeeded() {
    if (!cloudSession?.accessToken || !cloudSession?.user?.id) {
      saveCloudSession(null);
      throw new Error("Sign in to cloud sync first.");
    }
    const refreshToken = cloudSession.refreshToken || "";
    const expiresAt = Number(cloudSession.expiresAt || 0);
    if (!refreshToken || (expiresAt && expiresAt > Date.now() + 60000)) return;
    const response = await fetch(`${cloudConfig.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: cloudHeaders(false),
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (error) {
        body = text;
      }
    }
    if (!response.ok || !body?.access_token) {
      saveCloudSession(null);
      throw new Error("Your cloud sign-in expired. Sign in again, then retry.");
    }
    saveCloudSession(sessionFromAuthResult(body, cloudSession?.user));
  }

  async function cloudProbe(path, options = {}) {
    const response = await fetch(`${cloudConfig.url}${path}`, {
      method: "GET",
      ...options,
      headers: cloudHeaders(false, options.headers || {})
    });
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (error) {
        body = text;
      }
    }
    const message = cloudFriendlyErrorMessage(body?.msg || body?.message || body?.error_description || body?.error || text || response.statusText || "", response.status);
    return { ok: response.ok, status: response.status, message, body };
  }

  function cloudFriendlyErrorMessage(message, status = 0) {
    const text = String(message || "").trim();
    if (Number(status) === 402 || /payment required|project.*paused|project.*inactive|billing|egress[_\s-]*quota|spend cap|restricted.*project|upgrade.*plan/i.test(text)) {
      return "Supabase project is restricted, paused, or billing needs attention. Open Supabase, restore service or remove the spend-cap blocker, then test cloud setup again before inviting friends.";
    }
    return text || `Supabase request failed${status ? ` (${status})` : ""}.`;
  }

  function saveProfiles() {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      return true;
    } catch (error) {
      return rememberStorageFailure("BillMaster could not save the local profile list. Browser storage may be full or blocked.", error);
    }
  }

  function persistActiveProfileId(profileId) {
    try {
      if (profileId) localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
      else localStorage.removeItem(ACTIVE_PROFILE_KEY);
      return true;
    } catch (error) {
      return rememberStorageFailure("BillMaster could not remember the active local profile. Browser storage may be full or blocked.", error);
    }
  }

  function removeStoredProfileWorkspace(profileId) {
    try {
      localStorage.removeItem(profileDataKey(profileId));
      return true;
    } catch (error) {
      return rememberStorageFailure("BillMaster could not remove that profile workspace from this browser.", error);
    }
  }

  function activeProfile() {
    return profiles.find((profile) => profile.id === currentProfileId) || profiles[0] || null;
  }

  function profileDataKey(profileId = currentProfileId) {
    return `${STORE_KEY}:${profileId || "locked"}`;
  }

  function sessionFallbackKey(profileId = currentProfileId) {
    return `${SESSION_FALLBACK_PREFIX}${profileDataKey(profileId)}`;
  }

  function getSessionFallback(profileId = currentProfileId) {
    if (typeof sessionStorage === "undefined") return "";
    try {
      return sessionStorage.getItem(sessionFallbackKey(profileId)) || "";
    } catch (error) {
      return "";
    }
  }

  function setSessionFallback(serialized, profileId = currentProfileId) {
    if (typeof sessionStorage === "undefined") return false;
    try {
      sessionStorage.setItem(sessionFallbackKey(profileId), serialized);
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearSessionFallback(profileId = currentProfileId) {
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.removeItem(sessionFallbackKey(profileId));
    } catch (error) {
      // Session storage can be blocked; nothing to clean up.
    }
  }

  function blankWorkspace() {
    const blank = clone(seed);
    Object.keys(blank).forEach((key) => {
      if (Array.isArray(blank[key])) blank[key] = [];
    });
    blank.settings = clone(seed.settings);
    return normalizeData(blank);
  }

  function normalizeData(nextData) {
    Object.keys(seed).forEach((key) => {
      if (key === "dismissedInboxIds") nextData[key] = Array.isArray(nextData[key]) ? nextData[key].map(String) : [];
      else if (Array.isArray(seed[key])) nextData[key] = safeArray(nextData[key]);
    });
    nextData.settings = {
      taskDefaultBgColor: DEFAULT_TASK_BG,
      categoryColors: { ...defaultCategoryColors },
      calendarDayColors: {},
      interfaceMode: "power",
      cloudAutoSync: false,
      cloudRemoteUpdatedAt: "",
      cloudLastAutoCheckAt: "",
      cloudLastQueuedAt: "",
      cloudLastPushedAt: "",
      cloudLastPulledAt: "",
      cloudSyncState: "idle",
      cloudSyncMessage: "",
      cloudSyncConflictAt: "",
      cloudSyncConflictRemoteAt: "",
      cloudSyncConflictMessage: "",
      cloudLastSetupTestAt: "",
      cloudLastSetupTestOk: false,
      cloudLastSetupTestStatus: 0,
      cloudLastSetupTestHost: "",
      cloudLastSetupTestMessage: "",
      backupFrequency: "weekly",
      backupLastExportAt: "",
      backupLastExportName: "",
      backupLastRestoreAt: "",
      backupLastReminderAt: "",
      googleContactsClientId: "",
      googleContactsLastSyncAt: "",
      googleContactsLastImportCount: 0,
      googleContactsLastGroupImportCount: 0,
      googleContactsLastStatus: "",
      deletedItems: {},
      ...(nextData.settings || {})
    };
    nextData.settings.categoryColors = { ...defaultCategoryColors, ...(nextData.settings.categoryColors || {}) };
    nextData.settings.calendarDayColors = normalizeCalendarDayColors(nextData.settings.calendarDayColors);
    nextData.settings.deletedItems = normalizeDeletedItemsMap(nextData.settings.deletedItems);
    nextData.settings.customTaskCategories = normalizeCustomTaskCategories(nextData.settings.customTaskCategories);
    nextData.settings.customTransactionCategories = normalizeCustomTransactionCategories([
      ...(Array.isArray(nextData.settings.customTransactionCategories) ? nextData.settings.customTransactionCategories : []),
      ...safeArray(nextData.transactions).map((tx) => tx.category)
    ]);
    nextData.settings.customTaskCategories.forEach((category) => ensureTaskCategory(category, nextData.settings.categoryColors[category], nextData));
    if (!["simple", "power"].includes(nextData.settings.interfaceMode)) nextData.settings.interfaceMode = "power";
    nextData.settings.cloudAutoSync = Boolean(nextData.settings.cloudAutoSync);
    if (!["off", "daily", "weekly", "monthly"].includes(nextData.settings.backupFrequency)) nextData.settings.backupFrequency = "weekly";
    if (!taskBackgrounds.includes(nextData.settings.taskDefaultBgColor)) nextData.settings.taskDefaultBgColor = DEFAULT_TASK_BG;
    taskCategories.forEach((category) => {
      if (!isHexColor(nextData.settings.categoryColors[category])) nextData.settings.categoryColors[category] = defaultCategoryColors[category];
    });
    normalizeAddresses(nextData);
    normalizeLoans(nextData);
    normalizeGoals(nextData);
    normalizeProjects(nextData);
    normalizeNotebooks(nextData);
    normalizeHabits(nextData);
    normalizeHabitTemplates(nextData);
    normalizeContacts(nextData);
    normalizeTasks(nextData);
    normalizeNotificationLog(nextData);
    nextData.transactions = dedupeLendingTransactions(nextData.transactions || []);
    return nextData;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
  }

  function syncCollectionKeys() {
    return Object.keys(seed).filter((key) => Array.isArray(seed[key]) && key !== "dismissedInboxIds");
  }

  function normalizeDeletedItemsMap(value) {
    const normalized = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return normalized;
    Object.entries(value).forEach(([collection, itemMap]) => {
      if (!itemMap || typeof itemMap !== "object" || Array.isArray(itemMap)) return;
      Object.entries(itemMap).forEach(([itemId, deletedAt]) => {
        const key = String(itemId || "").trim();
        const at = String(deletedAt || "").trim();
        if (!key || !at) return;
        normalized[collection] = normalized[collection] || {};
        normalized[collection][key] = at;
      });
    });
    return normalized;
  }

  function syncItemId(collection, item) {
    if (!item || typeof item !== "object") return "";
    if (item.id) return String(item.id);
    if (collection === "weather" && item.date) return String(item.date);
    return "";
  }

  function syncComparable(value) {
    if (Array.isArray(value)) return value.map(syncComparable);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value)
      .filter((key) => !["updatedAt", "syncUpdatedAt"].includes(key))
      .sort()
      .reduce((output, key) => {
        output[key] = syncComparable(value[key]);
        return output;
      }, {});
  }

  function syncFingerprint(value) {
    try {
      return JSON.stringify(syncComparable(value));
    } catch (error) {
      return String(value || "");
    }
  }

  function workspaceFallbackTime(payload) {
    return payload?.settings?.cloudRemoteUpdatedAt
      || payload?.settings?.cloudLastSyncAt
      || payload?.settings?.cloudLastAutoCheckAt
      || "";
  }

  function syncItemTime(item, fallback = "") {
    return cloudTimeValue(item?.updatedAt || item?.syncUpdatedAt || fallback);
  }

  function mergeDeletedItems(localDeleted, incomingDeleted) {
    const merged = normalizeDeletedItemsMap(localDeleted);
    const incoming = normalizeDeletedItemsMap(incomingDeleted);
    Object.entries(incoming).forEach(([collection, itemMap]) => {
      Object.entries(itemMap).forEach(([itemId, incomingAt]) => {
        const currentAt = merged[collection]?.[itemId] || "";
        if (!currentAt || cloudTimeValue(incomingAt) >= cloudTimeValue(currentAt)) {
          merged[collection] = merged[collection] || {};
          merged[collection][itemId] = incomingAt;
        }
      });
    });
    return merged;
  }

  function stampLocalSyncChanges(nextData, options = {}) {
    if (options.syncStamp === false) return nextData;
    let previousData = null;
    try {
      previousData = lastSavedSnapshot ? JSON.parse(lastSavedSnapshot) : null;
    } catch (error) {
      previousData = null;
    }
    const now = new Date().toISOString();
    const baseline = workspaceFallbackTime(nextData) || workspaceFallbackTime(previousData) || now;
    const deletedItems = normalizeDeletedItemsMap(nextData.settings?.deletedItems || previousData?.settings?.deletedItems);
    syncCollectionKeys().forEach((collection) => {
      const currentItems = safeArray(nextData[collection]);
      const previousItems = safeArray(previousData?.[collection]);
      const previousById = new Map();
      previousItems.forEach((item) => {
        const itemId = syncItemId(collection, item);
        if (itemId) previousById.set(itemId, item);
      });
      const currentIds = new Set();
      nextData[collection] = currentItems.map((item) => {
        const itemId = syncItemId(collection, item);
        if (!itemId) return item;
        currentIds.add(itemId);
        const previousItem = previousById.get(itemId);
        const stamped = { ...item };
        if (!stamped.updatedAt) stamped.updatedAt = previousItem?.updatedAt || previousItem?.syncUpdatedAt || baseline;
        if (!previousItem || syncFingerprint(previousItem) !== syncFingerprint(stamped)) stamped.updatedAt = now;
        return stamped;
      });
      previousById.forEach((previousItem, itemId) => {
        if (currentIds.has(itemId)) return;
        deletedItems[collection] = deletedItems[collection] || {};
        deletedItems[collection][itemId] = deletedItems[collection][itemId] || now;
      });
    });
    nextData.settings = nextData.settings || {};
    nextData.settings.deletedItems = deletedItems;
    return nextData;
  }

  function isHexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""));
  }

  function normalizeCategoryName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function normalizeCustomTaskCategories(categories) {
    return Array.from(new Set((Array.isArray(categories) ? categories : [])
      .map(normalizeCategoryName)
      .filter((category) => category && !baseTaskCategories.some((existing) => existing.toLowerCase() === category.toLowerCase()))));
  }

  function normalizeCustomTransactionCategories(categories) {
    const defaultNames = Object.values(defaultTransactionCategories).flat();
    return uniqueNames(Array.isArray(categories) ? categories : [])
      .map(normalizeCategoryName)
      .filter((category) => category && !defaultNames.some((existing) => existing.toLowerCase() === category.toLowerCase()));
  }

  function uniqueNames(values) {
    const names = [];
    (Array.isArray(values) ? values : []).forEach((value) => {
      const normalized = normalizeCategoryName(value);
      if (normalized && !names.some((name) => name.toLowerCase() === normalized.toLowerCase())) names.push(normalized);
    });
    return names;
  }

  function transactionCategoryOptions(type = "expense", selected = "") {
    const primaryType = type === "income" ? "income" : "expense";
    const secondaryType = primaryType === "income" ? "expense" : "income";
    const existing = data.transactions
      .filter((tx) => tx.category)
      .map((tx) => tx.category);
    return [
      ...uniqueNames(defaultTransactionCategories[primaryType]),
      ...uniqueNames(data.settings?.customTransactionCategories),
      ...uniqueNames(existing),
      ...uniqueNames(defaultTransactionCategories[secondaryType]),
      normalizeCategoryName(selected),
      ADD_TRANSACTION_CATEGORY_VALUE
    ].reduce((options, category) => {
      if (!category) return options;
      if (category === ADD_TRANSACTION_CATEGORY_VALUE || !options.some((item) => item.toLowerCase() === category.toLowerCase())) options.push(category);
      return options;
    }, []);
  }

  function transactionCategoryLabel(category) {
    return category === ADD_TRANSACTION_CATEGORY_VALUE ? "+ Add new category" : category;
  }

  function ensureTransactionCategory(category) {
    const normalized = normalizeCategoryName(category);
    if (!normalized) return "";
    data.settings = data.settings || {};
    data.settings.customTransactionCategories = normalizeCustomTransactionCategories(data.settings.customTransactionCategories);
    const defaults = Object.values(defaultTransactionCategories).flat();
    if (!defaults.some((item) => item.toLowerCase() === normalized.toLowerCase())
      && !data.settings.customTransactionCategories.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      data.settings.customTransactionCategories.push(normalized);
    }
    return normalized;
  }

  function customCategoryColor(category) {
    const palette = ["#6c63ff", "#00bcd4", "#4caf50", "#ff9800", "#f44336", "#ffc107", "#14b8a6", "#8b5cf6"];
    const total = Array.from(category || "").reduce((sumValue, char) => sumValue + char.charCodeAt(0), 0);
    return palette[total % palette.length];
  }

  function ensureTaskCategory(category, color = "", targetData = data) {
    const normalized = normalizeCategoryName(category);
    if (!normalized) return "";
    const existing = taskCategories.find((item) => item.toLowerCase() === normalized.toLowerCase());
    const finalName = existing || normalized;
    if (!existing) taskCategories.push(finalName);
    if (ui.taskCategoryFilters[finalName] === undefined) ui.taskCategoryFilters[finalName] = true;
    if (targetData?.settings) {
      targetData.settings.customTaskCategories = targetData.settings.customTaskCategories || [];
      if (!Object.keys(defaultCategoryColors).some((name) => name.toLowerCase() === finalName.toLowerCase())
        && !targetData.settings.customTaskCategories.some((name) => name.toLowerCase() === finalName.toLowerCase())) {
        targetData.settings.customTaskCategories.push(finalName);
      }
      targetData.settings.categoryColors = targetData.settings.categoryColors || {};
      if (!isHexColor(targetData.settings.categoryColors[finalName])) {
        targetData.settings.categoryColors[finalName] = isHexColor(color) ? color : customCategoryColor(finalName);
      }
    }
    return finalName;
  }

  function normalizeAddresses(nextData) {
    const addresses = nextData.addresses || [];
    const seen = new Map();
    const remap = new Map();
    addresses.forEach((address) => {
      normalizeAddressUnit(address);
      address.validationProvider = address.validationProvider || "";
      address.validationUrl = address.validationUrl || "";
      address.validationCheckedAt = address.validationCheckedAt || "";
      const onlineVerified = Boolean(address.verified && address.validationStatus === "verified" && address.validationProvider);
      const onlineReviewing = address.validationStatus === "reviewing";
      address.verified = onlineVerified;
      address.validationStatus = onlineVerified ? "verified" : (onlineReviewing ? "reviewing" : "unverified");
    });
    nextData.addresses = addresses.filter((address) => {
      const key = addressKey(address);
      if (!key) return true;
      if (seen.has(key)) {
        remap.set(address.id, seen.get(key));
        return false;
      }
      seen.set(key, address.id);
      return true;
    });
    if (!remap.size) return;
    ["tasks", "bills", "contacts"].forEach((collection) => {
      (nextData[collection] || []).forEach((item) => {
        if (remap.has(item.addressId)) item.addressId = remap.get(item.addressId);
      });
    });
  }

  function addressKey(address) {
    if (!address || typeof address !== "object") return "";
    return [address.label, mapsStreetLine(address), addressUnit(address), address.city, address.state, address.zip, address.country]
      .map((part) => String(part || "").trim().toLowerCase())
      .join("|");
  }

  function dedupeLendingTransactions(transactions) {
    const seen = new Set();
    return transactions.filter((tx) => {
      if (tx.category !== "Lending" || !String(tx.name || "").startsWith("Repayment from ")) return true;
      const key = [tx.name, tx.merchant, tx.amount, tx.projected, tx.date, tx.status].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeLoans(nextData) {
    (nextData.loans || []).forEach((loan) => {
      const hadForgiven = loan.forgiven !== undefined && loan.forgiven !== null && loan.forgiven !== "";
      const rawStatus = String(loan.status || "").toLowerCase();
      const isDone = rawStatus === "done" || loan.done === true;
      loan.borrower = String(loan.borrower || "Borrower");
      loan.contactId = loan.contactId || null;
      loan.borrowerPhone = String(loan.borrowerPhone || "");
      loan.borrowerEmail = String(loan.borrowerEmail || "");
      loan.description = String(loan.description || "");
      loan.date = loan.date || "2026-05-06";
      loan.dueDate = loan.dueDate || "2026-05-20";
      loan.amount = moneyNumber(loan.amount);
      loan.repaid = Math.max(0, moneyNumber(loan.repaid));
      loan.forgiven = Math.max(0, moneyNumber(loan.forgiven));
      if (rawStatus === "forgiven" && !hadForgiven) {
        loan.forgiven = Math.max(0, loan.amount - loan.repaid);
      }
      if (loan.repaid > loan.amount) loan.repaid = loan.amount;
      if (loan.forgiven >= loan.amount && loan.amount > 0) loan.repaid = 0;
      if (loan.repaid + loan.forgiven > loan.amount) loan.forgiven = Math.max(0, loan.amount - loan.repaid);
      loan.done = isDone;
      loan.doneAt = isDone ? (loan.doneAt || todayIso()) : "";
      loan.status = isDone ? "Done" : loanStatusFromAmounts(loan);
    });
  }

  function normalizeGoals(nextData) {
    const accountIds = new Set(safeArray(nextData.accounts).map((account) => account.id));
    nextData.goalContributions = safeArray(nextData.goalContributions).map((entry) => ({
      ...entry,
      id: entry.id || id("goal_contribution"),
      goalId: entry.goalId || "",
      goalName: String(entry.goalName || ""),
      accountId: accountIds.has(entry.accountId) ? entry.accountId : "",
      accountName: String(entry.accountName || ""),
      amount: Math.max(0, moneyNumber(entry.amount)),
      date: entry.date || todayIso(),
      notes: String(entry.notes || ""),
      source: String(entry.source || "manual"),
      confirmedAt: String(entry.confirmedAt || "")
    }));
    (nextData.goals || []).forEach((goal) => {
      goal.name = String(goal.name || "Goal");
      goal.target = Math.max(0, moneyNumber(goal.target));
      goal.current = Math.max(0, moneyNumber(goal.current));
      goal.targetDate = goal.targetDate || todayIso();
      goal.createdAt = goal.createdAt || todayIso();
      goal.color = ["green", "teal", "purple", "amber"].includes(goal.color) ? goal.color : "green";
      goal.contributionSchedule = normalizeGoalSchedule(goal.contributionSchedule);
      goal.contributionAmount = Math.max(0, moneyNumber(goal.contributionAmount));
      goal.contributionAccountId = accountIds.has(goal.contributionAccountId) ? goal.contributionAccountId : (nextData.accounts?.[0]?.id || "");
      goal.confirmContributions = goal.confirmContributions !== false;
      const completed = goal.target > 0 && goal.current >= goal.target;
      goal.status = completed ? "Completed" : "In Progress";
      if (completed) goal.completedAt = goal.completedAt || todayIso();
      else goal.completedAt = "";
    });
  }

  function normalizeGoalSchedule(value) {
    const match = goalScheduleOptions.find((option) => option.toLowerCase() === String(value || "").toLowerCase());
    return match || "None";
  }

  function normalizeContacts(nextData) {
    nextData.contacts = safeArray(nextData.contacts).map((contact) => ({
      ...contact,
      name: String(contact.name || "Contact"),
      email: String(contact.email || ""),
      phone: String(contact.phone || ""),
      textEmail: String(contact.textEmail || contact.smsEmail || ""),
      googleId: String(contact.googleId || contact.googleResourceName || ""),
      googleResourceName: String(contact.googleResourceName || contact.googleId || ""),
      googleEtag: String(contact.googleEtag || contact.etag || ""),
      source: String(contact.source || "local"),
      groupIds: Array.isArray(contact.groupIds) ? contact.groupIds : [],
      addressId: contact.addressId || null
    }));
    nextData.contactGroups = safeArray(nextData.contactGroups);
    if (!nextData.contactGroups.length) nextData.contactGroups = [
      { id: "group_1", name: "BM", contactIds: nextData.contacts.slice(0, 3).map((contact) => contact.id) },
      { id: "group_2", name: "TtOneTT", contactIds: [] }
    ];
    nextData.contactGroups = nextData.contactGroups.map((group, index) => ({
      ...group,
      id: group.id || id("group"),
      name: String(group.name || `Group ${index + 1}`),
      contactIds: Array.from(new Set(Array.isArray(group.contactIds) ? group.contactIds : [])),
      googleResourceName: String(group.googleResourceName || ""),
      source: String(group.source || "local")
    }));
    nextData.contacts.forEach((contact) => {
      const fromGroups = nextData.contactGroups.filter((group) => group.contactIds.includes(contact.id)).map((group) => group.id);
      contact.groupIds = Array.from(new Set([...(contact.groupIds || []), ...fromGroups]));
    });
  }

  function moneyNumber(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function loanAmount(loan) {
    return Math.max(0, moneyNumber(loan?.amount));
  }

  function loanRepaid(loan) {
    return Math.max(0, moneyNumber(loan?.repaid));
  }

  function loanForgiven(loan) {
    return Math.max(0, moneyNumber(loan?.forgiven));
  }

  function loanRemaining(loan) {
    return Math.max(0, moneyNumber(loanAmount(loan) - loanRepaid(loan) - loanForgiven(loan)));
  }

  function loanStatusFromAmounts(loan) {
    if (loan?.done || String(loan?.status || "").toLowerCase() === "done") return "Done";
    const amount = loanAmount(loan);
    const repaid = loanRepaid(loan);
    const forgiven = loanForgiven(loan);
    const remaining = loanRemaining(loan);
    if (amount <= 0) return "Outstanding";
    if (remaining <= 0) {
      if (forgiven >= amount && repaid <= 0) return "Forgiven";
      if (forgiven > 0) return "Closed";
      return "Repaid";
    }
    if (repaid > 0 || forgiven > 0) return "Money Owed";
    return "Outstanding";
  }

  function lendingSummary() {
    return data.loans.reduce((summary, loan) => {
      if (loanIsDone(loan)) {
        summary.done += 1;
        summary.total += 1;
        return summary;
      }
      const status = loanStatusFromAmounts(loan);
      const remaining = loanRemaining(loan);
      summary.outstanding += remaining;
      if (status === "Money Owed") summary.partial += remaining;
      summary.repaid += loanRepaid(loan);
      summary.forgiven += loanForgiven(loan);
      summary.total += 1;
      return summary;
    }, { outstanding: 0, partial: 0, repaid: 0, forgiven: 0, done: 0, total: 0 });
  }

  function loanIsDone(loan) {
    return loan?.done === true || String(loan?.status || "").toLowerCase() === "done";
  }

  function normalizeProjects(nextData) {
    (nextData.projects || []).forEach((project) => {
      project.name = String(project.name || "Project");
      project.description = String(project.description || "");
      project.status = String(project.status || "Active");
      project.color = isHexColor(project.color) ? project.color : "#1a1f36";
      project.dueDate = project.dueDate || todayIso();
      if (!projectLevelOptions.includes(project.level)) project.level = "Medium";
      project.lastEditedAt = String(project.lastEditedAt || "");
    });
  }

  function normalizeNotebooks(nextData) {
    nextData.notebooks = safeArray(nextData.notebooks).map((notebook) => ({
      ...notebook,
      id: notebook.id || id("nb"),
      title: String(notebook.title || "Notebook"),
      description: String(notebook.description || ""),
      projectId: notebook.projectId || null,
      color: notebook.color || "#4388f3",
      icon: notebook.icon || "book",
      subjects: Array.from(new Set((Array.isArray(notebook.subjects) ? notebook.subjects : [])
        .map(normalizeNoteSubjectName)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
    }));
    const notebookIds = new Set(nextData.notebooks.map((notebook) => notebook.id));
    safeArray(nextData.notes).forEach((note) => {
      note.notebookId = notebookIds.has(note.notebookId) ? note.notebookId : null;
      note.subject = normalizeNoteSubjectName(note.subject);
      if (!note.notebookId || !note.subject) return;
      const notebook = nextData.notebooks.find((item) => item.id === note.notebookId);
      if (notebook && !notebook.subjects.some((subject) => subject.toLowerCase() === note.subject.toLowerCase())) {
        notebook.subjects.push(note.subject);
        notebook.subjects.sort((a, b) => a.localeCompare(b));
      }
    });
  }

  function normalizeTasks(nextData) {
    (nextData.tasks || []).forEach((task) => {
      task.endDate = task.endDate || task.date;
      if (!taskPriorityOptions.includes(task.priority)) task.priority = "Medium";
      if (!taskStatusOptions.includes(task.status)) task.status = "Not Started";
      task.category = taskCategory(task);
      task.bgColor = task.bgColor || nextData.settings.taskDefaultBgColor || DEFAULT_TASK_BG;
      task.fontFamily = task.fontFamily || "System";
      task.subtasks = normalizeSubtasks(task.subtasks);
      task.notifyContactIds = Array.isArray(task.notifyContactIds) ? task.notifyContactIds : [];
      task.notifyGroupIds = Array.isArray(task.notifyGroupIds) ? task.notifyGroupIds : [];
      task.notifyExtraRecipient = String(task.notifyExtraRecipient || "");
      task.notifyMessage = String(task.notifyMessage || "");
      task.notifyChannels = normalizeNotifyChannels(task.notifyChannels);
      task.notifyOnAnyStatus = task.notifyOnAnyStatus !== false;
      task.notifyOnStatuses = Array.isArray(task.notifyOnStatuses)
        ? task.notifyOnStatuses.filter((status) => taskStatusOptions.includes(status))
        : [];
      task.notifyConfigured = Boolean(task.notifyConfigured);
      task.alertOffsets = normalizeTaskAlertOffsets(task.alertOffsets);
      task.alertDevice = task.alertDevice !== false;
      task.alertSound = task.alertSound !== false;
      task.alertEmail = Boolean(task.alertEmail);
      task.alertConfigured = Boolean(task.alertConfigured && task.alertOffsets.length);
      task.alertFiredKeys = Array.isArray(task.alertFiredKeys)
        ? task.alertFiredKeys.map(String).filter(Boolean).slice(-TASK_ALERT_FIRED_LIMIT)
        : [];
      task.updatedAt = String(task.updatedAt || "");
    });
  }

  function normalizeNotificationLog(nextData) {
    nextData.notificationLog = safeArray(nextData.notificationLog).map((notice) => ({
      id: notice.id || id("notice"),
      type: String(notice.type || "task-status-change"),
      taskId: String(notice.taskId || ""),
      taskTitle: String(notice.taskTitle || notice.title || "Task"),
      previousStatus: String(notice.previousStatus || ""),
      status: String(notice.status || ""),
      channels: normalizeNotifyChannels(notice.channels),
      recipients: Array.isArray(notice.recipients) ? notice.recipients.map(String).filter(Boolean) : [],
      message: String(notice.message || ""),
      deliveryStatus: String(notice.deliveryStatus || "queued"),
      trigger: String(notice.trigger || "status"),
      createdAt: String(notice.createdAt || new Date().toISOString()),
      openedAt: String(notice.openedAt || ""),
      openedBy: String(notice.openedBy || ""),
      copiedAt: String(notice.copiedAt || ""),
      sentAt: String(notice.sentAt || ""),
      error: String(notice.error || "")
    }));
  }

  function normalizeNotifyChannels(channels) {
    const allowed = new Set(["email", "emailToText"]);
    const normalized = Array.from(new Set((Array.isArray(channels) ? channels : ["email"]).filter((channel) => allowed.has(channel))));
    return normalized.length ? normalized : ["email"];
  }

  function normalizeCalendarDayColors(colors) {
    const normalized = {};
    calendarDayColorKeys.forEach((key) => {
      const color = colors?.[key];
      if (isHexColor(color)) normalized[key] = color;
    });
    return normalized;
  }

  function normalizeTaskAlertOffsets(offsets) {
    const allowed = new Set(TASK_ALERT_OFFSET_OPTIONS);
    return Array.from(new Set((Array.isArray(offsets) ? offsets : [])
      .map((offset) => Number(offset))
      .filter((offset) => allowed.has(offset))))
      .sort((a, b) => b - a);
  }

  function normalizeSubtasks(subtasks) {
    if (!Array.isArray(subtasks)) return [];
    return subtasks
      .map((item) => {
        if (typeof item === "string") return { id: id("subtask"), text: item, done: false };
        return { id: item.id || id("subtask"), text: String(item.text || item.title || "").trim(), done: Boolean(item.done) };
      })
      .filter((item) => item.text);
  }

  function normalizeHabits(nextData) {
    (nextData.habits || []).forEach((habit) => {
      habit.title = String(habit.title || "Habit");
      habit.description = String(habit.description || "");
      if (!habitTypeOptions.includes(habit.type)) habit.type = "Personal";
      if (!habitScheduleOptions.includes(habit.schedule)) habit.schedule = "Daily";
      habit.startDate = habit.startDate || habit.date || "2026-05-06";
      habit.endDate = habit.endDate || "";
      habit.start = habit.start || "08:00";
      habit.end = habit.end || timeFromMinutes(Math.min(minutes(habit.start) + 30, 23 * 60 + 59));
      if (minutes(habit.end) <= minutes(habit.start)) habit.end = timeFromMinutes(Math.min(minutes(habit.start) + 30, 23 * 60 + 59));
      if (!taskPriorityOptions.includes(habit.priority)) habit.priority = "Medium";
      if (!["Active", "Paused", "Archived"].includes(habit.status)) habit.status = "Active";
      habit.includeHours = habit.includeHours !== false;
      habit.targetCount = Math.max(1, Math.round(Number(habit.targetCount || 1)));
      habit.freshStartDate = isIsoDateString(habit.freshStartDate) ? habit.freshStartDate : "";
      if (habit.freshStartDate && habit.endDate && habit.freshStartDate > habit.endDate) habit.freshStartDate = "";
      habit.addressId = habit.addressId || null;
      habit.color = isHexColor(habit.color) ? habit.color : defaultCategoryColors.Habit;
      const fallbackDay = parseLocalDate(habit.startDate).getDay();
      habit.days = Array.isArray(habit.days) ? habit.days.map(Number).filter((day) => day >= 0 && day <= 6) : [fallbackDay];
      if (!habit.days.length) habit.days = [fallbackDay];
      habit.completions = Array.from(new Set((Array.isArray(habit.completions) ? habit.completions : []).map(String).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))));
      habit.skippedDates = Array.from(new Set((Array.isArray(habit.skippedDates) ? habit.skippedDates : []).map(String).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))).sort();
    });
  }

  function normalizeHabitTemplates(nextData) {
    const templates = safeArray(nextData.habitTemplates).filter((template) => Number(template.slot) >= 1 && Number(template.slot) <= 5);
    nextData.habitTemplates = Array.from({ length: 5 }, (_, index) => {
      const slot = index + 1;
      const existing = templates.find((template) => Number(template.slot) === slot);
      const payload = normalizeHabitTemplatePayload(existing?.payload || {});
      return {
        id: existing?.id || `habit_template_${slot}`,
        slot,
        name: String(existing?.name || payload.title || `Template ${slot}`),
        payload
      };
    });
  }

  function normalizeHabitTemplatePayload(payload) {
    const fallbackDay = parseLocalDate(ui.selectedDate || todayIso()).getDay();
    const next = { ...(payload || {}) };
    next.title = String(next.title || "Habit Template");
    next.description = String(next.description || "");
    if (!habitTypeOptions.includes(next.type)) next.type = "Personal";
    if (!habitScheduleOptions.includes(next.schedule)) next.schedule = "Daily";
    next.days = Array.isArray(next.days) ? next.days.map(Number).filter((day) => day >= 0 && day <= 6) : [fallbackDay];
    if (!next.days.length) next.days = [fallbackDay];
    next.start = next.start || "08:00";
    next.end = next.end || timeFromMinutes(Math.min(minutes(next.start) + 30, 23 * 60 + 59));
    if (minutes(next.end) <= minutes(next.start)) next.end = timeFromMinutes(Math.min(minutes(next.start) + 30, 23 * 60 + 59));
    if (!taskPriorityOptions.includes(next.priority)) next.priority = "Medium";
    next.status = "Active";
    next.includeHours = next.includeHours !== false;
    next.targetCount = Math.max(1, Math.round(Number(next.targetCount || 1)));
    next.addressId = next.addressId || null;
    next.color = isHexColor(next.color) ? next.color : defaultCategoryColors.Habit;
    next.image = String(next.image || "");
    next.imageZoom = imageZoom(next.imageZoom || 1);
    next.imageX = imagePan(next.imageX || 0);
    next.imageY = imagePan(next.imageY || 0);
    next.imageFit = imageFit(next.imageFit || "cover");
    next.imageOpacity = imageOpacity(next.imageOpacity || 1);
    return next;
  }

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function mergeSeed(base, saved) {
    Object.keys(base).forEach((key) => {
      if (Array.isArray(base[key]) && Array.isArray(saved[key])) base[key] = saved[key];
    });
    if (saved.settings && typeof saved.settings === "object") base.settings = { ...(base.settings || {}), ...saved.settings };
    return base;
  }

  function mergeSyncCollection(collection, localItems, incomingItems, deletedItems, localFallback, incomingFallback) {
    const byId = new Map();
    const noIdByFingerprint = new Map();
    const addItem = (item, fallback) => {
      const itemId = syncItemId(collection, item);
      if (!itemId) {
        noIdByFingerprint.set(syncFingerprint(item), item);
        return;
      }
      const stamped = { ...item };
      if (!stamped.updatedAt) stamped.updatedAt = fallback || new Date().toISOString();
      const itemAt = syncItemTime(stamped, fallback);
      const deletedAt = cloudTimeValue(deletedItems?.[collection]?.[itemId] || "");
      if (deletedAt && deletedAt >= itemAt) return;
      const current = byId.get(itemId);
      if (!current || syncItemTime(stamped, fallback) >= syncItemTime(current, localFallback || incomingFallback)) {
        byId.set(itemId, stamped);
      }
    };
    safeArray(localItems).forEach((item) => addItem(item, localFallback));
    safeArray(incomingItems).forEach((item) => addItem(item, incomingFallback));
    return [...byId.values(), ...noIdByFingerprint.values()];
  }

  function mergeWorkspacePayloads(localPayload, incomingPayload, options = {}) {
    const preferIncoming = options.prefer === "incoming" || options.prefer === "remote";
    const local = normalizeData(mergeSeed(clone(seed), clone(localPayload || {})));
    const incoming = normalizeData(mergeSeed(clone(seed), clone(incomingPayload || {})));
    const merged = clone(preferIncoming ? incoming : local);
    const localSettings = local.settings || {};
    const incomingSettings = incoming.settings || {};
    merged.settings = preferIncoming
      ? { ...localSettings, ...incomingSettings }
      : { ...incomingSettings, ...localSettings };
    merged.settings.deletedItems = mergeDeletedItems(localSettings.deletedItems, incomingSettings.deletedItems);
    const localFallback = workspaceFallbackTime(local);
    const incomingFallback = workspaceFallbackTime(incoming);
    Object.keys(seed).forEach((collection) => {
      if (!Array.isArray(seed[collection])) return;
      if (collection === "dismissedInboxIds") {
        merged[collection] = Array.from(new Set([...(local[collection] || []), ...(incoming[collection] || [])].map(String)));
        return;
      }
      merged[collection] = mergeSyncCollection(
        collection,
        local[collection],
        incoming[collection],
        merged.settings.deletedItems,
        localFallback,
        incomingFallback
      );
    });
    return normalizeData(merged);
  }

  function pushUndoSnapshot(snapshot) {
    if (!snapshot || undoStack[undoStack.length - 1]?.snapshot === snapshot) return;
    undoStack.push({ snapshot, at: Date.now() });
    if (undoStack.length > 30) undoStack.shift();
  }

  function resetUndoBaseline() {
    undoStack.length = 0;
    lastSavedSnapshot = JSON.stringify(data);
  }

  function undoLastChange() {
    const entry = undoStack.pop();
    if (!entry) {
      showToast("Nothing to undo.", "danger");
      return;
    }
    try {
      data = normalizeData(mergeSeed(clone(seed), JSON.parse(entry.snapshot)));
      ui.selectedTasks = [];
      ui.dayCopyTargetDate = null;
      ui.selectedHabits = ui.selectedHabits.filter((habitId) => data.habits.some((habit) => habit.id === habitId));
      ui.modal = null;
      saveData({ undo: false });
      render();
      showToast("Last change undone.");
    } catch (error) {
      console.warn("BillMaster could not undo the last change.", error);
      showToast("That undo could not be restored.", "danger");
    }
  }

  function saveData(options = {}) {
    let serialized = "";
    try {
      stampLocalSyncChanges(data, options);
      data = normalizeData(data);
      const shouldQueueCloudSync = options.cloudSync !== false && cloudAutoSyncEnabled();
      if (shouldQueueCloudSync) {
        cloudHasLocalUnsyncedChanges = true;
        setCloudSyncState("queued", "Local change saved. BillMaster will smart-merge it to the cloud in a moment.", { queued: true });
      }
      serialized = JSON.stringify(data);
      if (options.undo !== false && lastSavedSnapshot && serialized !== lastSavedSnapshot) {
        pushUndoSnapshot(lastSavedSnapshot);
      }
      localStorage.setItem(profileDataKey(), serialized);
      clearSessionFallback();
      lastSavedSnapshot = serialized;
      ui.lastSaveError = "";
      broadcastLocalWorkspaceChange(serialized, options);
      if (shouldQueueCloudSync) scheduleCloudAutoPush();
      return true;
    } catch (error) {
      console.warn("BillMaster could not save local data.", error);
      const savedTemporarily = serialized ? setSessionFallback(serialized) : false;
      if (savedTemporarily) lastSavedSnapshot = serialized;
      ui.lastSaveError = savedTemporarily
        ? "Saved temporarily in this tab, but browser storage is full. Remove large uploaded photos or use image links so it can save permanently."
        : "BillMaster could not save this change. Browser storage may be full or blocked.";
      return false;
    }
  }

  function broadcastLocalWorkspaceChange(serialized, options = {}) {
    if (options.broadcast === false || !serialized || typeof window === "undefined") return;
    const message = {
      type: "workspace-saved",
      tabId,
      profileId: currentProfileId,
      key: profileDataKey(),
      savedAt: Date.now()
    };
    try {
      localSyncChannel?.postMessage(message);
    } catch (error) {
      // BroadcastChannel is a speed boost only; the storage event remains the fallback.
    }
  }

  function canApplyLocalWorkspaceUpdate() {
    if (ui.modal) return false;
    const active = typeof document === "undefined" ? null : document.activeElement;
    if (!active) return true;
    if (active.isContentEditable) return false;
    return !["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName);
  }

  function queueLocalWorkspaceReload(source = "tab") {
    if (localSyncRenderTimer) window.clearTimeout(localSyncRenderTimer);
    localSyncRenderTimer = window.setTimeout(() => {
      localSyncRenderTimer = null;
      const next = loadData();
      const nextSnapshot = JSON.stringify(next);
      if (nextSnapshot === lastSavedSnapshot) return;
      data = next;
      lastSavedSnapshot = nextSnapshot;
      if (canApplyLocalWorkspaceUpdate()) {
        render();
      } else if (ui.view === "sync") {
        setCloudSyncState("checked", `Another open BillMaster view saved changes. Leave the current field to refresh this ${source} update.`);
      }
    }, 60);
  }

  function handleLocalWorkspaceMessage(message) {
    if (!message || message.type !== "workspace-saved") return;
    if (message.tabId === tabId) return;
    if (message.profileId !== currentProfileId) return;
    queueLocalWorkspaceReload("tab");
  }

  function startLocalWorkspaceSync() {
    if (typeof window === "undefined") return;
    if ("BroadcastChannel" in window) {
      try {
        localSyncChannel = new BroadcastChannel(LOCAL_SYNC_CHANNEL);
        localSyncChannel.addEventListener("message", (event) => handleLocalWorkspaceMessage(event.data));
      } catch (error) {
        localSyncChannel = null;
      }
    }
    window.addEventListener("storage", (event) => {
      if (event.key !== profileDataKey()) return;
      if (!event.newValue || event.newValue === lastSavedSnapshot) return;
      queueLocalWorkspaceReload("storage");
    });
  }

  function id(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function icon(name) {
    return `<svg class="icon icon-${name}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function money(value) {
    return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function moneyWhole(value) {
    return Number(value || 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
  }

  function reportableTransactions(type = "") {
    return data.transactions.filter((tx) => !tx.isTransfer && (!type || tx.type === type));
  }

  function dateLabel(iso) {
    if (!iso) return "No date";
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function shortDate(iso) {
    if (!iso) return "";
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function dayName(iso) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
  }

  function timeLabel(value) {
    if (!value) return "Set time";
    const [hour, minute] = value.split(":").map(Number);
    const d = new Date(2026, 0, 1, hour, minute);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function daysBetween(iso) {
    const due = new Date(`${iso}T12:00:00`);
    return Math.round((due - SAMPLE_NOW) / 86400000);
  }

  function dateDiffDays(startIso, endIso) {
    if (!startIso || !endIso) return 0;
    const start = new Date(`${startIso}T12:00:00`);
    const end = new Date(`${endIso}T12:00:00`);
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  function dueText(iso) {
    const days = daysBetween(iso);
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days`;
  }

  function statusClass(status) {
    const s = String(status || "").toLowerCase();
    if (["paid", "active", "completed", "received", "closed", "done"].includes(s)) return "success";
    if (["trial", "due soon", "partial", "money owed"].includes(s)) return "warn";
    if (["in progress"].includes(s)) return "info";
    if (["overdue", "failed", "cancelled", "urgent"].includes(s)) return "danger";
    if (["unpaid", "outstanding"].includes(s)) return "info";
    if (["not started"].includes(s)) return "muted";
    if (["forgiven"].includes(s)) return "muted";
    return "muted";
  }

  function categoryIcon(category) {
    const c = String(category || "").toLowerCase();
    if (c.includes("util") || c.includes("phone")) return "receipt";
    if (c.includes("food")) return "wallet";
    if (c.includes("housing")) return "home";
    if (c.includes("salary") || c.includes("income")) return "wallet";
    if (c.includes("software") || c.includes("entertainment")) return "playcard";
    return "wallet";
  }

  function sum(items, key = "amount") {
    return items.reduce((total, item) => total + Number(item[key] || 0), 0);
  }

  function monthlyProjection(items, months, key = "amount") {
    return sum(items, key) * months;
  }

  function budgetVariance(actual, projected, type) {
    const actualAmount = Number(actual || 0);
    const projectedAmount = Number(projected || 0);
    return type === "income" ? projectedAmount - actualAmount : actualAmount - projectedAmount;
  }

  function varianceClass(actual, projected, type) {
    const variance = budgetVariance(actual, projected, type);
    if (Math.abs(variance) < 0.005) return "money-neutral";
    return variance > 0 ? "positive" : "negative";
  }

  function projectedClass(actual, projected, type) {
    return varianceClass(actual, projected, type);
  }

  function progressPct(current, target) {
    if (!target) return 0;
    return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
  }

  function routeNavItems() {
    return [
      ["dashboard", "home", "Today"],
      ["tracking", "wallet", "Money"],
      ["analytics", "chart", "Analytics"],
      ["bills", "receipt", "Bills"]
    ];
  }

  function activeRoot() {
    if (ui.view === "lending") return "tracking";
    if (ui.view === "inbox") return "bills";
    if (ui.view === "subscriptions") return "bills";
    if (["calendar", "tasks", "habits", "projects", "goals", "notebooks", "notes", "contacts", "addresses", "sync", "ai"].includes(ui.view)) return "dashboard";
    return ui.view;
  }

  function navMarkup(kind) {
    if (kind === "side") {
      const sections = [
        ["Main", routeNavItems(), "root"],
        ["Work", [
          ["calendar", "calendar", "Calendar"],
          ["tasks", "task", "Tasks"],
          ["habits", "check", "Habits"],
          ["projects", "folder", "Projects"]
        ]],
        ["Notes", [
          ["notebooks", "book", "Notebooks"],
          ["notes", "note", "Notes"]
        ]],
        ["Money", [
          ["goals", "chart", "Goals"],
          ["lending", "loan", "Lending"],
          ["inbox", "receipt", "Review Inbox"],
          ["sync", "settings", "Sync Center"]
        ]],
        ["People & Places", [
          ["contacts", "home", "Contacts"],
          ["addresses", "map", "Addresses"]
        ]],
        ["Assist", [
          ["ai", "ai", "AI Assistant"]
        ]]
      ];
      return `<aside class="side-nav"><div class="brand"><span class="round-icon">${icon("wallet")}</span><span>BillMaster</span></div>${sections.map(([section, links, mode]) => navSectionMarkup(section, links, mode)).join("")}</aside>`;
    }
    const items = routeNavItems()
      .map(([view, iconName, label]) => {
        const active = activeRoot() === view ? "is-active" : "";
        return `<button class="nav-item ${active}" data-action="navigate-root" data-view="${view}" aria-label="${esc(label)}">${icon(iconName)}<span>${esc(label)}</span></button>`;
      })
      .join("");
    return `<nav class="bottom-nav" aria-label="Primary">${items}</nav>`;
  }

  function navSectionKey(section) {
    return String(section || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
  }

  function navSectionMarkup(section, links, mode = "page") {
    const key = navSectionKey(section);
    const collapsed = Boolean(ui.navCollapsed?.[key]);
    const navItems = links
      .map(([view, iconName, label]) => {
        const active = mode === "root" ? activeRoot() === view : ui.view === view;
        const action = mode === "root" ? "navigate-root" : "navigate";
        return `<button class="nav-item ${active ? "is-active" : ""}" data-action="${action}" data-view="${view}">${icon(iconName)}<span>${esc(label)}</span></button>`;
      })
      .join("");
    return `<section class="nav-section ${collapsed ? "is-collapsed" : ""}">
      <button class="nav-section-label nav-section-toggle" data-action="toggle-nav-section" data-section="${esc(key)}" aria-expanded="${collapsed ? "false" : "true"}">
        <span>${esc(section)}</span><span class="nav-section-caret" aria-hidden="true">${collapsed ? "+" : "-"}</span>
      </button>
      <div class="nav-section-links" ${collapsed ? "hidden" : ""}>${navItems}</div>
    </section>`;
  }

  function header(title, actions = "") {
    const root = routeNavItems().some(([view]) => view === ui.view) && !ui.backStack.length;
    const profile = activeProfile();
    const profileAction = profile ? `<button class="icon-btn" data-action="open-modal" data-modal="profiles" aria-label="Profiles" title="${esc(profile.displayName)}">${icon("home")}</button>` : "";
    return `<header class="screen-header">
      ${root ? `<span class="icon-btn" aria-hidden="true">${icon("wallet")}</span>` : `<button class="icon-btn" data-action="back" aria-label="Back">${icon("back")}</button>`}
      <h1>${esc(title)}</h1>
      <div class="header-actions">${actions}${profileAction}</div>
    </header>`;
  }

  function render() {
    try {
      syncGestureLocks();
      if (!currentProfileId) {
        app.innerHTML = `<div class="app-shell auth-shell"><main class="main-view">${renderAuth()}</main>${renderModal()}${renderToast()}</div>`;
        return;
      }
      app.innerHTML = `<div class="app-shell">
        ${navMarkup("side")}
        <main class="main-view">${renderView()}</main>
        ${navMarkup("bottom")}
        ${renderTodayBadge()}
        ${renderFloatingAction()}
        ${renderModal()}
        ${renderSaveWarning()}
        ${renderToast()}
      </div>`;
      requestAnimationFrame(afterRender);
    } catch (error) {
      console.error("BillMaster render failed.", error);
      app.innerHTML = renderRecoveryScreen(error);
    }
  }

  function syncGestureLocks() {
    const blockDrawActive = Boolean(currentProfileId && ui.view === "calendar" && isBlockLikeCalendarView() && ui.blockDrawMode);
    document.body?.classList?.toggle("block-draw-active", blockDrawActive);
    if (!blockDrawActive) clearBlockTapCreateDraft();
  }

  function renderPreservingInput(input) {
    const inputId = input?.id || "";
    const start = typeof input?.selectionStart === "number" ? input.selectionStart : null;
    const end = typeof input?.selectionEnd === "number" ? input.selectionEnd : null;
    render();
    const restore = () => {
      const nextInput = inputId ? document.getElementById(inputId) : null;
      if (!nextInput || typeof nextInput.focus !== "function") return;
      nextInput.focus({ preventScroll: true });
      if (start !== null && end !== null && typeof nextInput.setSelectionRange === "function") {
        nextInput.setSelectionRange(start, end);
      }
    };
    restore();
    requestAnimationFrame(restore);
  }

  function renderTodayBadge() {
    const now = new Date();
    const dateText = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const targetView = ui.view === "calendar" ? ui.calendarView : "day";
    return `<button class="today-badge" data-action="go-calendar-today" data-view="${targetView}" aria-label="Open today's calendar date" title="Open today in Calendar">${icon("calendar")}<span>Today</span><strong>${esc(dateText)}</strong></button>`;
  }

  function renderToast() {
    if (!ui.toast) return "";
    const canUndo = ui.toast.type === "success" && undoStack.length;
    return `<div class="toast ${ui.toast.type}" role="status">${icon(ui.toast.type === "danger" ? "alert" : "check")}<span>${esc(ui.toast.message)}</span>${canUndo ? `<button class="toast-undo" data-action="undo-last-change">Undo</button>` : ""}</div>`;
  }

  function renderSaveWarning() {
    if (!ui.lastSaveError || ui.toast) return "";
    return `<div class="save-warning" role="alert">
      ${icon("alert")}
      <span>${esc(ui.lastSaveError)}</span>
      <button data-action="download-data">${icon("note")} Backup</button>
    </div>`;
  }

  function renderRecoveryScreen(error) {
    return `<main class="screen" style="min-height:100vh;display:grid;place-items:center;">
      <section class="section-card" style="max-width:560px;">
        <div class="section-title"><h2>${icon("alert")} BillMaster hit a local data issue</h2></div>
        <p class="muted">The app did not load this screen cleanly. You can try reloading, or reset only the local demo data stored in this browser.</p>
        <p class="subtle">${esc(error && error.message ? error.message : "Unknown render error")}</p>
        <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
          <button class="outline-btn" data-action="reload-app">${icon("check")} Reload</button>
          <button class="danger-btn" data-action="reset-data">${icon("trash")} Reset Demo Data</button>
        </div>
      </section>
    </main>`;
  }

  function renderAuth() {
    return `<section class="screen auth-screen">
      <section class="section-card auth-card">
        <div class="brand auth-brand"><span class="round-icon">${icon("wallet")}</span><span>BillMaster</span></div>
        <h1>Choose Your Workspace</h1>
        <p class="muted">Local prototype profiles keep each person’s BillMaster data separate on this device. Real private accounts will use Supabase Auth next.</p>
        <div class="profile-list">
          ${profiles.map((profile) => `<button class="profile-row" data-action="open-modal" data-modal="profileLogin" data-id="${profile.id}">
            <span class="round-icon">${icon("home")}</span>
            <span><strong>${esc(profile.displayName)}</strong><span>@${esc(profile.username)}</span></span>
            <span>${icon("back")}</span>
          </button>`).join("")}
        </div>
        <button class="primary-btn" data-action="open-modal" data-modal="profiles">${icon("plus")} Create Profile</button>
      </section>
    </section>`;
  }

  function renderView() {
    switch (ui.view) {
      case "dashboard": return renderDashboard();
      case "tracking": return renderTracking();
      case "analytics": return renderAnalytics();
      case "bills": return renderBills();
      case "inbox": return renderBillInbox();
      case "sync": return renderSyncCenter();
      case "subscriptions":
        ui.billHubTab = "subscriptions";
        return renderBills("subscriptions");
      case "calendar": return renderCalendar();
      case "tasks": return renderTasks();
      case "habits": return renderHabits();
      case "projects": return renderProjects();
      case "goals": return renderGoals();
      case "notebooks": return renderNotebooks();
      case "notes": return renderNotes();
      case "contacts": return renderContacts();
      case "addresses": return renderAddresses();
      case "lending": return renderLending();
      case "ai": return renderAi();
      default: return renderDashboard();
    }
  }

  function renderDashboard() {
    const income = sum(reportableTransactions("income"));
    const expenses = sum(reportableTransactions("expense"));
    const balance = sum(data.accounts, "balance") + income - expenses;
    const upcomingBills = data.bills
      .filter((bill) => daysBetween(bill.dueDate) <= 14)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4);
    const overdueTasks = data.tasks.filter((task) => task.status !== "Completed" && daysBetween(task.date) < 0);
    const recent = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const today = todayIso();
    const todayItems = calendarItemsForDay(today).sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")));
    const reviewCount = billInboxItems().filter((item) => item.status === "pending").length
      + safeArray(data.notificationLog).filter((notice) => notice.deliveryStatus === "queued").length;
    const routeCount = todayItems.filter((item) => item.addressId).length;
    const mode = data.settings?.interfaceMode === "simple" ? "simple" : "power";

    return `<section class="screen dashboard-screen">
      ${header("BillMaster Today", `<button class="mode-toggle ${mode === "power" ? "active" : ""}" data-action="toggle-interface-mode" title="Switch Simple / Power mode">${mode === "power" ? "Power" : "Simple"}</button><button class="icon-btn" data-action="open-modal" data-modal="dataTools" aria-label="Data tools">${icon("note")}</button><button class="icon-btn" data-action="navigate" data-view="ai" aria-label="AI Assistant">${icon("ai")}</button>`)}
      <div class="dashboard-swipe" data-dashboard-swipe aria-label="BillMaster dashboard panels">
        <div class="list dashboard-panel dashboard-panel--command" data-dashboard-panel="command" aria-label="Command Center">
          <section class="section-card command-center-card">
            <div class="section-title"><h2>Command Center</h2><span class="status info">${mode === "power" ? "Power tools" : "Simple mode"}</span></div>
            ${dashboardActionGroups(mode)}
          </section>

          ${dashboardHabitSnapshot()}

          <section class="section-card alert-panel">
            <div class="section-title">
              <h2>${icon("alert")} ${overdueTasks.length} overdue - ${upcomingBills.length} due soon</h2>
              <button class="icon-btn" data-action="dismiss-alert">${icon("close")}</button>
            </div>
            ${overdueTasks.slice(0, 3).map((task) => `<div class="alert-row"><span class="dot red"></span><span>${esc(task.title)}</span><span class="status danger">${dueText(task.date)}</span></div>`).join("")}
            <button class="text-btn" data-action="navigate" data-view="tasks">View all reminders</button>
          </section>

          <section class="section-card">
            <div class="section-title"><h2>Income & Expenses</h2><button class="text-btn" data-action="navigate-root" data-view="tracking">View History</button></div>
            ${summaryRows()}
            <div class="sheet-actions" style="grid-template-columns: 1fr 1fr;">
              <button class="outline-btn" data-action="open-modal" data-modal="addTransaction">${icon("plus")} Add Transaction</button>
              <button class="outline-btn" data-action="navigate-root" data-view="analytics">View Analytics</button>
            </div>
          </section>

          <section class="section-card">
            <div class="section-title"><h2>This Week</h2><button class="text-btn" data-action="navigate" data-view="calendar">View All</button></div>
            ${upcomingBills.map((bill) => weekBillRow(bill)).join("")}
          </section>
        </div>

        <div class="list dashboard-panel dashboard-panel--today" data-dashboard-panel="today" aria-label="BillMaster Today">
          <article class="section-card balance-panel">
            <div class="balance-row">
              <div>
                <div class="balance-label">Available Balance</div>
                <div class="balance-amount">${money(balance)}</div>
                <div class="small-label">Last synced 2m ago</div>
              </div>
              <span class="pill dark">${icon("filter")} Comfortable</span>
            </div>
            <div class="balance-meta">
              <span>${icon("wallet")} Income ${money(income)}</span>
              <span>${icon("receipt")} Expenses ${money(expenses)}</span>
              <span>${icon("chart")} Goals on track</span>
            </div>
          </article>

          ${cloudDashboardPrompt()}

          ${todayBriefingCard(today, todayItems, upcomingBills, reviewCount, routeCount)}

          <div class="quick-add">
            <button class="round-icon quick-voice-btn" data-action="open-modal" data-modal="voiceTask" aria-label="Add task by voice" title="Add task by voice">${icon("mic")}</button>
            <input id="quickTaskInput" placeholder="Quick add task... (Ctrl+T)" />
            <button class="icon-btn primary-btn" data-action="quick-add-task" aria-label="Add task">${icon("check")}</button>
          </div>
        </div>

        <div class="list dashboard-panel dashboard-panel--accounts" data-dashboard-panel="accounts" aria-label="Accounts">
          <section class="section-card">
            <div class="section-title"><h2>Accounts</h2><button class="text-btn" data-action="open-modal" data-modal="accountConnections">Manage</button></div>
            <div class="account-strip">
              ${data.accounts.map((acct) => `<article class="account-card clickable-card" style="border-left-color: var(--${acct.color});" data-action="open-modal" data-modal="accountDetail" data-id="${acct.id}" tabindex="0" role="button">
                <div class="entity-title">${esc(acct.name)}</div>
                <div class="entity-subtitle">${esc(acct.type)} ****${esc(acct.last4)}</div>
                <div class="amount-large money-blue">${money(acct.balance)}</div>
              </article>`).join("")}
            </div>
          </section>

          <section class="section-card">
            <div class="monitor-header">
              <span class="round-icon">${icon("chart")}</span>
              <div><h2 class="panel-title">Monitored Items</h2><div class="subtle">Bills + Subscriptions - Loans - Goals</div></div>
            </div>
            <div class="monitor-list">
              ${data.loans.filter((loan) => loanRemaining(loan) > 0).slice(0, 3).map((loan) => monitorLoanRow(loan)).join("") || `<p class="muted">No open lending items need attention.</p>`}
            </div>
            <div class="filter-row">
              <button data-action="navigate-root" data-view="bills">${icon("receipt")} Bills + Subscriptions</button>
              <button data-action="navigate" data-view="lending">${icon("loan")} Loans</button>
              <button data-action="navigate" data-view="goals">${icon("folder")} Goals</button>
            </div>
          </section>

          <section class="section-card">
            <div class="section-title"><h2>Active Goals</h2><button class="text-btn" data-action="navigate" data-view="goals">View All</button></div>
            <div class="goal-strip">
              ${data.goals.map((goal) => goalCard(goal)).join("")}
            </div>
          </section>

          <section class="section-card">
            <div class="section-title"><h2>AI Predictions</h2><button class="text-btn" data-action="navigate" data-view="ai">Open</button></div>
            <div class="suggestion-strip">
              <article class="suggestion-card" style="border-color:#f4c36d;">
                <span class="round-icon" style="color:#c47d00;background:#fff3d0;">${icon("ai")}</span>
                <h3 class="entity-title">Smart Suggestion</h3>
                <p class="muted">Cancel unused subscriptions to save ${money(45)} per month.</p>
              </article>
              <article class="suggestion-card" style="border-color:#bdebd0;">
                <span class="round-icon" style="color:#14874a;background:#e7f9ef;">${icon("chart")}</span>
                <h3 class="entity-title">Goal Progress</h3>
                <p class="muted">Emergency Fund is on track for December 2026.</p>
              </article>
            </div>
          </section>

          ${productRoadmapCard()}

          <section class="section-card">
            <div class="section-title"><h2>Recent Activity</h2><button class="text-btn" data-action="navigate-root" data-view="tracking">View All</button></div>
            ${recent.map((tx) => activityRow(tx)).join("")}
          </section>
        </div>
      </div>
    </section>`;
  }

  function cloudDashboardPrompt() {
    if (!hostedCloudConfigStarted() && !cloudConfigured()) return "";
    const configured = cloudConfigured();
    const signedIn = cloudSignedIn();
    const autoOn = cloudAutoSyncEnabled();
    const title = signedIn
      ? autoOn ? "Auto Sync Is Watching" : "Turn Auto Sync Back On"
      : configured ? "Use BillMaster Anywhere" : "Cloud Setup Almost Ready";
    const copy = signedIn
      ? autoOn
        ? "This workspace is signed in and will smart-merge saved changes with your phone, iPad, and desktop."
        : "You are signed in, but automatic syncing is paused. Turn it back on before serious cross-device use."
      : configured
        ? "Create or sign into your BillMaster cloud account so this workspace can follow you from desktop to phone to iPad."
        : "The Supabase project URL is built in. Add the public publishable key once, then friends can sign in without touching setup.";
    const statusLabel = signedIn ? cloudSyncStateLabel(data.settings?.cloudSyncState || "idle") : configured ? "Sign in needed" : "Setup needed";
    const statusClass = signedIn && autoOn ? "success" : configured ? "warning" : "info";
    const lastSync = data.settings?.cloudLastSyncAt ? `Last sync ${cloudTimeLabel(data.settings.cloudLastSyncAt)}` : "No cloud sync yet";
    return `<section class="section-card cloud-start-card">
      <div class="cloud-start-copy">
        <span class="round-icon" style="background:${signedIn && autoOn ? "#e9f8ef" : configured ? "#fff5d6" : "#eaf4ff"};color:${signedIn && autoOn ? "var(--green)" : configured ? "var(--amber)" : "var(--blue)"}">${icon(signedIn && autoOn ? "check" : configured ? "alert" : "settings")}</span>
        <div>
          <div class="card-row"><h2>${esc(title)}</h2><span class="status ${statusClass}">${esc(statusLabel)}</span></div>
          <p>${esc(copy)}</p>
          <small class="subtle">${esc(lastSync)}</small>
        </div>
      </div>
      <div class="cloud-start-actions">
        ${signedIn ? `<button class="primary-btn" data-action="cloud-smart-merge">${icon("cloud")} Smart Merge</button>` : ""}
        ${signedIn ? `<button class="outline-btn" data-action="toggle-cloud-auto-sync">${icon(autoOn ? "check" : "settings")} Auto ${autoOn ? "On" : "Off"}</button>` : ""}
        <button class="${signedIn ? "outline-btn" : "primary-btn"}" data-action="navigate-root" data-view="sync">${configured ? "Sync Center" : "Finish setup"}</button>
      </div>
    </section>`;
  }

  function productRoadmapCard() {
    return `<section class="section-card roadmap-card">
      <div class="section-title"><h2>Launch Roadmap</h2><span class="status warn">Next</span></div>
      <div class="roadmap-mini">
        <div><strong>Now</strong><span>Auto-sync beta: sign in, smart merge, phone/iPad/desktop workspace sharing.</span></div>
        <div><strong>Next</strong><span>Friend alpha: clean onboarding, private tester data, feedback capture, mobile QA.</span></div>
        <div><strong>Future</strong><span>Production rails: bank/card sync, Google Calendar, notifications, cancellation workflows.</span></div>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="navigate" data-view="sync">${icon("settings")} Sync Plan</button>
        <button class="outline-btn" data-action="open-modal" data-modal="profiles">${icon("home")} Profiles</button>
      </div>
    </section>`;
  }

  function todayBriefingCard(today, items, bills, reviewCount, routeCount) {
    const weather = weatherChip(today, "title");
    const nextItems = items.slice(0, 4).map((item) => `<div class="briefing-row">
      <span class="round-icon">${icon(item.isHabit ? "check" : "calendar")}</span>
      <span><strong>${esc(item.title)}</strong><small>${timeLabel(item.start)}${item.end ? ` - ${timeLabel(item.end)}` : ""}</small></span>
    </div>`).join("");
    const dueBills = bills.filter((bill) => daysBetween(bill.dueDate) <= 7);
    return `<section class="section-card today-briefing">
      <div class="briefing-head">
        <div>
          <div class="small-label dark">Today Briefing</div>
          <h2>${esc(dateFull(today))}</h2>
        </div>
        ${weather}
      </div>
      <div class="briefing-metrics">
        <button data-action="set-calendar-date-view" data-date="${today}" data-view="day"><strong>${items.length}</strong><span>events</span></button>
        <button data-action="navigate-root" data-view="bills"><strong>${dueBills.length}</strong><span>bills due</span></button>
        <button data-action="navigate" data-view="addresses"><strong>${routeCount}</strong><span>routes</span></button>
        <button data-action="navigate" data-view="inbox"><strong>${reviewCount}</strong><span>reviews</span></button>
      </div>
      <div class="briefing-list">${nextItems || `<p class="muted">No timed tasks or habits scheduled today.</p>`}</div>
      <div class="sheet-actions briefing-actions">
        <button class="primary-btn" data-action="set-calendar-date-view" data-date="${today}" data-view="day">${icon("calendar")} Day Mode</button>
        <button class="outline-btn" data-action="set-calendar-date-view" data-date="${today}" data-view="block">${icon("chart")} Block Mode</button>
        <button class="outline-btn" data-action="navigate" data-view="inbox">${icon("receipt")} Review Inbox</button>
      </div>
    </section>`;
  }

  function dashboardActionGroups(mode) {
    const groups = [
      ["Today", [
        { view: "calendar", iconName: "calendar", label: "Calendar", color: "blue", tone: "calendar", detail: "Day + block" },
        { view: "tasks", iconName: "task", label: "Tasks", color: "teal", tone: "tasks", detail: "Plan + finish" },
        { view: "habits", iconName: "morning", label: "Habits", color: "purple", tone: "habits", detail: "Streaks + rhythm" }
      ]],
      ["Money", [
        { view: "tracking", iconName: "wallet", label: "Tracking", color: "teal", tone: "money", detail: "Income + spend" },
        { view: "bills", iconName: "receipt", label: "Bills", color: "coral", tone: "bills", detail: "Bills + subscriptions" },
        { view: "goals", iconName: "chart", label: "Goals", color: "green", tone: "goals", detail: "Fund progress" },
        { view: "lending", iconName: "loan", label: "Loans", color: "teal", tone: "loans", detail: "Owed + repaid" }
      ]],
      ["Notes", [
        { view: "notebooks", iconName: "book", label: "Notebooks", color: "purple", tone: "notes", detail: "Visual library" },
        { view: "notes", iconName: "note", label: "Notes", color: "purple", tone: "notes", detail: "Capture fast" },
        { view: "projects", iconName: "folder", label: "Projects", color: "amber", tone: "projects", detail: "Tasks + notes" }
      ]],
      ["People & Places", [
        { view: "contacts", iconName: "home", label: "Contacts", color: "blue", tone: "people", detail: "People + groups" },
        { view: "addresses", iconName: "map", label: "Addresses", color: "green", tone: "places", detail: "Routes + maps" }
      ]],
      ["Sync & AI", [
        { view: "inbox", iconName: "reviewInbox", label: "Review Inbox", color: "blue", tone: "review", detail: "Check imports" },
        { view: "sync", iconName: "settings", label: "Sync Center", color: "purple", tone: "sync", detail: "Cloud health" },
        { view: "ai", iconName: "ai", label: "AI Assistant", color: "purple", tone: "ai", detail: "Ask BillMaster" }
      ]]
    ];
    const visibleGroups = mode === "simple" ? groups.slice(0, 3) : groups;
    return `<div class="action-groups">${visibleGroups.map(([title, actions]) => `<div class="action-group">
      <h3>${esc(title)}</h3>
      <div class="action-grid">${actions.map((action) => quickAction(action)).join("")}</div>
    </div>`).join("")}${mode === "simple" ? `<button class="outline-btn wide" data-action="toggle-interface-mode">${icon("settings")} Show power tools</button>` : ""}</div>`;
  }

function commandIconKind(iconName) {
  return ({
    calendar: "calendar",
    task: "tasks",
    morning: "habits",
    wallet: "tracking",
    receipt: "bills",
    playcard: "subscriptions",
    chart: "goals",
    loan: "loans",
    book: "notebooks",
    note: "notes",
    folder: "projects",
    home: "contacts",
    map: "addresses",
    reviewInbox: "reviewInbox",
    settings: "sync",
    ai: "ai"
  }[iconName] || iconName || "tasks");
}

function commandIllustration(iconName) {
  const kind = commandIconKind(iconName);
  const drawings = {
    calendar: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <circle class="ci-calendar-glow" cx="70" cy="27" r="19"></circle>
        <rect class="ci-soft ci-calendar-page" x="8" y="18" width="70" height="60" rx="13"></rect>
        <path class="ci-accent ci-calendar-header" d="M8 31c0-7 6-13 13-13h44c7 0 13 6 13 13v7H8z"></path>
        <rect class="ci-dark" x="20" y="8" width="9" height="20" rx="4"></rect>
        <rect class="ci-dark" x="58" y="8" width="9" height="20" rx="4"></rect>
        <g class="ci-grid">
          <rect x="20" y="45" width="10" height="10" rx="2"></rect>
          <rect x="38" y="45" width="10" height="10" rx="2"></rect>
          <rect x="56" y="45" width="10" height="10" rx="2"></rect>
          <rect x="20" y="61" width="10" height="10" rx="2"></rect>
          <rect x="38" y="61" width="10" height="10" rx="2"></rect>
          <rect x="56" y="61" width="10" height="10" rx="2"></rect>
        </g>
        <path class="ci-calendar-sweep" d="M19 40h47"></path>
        <circle class="ci-calendar-sun" cx="76" cy="26" r="6"></circle>
        <circle class="ci-check-badge" cx="72" cy="68" r="19"></circle>
        <path class="ci-white-line" d="M63 68l7 7 13-16"></path>
      </svg>`,
    tasks: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <circle class="ci-soft" cx="53" cy="46" r="35"></circle>
        <rect class="ci-paper" x="16" y="14" width="45" height="66" rx="5"></rect>
        <rect class="ci-alt" x="24" y="22" width="29" height="10" rx="2"></rect>
        <path class="ci-line" d="M28 44l5 5 9-12M28 59l5 5 9-12M48 44h12M48 59h12"></path>
        <g class="ci-pencil">
          <path class="ci-money" d="M68 14h12v48l-6 13-6-13z"></path>
          <path class="ci-line" d="M68 24h12M74 62v10"></path>
        </g>
        <g class="ci-pencil-burst">
          <circle class="ci-pencil-burst-core" cx="66" cy="63" r="4"></circle>
          <path class="ci-pencil-burst-ray" d="M66 50v-9M66 76v9M53 63h-9M79 63h9M57 54l-7-7M75 72l7 7M75 54l7-7M57 72l-7 7"></path>
        </g>
      </svg>`,
    habits: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <rect class="ci-paper" x="10" y="14" width="76" height="68" rx="13"></rect>
        <path class="ci-dark" d="M10 27c0-7 6-13 13-13h50c7 0 13 6 13 13v5H10z"></path>
        <circle class="ci-alt ci-pulse" cx="31" cy="50" r="12"></circle>
        <path class="ci-line" d="M31 39v22M20 50h22"></path>
        <path class="ci-thin ci-habit-heart" d="M56 45c8-9 20-2 12 10l-12 12-12-12c-8-12 4-19 12-10z"></path>
        <path class="ci-spark" d="M73 39l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"></path>
        <path class="ci-spark ci-spark-delay" d="M21 67l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"></path>
      </svg>`,
    tracking: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <rect class="ci-paper" x="12" y="11" width="50" height="71" rx="7"></rect>
        <path class="ci-line" d="M25 30h20M25 45h17M25 60h24M20 30l4 4 8-10"></path>
        <circle class="ci-coin" cx="56" cy="31" r="16"></circle>
        <text class="ci-dollar" x="56" y="37" text-anchor="middle">$</text>
        <text class="ci-tracking-label ci-tracking-income" x="15" y="24">Income</text>
        <text class="ci-tracking-label ci-tracking-expenses" x="8" y="89">Expenses</text>
        <rect class="ci-dark" x="55" y="47" width="28" height="34" rx="5"></rect>
        <rect class="ci-accent" x="61" y="54" width="16" height="7" rx="2"></rect>
        <g class="ci-calc">
          <rect x="62" y="67" width="5" height="5" rx="1"></rect>
          <rect x="71" y="67" width="5" height="5" rx="1"></rect>
          <rect x="62" y="75" width="5" height="5" rx="1"></rect>
          <rect x="71" y="75" width="5" height="5" rx="1"></rect>
        </g>
      </svg>`,
    bills: `
      <svg class="ci-svg ci-bills-svg" viewBox="0 0 96 96" role="img">
        <path class="ci-alt ci-bills-backing" d="M22 18l48-8 8 62-48 8z"></path>
        <path class="ci-paper ci-bills-paper" d="M17 14h54v68l-9-5-9 5-9-5-9 5-9-5-9 5z"></path>
        <text class="ci-title ci-bills-title" x="44" y="33" text-anchor="middle">BILL</text>
        <path class="ci-line ci-bills-lines" d="M27 45h34M27 56h25M27 67h18"></path>
        <text class="ci-dollar ci-dollar-small ci-bills-dollar" x="58" y="71">$</text>
      </svg>`,
    goals: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <path class="ci-goals-paper" d="M26 39h34l8 8v25H26z"></path>
        <path class="ci-goals-paper-fold" d="M60 39v8h8"></path>
        <g class="ci-goals-target">
          <circle class="ci-goals-shadow" cx="45" cy="51" r="34"></circle>
          <circle class="ci-goals-ring ci-goals-ring-outer" cx="45" cy="51" r="31"></circle>
          <circle class="ci-goals-ring ci-goals-ring-white" cx="45" cy="51" r="23"></circle>
          <circle class="ci-goals-ring ci-goals-ring-pulse" cx="45" cy="51" r="16"></circle>
          <circle class="ci-goals-ring ci-goals-ring-core" cx="45" cy="51" r="8"></circle>
          <circle class="ci-goals-red-line ci-goals-red-line-outer" cx="45" cy="51" r="31"></circle>
          <circle class="ci-goals-red-line ci-goals-red-line-mid" cx="45" cy="51" r="16"></circle>
        </g>
        <g class="ci-goals-dart">
          <path class="ci-goals-dart-tip" d="M44 50l8 4-9 1"></path>
          <path class="ci-goals-dart-barrel" d="M25 36l20 10-4 9-21-11z"></path>
          <path class="ci-goals-dart-shaft" d="M11 31l16 8"></path>
          <path class="ci-goals-dart-flight ci-goals-dart-flight-a" d="M13 32L1 19l2 16z"></path>
          <path class="ci-goals-dart-flight ci-goals-dart-flight-b" d="M13 32L0 42l17 1z"></path>
          <path class="ci-goals-dart-flight ci-goals-dart-flight-c" d="M17 34L8 22l14 6z"></path>
        </g>
        <path class="ci-goals-hit-spark" d="M45 43v-7M45 66v7M34 54h-7M62 54h7M37 46l-5-5M57 63l5 5M57 46l5-5M37 63l-5 5"></path>
        <text class="ci-goals-text" x="47" y="58" text-anchor="middle">Goals</text>
        <circle class="ci-goals-spark-dot" cx="18" cy="20" r="4"></circle>
      </svg>`,
    loans: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <g class="ci-loan-paper">
          <rect class="ci-paper ci-loan-page" x="8" y="10" width="58" height="70" rx="8"></rect>
          <rect class="ci-loan-page-flash" x="10" y="12" width="54" height="66" rx="7"></rect>
          <path class="ci-loan-clip" d="M27 8h18a4 4 0 0 1 4 4v8H23v-8a4 4 0 0 1 4-4z"></path>
          <path class="ci-line ci-loan-lines" d="M21 48h29M21 57h27M21 66h21"></path>
          <path class="ci-loan-tear ci-loan-tear-1" d="M16 39l7 5-5 5 8 5"></path>
          <path class="ci-loan-tear ci-loan-tear-2" d="M52 25l-6 7 7 5-5 8"></path>
          <g class="ci-loan-splatter">
            <circle class="ci-loan-splash ci-loan-splash-1" cx="18" cy="40" r="3.4"></circle>
            <circle class="ci-loan-splash ci-loan-splash-2" cx="51" cy="44" r="4.8"></circle>
            <circle class="ci-loan-splash ci-loan-splash-3" cx="26" cy="70" r="3.7"></circle>
            <circle class="ci-loan-splash ci-loan-splash-4" cx="55" cy="63" r="2.8"></circle>
            <circle class="ci-loan-splash ci-loan-splash-5" cx="14" cy="57" r="2.5"></circle>
            <circle class="ci-loan-splash ci-loan-splash-6" cx="39" cy="53" r="3.1"></circle>
            <circle class="ci-loan-splash ci-loan-splash-7" cx="34" cy="43" r="4.2"></circle>
            <circle class="ci-loan-splash ci-loan-splash-8" cx="47" cy="73" r="3.2"></circle>
            <path class="ci-loan-splash ci-loan-splash-impact" d="M12 46c10-9 30-11 48-5 8 3 14 8 17 15-15-4-28-2-40 4-11 5-20 5-27 0 5-4 8-8 2-14z"></path>
            <path class="ci-loan-splash ci-loan-splash-streak" d="M12 58c13-9 34-10 51 1"></path>
            <path class="ci-loan-splash ci-loan-splash-drip" d="M45 48c-2 8-1 16 3 23"></path>
          </g>
          <text class="ci-title ci-title-loan" x="31" y="36" text-anchor="middle">Loan</text>
        </g>
        <g class="ci-loan-burst">
          <path d="M60 31l-8-10"></path>
          <path d="M75 30l8-11"></path>
          <path d="M84 44l10-5"></path>
          <path d="M53 50l-12-3"></path>
          <path d="M82 76l8 8"></path>
        </g>
        <g class="ci-loan-bag-fragments">
          <path class="ci-loan-fragment ci-loan-fragment-1" d="M61 47l-9-5 4 10z"></path>
          <path class="ci-loan-fragment ci-loan-fragment-2" d="M79 43l10-5-2 11z"></path>
          <path class="ci-loan-fragment ci-loan-fragment-3" d="M69 73l-6 10 12-3z"></path>
          <path class="ci-loan-fragment ci-loan-fragment-4" d="M82 62l10 8-12 2z"></path>
        </g>
        <g class="ci-loan-bag">
          <path class="ci-loan-bag-tie" d="M70 33l-6-8 7 3 7-3-4 8"></path>
          <path class="ci-money" d="M62 34c-10 8-16 19-16 31 0 10 8 17 25 17s25-7 25-17c0-12-6-23-16-31z"></path>
          <text class="ci-dollar ci-loan-dollar" x="71" y="66" text-anchor="middle">$</text>
          <path class="ci-loan-shine" d="M58 50c2-5 6-8 11-10"></path>
        </g>
      </svg>`,
    notebooks: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <g class="ci-notebook-book">
          <path class="ci-notebook-back" d="M28 12h40c8 0 13 6 13 14v48c0 5-4 9-9 9H28z"></path>
          <path class="ci-notebook-cover" d="M23 10h43c6 0 10 5 10 11v53c0 5-4 9-9 9H23z"></path>
          <path class="ci-notebook-spine" d="M23 10h12v73H23z"></path>
          <g class="ci-rings ci-notebook-rings">
            <circle cx="21" cy="23" r="4"></circle>
            <circle cx="21" cy="37" r="4"></circle>
            <circle cx="21" cy="51" r="4"></circle>
            <circle cx="21" cy="65" r="4"></circle>
          </g>
          <rect class="ci-notebook-label" x="42" y="27" width="27" height="20" rx="3"></rect>
          <text class="ci-notebook-five" x="55.5" y="35" text-anchor="middle">5 SUBJECT</text>
          <text class="ci-notebook-word" x="55.5" y="43" text-anchor="middle">NOTEBOOK</text>
        </g>
        <g class="ci-notebook-fizzles">
          <circle cx="18" cy="20" r="2.2"></circle>
          <circle cx="75" cy="28" r="2.6"></circle>
          <circle cx="18" cy="74" r="2.4"></circle>
          <circle cx="70" cy="76" r="2"></circle>
          <circle cx="48" cy="12" r="1.8"></circle>
        </g>
      </svg>`,
    notes: `
      <svg class="ci-svg ci-notes-svg" viewBox="0 0 96 96" role="img">
        <rect class="ci-note-shadow" x="18" y="17" width="54" height="64" rx="9"></rect>
        <path class="ci-note-page" d="M19 22h51a7 7 0 0 1 7 7v45a7 7 0 0 1-7 7H26a7 7 0 0 1-7-7z"></path>
        <path class="ci-note-header" d="M19 25h58v17H19z"></path>
        <g class="ci-note-rings">
          <path d="M33 21v-8a6 6 0 0 1 12 0v16"></path>
          <path d="M57 21v-8a6 6 0 0 1 12 0v16"></path>
        </g>
        <path class="ci-note-fold-fill" d="M20 66h17L20 81z"></path>
        <path class="ci-note-fold" d="M20 66h17v15"></path>
        <g class="ci-note-lines">
          <path d="M33 51h26"></path>
          <path d="M33 60h34"></path>
          <path d="M33 69h24"></path>
        </g>
        <circle class="ci-note-dot" cx="27" cy="51" r="2.8"></circle>
        <circle class="ci-note-dot" cx="27" cy="60" r="2.8"></circle>
        <g class="ci-note-pencil">
          <path class="ci-pencil-body" d="M66 67l16-31 8 4-16 31z"></path>
          <path class="ci-pencil-eraser" d="M82 36l3-6 8 4-3 6z"></path>
          <path class="ci-pencil-tip" d="M66 67l-4 13 12-9z"></path>
          <path class="ci-pencil-edge" d="M66 67l16-31 8 4-16 31-12 9z"></path>
        </g>
      </svg>`,
    projects: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <rect class="ci-paper" x="12" y="13" width="68" height="68" rx="9"></rect>
        <text class="ci-title ci-title-project" x="45" y="32" text-anchor="middle">PROJECT</text>
        <rect class="ci-money" x="22" y="43" width="24" height="16" rx="3"></rect>
        <rect class="ci-accent" x="31" y="48" width="9" height="7" rx="1"></rect>
        <path class="ci-line" d="M52 45h16M52 55h13M23 68h34"></path>
        <path class="ci-gear" d="M72 57l5 3 5-1 4 7-4 4v6l4 4-4 7-5-1-5 3-2 5h-8l-2-5-5-3-5 1-4-7 4-4v-6l-4-4 4-7 5 1 5-3 2-5h8z"></path>
        <circle class="ci-soft" cx="66" cy="73" r="7"></circle>
      </svg>`,
    contacts: `
      <svg class="ci-svg ci-contact-svg" viewBox="0 0 96 96" role="img">
        <rect class="ci-contact-card" x="13" y="13" width="70" height="70" rx="16"></rect>
        <path class="ci-contact-shadow" d="M17 79c6-15 18-24 32-24 15 0 27 9 33 24z"></path>
        <g class="ci-contact-dreads-back">
          <path class="ci-contact-lock" d="M36 26c-9 9-12 20-9 33 2 8 0 15-6 21"></path>
          <path class="ci-contact-lock" d="M42 23c-8 11-10 23-5 37 3 8 1 15-5 21"></path>
          <path class="ci-contact-lock" d="M50 22c-6 12-6 24-1 36 4 9 3 16-3 23"></path>
          <path class="ci-contact-lock" d="M58 26c-2 11 0 21 7 30 5 7 6 14 2 22"></path>
        </g>
        <path class="ci-contact-shoulder" d="M21 78c6-12 16-19 28-19 13 0 23 7 29 19z"></path>
        <path class="ci-contact-neck" d="M42 55c1 7 4 12 9 15H37c4-4 6-9 6-15z"></path>
        <path class="ci-contact-head" d="M49 24c12 0 21 9 21 22s-9 22-21 22-21-9-21-22 9-22 21-22z"></path>
        <circle class="ci-contact-ear" cx="67" cy="47" r="5.2"></circle>
        <path class="ci-contact-hair" d="M30 43c0-13 8-22 20-22 12 0 20 8 22 20-7-5-14-7-23-6-9 1-15 4-19 8z"></path>
        <g class="ci-contact-locks">
          <path class="ci-contact-lock ci-contact-front-lock" d="M34 30c-6 8-8 17-5 27"></path>
          <path class="ci-contact-lock ci-contact-front-lock" d="M40 26c-6 9-7 18-3 29"></path>
          <path class="ci-contact-lock ci-contact-front-lock" d="M47 25c-5 10-5 20 0 30"></path>
          <path class="ci-contact-lock ci-contact-front-lock" d="M55 27c-3 10-1 19 5 27"></path>
          <path class="ci-contact-lock ci-contact-side-lock" d="M27 43c-5 8-4 17 3 25"></path>
        </g>
        <circle class="ci-contact-eye" cx="55" cy="43" r="2.3"></circle>
        <path class="ci-contact-brow" d="M49 38c4-2 8-2 12 0"></path>
        <path class="ci-contact-face-line" d="M58 46c3 4 3 8-1 11M47 59c4 2 9 2 13-1"></path>
        <path class="ci-contact-highlight" d="M43 30c5-2 11-2 17 2"></path>
        <circle class="ci-contact-spark" cx="69" cy="25" r="3"></circle>
      </svg>`,
    addresses: `
      <svg class="ci-svg ci-address-svg" viewBox="0 0 96 96" role="img">
        <rect class="ci-address-card" x="16" y="14" width="64" height="68" rx="15"></rect>
        <path class="ci-address-route" d="M26 69c8-8 17-10 27-5 8 4 14 2 18-6"></path>
        <circle class="ci-address-radar" cx="48" cy="43" r="29"></circle>
        <path class="ci-address-pin" d="M48 19c-12 0-22 9-22 22 0 17 22 38 22 38s22-21 22-38c0-13-10-22-22-22z"></path>
        <circle class="ci-address-dot" cx="48" cy="41" r="7"></circle>
      </svg>`,
    subscriptions: `
      <svg class="ci-svg ci-subs-svg" viewBox="0 0 96 96" role="img">
        <circle class="ci-subs-glow" cx="48" cy="48" r="40"></circle>
        <g class="ci-subs-orbit">
          <path d="M23 45c2-16 16-28 33-26 7 1 13 4 18 9"></path>
          <path d="M73 28l-2-10 10 3"></path>
          <path d="M73 51c-2 16-16 28-33 26-7-1-13-4-18-9"></path>
          <path d="M23 68l2 10-10-3"></path>
        </g>
        <g class="ci-subs-calendar">
          <rect class="ci-subs-calendar-body" x="18" y="19" width="44" height="47" rx="9"></rect>
          <path class="ci-subs-calendar-top" d="M18 29h44"></path>
          <path class="ci-subs-ring" d="M29 17v10M51 17v10"></path>
          <rect class="ci-subs-date" x="26" y="39" width="9" height="9" rx="2"></rect>
          <rect class="ci-subs-date" x="43" y="39" width="9" height="9" rx="2"></rect>
          <rect class="ci-subs-date ci-subs-date-active" x="26" y="53" width="9" height="9" rx="2"></rect>
        </g>
        <g class="ci-subs-card">
          <rect class="ci-subs-card-body" x="37" y="50" width="43" height="25" rx="7"></rect>
          <rect class="ci-subs-chip" x="44" y="57" width="9" height="7" rx="2"></rect>
          <path class="ci-subs-card-line" d="M58 59h15M44 69h28"></path>
        </g>
        <g class="ci-subs-dollar">
          <circle cx="67" cy="34" r="13"></circle>
          <path d="M67 25v18M61 31c2-3 10-3 12 0M61 37c2 3 10 3 12 0"></path>
        </g>
        <path class="ci-subs-check" d="M45 43l5 5 12-14"></path>
      </svg>`,
    reviewInbox: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <g class="ci-review-envelope">
          <rect class="ci-review-envelope-body" x="13" y="39" width="70" height="39" rx="3"></rect>
          <path class="ci-review-envelope-flap" d="M15 40l33 27 33-27z"></path>
          <path class="ci-review-envelope-fold" d="M15 77l25-23M81 77L56 54"></path>
        </g>
        <g class="ci-review-badge">
          <circle class="ci-review-badge-circle" cx="48" cy="27" r="19"></circle>
          <g class="ci-review-arrow-symbol">
            <path class="ci-review-arrow" d="M48 15v24M37 29l11 11 11-11"></path>
          </g>
        </g>
      </svg>`,
    sync: `
      <svg class="ci-svg" viewBox="0 0 96 96" role="img">
        <circle class="ci-sync-disc" cx="48" cy="48" r="38"></circle>
        <g class="ci-sync-arrows">
          <path class="ci-sync-arc" d="M26 56c4 12 15 21 29 21 8 0 15-3 21-9"></path>
          <path class="ci-sync-arc" d="M70 40c-4-12-15-21-29-21-8 0-15 3-21 9"></path>
          <path class="ci-sync-head" d="M17 57h22L28 42z"></path>
          <path class="ci-sync-head" d="M79 39H57l11 15z"></path>
        </g>
      </svg>`,
    ai: `
      <span class="ci-ai-gif-frame">
        <img class="ci-ai-gif" src="assets/generated/ai-assistant-flash.gif?v=20260627-6" alt="" loading="eager" decoding="async" />
      </span>`
  };

  return `<span class="command-illustration command-illustration--${esc(kind)}" aria-hidden="true">${drawings[kind] || drawings.tasks}</span>`;
}

function quickAction(action) {
  const { view, iconName, label, color, tone, detail } = action;
  const actualView = label === "Add Bill" ? "bills" : view;
  const tileStyle = `--tile-color:var(--${color});--tile-soft:${softColor(color)}`;
  return `<button class="action-tile action-tile--${esc(tone || color)}" style="${tileStyle}" data-action="navigate" data-view="${actualView}" aria-label="${esc(label)}">
    <span class="action-visual">
      <span class="action-orbit"></span>
      ${commandIllustration(iconName)}
    </span>
    <span class="action-copy">
      <strong>${esc(label)}</strong>
      <small>${esc(detail || "")}</small>
      </span>
    </button>`;
  }

  function softColor(color) {
    const map = {
      teal: "#e2f9fc",
      blue: "#e9f3ff",
      amber: "#fff5d6",
      purple: "#efedff",
      green: "#e9f8ef",
      coral: "#fff0f0"
    };
    return map[color] || "#eef3f9";
  }

  function summaryRows() {
    const expenses = reportableTransactions("expense");
    const income = reportableTransactions("income");
    return [3, 6, 12].map((months) => {
      const inc = monthlyProjection(income, months);
      const exp = monthlyProjection(expenses, months);
      const incProj = monthlyProjection(income, months, "projected");
      const expProj = monthlyProjection(expenses, months, "projected");
      return `<div class="metrics-grid">
        <div class="metric"><label>${months} Months</label><strong class="money-income">${money(inc)}</strong><span class="subtle">proj: ${money(incProj)}</span></div>
        <div class="metric"><label>Expenses</label><strong class="money-expense">${money(exp)}</strong><span class="subtle">proj: ${money(expProj)}</span></div>
        <div class="metric"><label>Net</label><strong class="${inc - exp >= 0 ? "positive" : "negative"}">${money(inc - exp)}</strong><span class="subtle">period</span></div>
      </div>`;
    }).join("");
  }

  function weekBillRow(bill) {
    const urgency = daysBetween(bill.dueDate) <= 3 ? "warn" : "info";
    return `<div class="week-row">
      <span class="round-icon" style="color:var(--${urgency === "warn" ? "amber" : "teal"});">${icon(categoryIcon(bill.category))}</span>
      <div><strong>${esc(bill.name)}</strong><div class="subtle">${esc(bill.payee)} - ${dueText(bill.dueDate)}</div></div>
      <div style="text-align:right;"><strong class="${urgency === "warn" ? "negative" : "money-blue"}">${money(bill.amount)}</strong><br><button class="primary-btn" style="min-height:30px;padding:0 14px;" data-action="pay-bill" data-id="${bill.id}">Pay</button></div>
    </div>`;
  }

  function monitorLoanRow(loan) {
    const remaining = loanRemaining(loan);
    const overdue = daysBetween(loan.dueDate) <= 0 && remaining > 0;
    return `<div class="data-row">
      <span class="round-icon" style="color:#0b7b4b;background:#edf9f2;">${icon("loan")}</span>
      <div><strong>Loan: ${esc(loan.borrower)}</strong><div><span class="tag status success">Loan</span> <span class="${overdue ? "negative" : "muted"}">${dueText(loan.dueDate)}</span></div></div>
      <div style="text-align:right;"><span class="status ${overdue ? "danger" : statusClass(loanStatusFromAmounts(loan))}">${overdue ? "Urgent" : loanStatusFromAmounts(loan)}</span><br><strong class="amount-large ${overdue ? "negative" : "money-blue"}">${money(remaining)}</strong></div>
    </div>`;
  }

  function goalCard(goal) {
    const pct = progressPct(goal.current, goal.target);
    return `<article class="goal-card">
      <div class="card-row"><span class="round-icon" style="color:var(--${goal.color});background:${softColor(goal.color)};">${icon("chart")}</span><strong>${money(goal.current)}</strong></div>
      <h3 class="entity-title">${esc(goal.name)}</h3>
      <div class="entity-subtitle">Target by ${shortDate(goal.targetDate)}</div>
      <div class="card-row"><strong class="${goal.color === "green" ? "positive" : "money-blue"}">${pct}% Complete</strong><span class="muted">of ${money(goal.target)}</span></div>
      <div class="progress ${goal.color}" style="--value:${pct}%"><span></span></div>
    </article>`;
  }

  function activityRow(tx) {
    const income = tx.type === "income";
    return `<div class="activity-row">
      <span class="round-icon" style="color:var(--${income ? "green" : "coral"});background:${income ? "#e9f8ef" : "#fff0f0"}">${icon(categoryIcon(tx.category))}</span>
      <div><strong>${esc(tx.name)}</strong><div class="subtle">${esc(tx.merchant)} - ${shortDate(tx.date)}</div></div>
      <strong class="${income ? "positive" : "negative"}">${income ? "+" : "-"}${money(tx.amount)}</strong>
    </div>`;
  }

  function dashboardHabitSnapshot() {
    const today = todayIso();
    const todaysHabits = habitInstancesForDay(today);
    const completed = todaysHabits.filter((habit) => habit.status === "Completed").length;
    const bestStreak = data.habits.reduce((best, habit) => Math.max(best, habitCurrentStreak(habit, today)), 0);
    return `<section class="section-card habit-snapshot">
      <div class="section-title"><h2>Habit Tracker</h2><button class="text-btn" data-action="navigate" data-view="habits">Open</button></div>
      <div class="metrics-grid">
        <div class="metric"><label>Today</label><strong>${completed}/${todaysHabits.length}</strong><span class="subtle">completed</span></div>
        <div class="metric"><label>Active</label><strong>${data.habits.filter((habit) => habit.status === "Active").length}</strong><span class="subtle">habits</span></div>
        <div class="metric"><label>Best Streak</label><strong>${bestStreak}</strong><span class="subtle">days</span></div>
      </div>
      <div class="habit-mini-list">${todaysHabits.slice(0, 3).map((habit) => habitMiniRow(habit)).join("") || `<p class="muted">No habits scheduled today.</p>`}</div>
    </section>`;
  }

  function habitMiniRow(item) {
    const completed = item.status === "Completed";
    return `<button class="habit-mini-row" data-action="navigate" data-view="habits">
      <span class="round-icon" style="color:${esc(item.color || taskCategoryColor("Habit"))};background:${softHex(item.color || taskCategoryColor("Habit"))};">${icon(completed ? "check" : "calendar")}</span>
      <span><strong>${esc(item.title)}</strong><span>${timeLabel(item.start)} - ${timeLabel(item.end)}</span></span>
      <span class="status ${completed ? "success" : "muted"}">${completed ? "Done" : "Due"}</span>
    </button>`;
  }

  function renderHabits() {
    const today = todayIso();
    const activeHabits = data.habits.filter((habit) => habit.status === "Active");
    const todaysHabits = activeHabits.filter((habit) => habitTrackableOn(habit, today));
    const completedToday = todaysHabits.filter((habit) => habitCompletedOn(habit, today)).length;
    const weekStart = startOfWeekIso(today);
    const weekEnd = addDaysIso(weekStart, 6);
    const weekStats = habitsCompletionSummary(data.habits, weekStart, weekEnd);
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = monthEndIso(today);
    const monthStats = habitsCompletionSummary(data.habits, monthStart, monthEnd);
    const filtered = data.habits.filter((habit) => {
      if (ui.habitFilter === "today") return habitTrackableOn(habit, today);
      if (ui.habitFilter === "completed") return habitCompletedOn(habit, today);
      if (ui.habitFilter === "paused") return habit.status !== "Active";
      return true;
    });
    const selectedVisible = filtered.filter((habit) => ui.selectedHabits.includes(habit.id)).length;
    const selectedCount = ui.selectedHabits.length;
    return `<section class="screen">
      ${header("Habit Tracker", `<button class="icon-btn" data-action="navigate" data-view="calendar" title="Calendar">${icon("calendar")}</button><button class="icon-btn" data-action="open-modal" data-modal="voiceHabit" title="Add habit by voice">${icon("mic")}</button><button class="icon-btn" data-action="open-modal" data-modal="editHabit" title="Add habit">${icon("plus")}</button>`)}
      <section class="habit-hero">
        <div>
          <span class="status info">${icon("calendar")} First-class calendar habits</span>
          <h2>${completedToday}/${todaysHabits.length} done today</h2>
          <p>Habits are separate from tasks, but their dated time blocks feed Month, Week, Day, and Block views.</p>
        </div>
        <div class="habit-ring" style="--value:${progressPct(completedToday, Math.max(1, todaysHabits.length))}%"><span>${progressPct(completedToday, Math.max(1, todaysHabits.length))}%</span></div>
      </section>
      <section class="habit-dashboard-panel" aria-label="Habit summary and controls">
        <div class="metrics-grid habit-stat-grid">
          <div class="metric habit-metric active"><label>Active</label><strong>${activeHabits.length}</strong><span class="subtle">tracked habits</span></div>
          <div class="metric habit-metric week"><label>This Week</label><strong>${weekStats.completed}/${weekStats.scheduled}</strong><span class="subtle">${weekStats.rate}% completion</span></div>
          <div class="metric habit-metric month"><label>This Month</label><strong>${monthStats.completed}/${monthStats.scheduled}</strong><span class="subtle">${monthStats.rate}% completion</span></div>
          <div class="metric habit-metric streak"><label>Top Streak</label><strong>${data.habits.reduce((best, habit) => Math.max(best, habitCurrentStreak(habit, today)), 0)}</strong><span class="subtle">days</span></div>
        </div>
        <div class="habit-control-bar" aria-label="Habit filters and layout">
          <div class="task-control-group">
            ${["all", "today", "completed", "paused"].map((filter) => `<button class="${ui.habitFilter === filter ? "active" : ""}" data-action="set-tab" data-key="habitFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}
          </div>
          <div class="task-control-group">
            ${["regular", "compact", "gallery"].map((view) => `<button class="${ui.habitView === view ? "active" : ""}" data-action="set-tab" data-key="habitView" data-value="${view}">${filterLabel(view)}</button>`).join("")}
          </div>
        </div>
        <div class="habit-ai-bar">
          <span class="habit-ai-icon">${icon("ai")}</span>
          <div>
            <strong>Habit AI</strong>
            <span>Ask about your habits, or add one by voice.</span>
          </div>
          <div class="habit-ai-actions">
            <button class="outline-btn" data-action="open-modal" data-modal="voiceHabit">${icon("mic")} Add by Voice</button>
            <button class="primary-btn" data-action="navigate" data-view="ai">${icon("ai")} Ask AI</button>
          </div>
        </div>
      </section>
      <div class="habit-action-bar">
        <span>${selectedCount ? `${selectedCount} selected` : "Select habits for bulk actions"}</span>
        <button class="outline-btn" data-action="select-visible-habits">${selectedVisible === filtered.length && filtered.length ? "Deselect visible" : "Select visible"}</button>
        ${selectedCount ? `<button class="outline-btn" data-action="copy-selected-habits">${icon("note")} Copy selected</button><button class="danger-btn" data-action="delete-selected-habits">${icon("trash")} Delete selected</button><button class="outline-btn" data-action="clear-selected-habits">Clear</button>` : ""}
      </div>
      <div class="habit-grid habits-${esc(ui.habitView)}">
        ${filtered.map((habit) => habitCard(habit, today)).join("") || `<div class="empty-state"><div><h2>No habits here yet</h2><button class="primary-btn" data-action="open-modal" data-modal="voiceHabit">${icon("mic")} Add By Voice</button><button class="outline-btn" data-action="open-modal" data-modal="editHabit">${icon("plus")} Add Habit</button></div></div>`}
      </div>
    </section>`;
  }

  function habitCard(habit, today) {
    const media = entityImage(habit);
    const completed = habitCompletedOn(habit, today);
    const weekStats = habitCompletionSummary(habit, addDaysIso(today, -6), today);
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthStats = habitCompletionSummary(habit, monthStart, monthEndIso(today));
    const streak = habitCurrentStreak(habit, today);
    const color = habit.color || taskCategoryColor("Habit");
    const selected = ui.selectedHabits.includes(habit.id);
    const durationMinutes = Math.max(0, minutes(habit.end) - minutes(habit.start));
    const countingSince = habitEffectiveStartDate(habit);
    const hasFreshStart = Boolean(habit.freshStartDate);
    return `<article class="habit-card habit-card-${esc(ui.habitView)} ${media ? "has-media" : ""} ${selected ? "selected" : ""}" style="--habit-color:${esc(color)};" data-habit-id="${habit.id}" draggable="true">
      ${media ? `<div class="habit-card-watermark" ${imageStyleAttr(habit)}><img src="${esc(media)}" alt=""></div>` : ""}
      <button class="habit-card-cover ${media ? "has-image" : "empty"}" data-action="open-modal" data-modal="editHabit" data-id="${habit.id}" aria-label="${media ? "Edit habit picture" : "Add habit picture"}" ${imageStyleAttr(habit)}>
        ${media ? `<img src="${esc(media)}" alt="">` : `<span>${icon("camera")} Add picture</span>`}
      </button>
      <div class="card-row habit-card-head">
        <div class="habit-head-main">
          <div class="habit-select-rail">
            <button class="habit-select-button ${selected ? "active" : ""}" data-action="toggle-habit-select" data-id="${habit.id}" aria-label="${selected ? "Deselect" : "Select"} ${esc(habit.title)}">${selected ? icon("check") : ""}</button>
            <button class="habit-inline-picture habit-rail-picture ${media ? "has-image" : "empty"}" data-action="open-modal" data-modal="editHabit" data-id="${habit.id}" aria-label="${media ? "Edit habit picture" : "Add habit picture"}" title="${media ? "Edit habit picture" : "Add habit picture"}" ${imageStyleAttr(habit)}>
              ${media ? `<img src="${esc(media)}" alt="">` : icon("camera")}
            </button>
          </div>
          <div class="habit-main-fields">
            <input class="habit-title-input" data-action="habit-inline" data-id="${habit.id}" data-field="title" value="${esc(habit.title)}" aria-label="Habit title">
            <div class="habit-inline-row">
              <select data-action="habit-inline" data-id="${habit.id}" data-field="type" aria-label="Habit type">${inlineOptions(habitTypeOptions, habit.type)}</select>
              <select data-action="habit-inline" data-id="${habit.id}" data-field="schedule" aria-label="Habit schedule">${inlineOptions(habitScheduleOptions, habit.schedule)}</select>
            </div>
            <div class="habit-time-row" draggable="true" data-habit-time-swap="${habit.id}" title="Drag this time row onto another habit to swap times">
              <input type="time" data-action="habit-inline" data-id="${habit.id}" data-field="start" value="${esc(habit.start || "08:00")}" aria-label="Start time">
              <span>to</span>
              <input type="time" data-action="habit-inline" data-id="${habit.id}" data-field="end" value="${esc(habit.end || "08:30")}" aria-label="End time">
            </div>
          </div>
        </div>
        <select class="habit-status-select ${habit.status === "Active" ? "success" : "muted"}" data-action="habit-inline" data-id="${habit.id}" data-field="status" aria-label="Habit status">${inlineOptions(["Active", "Paused"], habit.status)}</select>
      </div>
      <textarea class="habit-description-inline" rows="2" data-action="habit-inline" data-id="${habit.id}" data-field="description" placeholder="Notes for this habit">${esc(habit.description || "")}</textarea>
      <div class="habit-duration-stepper" aria-label="Quick end time controls">
        <button class="outline-btn" data-action="adjust-habit-end" data-id="${habit.id}" data-delta="-15">- 15m</button>
        <span>End ${timeLabel(habit.end)} &middot; ${durationLabel(durationMinutes)}</span>
        <button class="outline-btn" data-action="adjust-habit-end" data-id="${habit.id}" data-delta="15">${icon("plus")} 15m</button>
      </div>
      <div class="habit-stats-row">
        <div><label>Streak</label><strong>${streak}</strong><span>days</span></div>
        <div><label>Week</label><strong>${weekStats.rate}%</strong><span>${weekStats.completed}/${weekStats.scheduled}</span></div>
        <div><label>30 Days</label><strong>${monthStats.rate}%</strong><span>${monthStats.completed}/${monthStats.scheduled}</span></div>
      </div>
      ${habitHeatmap(habit, today)}
      <div class="task-time-preview habit-calendar-preview">
        <span>${icon("calendar")} Starts ${dateLabel(habit.startDate)}</span>
        <span>${icon("check")} Counting since ${dateLabel(countingSince)}</span>
        <span>${icon("bell")} ${habit.includeHours ? `${durationLabel(minutes(habit.end) - minutes(habit.start))} counted` : "Not counted in hours"}</span>
      </div>
      <div class="habit-fresh-row">
        <span>${hasFreshStart ? `Fresh start active from ${dateLabel(habit.freshStartDate)}` : "Need a reset? Start this habit fresh from a new date."}</span>
        <button class="outline-btn" data-action="open-modal" data-modal="habitFreshStart" data-id="${habit.id}">${icon("back")} Start Fresh</button>
      </div>
      <div class="sheet-actions habit-card-actions">
        <button class="${completed ? "outline-btn" : "success-btn"} habit-action-btn" data-action="toggle-habit-completion" data-id="${habit.id}" data-date="${today}">${icon("check")} ${completed ? "Undo Today" : "Complete Today"}</button>
        <button class="outline-btn habit-action-btn" data-action="copy-habit" data-id="${habit.id}">${icon("note")} Copy</button>
        <button class="outline-btn habit-action-btn" data-action="open-modal" data-modal="editHabit" data-id="${habit.id}">${icon("edit")} Edit</button>
        <button class="danger-btn habit-action-btn" data-action="delete-habit" data-id="${habit.id}">${icon("trash")} Delete</button>
        <button class="outline-btn habit-action-btn" data-action="open-habit-calendar" data-id="${habit.id}" data-view="day">${icon("calendar")} Day</button>
        <button class="outline-btn habit-action-btn" data-action="open-habit-calendar" data-id="${habit.id}" data-view="block">${icon("chart")} Block</button>
      </div>
    </article>`;
  }

  function inlineOptions(options, selected) {
    return options.map((option) => `<option value="${esc(option)}" ${option === selected ? "selected" : ""}>${esc(option)}</option>`).join("");
  }

  function habitHeatmap(habit, anchorIso) {
    const monthStart = `${anchorIso.slice(0, 7)}-01`;
    const monthEnd = monthEndIso(anchorIso);
    const monthDates = dateRangeIso(monthStart, monthEnd);
    const dates = Array.from({ length: Math.max(31, monthDates.length) }, (_, index) => addDaysIso(monthStart, index));
    const monthLabel = parseLocalDate(monthStart).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return `<div class="habit-heatmap habit-month-grid" aria-label="${esc(monthLabel)} habit activity">
      ${dates.map((iso) => {
        const inMonth = iso.slice(0, 7) === anchorIso.slice(0, 7);
        const scheduled = habitScheduledOn(habit, iso);
        const completed = habitCompletedOn(habit, iso);
        const current = iso === todayIso();
        return `<button class="${inMonth ? "" : "outside-month"} ${scheduled ? "scheduled" : ""} ${completed ? "completed" : ""} ${current ? "today" : ""}" data-action="toggle-habit-completion" data-id="${habit.id}" data-date="${iso}" title="${dateLabel(iso)}: ${completed ? "completed" : scheduled ? "scheduled" : "not scheduled"}">${Number(iso.slice(-2))}</button>`;
      }).join("")}
    </div>`;
  }

  function renderTracking() {
    const type = ui.trackingTab === "income" ? "income" : "expense";
    const items = reportableTransactions(type).sort((a, b) => b.date.localeCompare(a.date));
    const title = type === "income" ? "Income" : "Expenses";
    return `<section class="screen">
      ${header("Income & Expense Tracking", `<button class="icon-btn" data-action="navigate" data-view="lending" title="Money Lending Tracker">${icon("loan")}</button>`)}
      <div class="segmented tracking-segmented">
        <button class="${ui.trackingTab === "expenses" ? "active" : ""}" data-action="set-tab" data-key="trackingTab" data-value="expenses">Expenses</button>
        <button class="${ui.trackingTab === "income" ? "active" : ""}" data-action="set-tab" data-key="trackingTab" data-value="income">Income</button>
      </div>
      ${incomeExpenseOverview("finance-compare-panel--tracking")}
      <div class="finance-grid tracking-finance-grid tracking-finance-grid--${type === "income" ? "income" : "expenses"}">
        <section class="section-card">
          <div class="section-title"><h2>${type === "income" ? "All Income Sources" : "All Expenses"}</h2><button class="text-btn" data-action="open-modal" data-modal="addTransaction">${icon("plus")} Add</button></div>
          <div class="list">
            ${items.map((tx) => transactionRow(tx)).join("")}
          </div>
        </section>
        <section class="section-card">
          <div class="section-title"><h2>${title}</h2><span class="status success">Live</span></div>
          ${trackingSummary(type)}
        </section>
      </div>
    </section>`;
  }

  function trackingSummary(type) {
    const items = reportableTransactions(type);
    return [1, 3, 6, 12].map((months) => {
      const actual = monthlyProjection(items, months);
      const projected = monthlyProjection(items, months, "projected");
      const variance = budgetVariance(actual, projected, type);
      return `<div class="metrics-grid">
        <div class="metric"><label>${months === 1 ? "Monthly" : `${months} Months`}<br>Actual</label><strong class="${type === "income" ? "money-income" : "money-expense"}">${money(actual)}</strong></div>
        <div class="metric"><label>Projected</label><strong class="${projectedClass(actual, projected, type)}">${money(projected)}</strong></div>
        <div class="metric"><label>Variance</label><strong class="${varianceClass(actual, projected, type)}">${money(variance)}</strong></div>
      </div>`;
    }).join("");
  }

  function incomeExpenseTotals(months = 1) {
    const incomeItems = reportableTransactions("income");
    const expenseItems = reportableTransactions("expense");
    const incomeActual = monthlyProjection(incomeItems, months);
    const expenseActual = monthlyProjection(expenseItems, months);
    const incomeProjected = monthlyProjection(incomeItems, months, "projected");
    const expenseProjected = monthlyProjection(expenseItems, months, "projected");
    return {
      incomeActual,
      expenseActual,
      incomeProjected,
      expenseProjected,
      netActual: incomeActual - expenseActual,
      netProjected: incomeProjected - expenseProjected,
      maxActual: Math.max(incomeActual, expenseActual, 1)
    };
  }

  function incomeExpenseOverview(extraClass = "") {
    const totals = incomeExpenseTotals();
    const profit = totals.netActual >= 0;
    const incomePct = Math.max(3, Math.round((totals.incomeActual / totals.maxActual) * 100));
    const expensePct = Math.max(3, Math.round((totals.expenseActual / totals.maxActual) * 100));
    const lead = Math.abs(totals.netActual);
    return `<section class="section-card finance-compare-panel ${extraClass}">
      <div class="section-title"><h2>Income vs Expenses</h2><span class="status ${profit ? "success" : "danger"}">${profit ? "Profit" : "Loss"}</span></div>
      <div class="finance-compare-grid">
        <div class="finance-compare-card finance-compare-card--income">
          <label>Total Income</label>
          <strong class="money-income">${money(totals.incomeActual)}</strong>
          <span>Projected ${money(totals.incomeProjected)}</span>
        </div>
        <div class="finance-net-card ${profit ? "is-profit" : "is-loss"}">
          <label>${profit ? "Income is higher" : "Expenses are higher"}</label>
          <strong class="${profit ? "positive" : "negative"}">${money(lead)}</strong>
          <span>Net ${money(totals.netActual)}</span>
        </div>
        <div class="finance-compare-card finance-compare-card--expense">
          <label>Total Expenses</label>
          <strong class="money-expense">${money(totals.expenseActual)}</strong>
          <span>Projected ${money(totals.expenseProjected)}</span>
        </div>
      </div>
      <div class="finance-compare-bars" aria-label="Income and expenses comparison">
        <div class="finance-compare-bar"><span>Income</span><div><i class="income-fill" style="width:${incomePct}%"></i></div><strong>${money(totals.incomeActual)}</strong></div>
        <div class="finance-compare-bar"><span>Expenses</span><div><i class="expense-fill" style="width:${expensePct}%"></i></div><strong>${money(totals.expenseActual)}</strong></div>
      </div>
    </section>`;
  }

  function transactionRow(tx) {
    const cls = tx.type === "income" ? "positive" : "negative";
    return `<button class="data-row" style="text-align:left;background:transparent;border:0;width:100%;" data-action="open-modal" data-modal="transactionDetail" data-id="${tx.id}">
      <span class="round-icon" style="color:var(--${tx.type === "income" ? "green" : "coral"});background:${tx.type === "income" ? "#eafaf1" : "#fff0f0"}">${icon(categoryIcon(tx.category))}</span>
      <div><strong>${esc(tx.name)}</strong><div class="subtle">${esc(tx.category)} - ${esc(tx.frequency)}</div></div>
      <span style="text-align:right;"><span>Act: <strong class="${cls}">${money(tx.amount)}</strong></span><br><span class="${projectedClass(tx.amount, tx.projected, tx.type)}">Proj: ${money(tx.projected)}</span></span>
    </button>`;
  }

  function renderAnalytics() {
    if (ui.analyticsTab === "compare") return renderIncomeExpenseAnalytics();
    const type = ui.analyticsTab === "income" ? "income" : "expense";
    const items = reportableTransactions(type);
    const title = type === "income" ? "Income" : "Expenses";
    return `<section class="screen">
      ${header("Budget Analytics")}
      <div class="segmented segmented--three">
        <button class="${ui.analyticsTab === "expenses" ? "active" : ""}" data-action="set-tab" data-key="analyticsTab" data-value="expenses">Expenses</button>
        <button class="${ui.analyticsTab === "income" ? "active" : ""}" data-action="set-tab" data-key="analyticsTab" data-value="income">Income</button>
        <button class="${ui.analyticsTab === "compare" ? "active" : ""}" data-action="set-tab" data-key="analyticsTab" data-value="compare">Income vs Expenses</button>
      </div>
      <div class="analytics-grid">
        <section class="section-card">
          ${[3, 6, 12].map((months) => projectionCard(type, months)).join("")}
        </section>
        <section class="section-card chart-card">
          <div class="section-title"><h2>${title} Distribution</h2></div>
          <div class="filter-row">
            <button class="${ui.chartType === "pie" ? "active" : ""}" data-action="set-tab" data-key="chartType" data-value="pie">${icon("check")} Pie</button>
            <button class="${ui.chartType === "bar" ? "active" : ""}" data-action="set-tab" data-key="chartType" data-value="bar">${icon("chart")} Bar</button>
          </div>
          <div class="chart-wrap">
            <canvas id="analyticsChart" width="420" height="300" data-type="${type}" data-chart="${ui.chartType}"></canvas>
            <div class="legend">${categoryBreakdown(items).map((row) => legendRow(row)).join("")}</div>
          </div>
        </section>
        <section class="section-card span-2">
          <div class="section-title"><h2>${title} Categories</h2></div>
          ${categoryBreakdown(items).map((row) => categoryRow(row, type)).join("")}
        </section>
      </div>
    </section>`;
  }

  function renderIncomeExpenseAnalytics() {
    const incomeRows = categoryBreakdown(reportableTransactions("income"));
    const expenseRows = categoryBreakdown(reportableTransactions("expense"));
    return `<section class="screen">
      ${header("Budget Analytics")}
      <div class="segmented segmented--three">
        <button class="${ui.analyticsTab === "expenses" ? "active" : ""}" data-action="set-tab" data-key="analyticsTab" data-value="expenses">Expenses</button>
        <button class="${ui.analyticsTab === "income" ? "active" : ""}" data-action="set-tab" data-key="analyticsTab" data-value="income">Income</button>
        <button class="${ui.analyticsTab === "compare" ? "active" : ""}" data-action="set-tab" data-key="analyticsTab" data-value="compare">Income vs Expenses</button>
      </div>
      <div class="analytics-grid">
        ${incomeExpenseOverview("span-2 finance-compare-panel--analytics")}
        <section class="section-card">
          ${[1, 3, 6, 12].map((months) => incomeExpensePeriodCard(months)).join("")}
        </section>
        <section class="section-card chart-card">
          <div class="section-title"><h2>Income vs Expenses</h2></div>
          <div class="filter-row">
            <button class="${ui.chartType === "pie" ? "active" : ""}" data-action="set-tab" data-key="chartType" data-value="pie">${icon("check")} Pie</button>
            <button class="${ui.chartType === "bar" ? "active" : ""}" data-action="set-tab" data-key="chartType" data-value="bar">${icon("chart")} Bar</button>
          </div>
          <div class="chart-wrap">
            <canvas id="analyticsChart" width="420" height="300" data-type="compare" data-chart="${ui.chartType}"></canvas>
            <div class="legend">${comparisonLegendRows()}</div>
          </div>
        </section>
        <section class="section-card">
          <div class="section-title"><h2>Income Categories</h2></div>
          ${incomeRows.length ? incomeRows.map((row) => categoryRow(row, "income")).join("") : `<p class="muted">No income categories yet.</p>`}
        </section>
        <section class="section-card">
          <div class="section-title"><h2>Expense Categories</h2></div>
          ${expenseRows.length ? expenseRows.map((row) => categoryRow(row, "expense")).join("") : `<p class="muted">No expense categories yet.</p>`}
        </section>
      </div>
    </section>`;
  }

  function incomeExpensePeriodCard(months) {
    const totals = incomeExpenseTotals(months);
    const profit = totals.netActual >= 0;
    const label = months === 1 ? "Monthly" : `${months} Months`;
    const max = Math.max(totals.incomeActual, totals.expenseActual, 1);
    const incomePct = Math.max(3, Math.round((totals.incomeActual / max) * 100));
    const expensePct = Math.max(3, Math.round((totals.expenseActual / max) * 100));
    return `<article class="compare-period-card">
      <h2 class="panel-title">${label} Income vs Expenses</h2>
      <div class="projection-row">
        <div class="amount-cell amount-cell--income"><label>${icon("wallet")} Income</label><strong class="money-income">${money(totals.incomeActual)}</strong></div>
        <div class="amount-cell amount-cell--expense"><label>${icon("receipt")} Expenses</label><strong class="money-expense">${money(totals.expenseActual)}</strong></div>
        <div class="amount-cell"><label>Net</label><strong class="${profit ? "positive" : "negative"}">${money(totals.netActual)}</strong></div>
      </div>
      <div class="finance-compare-bars finance-compare-bars--compact">
        <div class="finance-compare-bar"><span>Income</span><div><i class="income-fill" style="width:${incomePct}%"></i></div></div>
        <div class="finance-compare-bar"><span>Expenses</span><div><i class="expense-fill" style="width:${expensePct}%"></i></div></div>
      </div>
    </article>`;
  }

  function comparisonLegendRows() {
    const totals = incomeExpenseTotals();
    const total = totals.incomeActual + totals.expenseActual;
    const incomePct = total ? Math.round((totals.incomeActual / total) * 100) : 0;
    const expensePct = total ? Math.round((totals.expenseActual / total) * 100) : 0;
    return `<div class="legend-row"><span class="dot green"></span><span>Income</span><strong>${incomePct}%</strong></div>
      <div class="legend-row"><span class="dot red"></span><span>Expenses</span><strong>${expensePct}%</strong></div>`;
  }

  function projectionCard(type, months) {
    const items = data.transactions.filter((tx) => tx.type === type);
    const actual = monthlyProjection(items, months);
    const projected = monthlyProjection(items, months, "projected");
    const variance = budgetVariance(actual, projected, type);
    const ok = variance >= 0;
    return `<article style="margin-bottom:24px;">
      <h2 class="panel-title">${type === "income" ? "Income" : "Expenses"} - ${months} Months</h2>
      <div class="projection-row">
        <div class="amount-cell" style="background:${type === "income" ? "#eef9fc" : "#fff0f0"};border:1px solid ${type === "income" ? "#c7edf5" : "#ffd2d2"};border-radius:8px;padding:12px;">
          <label>${icon("wallet")} Actual</label><strong class="${type === "income" ? "money-income" : "money-expense"}">${money(actual)}</strong>
        </div>
        <div class="amount-cell" style="background:#eff8fb;border:1px solid #c7e7f0;border-radius:8px;padding:12px;">
          <label>${icon("chart")} Projected</label><strong class="${projectedClass(actual, projected, type)}">${money(projected)}</strong>
        </div>
        <div class="amount-cell">
          <label>Variance</label><strong class="${ok ? "positive" : "negative"}">${money(variance)}</strong>
        </div>
      </div>
      <div class="progress ${ok ? "green" : "coral"}" style="--value:${projected ? Math.min(100, Math.round((actual / projected) * 100)) : 0}%"><span></span></div>
      <div class="card-row" style="margin-top:8px;"><span class="subtle">${projected ? Math.round((actual / projected) * 100) : 0}% of projected</span><span class="${ok ? "positive" : "negative"}">${ok ? "" : ""}${money(Math.abs(variance))} ${ok ? (type === "income" ? "ahead" : "under budget") : (type === "income" ? "behind" : "over budget")}</span></div>
    </article>`;
  }

  function categoryBreakdown(items) {
    const map = new Map();
    items.forEach((item) => {
      const row = map.get(item.category) || { name: item.category, actual: 0, projected: 0 };
      row.actual += Number(item.amount || 0);
      row.projected += Number(item.projected || 0);
      map.set(item.category, row);
    });
    return [...map.values()].sort((a, b) => b.actual - a.actual);
  }

  function legendRow(row) {
    const total = sum(categoryBreakdown(reportableTransactions(ui.analyticsTab === "income" ? "income" : "expense")), "actual");
    const pct = total ? Math.round((row.actual / total) * 100) : 0;
    return `<div class="legend-row"><span class="dot ${legendColor(row.name)}"></span><span>${esc(row.name)}</span><strong>${pct}%</strong></div>`;
  }

  function legendColor(name) {
    const colors = ["teal", "green", "blue", "coral", "amber", "purple"];
    let n = 0;
    String(name).split("").forEach((char) => { n += char.charCodeAt(0); });
    return colors[n % colors.length];
  }

  function categoryRow(row, type) {
    const variance = budgetVariance(row.actual, row.projected, type);
    return `<div class="data-row">
      <span class="round-icon" style="color:var(--${type === "income" ? "teal" : "coral"});background:${type === "income" ? "#e8fbfd" : "#fff0f0"}">${icon(categoryIcon(row.name))}</span>
      <div><strong>${esc(row.name)}</strong><div class="${projectedClass(row.actual, row.projected, type)}">Projected ${money(row.projected)}</div></div>
      <div style="text-align:right;"><strong class="${type === "income" ? "money-income" : "money-expense"}">${money(row.actual)}</strong><br><span class="${varianceClass(row.actual, row.projected, type)}">${money(variance)}</span></div>
    </div>`;
  }

  function renderBills(tabOverride = "") {
    const activeTab = tabOverride || ui.billHubTab || "bills";
    const q = ui.billQuery.toLowerCase();
    const bills = data.bills.filter((bill) => [bill.name, bill.payee, bill.category].join(" ").toLowerCase().includes(q)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const monthlyBills = data.bills.reduce((total, bill) => total + Number(bill.amount || 0), 0);
    const monthlySubscriptions = data.subscriptions.reduce((total, sub) => total + monthlySubAmount(sub), 0);
    return `<section class="screen">
      ${header("Bills", `<button class="icon-btn" data-action="navigate" data-view="inbox" title="Review Inbox">${icon("receipt")}</button><button class="icon-btn" data-action="navigate" data-view="sync" title="Sync Center">${icon("settings")}</button><button class="icon-btn" data-action="navigate" data-view="calendar">${icon("calendar")}</button><button class="icon-btn" data-action="open-modal" data-modal="addSubscription" title="Add subscription">${icon("playcard")}</button><button class="icon-btn" data-action="open-modal" data-modal="addBill" title="Add bill">${icon("plus")}</button>`)}
      <section class="section-card hub-note">
        <span class="round-icon">${icon("receipt")}</span>
        <div><strong>Bills umbrella</strong><p>Regular bills and subscriptions live together here. Subscription tools stay intact as a smart bill type.</p></div>
        <button class="outline-btn" data-action="navigate" data-view="inbox">${icon("receipt")} Review Inbox</button>
      </section>
      <div class="metrics-grid" style="margin-bottom:12px;">
        <div class="metric"><label>Regular Bills</label><strong>${data.bills.length}</strong><span class="subtle">${money(monthlyBills)} tracked</span></div>
        <div class="metric"><label>Subscriptions</label><strong>${data.subscriptions.length}</strong><span class="subtle">${money(monthlySubscriptions)} monthly</span></div>
      </div>
      <div class="filter-row bill-hub-tabs">
        ${["bills", "subscriptions"].map((tab) => `<button class="${activeTab === tab ? "active" : ""}" data-action="set-tab" data-key="billHubTab" data-value="${tab}">${tab === "bills" ? `${icon("receipt")} Bills` : `${icon("playcard")} Subscriptions`}</button>`).join("")}
      </div>
      ${activeTab === "subscriptions" ? subscriptionHubContent() : `
        <div class="toolbar">
          <label class="search-field">${icon("search")}<input id="billSearch" value="${esc(ui.billQuery)}" data-action="bill-search" placeholder="Search bills..." /></label>
          <button class="icon-btn primary-btn" data-action="run-smart-sync" title="Run smart sync">${icon("filter")}</button>
          <button class="icon-btn secondary-filter" data-action="navigate" data-view="inbox" title="Detected bills">${icon("chart")}</button>
        </div>
        ${bills.length ? `<div class="bill-grid">${bills.map((bill) => billCard(bill)).join("")}</div>` : emptyState("receipt", "No Bills Found", "Add your first bill to get started with organized payments.", "Add Your First Bill", "addBill")}
      `}
    </section>`;
  }

  function renderBillInbox() {
    const items = billInboxItems();
    const pendingCount = items.filter((item) => item.status === "pending").length;
    const detectedCount = items.filter((item) => item.source === "Recurring detector").length;
    const queuedAlerts = safeArray(data.notificationLog).filter((notice) => notice.deliveryStatus === "queued").length;
    const filtered = items.filter((item) => ui.billInboxFilter === "all" || item.status === ui.billInboxFilter || item.type === ui.billInboxFilter);
    return `<section class="screen">
      ${header("Review Inbox", `<button class="icon-btn" data-action="navigate" data-view="sync" title="Sync Center">${icon("settings")}</button><button class="icon-btn" data-action="open-modal" data-modal="importStatement" title="Import statement">${icon("note")}</button><button class="icon-btn" data-action="run-smart-sync" title="Run smart sync">${icon("filter")}</button>`)}
      <section class="section-card prism-hero">
        <div>
          <div class="small-label">Prism-style command center</div>
          <h2>Approve, pay, cancel, or file every bill signal.</h2>
          <p>Bank/card sync, screenshots, PDFs, email forwards, recurring-charge detection, and task notification alerts should all land here before they become action items.</p>
        </div>
        <div class="prism-metrics">
          <div><strong>${pendingCount}</strong><span>Pending</span></div>
          <div><strong>${detectedCount}</strong><span>Detected</span></div>
          <div><strong>${queuedAlerts}</strong><span>Task Alerts</span></div>
          <div><strong>${data.cancellations.length}</strong><span>Cancellations</span></div>
        </div>
      </section>
      ${notificationFoundationPanel("inbox")}
      ${billSyncPanel(items)}
      <div class="filter-row">
        ${["pending", "subscription", "bill", "approved", "all"].map((filter) => `<button class="${ui.billInboxFilter === filter ? "active" : ""}" data-action="set-tab" data-key="billInboxFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}
      </div>
      <div class="inbox-grid">${filtered.length ? filtered.map((item) => billInboxCard(item)).join("") : `<section class="section-card"><p class="muted">No inbox items in this filter.</p></section>`}</div>
      <section class="section-card">
        <div class="section-title"><h2>Cancellation Center</h2><button class="text-btn" data-action="navigate" data-view="subscriptions">Subscriptions</button></div>
        ${cancellationRows()}
      </section>
    </section>`;
  }

  function renderSyncCenter() {
    const connections = safeArray(data.syncConnections);
    const connected = connections.filter((item) => item.status === "Connected" || item.status === "Ready").length;
    const needsAuth = connections.filter((item) => item.needsAuth).length;
    return `<section class="screen">
      ${header("Sync Center", `<button class="icon-btn" data-action="run-smart-sync" title="Run smart sync">${icon("filter")}</button><button class="icon-btn" data-action="navigate" data-view="inbox" title="Review Inbox">${icon("receipt")}</button>`)}
      ${syncCommandPanel(connected, connections.length, needsAuth)}
      ${cloudWorkspacePanel()}
      ${backupSafetyPanel()}
      ${liveDataSafetyPanel()}
      ${plaidSandboxPanel()}
      <div class="sync-priority-grid">
        ${googleContactsPanel()}
        ${notificationFoundationPanel()}
      </div>
      ${syncDetailsDisclosure("Friend readiness", "Private accounts, safe alpha steps, onboarding, and feedback tools.", `${friendAlphaLaunchPanel()}${friendMobileReadyPanel()}${friendPrivacyGatePanel()}${friendAlphaOnboardingPanel()}${friendAlphaFeedbackPanel()}`)}
      ${syncDetailsDisclosure("Mobile and picture storage", "Phone/iPad access plus the Supabase media plan for uploads.", `${mobileCodexAccessPanel()}${mediaStoragePanel()}`)}
      <div class="sync-grid">${connections.map((connection) => syncConnectionCard(connection)).join("")}</div>
      ${syncDetailsDisclosure("Production Integration Plan", "Bank/card sync, bill pay, cancellation, contacts, and notifications staged safely.", `
        <div class="roadmap-grid">
          ${syncRoadmapStep("1", "Transactions", "Connect Plaid/MX/Finicity to pull balances, credit-card transactions, and recurring charge streams.")}
          ${syncRoadmapStep("2", "Liabilities", "Pull credit-card and loan due dates, statement balances, minimum due, and APR where supported.")}
          ${syncRoadmapStep("3", "Bill Pay", "Add a bill-pay rail such as BillGO/Fiserv/Method before moving real money.")}
          ${syncRoadmapStep("4", "Cancellation", "Start with guided workflows, provider links, email templates, and confirmation capture before direct APIs.")}
          ${syncRoadmapStep("5", "Contacts + Groups", "Read Google Contacts first, then later add create/update access after the privacy and consent flow is stable.")}
          ${syncRoadmapStep("6", "Notifications", "Queue task status alerts now. Add Resend/SendGrid email next, then SMS as a premium provider feature.")}
          ${syncRoadmapStep("7", "Drive Backup", "Later: add true Google Drive OAuth backup so BillMaster can create scheduled cloud backup files without manual downloads.")}
        </div>
      `)}
    </section>`;
  }

  function syncCommandPanel(connected, total, needsAuth) {
    const signedIn = cloudSignedIn();
    const autoOn = cloudAutoSyncEnabled();
    const title = signedIn ? (autoOn ? "Auto sync is watching" : "Ready to turn Auto On") : cloudConfigured() ? "Sign in to sync devices" : "Finish cloud setup";
    const copy = signedIn
      ? autoOn
        ? "BillMaster is watching for saved changes and can smart-merge this device with your phone, iPad, and desktop."
        : "Best next move: run Smart Merge once, then turn Auto On when the result looks right."
      : cloudConfigured()
        ? "Your Supabase keys are saved. Sign in with your BillMaster account to sync this workspace."
        : "Add the Supabase project URL and publishable key before inviting friends or testing on another device.";
    return `<section class="section-card sync-command-panel">
      <div class="sync-command-copy">
        <span class="round-icon">${icon(autoOn ? "check" : signedIn ? "cloud" : "settings")}</span>
        <div>
          <div class="section-title compact-title"><h2>${esc(title)}</h2><span class="status ${autoOn ? "success" : signedIn ? "info" : "warn"}">${connected}/${total} rails</span></div>
          <p class="muted">${esc(copy)}</p>
        </div>
      </div>
      <div class="sync-command-stats">
        <span><strong>${connected}</strong><small>ready</small></span>
        <span><strong>${needsAuth}</strong><small>need setup</small></span>
        <span><strong>${cloudNextActionLabel()}</strong><small>next best action</small></span>
      </div>
      <div class="sheet-actions sync-command-actions">
        ${signedIn ? `<button class="primary-btn" data-action="cloud-smart-merge">${icon("cloud")} Smart merge</button><button class="outline-btn" data-action="toggle-cloud-auto-sync">${icon(autoOn ? "check" : "settings")} Auto ${autoOn ? "On" : "Off"}</button>` : `<button class="primary-btn" data-action="open-modal" data-modal="${cloudConfigured() ? "cloudAuth" : "cloudSetup"}">${icon(cloudConfigured() ? "home" : "settings")} ${cloudConfigured() ? "Sign in" : "Setup"}</button>`}
        <button class="outline-btn" data-action="cloud-pull-workspace" ${signedIn ? "" : "disabled"}>${icon("note")} Pull cloud</button>
        <button class="outline-btn" data-action="cloud-push-workspace" ${signedIn ? "" : "disabled"}>${icon("wallet")} Push local</button>
      </div>
    </section>`;
  }

  function syncDetailsDisclosure(title, copy, content, open = false) {
    return `<details class="section-card sync-disclosure" ${open ? "open" : ""}>
      <summary><span><strong>${esc(title)}</strong><small>${esc(copy)}</small></span>${icon("back")}</summary>
      <div class="sync-disclosure-body">${content}</div>
    </details>`;
  }

  function plaidSandboxPanel() {
    const sync = safeArray(data.syncConnections).find((item) => item.id === "sync_1") || {};
    const sandboxAccounts = safeArray(data.accounts).filter((account) => account.provider === "Plaid Sandbox" || account.plaidSandbox);
    const sandboxTransactions = safeArray(data.transactions).filter((tx) => tx.source === "Plaid Sandbox" || tx.plaidSandbox);
    const inboxCount = billInboxItems().filter((item) => item.source === "Plaid Sandbox" || item.source === "Plaid recurring detector").length;
    const connected = Boolean(data.settings.plaidSandboxConnected || sandboxAccounts.length || sandboxTransactions.length);
    const lastImport = data.settings.plaidLastImportAt || sync.lastSync || "Not imported yet";
    return `<section class="section-card plaid-foundation-panel">
      <div class="plaid-foundation-copy">
        <span class="round-icon plaid-icon">${icon("wallet")}</span>
        <div>
          <div class="section-title compact-title">
            <h2>Plaid Bank/Card Sync Foundation</h2>
            <span class="status ${connected ? "success" : "warn"}">${connected ? "Sandbox ready" : "Safe test mode"}</span>
          </div>
          <p class="muted">Use this to prove the bank-sync workflow before real credentials touch the app. Sandbox import creates token-style accounts, transactions, and recurring bill candidates for Review Inbox.</p>
        </div>
      </div>
      <div class="plaid-stage-grid">
        <span><strong>${sandboxAccounts.length}</strong><small>linked sandbox accounts</small></span>
        <span><strong>${sandboxTransactions.length}</strong><small>imported transactions</small></span>
        <span><strong>${inboxCount}</strong><small>review candidates</small></span>
        <span><strong>${esc(lastImport)}</strong><small>last Plaid import</small></span>
      </div>
      <div class="plaid-flow">
        ${plaidFlowStep("1", "Link", "Plaid Link opens from BillMaster.")}
        ${plaidFlowStep("2", "Exchange", "Backend trades public token for access token.")}
        ${plaidFlowStep("3", "Pull", "Transactions and balances refresh safely.")}
        ${plaidFlowStep("4", "Review", "Bills/subscriptions wait in Review Inbox.")}
      </div>
      <div class="sheet-actions plaid-actions">
        <button class="primary-btn" data-action="run-plaid-sandbox-import">${icon("cloud")} Run Plaid Sandbox Import</button>
        <button class="outline-btn" data-action="navigate" data-view="inbox">${icon("receipt")} Review imported items</button>
        <button class="outline-btn" data-action="copy-plaid-production-plan">${icon("note")} Copy production plan</button>
      </div>
    </section>`;
  }

  function plaidFlowStep(number, title, copy) {
    return `<div class="plaid-flow-step"><span>${esc(number)}</span><strong>${esc(title)}</strong><small>${esc(copy)}</small></div>`;
  }

  function notificationFoundationPanel(context = "sync") {
    const queued = safeArray(data.notificationLog).filter((notice) => notice.deliveryStatus === "queued");
    const opened = safeArray(data.notificationLog).filter((notice) => notice.deliveryStatus === "opened");
    const sent = safeArray(data.notificationLog).filter((notice) => notice.deliveryStatus === "sent");
    const latest = safeArray(data.notificationLog).slice(0, 8);
    const inboxMode = context === "inbox";
    return `<section class="section-card notification-foundation-panel">
      <div class="section-title">
        <h2>${inboxMode ? "Queued Task Alerts" : "Notification Outbox"}</h2>
        <span class="status ${queued.length ? "warning" : "success"}">${queued.length} ${queued.length === 1 ? "alert" : "alerts"} ready</span>
      </div>
      <p class="muted">${inboxMode ? "When a watched task changes status, BillMaster queues the exact email here." : "Free mode opens a draft in Gmail or your device mail app."} Gmail sends from whichever Google account the user is already signed into. Automatic background sending comes later with a server email provider.</p>
      <div class="notification-stats">
        <span><strong>${queued.length}</strong><small>Queued</small></span>
        <span><strong>${opened.length}</strong><small>Opened</small></span>
        <span><strong>${sent.length}</strong><small>Sent</small></span>
      </div>
      <div class="sheet-actions notification-actions">
        <button class="primary-btn" data-action="send-next-notification-gmail" ${queued.length ? "" : "disabled"}>${icon("mail")} Open next in Gmail</button>
        <button class="outline-btn" data-action="send-next-notification" ${queued.length ? "" : "disabled"}>${icon("bell")} Device mail</button>
        <button class="outline-btn" data-action="copy-notification-outbox" ${latest.length ? "" : "disabled"}>${icon("note")} Copy outbox</button>
        <button class="outline-btn" data-action="clear-sent-notifications" ${sent.length ? "" : "disabled"}>${icon("trash")} Clear sent</button>
      </div>
      ${inboxMode ? `<div class="notification-delivery-steps">
        <span><strong>1</strong> Open Gmail draft</span>
        <span><strong>2</strong> Send from Gmail</span>
        <span><strong>3</strong> Mark sent here</span>
      </div>` : `<div class="roadmap-grid compact-roadmap">
        ${syncRoadmapStep("1", "Gmail first", "Open prefilled Gmail drafts from the signed-in user's Gmail account.")}
        ${syncRoadmapStep("2", "Email-to-text", "Store carrier gateway addresses for free text-style alerts where available.")}
        ${syncRoadmapStep("3", "Server send later", "Use Resend/SendGrid or Gmail API after OAuth and consent are ready.")}
      </div>`}
      ${latest.length ? `<div class="notification-list">${latest.map((notice) => notificationNoticeRow(notice)).join("")}</div>` : `<div class="empty-state compact-empty">${icon("bell")}<h3>No alerts yet</h3><p>When a watched task changes status, BillMaster will place the email here.</p></div>`}
    </section>`;
  }

  function notificationNoticeRow(notice) {
    const recipients = safeArray(notice.recipients);
    const statusClass = notice.deliveryStatus === "sent" ? "success" : notice.deliveryStatus === "opened" ? "info" : notice.deliveryStatus === "error" ? "danger" : "warning";
    return `<article class="notification-row">
      <span class="round-icon">${icon("bell")}</span>
      <div class="notification-main">
        <div class="card-row">
          <strong>${esc(notice.taskTitle)}</strong>
          <span class="status ${statusClass}">${esc(notificationStatusLabel(notice.deliveryStatus))}</span>
        </div>
        <div class="subtle">${esc(notice.previousStatus || "Unknown")} -> ${esc(notice.status || "Updated")} | ${esc(notificationChannelLabel(notice.channels))}</div>
        <div class="subtle">Queued ${esc(notificationQueuedLabel(notice.createdAt))}${notice.openedAt ? ` | Opened ${esc(notificationQueuedLabel(notice.openedAt))}` : ""}${notice.sentAt ? ` | Sent ${esc(notificationQueuedLabel(notice.sentAt))}` : ""}</div>
        <div class="subtle">${esc(recipients.slice(0, 3).join(", ") || "No recipients")}${recipients.length > 3 ? ` +${recipients.length - 3} more` : ""}</div>
      </div>
      <div class="notification-row-actions">
        <button class="primary-btn" data-action="send-notification-gmail" data-id="${esc(notice.id)}" ${recipients.length ? "" : "disabled"}>${icon("mail")} Gmail</button>
        <button class="outline-btn" data-action="send-notification" data-id="${esc(notice.id)}" ${recipients.length ? "" : "disabled"}>${icon("mail")} Open</button>
        <button class="outline-btn" data-action="copy-notification" data-id="${esc(notice.id)}">${icon("note")} Copy</button>
        <button class="success-btn" data-action="mark-notification-sent" data-id="${esc(notice.id)}">${icon("check")} Sent</button>
      </div>
    </article>`;
  }

  function backupSafetyPanel() {
    const counts = workspaceSummaryCounts();
    const due = backupReminderDue();
    const frequency = data.settings?.backupFrequency || "weekly";
    const buttons = ["off", "daily", "weekly", "monthly"].map((value) => (
      `<button class="${frequency === value ? "active" : ""}" data-action="set-backup-frequency" data-value="${esc(value)}">${esc(backupFrequencyLabel(value))}</button>`
    )).join("");
    return `<section class="section-card backup-safety-panel">
      <div class="backup-safety-head">
        <span class="round-icon backup-icon">${icon("cloud")}</span>
        <div>
          <div class="section-title compact-title"><h2>Backup & Restore</h2><span class="status ${due ? "warn" : "success"}">${due ? "Backup due" : "Protected"}</span></div>
          <p class="muted">Download a BillMaster backup file you can save to Google Drive. If anything gets erased, import this file and restore your workspace.</p>
        </div>
      </div>
      <div class="backup-status-grid">
        ${backupStat("Tasks", counts.tasks)}
        ${backupStat("Notes", counts.notes)}
        ${backupStat("Loans", counts.loans)}
        ${backupStat("Contacts", counts.contacts)}
        ${backupStat("Addresses", counts.addresses)}
        ${backupStat("Goals", counts.goals)}
      </div>
      <div class="backup-frequency-row">
        <div><strong>Timed backup reminder</strong><small>${esc(backupFrequencyCopy(frequency))}</small></div>
        <div class="backup-frequency-buttons">${buttons}</div>
      </div>
      <div class="backup-latest-grid">
        <span><strong>${esc(backupTimeLabel(data.settings?.backupLastExportAt))}</strong><small>last backup</small></span>
        <span><strong>${esc(data.settings?.backupLastExportName || "No file yet")}</strong><small>last file</small></span>
        <span><strong>${esc(backupTimeLabel(data.settings?.backupLastRestoreAt))}</strong><small>last restore</small></span>
      </div>
      <div class="sheet-actions backup-actions">
        <button class="primary-btn" data-action="download-data">${icon("note")} Download backup</button>
        <button class="outline-btn" data-action="download-drive-backup">${icon("cloud")} Google Drive file</button>
        <button class="outline-btn" data-action="import-backup-file">${icon("folder")} Import / restore</button>
      </div>
    </section>`;
  }

  function backupStat(label, value) {
    return `<span class="backup-stat"><strong>${esc(value)}</strong><small>${esc(label)}</small></span>`;
  }

  function liveDataSafetyPanel() {
    const signedIn = cloudSignedIn();
    const autoOn = cloudAutoSyncEnabled();
    const firstSync = Boolean(data.settings?.cloudLastSyncAt);
    const backupMade = Boolean(data.settings?.backupLastExportAt);
    const backupFresh = backupMade && !backupReminderDue();
    const checks = [
      {
        label: "Cloud account",
        ready: signedIn,
        detail: signedIn ? cloudSafeEmail() : "Sign in before entering live work."
      },
      {
        label: "First save synced",
        ready: firstSync,
        detail: firstSync ? `Synced ${cloudTimeLabel(data.settings.cloudLastSyncAt)}` : "Run Smart merge once after sign-in."
      },
      {
        label: "Auto sync",
        ready: autoOn,
        detail: autoOn ? "New saves can follow your phone, iPad, and desktop." : "Turn on after the first clean merge."
      },
      {
        label: "Backup file",
        ready: backupFresh,
        detail: backupMade ? `Last backup ${backupTimeLabel(data.settings.backupLastExportAt)}` : "Download one backup before heavy live work."
      }
    ];
    const ready = checks.filter((item) => item.ready).length;
    const allReady = ready === checks.length;
    const statusClass = allReady ? "success" : ready >= 2 ? "warn" : "danger";
    const statusLabel = allReady ? "Live-work ready" : `${ready}/${checks.length} ready`;
    const nextStep = !signedIn
      ? "Sign in or create your BillMaster cloud account."
      : !firstSync
        ? "Run Smart merge so the cloud gets this workspace."
        : !autoOn
          ? "Turn Auto On when the merge looks right."
          : !backupFresh
            ? "Download a fresh backup file."
            : "You can start entering real personal data with more confidence.";
    return `<section class="section-card live-data-safety-panel">
      <div class="live-data-safety-head">
        <span class="round-icon live-data-safety-icon">${icon(allReady ? "check" : "alert")}</span>
        <div>
          <div class="section-title compact-title"><h2>Live Data Safety Check</h2><span class="status ${statusClass}">${esc(statusLabel)}</span></div>
          <p class="muted">Use this before entering real work. It shows whether your data can be saved, synced to another device, and restored from a backup.</p>
        </div>
      </div>
      <div class="live-data-safety-steps">
        ${checks.map((item) => liveDataSafetyStep(item)).join("")}
      </div>
      <div class="live-data-next-step">
        <strong>${icon("start")} Next best move</strong>
        <span>${esc(nextStep)}</span>
      </div>
      <div class="sheet-actions live-data-actions">
        ${signedIn ? `<button class="primary-btn" data-action="cloud-smart-merge">${icon("cloud")} Smart merge</button>` : `<button class="primary-btn" data-action="open-modal" data-modal="${cloudConfigured() ? "cloudAuth" : "cloudSetup"}">${icon(cloudConfigured() ? "home" : "settings")} ${cloudConfigured() ? "Sign in" : "Setup cloud"}</button>`}
        <button class="outline-btn" data-action="toggle-cloud-auto-sync" ${signedIn ? "" : "disabled"}>${icon(autoOn ? "check" : "settings")} Auto ${autoOn ? "On" : "Off"}</button>
        <button class="outline-btn" data-action="download-drive-backup">${icon("cloud")} Backup file</button>
        <button class="outline-btn" data-action="copy-friend-alpha-link">${icon("note")} Copy live link</button>
      </div>
    </section>`;
  }

  function liveDataSafetyStep(item) {
    return `<div class="live-data-safety-step ${item.ready ? "is-ready" : ""}">
      <span>${icon(item.ready ? "check" : "alert")}</span>
      <div>
        <strong>${esc(item.label)}</strong>
        <small>${esc(item.detail)}</small>
      </div>
    </div>`;
  }

  function cloudWorkspacePanel() {
    const configured = cloudConfigured();
    const signedIn = cloudSignedIn();
    const hasProject = cloudHasProjectUrl();
    const hasConflict = Boolean(data.settings?.cloudSyncConflictAt);
    const lastSync = data.settings?.cloudLastSyncAt ? `${dateLabel(data.settings.cloudLastSyncAt.slice(0, 10))} ${new Date(data.settings.cloudLastSyncAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Not synced yet";
    const syncState = data.settings?.cloudSyncState || "idle";
    const syncMessage = data.settings?.cloudSyncMessage || (signedIn ? "BillMaster is ready to sync this workspace across your devices." : "Sign in to begin syncing this workspace.");
    const setupCopy = signedIn
      ? "You are connected. Auto sync merges saved items by ID, so tasks, notes, loans, addresses, projects, and other records can sync across devices."
      : configured
        ? "Cloud is ready. Sign in or create an account, then pull your workspace on another device."
        : hasProject
          ? "The Supabase project URL is already built in. Add the public publishable key once to unlock friend sign-in."
          : "First cloud-sync step: save this full BillMaster workspace to your private Supabase account, then pull it on another device.";
    const conflictCopy = data.settings?.cloudSyncConflictMessage || "This device and the cloud both changed. Pull cloud to keep the cloud version, or force push to overwrite it with this device.";
    return `<section class="section-card cloud-workspace-panel">
      <div class="cloud-workspace-head">
        <span class="round-icon" style="color:${signedIn ? "var(--green)" : configured ? "var(--blue)" : "var(--amber)"};background:${signedIn ? "#e9f8ef" : configured ? "#eaf4ff" : "#fff5d6"}">${icon(signedIn ? "check" : configured ? "settings" : "alert")}</span>
        <div>
          <div class="section-title compact-title"><h2>Supabase Cloud Workspace</h2><span class="status ${cloudStatusClass()}">${cloudStatusLabel()}</span></div>
          <p class="muted">${esc(setupCopy)}</p>
        </div>
      </div>
      <div class="cloud-facts">
        <span><strong>Project</strong><small>${hasProject ? esc(cloudProjectHost()) : "Add Supabase URL"}</small></span>
        <span><strong>Account</strong><small>${esc(cloudSafeEmail())}</small></span>
        <span><strong>Last sync</strong><small>${esc(lastSync)}</small></span>
        <span><strong>Mode</strong><small>${esc(cloudAutoSyncLabel())}</small></span>
      </div>
      <details class="cloud-advanced-facts">
        <summary>${icon("settings")} More sync details</summary>
        <div class="cloud-facts">
        <span><strong>Next</strong><small>${esc(cloudNextActionLabel())}</small></span>
        <span><strong>Last push</strong><small>${esc(cloudTimeLabel(data.settings?.cloudLastPushedAt))}</small></span>
        <span><strong>Last pull</strong><small>${esc(cloudTimeLabel(data.settings?.cloudLastPulledAt))}</small></span>
        <span><strong>Last check</strong><small>${esc(cloudTimeLabel(data.settings?.cloudLastAutoCheckAt))}</small></span>
        <span><strong>Setup test</strong><small>${esc(cloudSetupTestLabel())}</small></span>
        </div>
      </details>
      <div class="cloud-sync-status-line ${cloudSyncStateClass(syncState)}">
        <span>${icon(cloudSyncStateClass(syncState) === "danger" ? "alert" : cloudSyncStateClass(syncState) === "success" ? "check" : "settings")}</span>
        <div><strong>${esc(cloudSyncStateLabel(syncState))}</strong><small>${esc(syncMessage)}</small></div>
      </div>
      ${hasConflict ? `<div class="sync-conflict-banner">
        <strong>${icon("alert")} Sync needs your choice</strong>
        <span>${esc(conflictCopy)}</span>
      </div>` : ""}
      <div class="sheet-actions cloud-actions">
        <button class="outline-btn" data-action="open-modal" data-modal="cloudSetup">${icon("settings")} ${hostedCloudConfigStarted() ? "Advanced setup" : "Setup"}</button>
        ${signedIn ? `<button class="outline-btn" data-action="cloud-sign-out">${icon("close")} Sign out</button>` : `<button class="primary-btn" data-action="open-modal" data-modal="cloudAuth" ${configured ? "" : "disabled"}>${icon("home")} Sign in</button>`}
        <button class="primary-btn" data-action="cloud-smart-merge" ${signedIn ? "" : "disabled"}>${icon("cloud")} Smart merge now</button>
        <button class="secondary-btn" data-action="cloud-push-workspace" ${signedIn ? "" : "disabled"}>${icon("wallet")} Push local</button>
        ${hasConflict ? `<button class="danger-soft-btn" data-action="cloud-force-push-workspace" ${signedIn ? "" : "disabled"}>${icon("alert")} Force push</button>` : ""}
        <button class="outline-btn" data-action="cloud-pull-workspace" ${signedIn ? "" : "disabled"}>${icon("note")} Pull cloud</button>
        <button class="outline-btn" data-action="toggle-cloud-auto-sync" ${signedIn ? "" : "disabled"}>${icon(cloudAutoSyncEnabled() ? "check" : "settings")} Auto ${cloudAutoSyncEnabled() ? "On" : "Off"}</button>
      </div>
    </section>`;
  }

  function friendAlphaLaunchPanel() {
    const checks = [
      { label: "Supabase project URL", ready: cloudHasProjectUrl(), detail: cloudHasProjectUrl() ? cloudProjectHost() : "Add project URL" },
      { label: "Publishable key", ready: Boolean(cloudConfig.anonKey), detail: cloudConfig.anonKey ? "Browser can sign in" : "Paste full key into billmaster-config.js" },
      { label: "Live setup test", ready: cloudSetupTestReady(), detail: cloudSetupTestReady() ? cloudSetupTestLabel() : (data.settings?.cloudLastSetupTestMessage || "Run Add / test key before inviting friends") },
      { label: "BillMaster account", ready: cloudSignedIn(), detail: cloudSignedIn() ? cloudSafeEmail() : "Create or sign in from Sync Center" },
      { label: "First cloud workspace", ready: Boolean(data.settings?.cloudLastSyncAt), detail: data.settings?.cloudLastSyncAt ? `Synced ${dateLabel(data.settings.cloudLastSyncAt.slice(0, 10))}` : "Sign in, save one item, then Smart merge once" },
      { label: "Auto sync", ready: cloudAutoSyncEnabled(), detail: cloudAutoSyncEnabled() ? "Pushes local saves first, then pulls newer cloud changes" : "Turn on after the first successful Smart merge" },
      { label: "Safe alpha scope", ready: true, detail: "Tasks, notes, habits, loans, contacts, pictures, and manual finance only" }
    ];
    const ready = checks.filter((item) => item.ready).length;
    const keyMissing = cloudHasProjectUrl() && !cloudConfig.anonKey;
    const title = ready >= checks.length ? "Ready For Friend Alpha" : "Friend Alpha Launchpad";
    const copy = keyMissing
      ? "The only hard blocker is the Supabase publishable key. Once it is in the hosted config, the sign-in flow can be tested from your phone and iPad."
      : "Use this as the go/no-go board before inviting friends. Every green item means one less thing that can confuse someone testing BillMaster.";
    const stage = ready >= checks.length ? "Friend-ready alpha" : ready >= checks.length - 1 ? "Almost friend-ready" : "Personal cloud beta";
    const nextAction = friendAlphaNextAction(checks);
    return `<section class="section-card friend-alpha-panel">
      <div class="friend-alpha-head">
        <div>
          <div class="section-title compact-title"><h2>${esc(title)}</h2><span class="status ${ready >= checks.length ? "success" : keyMissing ? "warn" : "info"}">${ready}/${checks.length} ready</span></div>
          <p class="muted">${esc(copy)}</p>
        </div>
        <div class="friend-alpha-score">${ready}<span>of ${checks.length}</span></div>
      </div>
      <div class="friend-alpha-stage">
        <span class="round-icon">${icon(ready >= checks.length ? "check" : "settings")}</span>
        <div>
          <strong>${esc(stage)}</strong>
          <small>${esc(nextAction)}</small>
        </div>
      </div>
      <div class="friend-alpha-checks">
        ${checks.map((item) => `<div class="friend-alpha-check ${item.ready ? "is-ready" : ""}">
          <span>${icon(item.ready ? "check" : "alert")}</span>
          <strong>${esc(item.label)}</strong>
          <small>${esc(item.detail)}</small>
        </div>`).join("")}
      </div>
      <div class="friend-alpha-script">
        <div>
          <strong>First tester script</strong>
          <span>Sign in, add one task, add one note, add one loan, upload one picture, wait for Auto Sync, reload, then check another device.</span>
        </div>
        <div>
          <strong>Keep off for alpha</strong>
          <span>No real bank/card sync, no real bill pay, no direct cancellation APIs yet.</span>
        </div>
        <div>
          <strong>What feedback means most</strong>
          <span>Could they find things, save things, sync things, and understand what BillMaster helps them decide?</span>
        </div>
        <div>
          <strong>After they test</strong>
          <span>Ask for device, what broke, what confused them, what felt fast, and what money decision they wanted help making.</span>
        </div>
      </div>
      <div class="sheet-actions friend-alpha-actions">
        <button class="outline-btn" data-action="open-modal" data-modal="cloudSetup">${icon("settings")} Add / test key</button>
        <button class="outline-btn" data-action="copy-hosted-cloud-config" ${cloudConfigured() ? "" : "disabled"}>${icon("note")} Copy config</button>
        <button class="outline-btn" data-action="copy-friend-alpha-link">${icon("playcard")} Copy live link</button>
        <button class="outline-btn" data-action="copy-friend-alpha-invite" ${ready >= checks.length ? "" : "disabled"}>${icon("mail")} Copy invite</button>
        <button class="outline-btn" data-action="copy-friend-alpha-script">${icon("check")} Copy test script</button>
        <button class="outline-btn" data-action="copy-friend-feedback-request">${icon("note")} Copy feedback ask</button>
        <a class="outline-btn" href="${esc(friendAlphaHostedUrl())}" target="_blank" rel="noopener">${icon("home")} Open live app</a>
        <button class="primary-btn" data-action="open-modal" data-modal="cloudAuth" ${cloudConfigured() ? "" : "disabled"}>${icon("home")} Sign in</button>
        <button class="primary-btn" data-action="cloud-smart-merge" ${cloudSignedIn() ? "" : "disabled"}>${icon("cloud")} Smart merge</button>
        <button class="secondary-btn" data-action="cloud-push-workspace" ${cloudSignedIn() ? "" : "disabled"}>${icon("wallet")} Push local</button>
        <button class="outline-btn" data-action="cloud-pull-workspace" ${cloudSignedIn() ? "" : "disabled"}>${icon("note")} Pull cloud</button>
      </div>
    </section>`;
  }

  function friendAlphaNextAction(checks) {
    const missing = checks.find((item) => !item.ready);
    if (!missing) {
      return "Ready for one trusted tester. Watch their first session, keep bank/card sync off, and ask them to save one task, note, loan, and picture.";
    }
    if (missing.label === "Supabase project URL" || missing.label === "Publishable key") {
      return "Finish cloud setup first: add the Supabase project URL and publishable key, then test sign-in from the hosted app.";
    }
    if (missing.label === "BillMaster account") {
      return "Sign into your own BillMaster cloud account before inviting anyone else.";
    }
    if (missing.label === "First cloud workspace") {
      return "Save one real item, then run Smart Merge once so this device has a first cloud workspace.";
    }
    if (missing.label === "Auto sync") {
      return "Turn Auto Sync on after one good push/pull so phone, iPad, and desktop stay caught up without manual buttons.";
    }
    return "Finish the remaining yellow item before giving the link to someone who is not sitting beside you.";
  }

  function friendAlphaHostedUrl() {
    const liveUrl = `https://marksman2g.github.io/billmaster/?v=${FRIEND_ALPHA_CACHE_VERSION}`;
    if (typeof location === "undefined") return liveUrl;
    const localHost = /^(127\.0\.0\.1|localhost)$/i.test(location.hostname || "");
    if (localHost || location.protocol === "file:") return liveUrl;
    return `${location.origin}${location.pathname}?v=${FRIEND_ALPHA_CACHE_VERSION}`;
  }

  function friendMobileReadyPanel() {
    const signedIn = cloudSignedIn();
    const autoOn = cloudAutoSyncEnabled();
    const lastSync = data.settings?.cloudLastSyncAt ? cloudTimeLabel(data.settings.cloudLastSyncAt) : "Not synced yet";
    const steps = [
      { label: "Sign in", ready: signedIn, detail: signedIn ? cloudSafeEmail() : "Create or use a BillMaster account" },
      { label: "Save one item", ready: Boolean(data.settings?.cloudLastSyncAt), detail: "Task, note, loan, or address" },
      { label: "Auto sync", ready: autoOn, detail: autoOn ? "Watching this device" : "Turn on after a good push/pull" },
      { label: "Phone/iPad check", ready: signedIn && Boolean(data.settings?.cloudLastPulledAt || data.settings?.cloudLastSyncAt), detail: "Open live app, sign in, confirm same item" }
    ];
    return `<section class="section-card friend-mobile-panel">
      <div class="section-title compact-title">
        <h2>Phone/iPad Friend Test</h2>
        <span class="status ${signedIn && autoOn ? "success" : signedIn ? "info" : "warning"}">${esc(cloudSyncStateLabel(data.settings?.cloudSyncState || "idle"))}</span>
      </div>
      <p class="muted">Use this quick pass before handing BillMaster to a friend. The tester should always know who is signed in, whether auto-sync is on, and when the last save reached the cloud.</p>
      <div class="friend-mobile-status">
        <span><strong>Private account</strong><small>${esc(signedIn ? cloudSafeEmail() : "Not signed in")}</small></span>
        <span><strong>Auto sync</strong><small>${esc(autoOn ? "On - saved changes are watched" : "Off - manual push/pull")}</small></span>
        <span><strong>Last cloud save</strong><small>${esc(lastSync)}</small></span>
      </div>
      <div class="friend-mobile-steps">
        ${steps.map((item, index) => `<div class="${item.ready ? "is-ready" : ""}">
          <strong>${index + 1}. ${esc(item.label)}</strong>
          <small>${esc(item.detail)}</small>
        </div>`).join("")}
      </div>
      <div class="friend-mobile-script">
        <strong>Five-minute phone test:</strong>
        <span>Open Dashboard, Calendar Day, Block, Tasks, Notes, Projects, Goals, Lending, and Sync Center. Nothing should spill off the screen, buttons should be tappable, and Sync Center should say whether the data is saved.</span>
      </div>
    </section>`;
  }

  function friendPrivacyGatePanel() {
    const setupReady = cloudSetupTestReady();
    const checks = [
      { label: "Separate account", ready: cloudSignedIn(), detail: cloudSignedIn() ? `This device is signed in as ${cloudSafeEmail()}.` : "Each friend must create their own BillMaster account." },
      { label: "Private workspace row", ready: setupReady, detail: setupReady ? "Supabase Row Level Security uses auth.uid() = user_id for each workspace." : "Run Add / test key after supabase/schema.sql is applied." },
      { label: "Private picture folders", ready: setupReady, detail: setupReady ? "Media policies keep uploads inside each user's Supabase user-id folder." : "Run the latest schema and setup test before picture testing." },
      { label: "No live bank credentials", ready: true, detail: "Alpha testers should only use manual finance data until bank/card sync is production-ready." },
      { label: "First tester watched", ready: false, detail: "Invite one trusted person first and watch where they get confused." }
    ];
    const ready = checks.filter((item) => item.ready).length;
    return `<section class="section-card friend-privacy-panel">
      <div class="section-title compact-title">
        <h2>Friend Safety Gate</h2>
        <span class="status ${ready >= checks.length - 1 ? "success" : "info"}">${ready}/${checks.length} checks</span>
      </div>
      <p class="muted">This is the guardrail for letting friends test BillMaster. The goal is simple: every friend gets their own private cloud workspace, pictures stay private, and nobody enters real bank/card credentials during alpha.</p>
      <div class="friend-safety-grid">
        ${checks.map((item) => `<div class="friend-safety-item ${item.ready ? "is-ready" : "is-watch"}">
          <span>${icon(item.ready ? "check" : "alert")}</span>
          <div>
            <strong>${esc(item.label)}</strong>
            <small>${esc(item.detail)}</small>
          </div>
        </div>`).join("")}
      </div>
      <div class="friend-safety-flow">
        <span><strong>1</strong><small>Friend opens live app</small></span>
        <span><strong>2</strong><small>Creates their own account</small></span>
        <span><strong>3</strong><small>Starts clean or imports their own data</small></span>
        <span><strong>4</strong><small>Auto sync follows only their account</small></span>
      </div>
      <div class="sheet-actions friend-alpha-actions">
        <button class="outline-btn" data-action="copy-friend-safety-checklist">${icon("note")} Copy safety checklist</button>
        <button class="outline-btn" data-action="open-modal" data-modal="cloudAuth" ${cloudConfigured() ? "" : "disabled"}>${icon("home")} Test clean sign-in</button>
        <a class="primary-btn" href="${esc(friendAlphaHostedUrl())}" target="_blank" rel="noopener">${icon("playcard")} Open live tester app</a>
      </div>
    </section>`;
  }

  function friendAlphaOnboardingPanel() {
    const signedIn = cloudSignedIn();
    const hasSynced = Boolean(data.settings?.cloudLastSyncAt);
    return `<section class="section-card friend-onboarding-panel">
      <div class="section-title compact-title">
        <h2>Friend Alpha Onboarding</h2>
        <span class="status ${signedIn && hasSynced ? "success" : "info"}">${signedIn && hasSynced ? "Ready to rehearse" : "Script ready"}</span>
      </div>
      <p class="muted">This is the simple walkthrough for the first friend test. It keeps the tester focused on useful, safe actions and keeps BillMaster aimed at becoming a financial command center.</p>
      <div class="friend-onboarding-steps">
        <span><strong>1</strong><small>Create their own account</small></span>
        <span><strong>2</strong><small>Add safe sample data</small></span>
        <span><strong>3</strong><small>Refresh and sync</small></span>
        <span><strong>4</strong><small>Say what helped or confused them</small></span>
      </div>
      <div class="friend-onboarding-rules">
        <div><strong>Do</strong><small>Tasks, notes, habits, loans, contacts, addresses, pictures, and manual finance.</small></div>
        <div><strong>Do Not</strong><small>Real bank passwords, full card numbers, real bill pay, or direct subscription cancellation yet.</small></div>
        <div><strong>Ask</strong><small>Could this help you make a better money decision this week?</small></div>
      </div>
      <div class="sheet-actions friend-alpha-actions">
        <button class="primary-btn" data-action="open-modal" data-modal="friendOnboarding">${icon("check")} Open walkthrough</button>
        <button class="outline-btn" data-action="copy-friend-onboarding">${icon("note")} Copy quick start</button>
        <a class="outline-btn" href="${esc(friendAlphaHostedUrl())}" target="_blank" rel="noopener">${icon("playcard")} Open live app</a>
      </div>
    </section>`;
  }

  function friendAlphaFeedbackPanel() {
    const feedback = safeArray(data.alphaFeedback);
    const rated = feedback.filter((item) => Number(item.rating));
    const average = rated.length ? (rated.reduce((sum, item) => sum + Number(item.rating || 0), 0) / rated.length).toFixed(1) : "0.0";
    const latest = feedback.slice(0, 3);
    return `<section class="section-card alpha-feedback-panel">
      <div class="section-title compact-title">
        <h2>Alpha Feedback</h2>
        <span class="status ${feedback.length ? "success" : "info"}">${feedback.length} saved</span>
      </div>
      <p class="muted">Capture what friends actually feel while testing BillMaster. The most important question is whether the app helped them make, organize, or imagine a better financial decision.</p>
      <div class="alpha-feedback-summary">
        <span><strong>${feedback.length}</strong><small>Total notes</small></span>
        <span><strong>${average}</strong><small>Avg rating</small></span>
        <span><strong>${feedback.filter((item) => String(item.moneyDecision || "").trim()).length}</strong><small>Money insights</small></span>
      </div>
      ${latest.length ? `<div class="alpha-feedback-list">${latest.map((item) => alphaFeedbackCard(item)).join("")}</div>` : `<div class="empty-state compact-empty">${icon("note")}<h3>No feedback yet</h3><p>After a friend test, save what helped, what confused them, and what money decision they wanted help with.</p></div>`}
      <div class="sheet-actions friend-alpha-actions">
        <button class="primary-btn" data-action="open-modal" data-modal="friendFeedback">${icon("plus")} Add feedback</button>
        <button class="outline-btn" data-action="copy-friend-feedback-request">${icon("note")} Copy feedback request</button>
        <button class="outline-btn" data-action="email-friend-feedback-request">${icon("mail")} Email request</button>
        <button class="outline-btn" data-action="copy-alpha-feedback" ${feedback.length ? "" : "disabled"}>${icon("note")} Copy feedback</button>
      </div>
    </section>`;
  }

  function alphaFeedbackCard(item) {
    const created = item.createdAt ? dateLabel(String(item.createdAt).slice(0, 10)) : "Recent";
    const decision = item.moneyDecision || item.nextFeature || item.helped || item.confused || "No detail yet.";
    return `<article class="alpha-feedback-card">
      <div class="card-row">
        <strong>${esc(item.tester || "Friend tester")}</strong>
        <span class="status info">${Number(item.rating || 0) || "-"} / 5</span>
      </div>
      <div class="subtle">${esc(item.device || "Device not listed")} | ${esc(created)}</div>
      <p>${esc(decision)}</p>
    </article>`;
  }

  function alphaFeedbackText() {
    const feedback = safeArray(data.alphaFeedback);
    if (!feedback.length) return "No BillMaster alpha feedback saved yet.";
    return feedback.map((item, index) => [
      `Feedback ${index + 1}`,
      `Tester: ${item.tester || "Friend tester"}`,
      `Device: ${item.device || "Not listed"}`,
      `Rating: ${item.rating || "-"} / 5`,
      `Confused: ${item.confused || "-"}`,
      `Helpful: ${item.helped || "-"}`,
      `Money decision: ${item.moneyDecision || "-"}`,
      `Next feature: ${item.nextFeature || "-"}`,
      `Saved: ${item.createdAt || "-"}`
    ].join("\n")).join("\n\n");
  }

  function friendAlphaInviteText() {
    return [
      "BillMaster Friend Alpha Invite",
      "",
      "I am testing BillMaster as a personal financial command center. It helps organize tasks, habits, bills, loans, notes, contacts, addresses, pictures, and manual money tracking in one place.",
      "",
      `Open it here: ${friendAlphaHostedUrl()}`,
      "",
      "Please create your own BillMaster account, then try:",
      "1. Add one task with a date and time.",
      "2. Add one note or notebook.",
      "3. Add one loan or manual transaction.",
      "4. Add one contact/address if you are comfortable.",
      "5. Reload the app and confirm your information is still there.",
      "6. If you use another device, sign in there and confirm your data follows you.",
      "",
      "Important: this is an alpha test. Do not enter sensitive bank passwords, card numbers, or private financial details yet. Bank/card sync, real bill pay, and automatic cancellation are future production features.",
      "",
      "Most useful feedback: What confused you? What felt fast? What financial decision would you want BillMaster to help you make next?"
    ].join("\n");
  }

  function friendAlphaTestScriptText() {
    return [
      "BillMaster Friend Alpha Test Script",
      "",
      "Goal: prove a friend can sign in, save useful data, sync across devices, and understand the financial command-center direction.",
      "",
      "Setup checks:",
      "- Supabase project URL is configured.",
      "- Publishable key is configured.",
      "- User can create/sign into a BillMaster account.",
      "- First cloud workspace has been pushed.",
      "- Auto sync is on.",
      "",
      "Tester actions:",
      "1. Open the live app.",
      "2. Create a BillMaster account.",
      "3. Add a task with title, date, start time, end time, category, and status.",
      "4. Add a note and assign it to a notebook.",
      "5. Add a manual loan or manual income/expense item.",
      "6. Add a contact and address if comfortable.",
      "7. Upload or link one picture.",
      "8. Refresh the browser and confirm the data stayed.",
      "9. Sign in on another device and confirm the data appears.",
      "",
      "Do not test yet:",
      "- Real bank/card passwords.",
      "- Real bill payments.",
      "- Direct subscription cancellation.",
      "",
      "Feedback questions:",
      "- Could you find the main areas?",
      "- Did saving feel obvious?",
      "- Did sync make sense?",
      "- What would help you make better money decisions from this app?"
    ].join("\n");
  }

  function friendAlphaFeedbackRequestText() {
    return [
      "BillMaster Alpha Feedback Request",
      "",
      "Thank you for testing BillMaster. Please reply with short answers. Honest feedback helps more than polite feedback.",
      "",
      `App link: ${friendAlphaHostedUrl()}`,
      "",
      "1. What device did you use?",
      "2. Could you create an account and sign in?",
      "3. What did you try first?",
      "4. Did your task, note, loan, picture, or contact save after refresh?",
      "5. Did anything disappear, duplicate, freeze, or feel confusing?",
      "6. What felt fast or useful?",
      "7. What financial decision would you want BillMaster to help you make?",
      "8. What is the one thing that would make you keep using it?",
      "",
      "Please do not enter real bank passwords, full card numbers, or real bill-pay information yet. This alpha is for workflow, organization, sync, notes, tasks, habits, loans, addresses, and manual finance testing."
    ].join("\n");
  }

  function friendSafetyChecklistText() {
    return [
      "BillMaster Friend Safety Checklist",
      "",
      "Purpose: let trusted friends test BillMaster without mixing their data with mine or entering sensitive bank information too early.",
      "",
      "Before inviting:",
      "1. Confirm the hosted app opens.",
      "2. Confirm Supabase project URL and publishable key are configured.",
      "3. Confirm a new user can create their own BillMaster account.",
      "4. Confirm a new user can save data, refresh, and still see it.",
      "5. Confirm a second device can sign into that same account and pull/sync the same workspace.",
      "",
      "Privacy rules:",
      "- Every friend uses their own email and BillMaster password.",
      "- Do not share my account with friends.",
      "- Do not enter real bank passwords, full card numbers, or real bill-payment credentials in alpha.",
      "- Pictures should be uploaded only after the user is signed in, so they belong to that user's private media folder.",
      "",
      "First friend test:",
      "- Watch one person use it first.",
      "- Ask what confused them.",
      "- Ask what helped them make a financial decision.",
      "- Fix the top 3 confusing points before inviting more people.",
      "",
      "Friend-ready means:",
      "- Separate accounts work.",
      "- Data persists after refresh.",
      "- Phone/iPad/desktop sync works.",
      "- The tester understands what not to use yet: bank sync, bill pay, direct cancellation."
    ].join("\n");
  }

  function friendOnboardingQuickStartText() {
    return [
      "BillMaster Friend Alpha Quick Start",
      "",
      "Goal: test whether BillMaster is easy to use, saves your information, syncs across devices, and helps you make better financial decisions.",
      "",
      "What to test:",
      "1. Open the live app: " + friendAlphaHostedUrl(),
      "2. Create your own BillMaster account with your own email.",
      "3. Add one task with a date, start time, end time, and address.",
      "4. Add one note or notebook picture.",
      "5. Add one safe sample loan or manual money item.",
      "6. Refresh the app and confirm your data is still there.",
      "7. If you have another device, sign in there and confirm your data appears.",
      "",
      "What not to test yet:",
      "- Do not enter real bank passwords.",
      "- Do not enter full real card numbers.",
      "- Do not attempt real bill pay.",
      "- Do not rely on subscription cancellation as final yet.",
      "",
      "Feedback I need:",
      "- What was confusing?",
      "- What felt fast?",
      "- What felt unsafe or unclear?",
      "- What financial decision could this help you make this week?",
      "- What feature would make you want to keep using it?"
    ].join("\n");
  }

  function mobileCodexAccessPanel() {
    return `<section class="section-card mobile-codex-panel">
      <div class="mobile-codex-copy">
        <span class="round-icon" style="color:var(--purple);background:#f0edff">${icon("settings")}</span>
        <div>
          <div class="section-title compact-title"><h2>Codex Mobile & Cloud Workbench</h2><span class="status info">Phone/iPad path</span></div>
          <p class="muted">Use the hosted app for real BillMaster access, GitHub or Codespaces for cloud editing, and ChatGPT mobile Codex when it is available on your account.</p>
        </div>
      </div>
      <div class="cloud-facts mobile-codex-facts">
        <span><strong>Use app</strong><small>GitHub Pages + Supabase sign-in</small></span>
        <span><strong>Edit app</strong><small>GitHub.dev or Codespaces</small></span>
        <span><strong>Preview</strong><small>node scripts/serve-billmaster.js --port 4176</small></span>
        <span><strong>Limit</strong><small>Windows host still needs cloud workaround</small></span>
      </div>
      <div class="sheet-actions cloud-actions mobile-codex-actions">
        <a class="outline-btn" href="https://github.com/marksman2g/billmaster" target="_blank" rel="noopener">${icon("note")} Repo</a>
        <a class="outline-btn" href="https://github.dev/marksman2g/billmaster" target="_blank" rel="noopener">${icon("settings")} Web editor</a>
        <a class="outline-btn" href="https://github.com/codespaces" target="_blank" rel="noopener">${icon("home")} Codespaces</a>
        <button class="primary-btn" data-action="navigate-root" data-view="dashboard">${icon("playcard")} Use BillMaster</button>
      </div>
    </section>`;
  }

  function mediaStoragePanel() {
    const stats = mediaPortabilityStats();
    const statusClass = stats.localData ? "warn" : stats.cloudStorage ? "success" : stats.total ? "success" : "info";
    const statusLabel = stats.localData
      ? `${stats.localData} local upload${stats.localData === 1 ? "" : "s"}`
      : stats.cloudStorage
        ? "Cloud-backed"
        : stats.total
          ? "Portable"
          : "No media yet";
    const rows = stats.byCollection
      .filter((item) => item.total)
      .slice(0, 8)
      .map((item) => `<span><strong>${esc(item.label)}</strong><small>${item.total} image${item.total === 1 ? "" : "s"} | ${item.localData} local | ${item.cloudStorage} cloud</small></span>`)
      .join("");
    const bucketStatus = cloudSignedIn()
      ? stats.localData
        ? "Ready to upload"
        : "Private bucket ready"
      : "Sign in first";
    return `<section class="section-card media-storage-panel">
      <div class="media-storage-copy">
        <span class="round-icon" style="color:${stats.localData ? "var(--amber)" : "var(--green)"};background:${stats.localData ? "#fff5d6" : "#e9f8ef"}">${icon(stats.localData ? "alert" : "camera")}</span>
        <div>
          <div class="section-title compact-title"><h2>Media Storage Readiness</h2><span class="status ${statusClass}">${esc(statusLabel)}</span></div>
          <p class="muted">Upload local pictures to your private <strong>billmaster-media</strong> Supabase bucket so they show on phone and iPad without carrying giant browser-only image data.</p>
        </div>
      </div>
      <div class="cloud-facts media-storage-facts">
        <span><strong>Total pictures</strong><small>${stats.total}</small></span>
        <span><strong>Portable links</strong><small>${stats.web + stats.googleDrive + stats.cloudStorage}</small></span>
        <span><strong>Local uploads</strong><small>${stats.localData}</small></span>
        <span><strong>Cloud-backed</strong><small>${stats.cloudStorage}</small></span>
        <span><strong>Bucket</strong><small>${esc(bucketStatus)}</small></span>
      </div>
      ${rows ? `<div class="media-collection-list">${rows}</div>` : `<p class="muted">Add pictures to tasks, habits, notes, notebooks, projects, goals, loans, bills, or subscriptions and this panel will track them.</p>`}
      <div class="sheet-actions media-storage-actions">
        <button class="primary-btn" data-action="cloud-upload-local-media" ${cloudSignedIn() && stats.localData ? "" : "disabled"}>${icon("cloud")} Upload local pictures</button>
        <button class="outline-btn" data-action="cloud-refresh-media-links" ${cloudSignedIn() && stats.cloudStorage ? "" : "disabled"}>${icon("camera")} Refresh picture links</button>
        <button class="outline-btn" data-action="copy-media-storage-plan">${icon("note")} Copy media plan</button>
        <button class="outline-btn" data-action="navigate" data-view="notebooks">${icon("book")} Notebooks</button>
        <button class="outline-btn" data-action="navigate" data-view="projects">${icon("folder")} Projects</button>
        <button class="secondary-btn" data-action="cloud-push-workspace" ${cloudSignedIn() ? "" : "disabled"}>${icon("wallet")} Push workspace</button>
      </div>
    </section>`;
  }

  function googleContactsPanel() {
    const configured = Boolean(String(data.settings?.googleContactsClientId || "").trim());
    const imported = Number(data.settings?.googleContactsLastImportCount || 0);
    const groups = Number(data.settings?.googleContactsLastGroupImportCount || 0);
    const lastSync = data.settings?.googleContactsLastSyncAt
      ? `${dateLabel(data.settings.googleContactsLastSyncAt.slice(0, 10))} ${new Date(data.settings.googleContactsLastSyncAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
      : "Not imported yet";
    const status = data.settings?.googleContactsLastStatus || (configured ? "Ready for read-only import" : "OAuth Client ID needed");
    return `<section class="section-card google-contacts-panel">
      <div class="google-contacts-copy">
        <span class="round-icon" style="color:${configured ? "var(--green)" : "var(--amber)"};background:${configured ? "#e9f8ef" : "#fff5d6"}">${icon(configured ? "check" : "alert")}</span>
        <div>
          <div class="section-title compact-title"><h2>Google Contacts</h2><span class="status ${configured ? "success" : "warn"}">Read-only</span></div>
          <p class="muted">Import names, emails, phone numbers, addresses, and Google contact groups into BillMaster so tasks and loan alerts can use the same people list.</p>
        </div>
      </div>
      <div class="cloud-facts google-contact-facts">
        <span><strong>OAuth setup</strong><small>${configured ? "Client ID saved" : "Needs Google Cloud"}</small></span>
        <span><strong>Last import</strong><small>${esc(lastSync)}</small></span>
        <span><strong>Contacts</strong><small>${imported ? `${imported} imported/updated` : "0 imported"}</small></span>
        <span><strong>Groups</strong><small>${groups ? `${groups} found` : "Staged"}</small></span>
      </div>
      <div class="sync-conflict-banner google-verify-banner">
        <strong>${icon("alert")} You may need to verify in Google</strong>
        <span>${esc(status)}. In Google Cloud, enable People API, create a Web OAuth Client ID, and add this site origin before importing.</span>
      </div>
      <div class="sheet-actions google-contact-actions">
        <button class="outline-btn" data-action="open-modal" data-modal="googleContactsSetup">${icon("settings")} Setup Google Contacts</button>
        <button class="secondary-btn" data-action="google-contacts-import" ${configured ? "" : "disabled"}>${icon("wallet")} Import contacts</button>
        <button class="outline-btn" data-action="copy-google-contacts-checklist">${icon("note")} Copy setup steps</button>
        <button class="outline-btn" data-action="navigate" data-view="contacts">${icon("home")} View contacts</button>
      </div>
    </section>`;
  }

  function syncConnectionCard(connection) {
    const coverage = safeArray(connection.coverage).map((item) => `<span>${esc(item)}</span>`).join("");
    const status = connection.needsAuth ? "Needs Setup" : connection.status;
    return `<article class="sync-card">
      <div class="card-row">
        <span class="round-icon" style="color:${connection.needsAuth ? "var(--amber)" : "var(--green)"};background:${connection.needsAuth ? "#fff5d6" : "#e9f8ef"}">${icon(connection.needsAuth ? "alert" : "check")}</span>
        <span class="status ${connection.needsAuth ? "warn" : "success"}">${esc(status)}</span>
      </div>
      <h2 class="entity-title">${esc(connection.name)}</h2>
      <div class="entity-subtitle">${esc(connection.provider)} - ${esc(connection.type)}</div>
      <div class="subject-chip-row">${coverage}</div>
      <div class="sync-card-footer"><span class="muted">Last sync: ${esc(connection.lastSync)}</span><button class="${connection.needsAuth ? "primary-btn" : "outline-btn"}" data-action="sync-connection" data-id="${connection.id}">${connection.needsAuth ? "Connect" : "Sync"}</button></div>
    </article>`;
  }

  function syncRoadmapStep(number, title, copy) {
    return `<div class="roadmap-step"><span>${esc(number)}</span><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`;
  }

  function billSyncPanel(items) {
    const linkedAccounts = data.accounts.length;
    const needsReview = items.filter((item) => item.status === "pending").length;
    return `<section class="section-card sync-panel">
      <div class="sync-step good"><span>${icon("check")}</span><div><strong>${linkedAccounts} payment accounts</strong><p>Prototype accounts are connected locally. Production would use Plaid/MX/Finicity-style tokenized links.</p></div></div>
      <div class="sync-step ${needsReview ? "warn" : "good"}"><span>${icon(needsReview ? "alert" : "check")}</span><div><strong>${needsReview} items need review</strong><p>Detected charges are held here so duplicates do not flood Bills or Subscriptions.</p></div></div>
      <div class="sync-step"><span>${icon("wallet")}</span><div><strong>Payment rail staged</strong><p>Local Pay marks bills paid now. Real bill pay needs a biller/payment partner before money can move.</p></div></div>
    </section>`;
  }

  function billInboxCard(item) {
    const isSubscription = item.type === "subscription";
    const confidence = clamp(Number(item.confidence || 0), 0, 100);
    const match = inboxMatch(item);
    return `<article class="inbox-card ${item.status}">
      <div class="card-row">
        <div style="display:flex;gap:10px;align-items:center;min-width:0;">
          <span class="round-icon" style="color:${isSubscription ? "var(--accent)" : "var(--navy-2)"};background:${isSubscription ? "#efedff" : "#eef3f9"}">${icon(isSubscription ? "playcard" : "receipt")}</span>
          <div style="min-width:0;"><h2 class="entity-title">${esc(item.title)}</h2><div class="entity-subtitle">${esc(item.merchant)} - ${esc(item.source)}</div></div>
        </div>
        <span class="status ${item.status === "pending" ? "warn" : item.status === "approved" ? "success" : "muted"}">${esc(filterLabel(item.status))}</span>
      </div>
      <div class="amount-grid compact-amounts">
        <div class="amount-cell"><label>Amount</label><strong>${money(item.amount)}</strong></div>
        <div class="amount-cell"><label>Due / Next</label><strong>${dateLabel(item.dueDate)}</strong></div>
        <div class="amount-cell"><label>Confidence</label><strong>${confidence}%</strong></div>
      </div>
      <div class="progress blue" style="--value:${confidence}%"><span></span></div>
      ${match ? `<div class="match-banner">${icon("alert")} Possible match: <strong>${esc(match.label)}</strong><button class="text-btn" data-action="link-inbox-item" data-id="${item.id}">Link</button></div>` : ""}
      <p class="muted">${esc(item.notes || "Ready for review.")}</p>
      <div class="sheet-actions inbox-actions">
        ${isSubscription ? `<button class="primary-btn" data-action="add-inbox-subscription" data-id="${item.id}">${icon("plus")} Add to Hub</button><button class="outline-btn" data-action="cancel-inbox-subscription" data-id="${item.id}">${icon("close")} Cancel</button>` : `<button class="primary-btn" data-action="add-inbox-bill" data-id="${item.id}">${icon("plus")} Add Bill</button><button class="outline-btn" data-action="open-modal" data-modal="addBill">${icon("edit")} Manual</button>`}
        <button class="danger-btn" data-action="dismiss-inbox-item" data-id="${item.id}">${icon("trash")}</button>
      </div>
    </article>`;
  }

  function inboxMatch(item) {
    if (!item) return null;
    const itemName = normalizedName(item.title);
    const merchant = normalizedName(item.merchant);
    const sub = data.subscriptions.find((candidate) => normalizedName(candidate.name) === itemName || normalizedName(candidate.name) === merchant);
    if (sub) return { type: "subscription", id: sub.id, label: `${sub.name} subscription` };
    const bill = data.bills.find((candidate) => normalizedName(candidate.name) === itemName || normalizedName(candidate.payee) === merchant);
    if (bill) return { type: "bill", id: bill.id, label: `${bill.name} bill` };
    return null;
  }

  function billInboxItems() {
    const dismissed = new Set(data.dismissedInboxIds || []);
    const stored = safeArray(data.billInbox).filter((item) => !dismissed.has(item.id));
    const storedIds = new Set(stored.map((item) => item.id));
    const detected = recurringInboxCandidates().filter((item) => !dismissed.has(item.id) && !storedIds.has(item.id));
    return [...stored, ...detected].sort((a, b) => {
      const statusSort = (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1);
      if (statusSort) return statusSort;
      return String(a.dueDate || "").localeCompare(String(b.dueDate || ""));
    });
  }

  function recurringInboxCandidates() {
    return data.transactions
      .filter((tx) => tx.type === "expense" && tx.frequency !== "One time")
      .filter((tx) => recurringCandidateIsUseful(tx))
      .map((tx) => {
        const isSubscription = tx.category === "Subscriptions" || /netflix|spotify|adobe|prime|subscription|stream|cloud/i.test(`${tx.name} ${tx.merchant}`);
        return {
          id: `detected_${tx.id}`,
          sourceId: tx.id,
          type: isSubscription ? "subscription" : "bill",
          status: "pending",
          source: "Recurring detector",
          title: tx.name,
          merchant: tx.merchant || tx.name,
          category: tx.category || (isSubscription ? "Subscriptions" : "Utilities"),
          amount: tx.amount,
          projected: tx.projected || tx.amount,
          dueDate: addMonthsIso(tx.date || ui.selectedDate, 1),
          confidence: recurringConfidence(tx),
          notes: `${tx.frequency} transaction from ${dateLabel(tx.date)} detected as a repeat pattern.`
        };
      });
  }

  function recurringCandidateIsUseful(tx) {
    const key = normalizedName(tx.name);
    const merchant = normalizedName(tx.merchant);
    const alreadySubscription = data.subscriptions.some((sub) => normalizedName(sub.name) === key || normalizedName(sub.name) === merchant);
    const alreadyBill = data.bills.some((bill) => normalizedName(bill.name) === key || normalizedName(bill.payee) === merchant);
    return !(alreadySubscription || alreadyBill);
  }

  function recurringConfidence(tx) {
    let score = 72;
    if (tx.frequency === "Monthly") score += 14;
    if (tx.projected && Math.abs(Number(tx.amount || 0) - Number(tx.projected || 0)) <= 5) score += 8;
    if (tx.category === "Subscriptions" || tx.category === "Utilities") score += 6;
    return clamp(score, 60, 98);
  }

  function normalizedName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
  }

  function cancellationRows() {
    const expensive = [...data.subscriptions]
      .sort((a, b) => (Number(b.projected || 0) - Number(b.amount || 0)) - (Number(a.projected || 0) - Number(a.amount || 0)))
      .slice(0, 3);
    const rows = expensive.map((sub) => {
      const activeRecord = data.cancellations.find((item) => item.subscriptionId === sub.id && item.status !== "Completed");
      const variance = budgetVariance(sub.amount, sub.projected, "expense");
      return `<div class="data-row">
        <span class="round-icon" style="color:var(--accent);background:#efedff;">${icon("playcard")}</span>
        <div><strong>${esc(sub.name)}</strong><div class="subtle">${activeRecord ? `Cancellation ${activeRecord.status}` : `<span class="${varianceClass(sub.amount, sub.projected, "expense")}">${money(variance)}</span> variance - ${esc(sub.status)}`}</div></div>
        <button class="${sub.status === "Cancelled" ? "outline-btn" : "danger-btn"}" data-action="cancel-subscription" data-id="${sub.id}">${sub.status === "Cancelled" ? "Cancelled" : "Start Cancel"}</button>
      </div>`;
    }).join("");
    return rows || `<p class="muted">No subscriptions to review yet.</p>`;
  }

  function billCard(bill) {
    const overdue = daysBetween(bill.dueDate) < 0;
    const dueSoon = daysBetween(bill.dueDate) <= 3 && !overdue;
    const media = entityImage(bill);
    return `<article class="bill-card compact ${overdue ? "overdue" : ""}">
      <div class="card-row">
        <div class="bill-title-pack">
          ${media ? `<span class="media-thumb" ${imageStyleAttr(bill)}><img src="${esc(media)}" alt=""></span>` : `<span class="round-icon" style="color:var(--${overdue ? "red" : dueSoon ? "amber" : "navy-2"});background:${overdue ? "#fff0f0" : dueSoon ? "#fff8df" : "#eef3f9"}">${icon(categoryIcon(bill.category))}</span>`}
          <div><h2 class="entity-title">${esc(bill.name)}</h2><div class="entity-subtitle">${esc(bill.payee)} - ${esc(bill.category)}</div></div>
        </div>
        <div style="text-align:right;"><strong class="amount-large">${money(bill.amount)}</strong><br><span class="status ${statusClass(overdue ? "Overdue" : bill.status)}">${overdue ? "Overdue" : esc(bill.status)}</span></div>
      </div>
      <div class="bill-meta-line">
        <span class="${overdue ? "negative" : dueSoon ? "danger-text" : "muted"}">${icon("calendar")} ${dueText(bill.dueDate)}</span>
        <span class="muted">${bill.autopay ? "Auto-pay" : "Manual"} - ${esc(bill.method)}</span>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr auto auto;">
        <button class="primary-btn" data-action="pay-bill" data-id="${bill.id}">${icon("wallet")} Pay</button>
        <button class="outline-btn" data-action="open-modal" data-modal="addBill" data-id="${bill.id}">${icon("edit")}</button>
        <button class="icon-btn danger-btn" data-action="delete-bill" data-id="${bill.id}" aria-label="Delete bill">${icon("trash")}</button>
      </div>
    </article>`;
  }

  function emptyState(iconName, title, copy, button, modal) {
    return `<div class="empty-state">
      <div><span class="big-icon">${icon(iconName)}</span><h2>${esc(title)}</h2><p>${esc(copy)}</p><button class="primary-btn" data-action="open-modal" data-modal="${modal}">${icon("plus")} ${esc(button)}</button></div>
    </div>`;
  }

  function renderSubscriptions() {
    return renderBills("subscriptions");
  }

  function subscriptionHubContent() {
    const filtered = data.subscriptions.filter((sub) => ui.subscriptionFilter === "all" || sub.status.toLowerCase().replaceAll(" ", "-") === ui.subscriptionFilter);
    const monthly = data.subscriptions.reduce((total, sub) => total + monthlySubAmount(sub), 0);
    const projectedMonthly = data.subscriptions.reduce((total, sub) => total + monthlySubProjected(sub), 0);
    const sixMonths = monthly * 6;
    const projectedSixMonths = projectedMonthly * 6;
    const yearly = monthly * 12;
    return `
      <section class="section-card balance-panel subscription-summary" style="margin-bottom:16px;">
        <h2 class="panel-title" style="color:#fff;">Total Subscription Cost</h2>
        <div class="metrics-grid subscription-summary-grid">
          <div class="metric"><label>Actual Monthly</label><strong>${money(monthly)}</strong></div>
          <div class="metric"><label>Projected Monthly</label><strong>${money(projectedMonthly)}</strong></div>
          <div class="metric"><label>Actual 6 Months</label><strong>${money(sixMonths)}</strong></div>
          <div class="metric"><label>Projected 6 Months</label><strong>${money(projectedSixMonths)}</strong></div>
          <div class="metric"><label>Actual Yearly</label><strong>${money(yearly)}</strong></div>
          <div class="metric"><label>Active</label><strong>${data.subscriptions.filter((s) => s.status === "Active").length}</strong></div>
        </div>
      </section>
      <section class="section-card hub-note">
        <span class="round-icon">${icon("playcard")}</span>
        <div><strong>Subscriptions are inside Bills</strong><p>Detected recurring charges, imported statements, cancellation workflows, and manual subscriptions all stay here as a smart bill type.</p></div>
        <button class="outline-btn" data-action="navigate" data-view="inbox">${icon("receipt")} Review Inbox</button>
      </section>
      <div class="filter-row">
        ${["all", "active", "trial", "expiring-soon", "cancelled"].map((filter) => `<button class="${ui.subscriptionFilter === filter ? "active" : ""}" data-action="set-tab" data-key="subscriptionFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}
      </div>
      <div class="subscription-grid">${filtered.map((sub) => subscriptionCard(sub)).join("")}</div>
    `;
  }

  function filterLabel(filter) {
    if (filter === "partial") return "Money Owed";
    if (filter === "week2") return "Week 2";
    return filter.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function calendarViewOptions() {
    return ["month", "week", "week2", "day", "block"];
  }

  function visibleCalendarViewOptions() {
    return ["month", "week", "day", "block"];
  }

  function isCalendarView(view) {
    return calendarViewOptions().includes(view);
  }

  function isBlockLikeCalendarView(view = ui.calendarView) {
    return view === "block" || view === "week2";
  }

  function monthlySubAmount(sub) {
    return sub.cycle === "yearly" ? Number(sub.amount || 0) / 12 : Number(sub.amount || 0);
  }

  function monthlySubProjected(sub) {
    return sub.cycle === "yearly" ? Number(sub.projected || 0) / 12 : Number(sub.projected || 0);
  }

  function subscriptionCard(sub) {
    const q = sub.amount * (sub.cycle === "yearly" ? 0.25 : 3);
    const six = sub.amount * (sub.cycle === "yearly" ? 0.5 : 6);
    const year = sub.amount * (sub.cycle === "yearly" ? 1 : 12);
    const projectedQ = sub.projected * (sub.cycle === "yearly" ? 0.25 : 3);
    const projectedSix = sub.projected * (sub.cycle === "yearly" ? 0.5 : 6);
    const projectedYear = sub.projected * (sub.cycle === "yearly" ? 1 : 12);
    const media = entityImage(sub);
    return `<article class="subscription-card">
      <div class="card-row">
        <div style="display:flex;gap:12px;align-items:center;">
          <button class="sub-logo ${media ? "has-media" : ""}" data-action="open-modal" data-modal="subscriptionDetail" data-id="${sub.id}" aria-label="Subscription details" ${imageStyleAttr(sub)}>${media ? `<img src="${esc(media)}" alt="">` : icon("playcard")}</button>
          <div><h2 class="entity-title">${esc(sub.name)}</h2><div class="entity-subtitle">${esc(sub.plan)}</div></div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="status ${statusClass(sub.status)}" data-action="open-modal" data-modal="subscriptionStatus" data-id="${sub.id}">${esc(sub.status)}</button>
          <button class="icon-btn danger-text" data-action="delete-subscription" data-id="${sub.id}" aria-label="Delete subscription">${icon("trash")}</button>
        </div>
      </div>
      <div class="amount-grid">
        <div class="amount-cell"><label>Actual Amount <button class="text-btn" data-action="open-modal" data-modal="editSubscriptionActual" data-id="${sub.id}">${icon("edit")}</button></label><strong>${money(sub.amount)} <span class="pill dark" style="background:var(--navy-2);">${esc(sub.cycle)}</span></strong></div>
        <div class="amount-cell"><label>Projected Amount <button class="text-btn" data-action="open-modal" data-modal="editSubscriptionProjected" data-id="${sub.id}">${icon("edit")}</button></label><strong class="${projectedClass(sub.amount, sub.projected, "expense")}">${money(sub.projected)}</strong></div>
        <div class="amount-cell"><label>Variance</label><strong class="${varianceClass(sub.amount, sub.projected, "expense")}">${money(budgetVariance(sub.amount, sub.projected, "expense"))}</strong></div>
      </div>
      <div class="period-table">
        <div><label>Quarterly</label><strong>${money(q)}</strong><span class="subtle">proj ${money(projectedQ)}</span></div>
        <div><label>6 Months</label><strong>${money(six)}</strong><span class="subtle">proj ${money(projectedSix)}</span></div>
        <div><label>Yearly</label><strong>${money(year)}</strong><span class="subtle">proj ${money(projectedYear)}</span></div>
      </div>
      <button class="outline-btn" style="color:#14a85c;border-color:#14a85c;" data-action="open-modal" data-modal="paySubscription" data-id="${sub.id}">${icon("wallet")} Pay Now</button>
      <div class="positive">${sub.autopay ? "Auto-renewal enabled" : "Manual renewal"}</div>
    </article>`;
  }

  function renderCalendar() {
    const view = ui.calendarView === "week2" ? "block" : ui.calendarView;
    return `<section class="screen calendar-screen calendar-screen--${esc(view)} calendar-palette--${esc(activeCalendarPalette)}">
      ${header("Financial Calendar", `<button class="icon-btn">${icon("search")}</button>${calendarUndoButton("icon-btn undo-icon")}<button class="icon-btn" data-action="open-modal" data-modal="calendarSync" title="Google Calendar">${icon("calendar")}</button><button class="icon-btn" data-action="open-modal" data-modal="taskDefaults" title="Task defaults">${icon("settings")}</button><button class="icon-btn">${icon("filter")}</button>`)}
      <div class="calendar-mode-row">
        <div class="calendar-left-tools">
          <div class="mini-tabs">
            ${visibleCalendarViewOptions().map((item) => `<button class="${view === item ? "active" : ""}" data-action="set-tab" data-key="calendarView" data-value="${item}">${filterLabel(item)}</button>`).join("")}
          </div>
          ${calendarCategoryBar()}
        </div>
        ${calendarTopTools(view)}
      </div>
      <div class="calendar-controls">
        <button class="icon-btn" data-action="calendar-nav" data-direction="-1" aria-label="Previous ${view}">${icon("back")}</button>
        <div class="calendar-title-cluster">
          <button class="today-jump" data-action="go-calendar-today" data-view="${view}" title="Jump to today">${icon("calendar")} Today</button>
          <button class="calendar-title-button" data-action="open-modal" data-modal="${view === "month" ? "calendarMonthPicker" : "calendarDatePicker"}" title="${view === "month" ? "Pick month and year" : "Pick date"}">${calendarTitle(view)}</button>
          ${weatherChip(calendarTitleWeatherDate(view), "title")}
        </div>
        <button class="icon-btn" data-action="calendar-nav" data-direction="1" aria-label="Next ${view}" style="transform:rotate(180deg);">${icon("back")}</button>
      </div>
      ${view === "month" ? calendarMonth() : view === "week" ? calendarWeek() : view === "week2" ? calendarWeek2() : view === "block" ? calendarBlock() : calendarDay()}
    </section>`;
  }

  function calendarCategoryBar() {
    return `<div class="category-filter-bar">
      ${taskCategories.map((category) => `<button class="${isTaskCategoryEnabled(category) ? "active" : ""}" data-action="toggle-task-category" data-category="${category}" style="--category-color:${taskCategoryColor(category)}">${esc(category)}</button>`).join("")}
    </div>`;
  }

  function calendarTopTools(view) {
    return `<div class="calendar-top-tools">
      <div class="calendar-top-tools__panel">
        <div class="calendar-top-primary">
          ${calendarQuickAddBar(view)}
          <button class="outline-btn calendar-color-toggle ${ui.calendarColorsOpen ? "active" : ""}" data-action="toggle-calendar-colors" aria-expanded="${ui.calendarColorsOpen ? "true" : "false"}" title="${ui.calendarColorsOpen ? "Hide calendar colors" : "Show calendar colors"}">${icon("settings")} Colors</button>
        </div>
        ${ui.calendarColorsOpen ? calendarColorSchemePicker() : ""}
      </div>
    </div>`;
  }

  function calendarColorSchemePicker() {
    const toneKeys = calendarDayTones;
    const chips = Object.entries(calendarPaletteSchemes)
      .map(([key, scheme]) => {
        const swatches = toneKeys
          .map((tone) => {
            const vars = scheme.tones[tone] || scheme.tones.weekday;
            return `<span style="background:${vars.accent}"></span>`;
          })
          .join("");
        return `<button class="calendar-color-chip calendar-color-chip--${esc(key)} ${activeCalendarPalette === key ? "is-active" : ""}" data-action="set-calendar-palette" data-palette="${key}" title="Use ${esc(scheme.label)} calendar colors">
          <span class="calendar-color-chip__swatches" aria-hidden="true">${swatches}</span>
          <span>${esc(scheme.label)}</span>
        </button>`;
      })
      .join("");
    return `<div class="calendar-color-picker" aria-label="Calendar color scheme">
      <span class="calendar-color-picker__label">Color style</span>
      ${chips}
      ${calendarDayColorEditor()}
    </div>`;
  }

  function calendarDayColorEditor() {
    return `<div class="calendar-day-color-editor" aria-label="Customize weekday colors">
      <span class="calendar-color-picker__label">Days</span>
      ${calendarDayColorKeys.map((key, index) => {
        const color = calendarDayColorValue(index);
        return `<label class="calendar-day-color-control" title="Set ${weekdayLabels[index]} color">
          <span>${weekdayLabels[index]}</span>
          <input type="color" value="${esc(color)}" data-calendar-day-color="${index}" aria-label="${weekdayLabels[index]} color">
        </label>`;
      }).join("")}
      <button class="calendar-color-chip calendar-day-color-reset" data-action="reset-calendar-day-colors" title="Reset day colors to the selected style">Reset</button>
    </div>`;
  }

  function calendarQuickAddBar(view) {
    const label = isBlockLikeCalendarView(view) ? `Quick add ${filterLabel(view)} block task...` : `Quick add ${filterLabel(view)} task...`;
    return `<div class="quick-add calendar-quick-add">
      <button class="round-icon quick-voice-btn" data-action="open-modal" data-modal="voiceTask" aria-label="Add task by voice" title="Add task by voice">${icon("mic")}</button>
      <input id="quickTaskInput" placeholder="${esc(label)} (Ctrl+T)" />
      <button class="icon-btn primary-btn" data-action="quick-add-task" aria-label="Add calendar task">${icon("check")}</button>
      <button class="icon-btn quick-ask-btn" data-action="quick-ask-ai" aria-label="Ask BillMaster AI about your app" title="Ask BillMaster AI about your app">${icon("ai")}</button>
    </div>`;
  }

  function calendarUndoButton(className = "outline-btn undo-btn") {
    const compact = className.includes("icon-btn");
    return undoStack.length ? `<button class="${className}" data-action="undo-last-change" title="Undo last change" aria-label="Undo last change">${icon("back")}${compact ? "" : " Undo"}</button>` : "";
  }

  function parseLocalDate(iso) {
    const [year, month, day] = String(iso || ui.selectedDate).split("-").map(Number);
    return new Date(year || 2026, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  }

  function isoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isIsoDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }

  function addDaysIso(iso, days) {
    const date = parseLocalDate(iso);
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  function todayIso() {
    return isoDate(new Date());
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function addMonthsIso(iso, months) {
    const date = parseLocalDate(iso);
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + months);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDay));
    return isoDate(date);
  }

  function startOfWeekIso(iso) {
    const date = parseLocalDate(iso);
    date.setDate(date.getDate() - date.getDay());
    return isoDate(date);
  }

  function calendarTitle(view) {
    if (view === "day") return dateFull(ui.selectedDate);
    if (view === "month") return parseLocalDate(ui.selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return weekRangeLabel(weekDates());
  }

  function calendarTitleWeatherDate(view) {
    const today = todayIso();
    if (view === "month") return ui.selectedDate.slice(0, 7) === today.slice(0, 7) ? today : ui.selectedDate;
    if (view === "week" || isBlockLikeCalendarView(view)) {
      const dates = weekDates();
      return dates.includes(today) ? today : ui.selectedDate;
    }
    return ui.selectedDate;
  }

  function weatherForDate(iso) {
    const stored = (data.weather || []).find((item) => item.date === iso);
    if (stored) return stored;
    const date = parseLocalDate(iso);
    const seedValue = date.getFullYear() + date.getMonth() * 7 + date.getDate();
    const patterns = [
      { condition: "sunny", temp: 72 },
      { condition: "cloudy", temp: 66 },
      { condition: "sunny", temp: 76 },
      { condition: "rain", temp: 63, rainStart: "2:00 PM", rainEnd: "5:00 PM" },
      { condition: "cloudy", temp: 69 },
      { condition: "sunny", temp: 74 },
      { condition: "windy", temp: 70 }
    ];
    return { date: iso, ...patterns[Math.abs(seedValue) % patterns.length] };
  }

  function weatherIconName(weather) {
    const condition = String(weather?.condition || "").toLowerCase();
    if (condition.includes("rain")) return "rain";
    if (condition.includes("wind") || condition.includes("breeze") || condition.includes("gust")) return "wind";
    if (condition.includes("cloud")) return "cloud";
    return "sun";
  }

  function weatherConditionLabel(weather) {
    const condition = String(weather?.condition || "sunny").toLowerCase();
    if (condition.includes("rain")) return "Rain";
    if (condition.includes("wind") || condition.includes("breeze") || condition.includes("gust")) return "Windy";
    if (condition.includes("cloud")) return "Clouds";
    return "Sunny";
  }

  function weatherRainWindow(weather, short = false) {
    if (!weather?.rainStart || !weather?.rainEnd) return short ? "Rain" : "Rain likely";
    if (!short) return `${weather.rainStart} - ${weather.rainEnd}`;
    return `${weather.rainStart.replace(":00", "")}-${weather.rainEnd.replace(":00", "")}`;
  }

  function weatherChip(iso, size = "mini") {
    const weather = weatherForDate(iso);
    const iconName = weatherIconName(weather);
    const condition = weatherConditionLabel(weather);
    const rain = condition === "Rain";
    const text = rain
      ? (size === "title" ? `Rain ${weatherRainWindow(weather)}` : weatherRainWindow(weather, true))
      : (size === "title" ? `${condition} ${weather.temp || "--"}°` : `${weather.temp || "--"}°`);
    const title = rain
      ? `${dateLabel(iso)}: rain from ${weatherRainWindow(weather).toLowerCase()}`
      : `${dateLabel(iso)}: ${condition.toLowerCase()}, ${weather.temp || "--"} degrees`;
    return `<span class="weather-chip weather-${esc(iconName)} weather-${esc(size)}" title="${esc(title)}" aria-label="${esc(title)}">${icon(iconName)}<span>${esc(text)}</span></span>`;
  }

  function weatherMotionLayer(iso, extraClass = "") {
    const type = weatherIconName(weatherForDate(iso));
    return `<span class="weather-motion-layer weather-motion-${esc(type)} ${extraClass}" aria-hidden="true"></span>`;
  }

  function weekRangeLabel(dates) {
    const start = parseLocalDate(dates[0]);
    const end = parseLocalDate(dates[6]);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  function dateFull(iso) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  function weekDates(anchor = ui.selectedDate) {
    const start = startOfWeekIso(anchor);
    return Array.from({ length: 7 }, (_, index) => addDaysIso(start, index));
  }

  function calendarItemsForDay(iso) {
    return visibleCalendarTasks([...data.tasks.filter((task) => task.date === iso), ...habitInstancesForDay(iso)]);
  }

  function calendarItemsForRange(startIso, endIso) {
    const start = startIso <= endIso ? startIso : endIso;
    const end = endIso >= startIso ? endIso : startIso;
    return visibleCalendarTasks([
      ...data.tasks.filter((task) => task.date >= start && task.date <= end),
      ...habitInstancesForRange(start, end)
    ]);
  }

  function calendarExportItems() {
    return calendarItemsForRange(addDaysIso(ui.selectedDate, -30), addDaysIso(ui.selectedDate, 90));
  }

  function monthEndIso(iso) {
    const date = parseLocalDate(iso);
    return isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
  }

  function dateRangeIso(startIso, endIso, cap = 730) {
    const dates = [];
    let current = startIso;
    while (current <= endIso && dates.length < cap) {
      dates.push(current);
      current = addDaysIso(current, 1);
    }
    return dates;
  }

  function habitInstancesForDay(iso) {
    return habitInstancesForRange(iso, iso);
  }

  function habitInstancesForRange(startIso, endIso) {
    return data.habits.flatMap((habit) => dateRangeIso(startIso, endIso)
      .filter((iso) => habitScheduledOn(habit, iso))
      .map((iso) => habitInstance(habit, iso)));
  }

  function habitInstance(habit, iso) {
    return {
      id: habitInstanceId(habit.id, iso),
      isHabit: true,
      habitId: habit.id,
      title: habit.title,
      description: habit.description,
      date: iso,
      endDate: iso,
      start: habit.start,
      end: habit.end,
      priority: habit.priority || "Medium",
      status: habitCompletedOn(habit, iso) ? "Completed" : "Not Started",
      repeat: habit.schedule || "Daily",
      includeHours: habit.includeHours !== false,
      projectId: habit.projectId || null,
      billId: null,
      goalId: null,
      contactId: null,
      addressId: habit.addressId || null,
      tags: ["habit", String(habit.type || "Personal").toLowerCase()],
      category: "Habit",
      bgColor: habit.color || taskCategoryColor("Habit"),
      color: habit.color || taskCategoryColor("Habit"),
      fontFamily: habit.fontFamily || "System",
      image: habit.image || "",
      imageZoom: habit.imageZoom || 1,
      imageX: habit.imageX || 0,
      imageY: habit.imageY || 0,
      imageFit: habit.imageFit || "cover",
      imageOpacity: habit.imageOpacity || 1
    };
  }

  function habitInstanceId(habitId, iso) {
    return `habit:${habitId}:${iso}`;
  }

  function parseHabitInstanceId(itemId) {
    const match = /^habit:(.+):(\d{4}-\d{2}-\d{2})$/.exec(String(itemId || ""));
    return match ? { habitId: match[1], date: match[2] } : null;
  }

  function isHabitInstanceId(itemId) {
    return Boolean(parseHabitInstanceId(itemId));
  }

  function findCalendarItemById(itemId) {
    const task = data.tasks.find((item) => item.id === itemId);
    if (task) return task;
    const parsed = parseHabitInstanceId(itemId);
    if (!parsed) return null;
    const habit = data.habits.find((item) => item.id === parsed.habitId);
    return habit ? habitInstance(habit, parsed.date) : null;
  }

  function findHabitFromInstanceId(itemId) {
    const parsed = parseHabitInstanceId(itemId);
    return parsed ? data.habits.find((habit) => habit.id === parsed.habitId) : null;
  }

  function habitEffectiveStartDate(habit) {
    const startDate = isIsoDateString(habit?.startDate) ? habit.startDate : todayIso();
    return isIsoDateString(habit?.freshStartDate) && habit.freshStartDate > startDate ? habit.freshStartDate : startDate;
  }

  function habitScheduledOn(habit, iso) {
    if (!habit || habit.status === "Archived") return false;
    if (habit.status === "Paused") return false;
    if (iso < habitEffectiveStartDate(habit)) return false;
    if (habit.endDate && iso > habit.endDate) return false;
    if (Array.isArray(habit.skippedDates) && habit.skippedDates.includes(iso)) return false;
    const weekday = parseLocalDate(iso).getDay();
    if (habit.schedule === "Daily") return true;
    if (habit.schedule === "Weekdays") return weekday >= 1 && weekday <= 5;
    if (habit.schedule === "Weekly") return (habit.days || []).includes(weekday);
    if (habit.schedule === "Monthly") return parseLocalDate(iso).getDate() === parseLocalDate(habit.startDate).getDate();
    return true;
  }

  function habitTrackableOn(habit, iso) {
    if (!habit || habit.status !== "Active") return false;
    if (iso < habitEffectiveStartDate(habit)) return false;
    if (habit.endDate && iso > habit.endDate) return false;
    if (Array.isArray(habit.skippedDates) && habit.skippedDates.includes(iso)) return false;
    return true;
  }

  function habitCompletedOn(habit, iso) {
    if (!habit || !Array.isArray(habit.completions) || !habit.completions.includes(iso)) return false;
    return !isIsoDateString(iso) || iso >= habitEffectiveStartDate(habit);
  }

  function setHabitCompletion(habitId, iso, completed) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return false;
    habit.completions = Array.from(new Set(Array.isArray(habit.completions) ? habit.completions : []));
    if (completed && !habit.completions.includes(iso)) habit.completions.push(iso);
    if (!completed) habit.completions = habit.completions.filter((date) => date !== iso);
    habit.completions.sort();
    return true;
  }

  function habitCompletionSummary(habit, startIso, endIso) {
    const dates = dateRangeIso(startIso, endIso).filter((iso) => habitScheduledOn(habit, iso));
    const completed = dates.filter((iso) => habitCompletedOn(habit, iso)).length;
    return { scheduled: dates.length, completed, rate: progressPct(completed, Math.max(1, dates.length)) };
  }

  function habitsCompletionSummary(habits, startIso, endIso) {
    return habits.reduce((summary, habit) => {
      const stats = habitCompletionSummary(habit, startIso, endIso);
      summary.scheduled += stats.scheduled;
      summary.completed += stats.completed;
      summary.rate = progressPct(summary.completed, Math.max(1, summary.scheduled));
      return summary;
    }, { scheduled: 0, completed: 0, rate: 0 });
  }

  function habitCurrentStreak(habit, anchorIso = todayIso()) {
    let streak = 0;
    let checkedScheduled = 0;
    for (let offset = 0; offset < 365 && checkedScheduled < 90; offset += 1) {
      const iso = addDaysIso(anchorIso, -offset);
      if (!habitScheduledOn(habit, iso)) continue;
      checkedScheduled += 1;
      if (!habitCompletedOn(habit, iso)) break;
      streak += 1;
    }
    return streak;
  }

  function softHex(color) {
    const hex = String(color || "#8892b0").replace("#", "");
    if (hex.length !== 6) return "#eef3f9";
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, 0.14)`;
  }

  function calendarMonth() {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const anchor = parseLocalDate(ui.selectedDate);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1, 12);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = first.getDay();
    const days = [];
    const gridStart = new Date(year, month, 1 - leading, 12);
    const cellCount = Math.ceil((leading + daysInMonth) / 7) * 7;
    for (let index = 0; index < cellCount; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      days.push(isoDate(date));
    }
    return `<div class="month-grid">
      ${weekdays.map((d, index) => `<div class="weekday cal-day--${calendarToneForWeekday(index)}" style="${calendarToneStyleByIndex(index)}">${d}</div>`).join("")}
      ${days.map((iso) => monthDayCell(iso, month, year)).join("")}
    </div>
    <div class="calendar-summary">${icon("calendar")} <strong>Month Total: ${hoursForMonth()}h</strong><span class="muted">Bills</span><span class="muted">Tasks</span><span class="muted">Subscriptions</span></div>`;
  }

  function monthDayCell(iso, activeMonth, activeYear) {
    const day = Number(iso.slice(-2));
    const date = parseLocalDate(iso);
    const inMonth = date.getMonth() === activeMonth && date.getFullYear() === activeYear;
    const selected = iso === ui.selectedDate;
    const isToday = iso === todayIso();
    const tasks = calendarItemsForDay(iso).filter((task) => task.includeHours);
    const bill = data.bills.find((b) => b.dueDate === iso);
    const sub = data.subscriptions.find((s) => s.nextDate === iso);
    return `<div class="day-cell weather-motion-host ${calendarToneClass(iso)} ${selected ? "is-selected" : ""} ${isToday ? "is-today" : ""}" data-double-date="${iso}" ${calendarWeekdayAttr(iso)} style="${calendarDateColorStyle(iso)}${inMonth ? "" : "opacity:.42;"}">
      ${dateViewZones(iso)}
      ${weatherMotionLayer(iso)}
      <div class="date-cell-content">
        ${isToday ? `<div class="subtle">${calendarWeekdayGlowLabel(date.toLocaleDateString("en-US", { weekday: "short" }))}</div>` : ""}
        <strong>${day}</strong>
        ${weatherChip(iso, "mini")}
        <div class="event-dots">${tasks.length ? `<span class="dot blue"></span>` : ""}${bill ? `<span class="dot coral"></span>` : ""}${sub ? `<span class="dot purple"></span>` : ""}</div>
        ${tasks.length ? `<span class="hour-chip">${round1(totalTaskHours(tasks))}h</span>` : ""}
      </div>
    </div>`;
  }

  function calendarWeek() {
    const dates = weekDates();
    const timetableDates = dates;
    const weekTasks = calendarItemsForRange(timetableDates[0], timetableDates[6]);
    return `<div class="week-timetable" aria-label="Weekly time grid">
        <div class="week-timetable-grid">
          <div class="week-timetable-head week-timetable-time-head">Time</div>
          ${timetableDates.map((iso) => weekTimetableHeader(iso)).join("")}
          <div class="week-time-scale">${weekTimetableHours().map((hour) => `<div class="week-time-row">${String(hour).padStart(2, "0")}:00</div>`).join("")}</div>
          ${timetableDates.map((iso, index) => weekTimetableColumn(iso, index)).join("")}
        </div>
      </div>
      <div class="calendar-summary">${icon("bell")} Week Total: <strong>${round1(totalTaskHours(weekTasks))}h</strong></div>`;
  }

  function weekTimetableDates() {
    return weekDates(ui.selectedDate);
  }

  function weekTimetableHours() {
    return Array.from({ length: 13 }, (_, index) => index + 7);
  }

  function weekTimetableHeader(iso) {
    const isSelected = iso === ui.selectedDate;
    const isToday = iso === todayIso();
    return `<div class="week-timetable-head week-timetable-day-head weather-motion-host ${calendarToneClass(iso)} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}" style="${calendarDateColorStyle(iso)}" data-double-date="${iso}" ${calendarWeekdayAttr(iso)} title="Open ${dateLabel(iso)}">
      ${dateViewZones(iso)}
      ${weatherMotionLayer(iso)}
      ${calendarDateCardContent(iso)}
    </div>`;
  }

  function weekTimetableColumn(iso, index) {
    const startMinute = 7 * 60;
    const endMinute = 20 * 60;
    const items = tasksForDay(iso).filter((task) => task.start && task.end);
    return `<div class="week-timetable-day weather-motion-host ${calendarToneClass(iso)}" style="--week-day-index:${index};${calendarDateColorStyle(iso)}" ${calendarWeekdayAttr(iso)}>
      ${weatherMotionLayer(iso, "weather-motion-grid")}
      ${weekTimetableHours().map(() => `<span class="week-grid-line"></span>`).join("")}
      ${items.map((task) => weekTimetableEvent(task, startMinute, endMinute)).join("")}
    </div>`;
  }

  function weekTimetableEvent(task, rangeStart, rangeEnd) {
    const start = minutes(task.start);
    let end = minutes(task.end);
    if (end <= start) end += 24 * 60;
    if (end <= rangeStart || start >= rangeEnd) return "";
    const visibleStart = Math.max(start, rangeStart);
    const visibleEnd = Math.min(end, rangeEnd);
    const topHours = (visibleStart - rangeStart) / 60;
    const visibleHours = (visibleEnd - visibleStart) / 60;
    const color = task.bgColor || task.color || taskCategoryColor(taskCategory(task));
    const modal = task.isHabit ? "editHabit" : "editTask";
    const id = task.isHabit ? task.habitId : task.id;
    return `<button class="week-timetable-event" style="top:calc(${topHours} * var(--week-row-height));height:max(28px, calc(${visibleHours} * var(--week-row-height) - 4px));--event-color:${esc(color)};" data-action="open-modal" data-modal="${modal}" data-id="${id}" title="${esc(`${task.title} ${timeLabel(task.start)} - ${timeLabel(task.end)}`)}">
      <strong>${esc(task.title)}</strong>
      <span>${esc(timeLabel(task.start))} - ${esc(timeLabel(task.end))}</span>
      <small>${esc(durationLabel(taskDurationMinutes(task)))}</small>
    </button>`;
  }

  function calendarDay() {
    const dayTasks = tasksForDay(ui.selectedDate);
    const selectedDayTasks = dayTasks.filter((task) => ui.selectedTasks.includes(task.id));
    const selectedDayCount = selectedDayTasks.length;
    const selectedDayAddresses = selectedDayTasks.map((task) => taskAddress(task)).filter(Boolean);
    const selectedDayCanRoute = selectedDayCount > 0 && selectedDayAddresses.length === selectedDayCount;
    const dayCopyTargetDate = ui.dayCopyTargetDate && ui.dayCopyTargetDate !== ui.selectedDate ? ui.dayCopyTargetDate : "";
    const dayCopyTargetLabel = dayCopyTargetDate ? shortDate(dayCopyTargetDate) : "";
    const copyTargetButton = selectedDayCount
      ? dayCopyTargetDate
        ? `<button class="outline-btn compact-action copy-target-action" data-action="copy-selected-to-day-target">${icon("calendar")} Copy to ${esc(dayCopyTargetLabel)}</button>`
        : `<button class="outline-btn compact-action copy-target-action" data-action="open-modal" data-modal="copyTasksDate">${icon("calendar")} Copy to date</button>`
      : "";
    const selectedHint = selectedDayCount
      ? dayCopyTargetDate
        ? ` - copy target ${dayCopyTargetLabel}`
        : " - tap a date above to pick copy target"
      : "";
    return `<div class="calendar-summary day-toolbar">${icon("bell")} <span class="calendar-summary-label">Today's Task Hours:</span><strong>${round1(totalTaskHours(dayTasks))}h</strong><span class="muted">${selectedDayCount}/${dayTasks.length} selected${ui.daySwapMode ? " - Swap mode on" : ""}${selectedHint}</span><button class="primary-btn day-add-task-btn" data-action="open-modal" data-modal="editTask">${icon("plus")} Add Task</button><button class="${ui.daySwapMode ? "primary-btn" : "outline-btn"}" data-action="toggle-day-swap-mode">${icon("refresh")} ${ui.daySwapMode ? "Swap On" : "Swap mode"}</button>${selectedDayCount === 2 ? `<button class="outline-btn compact-action" data-action="swap-selected-day-tasks">${icon("refresh")} Swap selected</button>` : ""}<button class="outline-btn" data-action="select-all-day-tasks">Select all</button><button class="outline-btn" data-action="deselect-all-day-tasks">Deselect all</button>${selectedDayCount ? `<button class="outline-btn compact-action" data-action="open-modal" data-modal="duplicateTasks">${icon("note")} Copy selected</button>${copyTargetButton}<button class="outline-btn compact-action" data-action="map-selected-day-tasks" ${selectedDayCanRoute ? "" : "disabled"}>${icon("map")} Open route</button><button class="outline-btn compact-action" data-action="copy-selected-day-task-route" ${selectedDayCanRoute ? "" : "disabled"}>${icon("note")} Copy route URL</button><button class="danger-btn compact-action" data-action="delete-selected-tasks">${icon("trash")} Delete selected</button>` : ""}<button class="outline-btn" data-action="toggle-select-mode">${ui.selectedTasks.length ? "Actions" : "Select"}</button>${calendarUndoButton()}${dayTimeOfDayLegend("day-toolbar-periods")}</div>
      <div class="week-strip">${weekDates().map((iso) => weekDayButton(iso)).join("")}</div>
      <p class="subtle" style="margin-top:-6px;">Tap an event to edit.${ui.daySwapMode ? " Drag one task onto another to swap times." : " Turn Swap mode on before dragging tasks on touch screens."}</p>
      <div class="list day-task-grid ${ui.daySwapMode ? "day-swap-mode" : ""}">${dayTasks.map((task) => taskDayCard(task)).join("") || `<div class="empty-state"><div><h2>No tasks for this day</h2><button class="primary-btn" data-action="open-modal" data-modal="editTask">${icon("plus")} Add Task</button></div></div>`}</div>`;
  }

  function dayTimeOfDayLegend(extraClass = "") {
    const items = [
      { key: "morning", label: "Morning", iconName: "morning" },
      { key: "afternoon", label: "Afternoon", iconName: "afternoon" },
      { key: "night", label: "Night", iconName: "night" },
      { key: "late-night", label: "Late Night", iconName: "late-night" }
    ];
    return `<div class="time-of-day-legend ${extraClass}">${items.map((item) => `<span class="time-period-chip ${item.key}">${icon(item.iconName)} ${item.label}</span>`).join("")}</div>`;
  }

  function tasksForDay(iso) {
    return calendarItemsForDay(iso)
      .sort((a, b) => taskSortValue(a) - taskSortValue(b));
  }

  function taskSortValue(task) {
    if (!task.start) return 24 * 60 + 1;
    return minutes(task.start);
  }

  function weekDayButton(iso) {
    const isToday = iso === todayIso();
    const isCopyTarget = ui.view === "calendar" && ui.calendarView === "day" && ui.selectedTasks.length && ui.dayCopyTargetDate === iso && iso !== ui.selectedDate;
    const canPickCopyTarget = ui.view === "calendar" && ui.calendarView === "day" && ui.selectedTasks.length && iso !== ui.selectedDate;
    return `<div class="week-day weather-motion-host ${calendarToneClass(iso)} ${iso === ui.selectedDate ? "active" : ""} ${isToday ? "is-today" : ""} ${isCopyTarget ? "copy-target" : ""}" style="${calendarDateColorStyle(iso)}" data-double-date="${iso}" ${calendarWeekdayAttr(iso)} data-copy-target-date="${iso}">
      ${dateViewZones(iso)}
      ${weatherMotionLayer(iso)}
      ${calendarDateCardContent(iso)}
      ${canPickCopyTarget ? `<button class="copy-here-chip" data-action="select-day-copy-target" data-date="${iso}">${isCopyTarget ? `${icon("check")} Target` : "Copy here"}</button>` : ""}
    </div>`;
  }

  function calendarToneForWeekday(weekday) {
    return calendarDayTones[weekday] || "weekday";
  }

  function calendarDateTone(iso) {
    return calendarToneForWeekday(parseLocalDate(iso).getDay());
  }

  function getStoredCalendarPalette() {
    try {
      const saved = localStorage.getItem(calendarPaletteStorageKey);
      return calendarPaletteSchemes[saved] ? saved : "bold";
    } catch (error) {
      return "bold";
    }
  }

  function setCalendarPalette(key) {
    if (!calendarPaletteSchemes[key]) return;
    activeCalendarPalette = key;
    try {
      localStorage.setItem(calendarPaletteStorageKey, key);
    } catch (error) {
      // Storage can be blocked in private browsers; the live view should still update.
    }
    render();
  }

  function setCalendarDayColor(dayIndex, color, options = {}) {
    const index = Number(dayIndex);
    const key = calendarDayColorKeys[index];
    if (!key || !isHexColor(color)) return;
    data.settings = data.settings || {};
    data.settings.calendarDayColors = normalizeCalendarDayColors(data.settings.calendarDayColors);
    data.settings.calendarDayColors[key] = color;
    if (options.live) {
      applyCalendarDayColorPreview(index, color);
      queueCalendarDayColorSave();
      return;
    }
    if (calendarDayColorSaveTimer) {
      window.clearTimeout(calendarDayColorSaveTimer);
      calendarDayColorSaveTimer = null;
    }
    saveData({ undo: false });
    if (options.render !== false) render();
    if (!options.quiet) showToast(`${weekdayLabels[index]} color updated across all calendar views.`);
  }

  function queueCalendarDayColorSave() {
    if (calendarDayColorSaveTimer) window.clearTimeout(calendarDayColorSaveTimer);
    calendarDayColorSaveTimer = window.setTimeout(() => {
      calendarDayColorSaveTimer = null;
      saveData({ undo: false });
    }, 260);
  }

  function resetCalendarDayColors() {
    data.settings = data.settings || {};
    data.settings.calendarDayColors = {};
    saveData({ undo: false });
    render();
    showToast("Calendar day colors reset to the selected style.");
  }

  function calendarToneVars(tone) {
    const scheme = calendarPaletteSchemes[activeCalendarPalette] || calendarPaletteSchemes.bold;
    return scheme.tones[tone] || scheme.tones.weekday || calendarPaletteSchemes.bold.tones.weekday;
  }

  function calendarDayColorValue(weekdayIndex) {
    const key = calendarDayColorKeys[Number(weekdayIndex)];
    const stored = data?.settings?.calendarDayColors?.[key];
    if (isHexColor(stored)) return stored;
    return calendarToneVars(calendarToneForWeekday(Number(weekdayIndex))).accent;
  }

  function calendarDayOverrideColor(weekdayIndex) {
    const key = calendarDayColorKeys[Number(weekdayIndex)];
    const stored = data?.settings?.calendarDayColors?.[key];
    return isHexColor(stored) ? stored : "";
  }

  function calendarCustomColorStyle(color) {
    return `--day-bg:color-mix(in srgb, ${color} 13%, white);--day-bg-2:color-mix(in srgb, ${color} 36%, white);--day-border:color-mix(in srgb, ${color} 72%, white);--day-accent:${color};--day-color:linear-gradient(145deg, color-mix(in srgb, ${color} 13%, white), color-mix(in srgb, ${color} 36%, white));`;
  }

  function applyCalendarDayColorPreview(dayIndex, color) {
    const index = Number(dayIndex);
    if (!Number.isInteger(index) || !isHexColor(color) || typeof document === "undefined") return;
    document.querySelectorAll(`[data-calendar-weekday="${index}"]`).forEach((el) => {
      el.style.setProperty("--day-bg", `color-mix(in srgb, ${color} 13%, white)`);
      el.style.setProperty("--day-bg-2", `color-mix(in srgb, ${color} 36%, white)`);
      el.style.setProperty("--day-border", `color-mix(in srgb, ${color} 72%, white)`);
      el.style.setProperty("--day-accent", color);
      el.style.setProperty("--day-color", `linear-gradient(145deg, color-mix(in srgb, ${color} 13%, white), color-mix(in srgb, ${color} 36%, white))`);
    });
  }

  function calendarToneStyle(tone) {
    const vars = calendarToneVars(tone);
    return `--day-bg:${vars.bg};--day-bg-2:${vars.bg2};--day-border:${vars.border};--day-accent:${vars.accent};--day-color:linear-gradient(145deg, ${vars.bg}, ${vars.bg2});`;
  }

  function calendarToneStyleByIndex(index) {
    const override = calendarDayOverrideColor(index);
    return override ? calendarCustomColorStyle(override) : calendarToneStyle(calendarToneForWeekday(index));
  }

  function calendarDateColorStyle(iso) {
    return calendarToneStyleByIndex(parseLocalDate(iso).getDay());
  }

  function calendarWeekdayAttr(iso) {
    return `data-calendar-weekday="${parseLocalDate(iso).getDay()}"`;
  }

  function calendarToneClass(iso) {
    return `cal-day--${calendarDateTone(iso)}`;
  }

  function calendarDateCardContent(iso) {
    const d = new Date(`${iso}T12:00:00`);
    const tasks = calendarItemsForDay(iso);
    const dayHours = round1(totalTaskHours(tasks));
    return `<div class="date-cell-content">
      <div class="subtle">${calendarWeekdayGlowLabel(d.toLocaleDateString("en-US", { weekday: "short" }))}</div>
      <strong>${d.getDate()}</strong>
      ${weatherChip(iso, "mini")}
      <div class="event-dots">${tasks.length ? `<span class="dot blue"></span>` : ""}${data.bills.some((b) => b.dueDate === iso) ? `<span class="dot coral"></span>` : ""}</div>
      ${dayHours ? `<span class="hour-chip">${dayHours}h</span>` : ""}
    </div>`;
  }

  function calendarWeekdayGlowLabel(label) {
    const text = String(label || "").slice(0, 3);
    const letters = text.split("").map((letter) => `<span>${esc(letter)}</span>`).join("");
    return `<span class="calendar-weekday-name" aria-label="${esc(text)}">${letters}</span>`;
  }

  function dateViewZones(iso) {
    const zones = [
      ["month", "top-left", "Month view", "M"],
      ["week", "top-right", "Week view", "W"],
      ["day", "bottom-left", "Day view", "D"],
      ["block", "bottom-right", "Block view", "B"]
    ];
    return `<div class="date-view-zones has-zone-labels">${zones.map(([view, zone, label, letter]) => `<button class="date-zone ${zone}" data-action="set-calendar-date-view" data-date="${iso}" data-view="${view}" data-letter="${letter}" aria-label="${label} for ${dateLabel(iso)}" title="${label}"><span class="date-zone-label" data-letter="${letter}" aria-hidden="true">${letter}</span></button>`).join("")}</div>`;
  }

  function visibleCalendarTasks(tasks) {
    return tasks.filter((task) => isTaskCategoryEnabled(taskCategory(task)));
  }

  function taskCategory(task) {
    if (task && task.category && taskCategories.includes(task.category)) return task.category;
    if (task && (String(task.repeat || "").toLowerCase() !== "none" || (task.tags || []).includes("habit"))) return "Habit";
    if (task && task.billId) return "Finance";
    if (task && task.projectId) return "Project";
    return "General";
  }

  function taskCategoryLabel(category) {
    return category === ADD_TASK_CATEGORY_VALUE ? "+ Add new category" : category;
  }

  function isTaskCategoryEnabled(category) {
    return ui.taskCategoryFilters[category] !== false;
  }

  function taskCategoryColor(category) {
    return data?.settings?.categoryColors?.[category] || defaultCategoryColors[category] || "#8892b0";
  }

  function taskTimeOfDay(task) {
    const startMinutes = minutes(task?.start || "");
    if (!task?.start) return { key: "afternoon", label: "No time set", iconName: "afternoon" };
    if (startMinutes >= 5 * 60 && startMinutes < 12 * 60) return { key: "morning", label: "Morning task", iconName: "morning" };
    if (startMinutes >= 12 * 60 && startMinutes < 18 * 60) return { key: "afternoon", label: "Afternoon task", iconName: "afternoon" };
    if (startMinutes >= 23 * 60 || startMinutes < 5 * 60) return { key: "late-night", label: "Late night task", iconName: "late-night" };
    return { key: "night", label: "Night task", iconName: "night" };
  }

  function taskTimeOfDayBadge(task) {
    const meta = taskTimeOfDay(task);
    return `<span class="time-of-day-badge ${meta.key}" title="${esc(meta.label)} starting at ${esc(timeLabel(task.start))}" aria-label="${esc(meta.label)}">${icon(meta.iconName)}</span>`;
  }

  function taskDayCard(task) {
    const selected = ui.selectedTasks.includes(task.id);
    const taskImage = entityImage(task);
    const deleteAction = task.isHabit ? "delete-habit" : "delete-task";
    const editButton = task.isHabit
      ? `<button class="outline-btn" data-action="edit-habit-instance" data-id="${task.id}">${icon("edit")} Edit</button>`
      : `<button class="outline-btn" data-action="open-modal" data-modal="editTask" data-id="${task.id}">${icon("edit")} Edit</button>`;
    const habit = task.isHabit ? data.habits.find((item) => item.id === task.habitId) : null;
    const habitDone = Boolean(task.isHabit && habitCompletedOn(habit, task.date));
    const doneButton = task.isHabit
      ? `<button class="${habitDone ? "outline-btn" : "success-btn"}" data-action="toggle-habit-completion" data-id="${task.habitId}" data-date="${task.date}">${icon("check")} ${habitDone ? "Undo Done" : "Mark Done"}</button>`
      : `<button class="primary-btn" data-action="complete-task" data-id="${task.id}">${icon("check")} Done</button>`;
    return `<article class="task-card day-task-card compact-day-task ${taskImage ? "has-task-picture" : ""} ${task.status === "Completed" ? "complete" : ""}" data-task-id="${task.id}" style="${selected ? "background:#eaf4ff;border-color:#8dc8ff;" : ""}">
      ${taskImage ? `<span class="day-task-picture" ${dayTaskPictureStyle(task)}><img src="${esc(taskImage)}" alt=""></span>` : ""}
      ${taskTimeOfDayBadge(task)}
      <button class="icon-btn task-select-square ${selected ? "selected" : ""}" data-action="toggle-task-select" data-id="${task.id}" aria-label="${selected ? "Deselect" : "Select"} task" aria-pressed="${selected ? "true" : "false"}">${selected ? icon("check") : ""}</button>
      <div class="card-row">
        <div class="day-task-main">
          <div class="day-task-title-row">
            <h2 class="entity-title">${esc(task.title)}</h2>
          </div>
          <div class="day-task-body">
            <div class="task-meta">
              <span class="category-pill" style="--category-color:${taskCategoryColor(taskCategory(task))}">${esc(taskCategory(task))}</span>
              ${taskProjectBadge(task)}
              ${(task.tags || []).map((tag) => `<span class="tag">#${esc(tag)}</span>`).join("")}
            </div>
            <div class="task-time-preview">
              <button class="start-time-row" data-action="open-modal" data-modal="quickTime" data-id="${task.id}">${icon("start")} <span class="task-time-label">Start: ${dateLabel(task.date)} ${timeLabel(task.start)}</span></button>
              <button class="end-time-row" data-action="open-modal" data-modal="quickTime" data-id="${task.id}">${icon("end")} <span class="task-time-label">End: ${dateLabel(taskEndDate(task))} ${timeLabel(task.end)}</span></button>
              <button class="duration-chip" data-action="open-modal" data-modal="quickTime" data-id="${task.id}"><span class="task-time-label">${durationText(task)}</span></button>
            </div>
            <div class="task-quick-controls"><span class="task-quick-badge-stack">${taskQuickBadge(task, "priority")}${taskQuickBadge(task, "status")}</span><button class="icon-btn danger-text task-delete-inline" data-action="${deleteAction}" data-id="${task.id}" aria-label="Delete ${task.isHabit ? "habit occurrence" : "task"}">${icon("trash")}</button></div>
          </div>
        </div>
      </div>
      ${taskAddressRow(task, true)}
      ${taskChecklistPreview(task, 3)}
      <div class="sheet-actions compact-card-actions">
        ${editButton}
        ${task.isHabit ? `<button class="outline-btn" data-action="navigate" data-view="habits">${icon("chart")} Stats</button>` : `<button class="outline-btn" data-action="open-modal" data-modal="taskNotify" data-id="${task.id}">${icon("bell")} Notify</button>`}
        ${doneButton}
      </div>
    </article>`;
  }

  function dayTaskPictureStyle(task) {
    const opacity = task?.imageOpacity === undefined ? 0.28 : task.imageOpacity;
    return `style="--media-zoom:${imageZoom(task?.imageZoom || 1)};--media-x:${imagePan(task?.imageX || 0)}%;--media-y:${imagePan(task?.imageY || 0)}%;--media-fit:${imageFit(task?.imageFit || "cover")};--day-picture-opacity:${imageOpacity(opacity)};"`;
  }

  function calendarWeek2() {
    return calendarBlock({ variant: "week2" });
  }

  function calendarBlock(options = {}) {
    const variant = options.variant || "block";
    const week2 = variant === "week2";
    const weekdays = weekDates();
    const tasks = calendarItemsForRange(weekdays[0], weekdays[6]).filter((task) => task.start && task.end);
    const countedTasks = tasks.filter((task) => task.includeHours);
    const handleStyle = ui.blockHandleStyle || "interactive";
    const range = blockFocusRange();
    const style = blockRangeStyle(range);
    const selectedCount = tasks.filter((task) => ui.selectedTasks.includes(task.id)).length;
    const heads = `<div class="block-head time-head week-timetable-head week-timetable-time-head">${week2 ? "Time" : "AM/PM"}</div>${weekdays.map((iso) => {
      const stateClass = `${iso === todayIso() ? "is-today" : ""} ${iso === ui.selectedDate ? "is-selected-day" : ""}`;
      return `<div class="block-head block-head-button week-timetable-head week-timetable-day-head weather-motion-host ${calendarToneClass(iso)} ${stateClass}" style="${calendarDateColorStyle(iso)}" data-double-date="${iso}" ${calendarWeekdayAttr(iso)} title="Open ${dateFull(iso)}">
        ${dateViewZones(iso)}
        ${weatherMotionLayer(iso)}
        ${calendarDateCardContent(iso)}
      </div>`;
    }).join("")}<div class="block-head time-head time-head-right week-timetable-head week-timetable-time-head">24h</div>`;
    const leftLabels = blockHourLabels(range, "left");
    const rightLabels = blockHourLabels(range, "right");
    const cols = weekdays.map((iso) => {
      const dayTasks = tasks.filter((task) => task.date === iso);
      const stateClass = `${iso === todayIso() ? "is-today" : ""} ${iso === ui.selectedDate ? "is-selected-day" : ""}`;
      return `<div class="block-col weather-motion-host ${calendarToneClass(iso)} ${stateClass}" style="${calendarDateColorStyle(iso)}" data-date="${iso}" ${calendarWeekdayAttr(iso)}>${weatherMotionLayer(iso, "weather-motion-grid")}${dayTasks.map((task) => blockEvent(task, dayTasks)).join("")}</div>`;
    }).join("");
    const focusKey = normalizedBlockFocusKey();
    const drawMode = Boolean(ui.blockDrawMode);
    const selectedActionButton = selectedCount ? `<button class="outline-btn compact-action block-selected-actions-btn" data-action="open-modal" data-modal="taskActions">${icon("note")} Actions (${selectedCount})</button>` : "";
    const blockSelectTools = `<div class="block-select-tools"><button class="outline-btn" data-action="toggle-block-select-mode">${ui.blockSelectMode ? "Done selecting" : "Select tasks"}</button>${ui.blockSelectMode ? `<button class="outline-btn" data-action="select-visible-block-tasks">Select week</button><button class="outline-btn" data-action="clear-selected-tasks">Clear</button>${selectedCount ? `<button class="outline-btn" data-action="open-modal" data-modal="taskActions">${icon("check")} Actions</button><button class="danger-btn compact-action" data-action="delete-selected-tasks">${icon("trash")} Delete selected</button>` : ""}` : ""}</div>`;
    const helperText = week2
      ? "Week 2 keeps the clean week grid while preserving block drag, draw, select, repeat, and timed-task controls."
      : "Double-tap empty grid space or tap a spot, then Timed Task. Desktop can still drag empty space.";
    return `<div class="calendar-summary block-toolbar ${week2 ? "week2-toolbar" : ""}">${icon("bell")} <span class="calendar-summary-label">${week2 ? "Week 2 total:" : "Week total:"}</span><strong>${round1(totalTaskHours(countedTasks))}h</strong><span class="muted">${ui.blockSelectMode ? `${selectedCount}/${tasks.length} selected` : helperText}</span>${selectedActionButton}<span class="block-toolbar-break" aria-hidden="true"></span><div class="handle-style-picker"><span class="subtle">Zoom</span>${blockZoomOptions().map((option) => `<button class="${String(ui.blockZoom) === option.value ? "active" : ""}" data-action="set-tab" data-key="blockZoom" data-value="${option.value}">${option.label}</button>`).join("")}</div><div class="handle-style-picker focus-picker"><span class="subtle">Focus</span>${blockFocusOptions().map((option) => `<button class="${focusKey === option.value ? "active" : ""}" data-action="set-tab" data-key="blockTimeFocus" data-value="${option.value}" title="${esc(option.title || option.label)}">${option.iconName ? icon(option.iconName) : ""}${option.label}</button>`).join("")}</div><div class="handle-style-picker"><span class="subtle">Handles</span>${["interactive", "light", "solid"].map((styleOption) => `<button class="${handleStyle === styleOption ? "active" : ""}" data-action="set-tab" data-key="blockHandleStyle" data-value="${styleOption}">${filterLabel(styleOption)}</button>`).join("")}</div>${blockSelectTools}${calendarUndoButton()}<button class="outline-btn block-timed-task-btn" style="min-height:32px;margin-left:auto;" data-action="open-block-quick-create">${icon("plus")} Timed Task</button></div>
      <div class="block-mobile-actions ${drawMode ? "is-drawing" : ""} ${ui.blockSelectMode ? "is-selecting" : ""}"><button class="primary-btn block-phone-create-btn" data-action="open-block-quick-create">${icon("plus")} Phone Create</button><button class="${drawMode ? "primary-btn" : "outline-btn"}" data-action="toggle-block-draw-mode">${icon(drawMode ? "check" : "edit")} ${drawMode ? "Tap Place On" : "Tap Place"}</button><button class="${ui.blockSelectMode ? "primary-btn" : "outline-btn"}" data-action="toggle-block-select-mode">${icon("check")} ${ui.blockSelectMode ? "Selecting" : "Select tasks"}</button><button class="outline-btn" data-action="open-modal" data-modal="editTask">${icon("plus")} Full Task</button>${ui.blockSelectMode ? `<button class="outline-btn" data-action="select-visible-block-tasks">${icon("check")} Select week</button>${selectedCount ? `<button class="danger-btn" data-action="delete-selected-tasks">${icon("trash")} Delete ${selectedCount}</button><button class="outline-btn" data-action="open-modal" data-modal="taskActions">${icon("check")} Actions</button>` : ""}<button class="outline-btn" data-action="clear-selected-tasks">${icon("close")} Clear</button>` : ""}<span class="subtle">${drawMode ? "Press and drag empty grid space to draw the task time. A single tap creates a one-hour task there." : ui.blockSelectMode ? "Select mode on: tap task blocks, then delete or open actions." : "Android/iPhone: double-tap to create, or double-tap and hold-drag to set the time."}</span></div>
      <div class="block-scroll ${week2 ? "week2-scroll" : ""} ${drawMode ? "block-draw-scroll" : ""} ${ui.blockSelectMode ? "block-select-scroll" : ""}"><div class="block-calendar ${week2 ? "block-calendar--week2" : ""} handle-${handleStyle} ${ui.blockSelectMode ? "block-select-mode" : ""} ${drawMode ? "block-draw-mode" : ""}" style="${style}">${heads}<div class="time-col">${leftLabels}</div>${cols}<div class="time-col-right">${rightLabels}</div></div></div>`;
  }

  function blockEvent(task, dayTasks = []) {
    const range = blockFocusRange();
    const scale = blockMinuteScale();
    const window = blockEventWindow(task, range);
    const start = window.start;
    const end = window.end;
    if (end <= range.start || start >= range.end) return "";
    const visibleStart = clamp(start, range.start, range.end);
    const visibleEnd = clamp(end, range.start, range.end);
    const top = Math.max(0, (visibleStart - range.start) * scale);
    const duration = Math.max(0, end - start);
    const height = Math.max(24, (visibleEnd - visibleStart) * scale);
    const cancelled = task.status === "Cancelled";
    const topHandle = cancelled ? "transparent" : priorityColor(task.priority);
    const bottomHandle = statusHandleColor(task.status);
    const bg = blockTaskColor(task);
    const selected = ui.selectedTasks.includes(task.id);
    const short = duration < 120;
    const micro = duration <= 30;
    const boundary = blockBoundaryInfo(task, dayTasks, range);
    return `<div class="event-block ${task.includeHours ? "" : "not-counted"} ${selected ? "is-selected" : ""} ${short ? "short-block" : ""} ${micro ? "micro-block" : ""} ${boundary.startsHere ? "has-start-boundary" : ""} ${boundary.endsHere ? "has-end-boundary" : ""} status-${statusSlug(task.status)}" style="top:${top}px;height:${height}px;--event-bg:${bg};--top-handle:${topHandle};--bottom-handle:${bottomHandle};--task-font:${taskFontFamily(task)};" data-title="${esc(task.title)}" title="${short ? esc(task.title) : ""}" data-task-id="${task.id}" role="button" tabindex="0" aria-label="${esc(`${task.title}, ${durationLabel(duration)}`)}">
      ${boundary.startsHere ? `<span class="block-boundary block-boundary-start">Start ${esc(timeLabel(task.start))}</span>` : ""}
      ${boundary.endsHere ? `<span class="block-boundary block-boundary-end">End ${esc(timeLabel(task.end))}</span>` : ""}
      ${(ui.blockSelectMode || selected) ? `<button class="block-select-button ${selected ? "active" : ""}" data-action="toggle-task-select" data-id="${task.id}" aria-label="${selected ? "Deselect" : "Select"} ${esc(task.title)}">${selected ? icon("check") : ""}</button>` : ""}
      <span class="block-resize block-resize-top" data-resize="top" data-tooltip="Priority: ${esc(task.priority)}" title="Priority: ${esc(task.priority)}" aria-label="Priority: ${esc(task.priority)}"></span>
      <span class="block-repeat block-repeat-left" data-repeat="left" data-tooltip="Drag left and up/down to duplicate earlier with shifted times" title="Drag left and up/down to duplicate earlier with shifted times" aria-label="Duplicate earlier days and shift time"></span>
      <div class="event-drag-area">
        <strong class="block-event-title">${esc(task.title)}</strong>
        <span class="block-duration">${durationLabel(duration)}</span>
        <span class="block-time-range">${micro ? esc(blockMicroTimeRange(task.start, task.end)) : `${timeLabel(task.start)} - ${timeLabel(task.end)}`}</span>${task.includeHours ? "" : `<span>not counted</span>`}
      </div>
      <span class="block-repeat block-repeat-right" data-repeat="right" data-tooltip="Drag right and up/down to duplicate later with shifted times" title="Drag right and up/down to duplicate later with shifted times" aria-label="Duplicate later days and shift time"></span>
      <span class="block-resize block-resize-bottom" data-resize="bottom" data-tooltip="Status: ${esc(task.status)}" title="Status: ${esc(task.status)}" aria-label="Status: ${esc(task.status)}"></span>
    </div>`;
  }

  function blockMicroTimeRange(startTime, endTime) {
    const startLabel = timeLabel(startTime);
    const endLabel = timeLabel(endTime);
    const startPeriod = startLabel.endsWith("AM") ? "AM" : startLabel.endsWith("PM") ? "PM" : "";
    const endPeriod = endLabel.endsWith("AM") ? "AM" : endLabel.endsWith("PM") ? "PM" : "";
    if (startPeriod && startPeriod === endPeriod) return `${startLabel.replace(` ${startPeriod}`, "")}-${endLabel}`;
    return `${startLabel}-${endLabel}`;
  }

  function blockBoundaryInfo(task, dayTasks, range = blockFocusRange()) {
    const current = blockEventWindow(task, range);
    const start = current.start;
    const end = current.end;
    return dayTasks.reduce((info, other) => {
      if (!other || other.id === task.id || !other.start || !other.end) return info;
      const otherWindow = blockEventWindow(other, range);
      const otherStart = otherWindow.start;
      const otherEnd = otherWindow.end;
      if (otherEnd === start) info.startsHere = true;
      if (otherStart === end) info.endsHere = true;
      return info;
    }, { startsHere: false, endsHere: false });
  }

  function blockZoomOptions() {
    return [
      { value: "0.75", label: "Fit" },
      { value: "1", label: "1x" },
      { value: "1.5", label: "1.5x" },
      { value: "2", label: "2x" },
      { value: "3", label: "3x" }
    ];
  }

  function blockFocusOptions() {
    return [
      { value: "full", label: "Full" },
      { value: "morning", label: "Morning", title: "Morning: 5:00 AM to 11:59 AM", iconName: "morning" },
      { value: "lunch", label: "Lunch", title: "Lunch: 12:00 PM to 5:59 PM", iconName: "noon" },
      { value: "night", label: "Night", title: "Night: 6:00 PM to 10:59 PM", iconName: "night" },
      { value: "late", label: "Late", title: "Late Night: 11:00 PM to 4:59 AM", iconName: "late-night" }
    ];
  }

  function normalizedBlockFocusKey() {
    const aliases = { "3-9": "morning", "6-12": "morning", work: "lunch", evening: "night" };
    const key = ui.blockTimeFocus || "full";
    return ["full", "morning", "lunch", "night", "late"].includes(key) ? key : aliases[key] || "full";
  }

  function blockFocusRange() {
    const ranges = {
      full: [0, 24 * 60],
      morning: [5 * 60, 12 * 60],
      lunch: [12 * 60, 18 * 60],
      night: [18 * 60, 23 * 60],
      late: [23 * 60, 29 * 60]
    };
    const [start, end] = ranges[normalizedBlockFocusKey()] || ranges.full;
    return { start, end };
  }

  function blockEventWindow(task, range = blockFocusRange()) {
    let start = minutes(task?.start || "");
    let end = minutes(task?.end || "");
    if (end <= start) end += 24 * 60;
    const wrapEnd = range.end - 24 * 60;
    if (range.end > 24 * 60 && start < range.start && start < wrapEnd) {
      start += 24 * 60;
      end += 24 * 60;
    }
    return { start, end };
  }

  function blockEndDateFor(date, startMinute, endMinute) {
    return startMinute < 24 * 60 && endMinute >= 24 * 60 ? addDaysIso(date, 1) : date;
  }

  function blockMinuteScale() {
    const parsed = Number(ui.blockZoom);
    return clamp(Number.isFinite(parsed) ? parsed : 1, 0.75, 3);
  }

  function blockRangeStyle(range = blockFocusRange()) {
    const scale = blockMinuteScale();
    const dayHeight = Math.max(120, (range.end - range.start) * scale);
    return `--block-day-height:${dayHeight}px;--block-hour-height:${60 * scale}px;--block-quarter-height:${15 * scale}px;`;
  }

  function blockHourLabels(range, side) {
    const labels = [];
    for (let minute = range.start; minute < range.end; minute += 60) {
      const hour = ((Math.floor(minute / 60) % 24) + 24) % 24;
      const right = side === "right";
      labels.push(`<div class="time-label ${right ? "right" : ""} ${hour % 3 === 0 ? "is-major-hour" : ""}">${right ? `${String(hour).padStart(2, "0")}:00` : ampmHourLabel(hour)}</div>`);
    }
    return labels.join("");
  }

  function blockMinuteToPixel(minute) {
    const range = blockFocusRange();
    return (minute - range.start) * blockMinuteScale();
  }

  function blockPixelToMinute(pixelY) {
    const range = blockFocusRange();
    return range.start + pixelY / blockMinuteScale();
  }

  function blockMinuteDelta(pixelDelta) {
    return snapMinutes(pixelDelta / blockMinuteScale());
  }

  function ampmHourLabel(hour) {
    hour = ((hour % 24) + 24) % 24;
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  }

  function minutes(time) {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function addMinutesToTime(time, deltaMinutes) {
    const total = ((minutes(time) + Number(deltaMinutes || 0)) % (24 * 60) + 24 * 60) % (24 * 60);
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function totalTaskHours(tasks) {
    return tasks.reduce((total, task) => {
      if (!task.start || !task.end || !task.includeHours) return total;
      return total + taskDurationMinutes(task) / 60;
    }, 0);
  }

  function hoursForMonth() {
    const date = parseLocalDate(ui.selectedDate);
    const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return round1(totalTaskHours(calendarItemsForRange(`${prefix}-01`, monthEndIso(ui.selectedDate))));
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function durationText(task) {
    if (!task.start || !task.end) return `${icon("bell")} Set duration`;
    const diff = taskDurationMinutes(task);
    return `${icon("bell")} ${durationLabel(diff)}`;
  }

  function taskDurationMinutes(task) {
    if (!task?.start || !task?.end) return 0;
    let start = minutes(task.start);
    let end = minutes(task.end);
    if (end <= start) end += 24 * 60;
    return Math.max(0, end - start);
  }

  function taskEndDate(task) {
    return task.endDate || task.date || ui.selectedDate;
  }

  function durationLabel(totalMinutes) {
    const minutesValue = Math.max(0, Number(totalMinutes || 0));
    if (minutesValue >= 60) return `${round1(minutesValue / 60)}h`;
    return `${minutesValue}m`;
  }

  function priorityColor(priority) {
    const map = { Low: "#ffc107", Medium: "#ff9800", High: "#f44336", Urgent: "#b91c1c" };
    return map[priority] || map.Medium;
  }

  function statusHandleColor(status) {
    const map = { "Not Started": "#8892b0", "In Progress": "#2196f3", Completed: "#4caf50", Cancelled: "transparent" };
    return map[status] || map["Not Started"];
  }

  function noteImportanceColor(importance) {
    const map = { Low: "#ffc107", Medium: "#ff9800", High: "#f44336", Critical: "#b91c1c" };
    return map[importance] || map.Low;
  }

  function noteImportanceRank(importance) {
    return { Critical: 4, High: 3, Medium: 2, Low: 1 }[importance] || 0;
  }

  function badgeTextColor(color) {
    return color === "#ffffff" || color === "#ffc107" || color === "transparent" ? "#1a1f36" : "#ffffff";
  }

  function badgeBackground(color) {
    if (color === "transparent") return "transparent";
    if (color === "#ffffff") return "#ffffff";
    return color;
  }

  function taskQuickBadge(task, kind) {
    const isPriority = kind === "priority";
    const value = isPriority ? task.priority || "Medium" : task.status || "Not Started";
    const color = isPriority ? priorityColor(value) : statusHandleColor(value);
    const label = isPriority ? "Priority" : "Status";
    const action = "toggle-task-picker";
    const open = ui.taskPicker?.taskId === task.id && ui.taskPicker?.kind === kind;
    const options = isPriority ? taskPriorityOptions : taskStatusOptions;
    const optionAction = isPriority ? "set-task-priority" : "set-task-status";
    const colorer = isPriority ? priorityColor : statusHandleColor;
    const bg = badgeBackground(color);
    const text = badgeTextColor(color);
    return `<span class="quick-picker-wrap">
      <button class="status quick-badge ${isPriority ? "priority-badge" : "status-badge"}" style="--badge-color:${color};--badge-bg:${bg};--badge-text:${text};background:${bg};border-color:${color};color:${text};" data-action="${action}" data-id="${task.id}" data-kind="${kind}" title="Select ${label.toLowerCase()}">${label}: ${esc(value)}</button>
      ${open ? `<span class="quick-picker" role="menu" aria-label="${esc(label)} options">
        ${options.map((option) => {
          const optionColor = colorer(option);
          const optionBg = badgeBackground(optionColor);
          const optionText = badgeTextColor(optionColor);
          return `<button style="--badge-color:${optionColor};--badge-bg:${optionBg};--badge-text:${optionText};background:${optionBg};border-color:${optionColor};color:${optionText};" data-action="${optionAction}" data-id="${task.id}" data-value="${esc(option)}" role="menuitem">${esc(option)}</button>`;
        }).join("")}
      </span>` : ""}
    </span>`;
  }

  function taskChecklistText(task) {
    return normalizeSubtasks(task?.subtasks).map((item) => `${item.done ? "[x]" : "[ ]"} ${item.text}`).join("\n");
  }

  function parseTaskChecklist(raw, previous = []) {
    const previousByText = new Map(normalizeSubtasks(previous).map((item) => [item.text.toLowerCase(), item]));
    return String(raw || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const done = /^\[(x|X|✓|check|done)\]\s*/.test(line) || /^[-*]\s*\[(x|X)\]\s*/.test(line);
        const text = line
          .replace(/^[-*]\s*/, "")
          .replace(/^\[(x|X|✓|check|done|\s*)\]\s*/, "")
          .trim();
        const existing = previousByText.get(text.toLowerCase());
        return { id: existing?.id || id("subtask"), text, done };
      })
      .filter((item) => item.text);
  }

  function taskChecklistPreview(task, limit = 5) {
    const subtasks = normalizeSubtasks(task?.subtasks);
    if (!subtasks.length) return "";
    const done = subtasks.filter((item) => item.done).length;
    const pct = progressPct(done, subtasks.length);
    return `<div class="task-checklist">
      <div class="task-checklist-head"><strong>Checklist</strong><span>${done}/${subtasks.length}</span></div>
      <div class="progress green" style="--value:${pct}%"><span></span></div>
      <div class="checklist-items">
        ${subtasks.slice(0, limit).map((item) => `<button class="${item.done ? "done" : ""}" data-action="toggle-subtask" data-id="${task.id}" data-subtask="${item.id}"><span>${item.done ? icon("check") : ""}</span>${esc(item.text)}</button>`).join("")}
        ${subtasks.length > limit ? `<span class="subtle">+${subtasks.length - limit} more items</span>` : ""}
      </div>
    </div>`;
  }

  function taskProjectName(task) {
    return data.projects.find((project) => project.id === task.projectId)?.name || "";
  }

  function taskAddress(task) {
    return data.addresses.find((address) => address.id === task.addressId);
  }

  function taskContact(task) {
    return data.contacts.find((contact) => contact.id === task.contactId);
  }

  function contactGroupsForContact(contactId) {
    const contact = data.contacts.find((item) => item.id === contactId);
    return (data.contactGroups || []).filter((group) => safeArray(group.contactIds).includes(contactId) || safeArray(contact?.groupIds).includes(group.id));
  }

  function taskProjectBadge(task) {
    const project = data.projects.find((item) => item.id === task.projectId);
    const label = project?.name || "Unassigned";
    return `<button class="status muted quick-project task-project-assign" data-action="open-modal" data-modal="assignProject" data-id="${task.id}" title="Change task project">${icon("folder")} <span>Project: ${esc(label)}</span>${icon("edit")}</button>`;
  }

  function taskAddressRow(task, reserve = false) {
    const addr = taskAddress(task);
    if (!addr) {
      if (!reserve) return "";
      return `<div class="task-address-row empty-address" aria-hidden="true">
        <span class="round-icon">${icon("map")}</span>
        <div><strong>No address</strong><div class="subtle">No address attached</div></div>
        <span class="outline-btn">Maps</span>
      </div>`;
    }
    return `<div class="task-address-row">
      <span class="round-icon task-address-icon ${addressVerified(addr) ? "verified" : ""}">${icon("map")}</span>
      <div><strong>${esc(addr.label)}</strong><div class="subtle">${esc(addressText(addr))}</div></div>
      <a class="outline-btn" href="${esc(mapsSearchUrl(addr))}" target="_blank" rel="noopener">Maps</a>
    </div>`;
  }

  function statusSlug(status) {
    return String(status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function taskBackgroundColor(task) {
    return task?.bgColor || defaultTaskBgColor();
  }

  function blockTaskColor(task) {
    if (task?.isHabit && task.color) return task.color;
    return task?.bgColor || task?.color || taskCategoryColor(taskCategory(task));
  }

  function defaultTaskBgColor() {
    return data?.settings?.taskDefaultBgColor || DEFAULT_TASK_BG;
  }

  function taskFontFamily(task) {
    const font = task?.fontFamily || "System";
    const map = {
      System: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      Rounded: "'Arial Rounded MT Bold', 'Trebuchet MS', ui-sans-serif, system-ui",
      Serif: "Georgia, 'Times New Roman', serif",
      Mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    };
    return map[font] || map.System;
  }

  function renderTasks() {
    const done = data.tasks.filter((task) => task.status === "Completed").length;
    const pct = progressPct(done, data.tasks.length);
    const filtered = sortedTaskList(data.tasks.filter((task) => {
      if (ui.taskFilter === "today") return task.date === "2026-05-06";
      if (ui.taskFilter === "week") return weekDates().includes(task.date);
      if (ui.taskFilter === "done") return task.status === "Completed";
      return true;
    }));
    const filteredIds = filtered.map((task) => task.id);
    const selectedIds = filteredIds.filter((taskId) => ui.selectedTasks.includes(taskId));
    const allSelected = filteredIds.length > 0 && selectedIds.length === filteredIds.length;
    return `<section class="screen">
      ${header("Tasks", `<button class="icon-btn" data-action="navigate" data-view="projects">${icon("folder")}</button>`)}
      <div class="quick-add">
        <button class="round-icon quick-voice-btn" data-action="open-modal" data-modal="voiceTask" aria-label="Add task by voice" title="Add task by voice">${icon("mic")}</button>
        <input id="quickTaskInput" placeholder="Quick add task..." />
        <button class="icon-btn primary-btn" data-action="quick-add-task">${icon("check")}</button>
      </div>
      <section class="section-card balance-panel" style="margin-top:16px;">
        <div class="card-row"><h2 class="panel-title" style="color:#fff;">Task Progress</h2><strong>${done}/${data.tasks.length}</strong></div>
        <div class="progress teal" style="--value:${pct}%"><span></span></div>
        <div class="balance-meta"><span>${pct}% complete</span><span>${data.tasks.length - done} remaining</span></div>
      </section>
      <div class="task-control-bar" aria-label="Task filters and sorting">
        <div class="task-control-group">
          ${["all", "today", "week", "done"].map((filter) => `<button class="${ui.taskFilter === filter ? "active" : ""}" data-action="set-tab" data-key="taskFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}
        </div>
        <div class="task-control-group">
          ${["regular", "compact", "gallery"].map((view) => `<button class="${ui.taskView === view ? "active" : ""}" data-action="set-tab" data-key="taskView" data-value="${view}">${filterLabel(view)}</button>`).join("")}
        </div>
        <div class="task-control-group task-sort-group">
          <label class="sort-select-label" for="taskSortSelect">Sort</label>
          <select id="taskSortSelect" class="task-sort-select" aria-label="Sort tasks">
            ${[
              ["newest", "Newest"],
              ["date", "Start date"],
              ["priority", "Priority"],
              ["status", "Status"],
              ["project", "Project"],
              ["title", "Title"]
            ].map(([value, label]) => `<option value="${esc(value)}" ${(ui.taskSort || "newest") === value ? "selected" : ""}>${esc(label)}</option>`).join("")}
          </select>
        </div>
      </div>
      <label class="search-field" style="margin-bottom:12px;">${icon("search")}<input placeholder="Search tasks..." /></label>
      <div class="project-bulk-toolbar task-list-bulk-toolbar">
        <button class="outline-btn" data-action="select-visible-tasks">${icon("check")} ${allSelected ? "Deselect visible" : "Select visible"}</button>
        ${selectedIds.length ? `<button class="outline-btn" data-action="open-modal" data-modal="duplicateTasks">${icon("note")} Copy selected</button><button class="outline-btn" data-action="open-modal" data-modal="assignProject" data-id="${selectedIds[0]}">${icon("folder")} Change project</button><button class="danger-btn" data-action="delete-selected-tasks">${icon("trash")} Delete selected</button><button class="outline-btn" data-action="clear-selected-tasks">${icon("close")} Clear</button>` : ""}
        <span class="muted">${selectedIds.length}/${filtered.length} selected</span>
      </div>
      <div class="list tasks-list tasks-${esc(ui.taskView)}">${filtered.map((task) => taskBoardCard(task)).join("")}</div>
    </section>`;
  }

  function sortedTaskList(tasks) {
    const sort = ui.taskSort || "newest";
    return [...tasks].sort((a, b) => {
      if (sort === "date") return Date.parse(`${a.date || "9999-12-31"}T${a.start || "23:59"}`) - Date.parse(`${b.date || "9999-12-31"}T${b.start || "23:59"}`) || a.title.localeCompare(b.title);
      if (sort === "priority") return priorityRank(b.priority) - priorityRank(a.priority) || a.title.localeCompare(b.title);
      if (sort === "status") return taskStatusOptions.indexOf(a.status) - taskStatusOptions.indexOf(b.status) || a.title.localeCompare(b.title);
      if (sort === "project") return (projectName(a.projectId) || "Unassigned").localeCompare(projectName(b.projectId) || "Unassigned") || a.title.localeCompare(b.title);
      if (sort === "title") return a.title.localeCompare(b.title);
      return taskEditedStamp(b) - taskEditedStamp(a) || a.title.localeCompare(b.title);
    });
  }

  function priorityRank(priority) {
    return { Low: 1, Medium: 2, High: 3, Urgent: 4 }[priority] || 2;
  }

  function taskBoardCard(task) {
    const media = entityImage(task);
    const selected = ui.selectedTasks.includes(task.id);
    return `<article class="task-card task-board-card ${task.status === "Completed" ? "complete" : ""} ${selected ? "selected" : ""}" data-action="open-modal" data-modal="editTask" data-id="${task.id}" role="button" tabindex="0" title="Edit ${esc(task.title)}">
      <div class="card-row">
        <div class="task-board-main">
          <button class="task-mini-select task-board-select ${selected ? "active" : ""}" data-action="toggle-task-select" data-id="${task.id}" aria-label="${selected ? "Deselect" : "Select"} ${esc(task.title)}">${selected ? icon("check") : ""}</button>
          ${taskStartDateBadge(task)}
          ${media ? `<span class="media-thumb small" ${imageStyleAttr(task)}><img src="${esc(media)}" alt=""></span>` : `<span class="dot task-board-priority-dot" style="background:${priorityColor(task.priority)};"></span>`}
          <div class="task-board-copy"><h2 class="entity-title">${esc(task.title)}</h2><div class="entity-subtitle">${esc(task.description)}</div><div class="task-meta">${taskQuickBadge(task, "priority")}${taskQuickBadge(task, "status")}<span class="status warn">${icon("calendar")} ${shortDate(task.date)} ${timeLabel(task.start)} - ${shortDate(taskEndDate(task))} ${timeLabel(task.end)}</span>${taskProjectBadge(task)}${task.repeat !== "None" ? `<span class="status info">${esc(task.repeat)}</span>` : ""}</div></div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" data-action="open-modal" data-modal="editTask" data-id="${task.id}">${icon("edit")}</button>
          <button class="icon-btn danger-text" data-action="delete-task" data-id="${task.id}" aria-label="Delete task">${icon("trash")}</button>
        </div>
      </div>
      ${taskChecklistPreview(task)}
    </article>`;
  }

  function taskStartDateBadge(task) {
    if (!task?.date) return `<span class="task-start-date-badge"><strong>--</strong><small>No date</small></span>`;
    const d = new Date(`${task.date}T12:00:00`);
    return `<span class="task-start-date-badge" title="Starts ${esc(dateLabel(task.date))}"><strong>${d.getDate()}</strong><small>${esc(d.toLocaleDateString("en-US", { month: "short" }))}</small></span>`;
  }

  function renderProjects() {
    const activeProject = data.projects.find((project) => project.id === ui.projectId);
    if (activeProject) return renderProjectDetail(activeProject);
    const unassigned = data.tasks.filter((task) => !task.projectId);
    const projects = sortedProjects();
    return `<section class="screen">
      ${header("Project Tasks", `<button class="icon-btn">${icon("chart")}</button>`)}
      <div class="mini-tabs"><button class="active">${icon("folder")} By Project</button><button>${icon("chart")} Timeline</button></div>
      <div class="filter-row project-sort-row" aria-label="Project sort">
        <span class="sort-label">Sort projects by</span>
        ${[
          ["level", "Level"],
          ["lastEdited", "Last edited task"],
          ["tasks", "Task count"],
          ["name", "Name"]
        ].map(([value, label]) => `<button class="${(ui.projectSort || "level") === value ? "active" : ""}" data-action="set-tab" data-key="projectSort" data-value="${value}">${esc(label)}</button>`).join("")}
      </div>
      <div class="project-tile-grid">
        ${projects.map((project) => projectTile(project)).join("")}
      </div>
      <div class="list">
        ${projectGroup({ id: null, name: "Unassigned", color: "#607d8b" }, unassigned)}
      </div>
    </section>`;
  }

  function sortedProjects() {
    const sort = ui.projectSort || "level";
    return [...data.projects].sort((a, b) => {
      if (sort === "level") return projectLevelRank(b.level) - projectLevelRank(a.level) || a.name.localeCompare(b.name);
      if (sort === "lastEdited") return taskEditedStamp(projectLastEditedTask(b)) - taskEditedStamp(projectLastEditedTask(a)) || a.name.localeCompare(b.name);
      if (sort === "tasks") return projectTasks(b).length - projectTasks(a).length || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }

  function projectTasks(project) {
    return data.tasks.filter((task) => task.projectId === project.id);
  }

  function projectNotes(project) {
    return data.notes.filter((note) => note.projectId === project.id);
  }

  function projectName(projectId) {
    return data.projects.find((project) => project.id === projectId)?.name || "";
  }

  function projectLevelRank(level) {
    return { Low: 1, Medium: 2, High: 3, Critical: 4 }[level] || 2;
  }

  function projectLevelClass(level) {
    return `project-level-${String(level || "Medium").toLowerCase()}`;
  }

  function projectLevelBadge(level) {
    return `<span class="status project-level-badge ${projectLevelClass(level)}">Level: ${esc(level || "Medium")}</span>`;
  }

  function taskEditedStamp(task) {
    if (!task) return 0;
    const parsedEdited = Date.parse(task.updatedAt || "");
    if (Number.isFinite(parsedEdited)) return parsedEdited;
    const parsedSchedule = Date.parse(`${task.date || todayIso()}T${task.start || "00:00"}`);
    return Number.isFinite(parsedSchedule) ? parsedSchedule : 0;
  }

  function projectLastEditedTask(project) {
    return projectTasks(project).sort((a, b) => taskEditedStamp(b) - taskEditedStamp(a))[0] || null;
  }

  function projectLastTaskText(task) {
    if (!task) return "Last edited: none yet";
    const when = task.updatedAt ? dateLabel(task.updatedAt.slice(0, 10)) : dateLabel(task.date);
    return `Last edited: ${task.title} - ${when}`;
  }

  function projectTile(project) {
    const media = entityImage(project);
    const tasks = projectTasks(project);
    const notes = projectNotes(project);
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const lastTask = projectLastEditedTask(project);
    return `<button class="project-picture-tile" data-action="open-project" data-id="${project.id}" data-project-drop="${project.id}" data-project-note-drop="${project.id}" title="Open project or drop tasks/notes here">
      <span class="project-tile-cover" ${imageStyleAttr(project)}>
        ${media ? `<img src="${esc(media)}" alt="">` : `<span class="round-icon" style="color:#fff;background:${esc(project.color || "#1a1f36")}">${icon("folder")}</span>`}
      </span>
      <span class="project-tile-title">${esc(project.name)}</span>
      <span class="project-tile-row">${projectLevelBadge(project.level)}</span>
      <span class="project-tile-meta">${tasks.length} tasks - ${completed} done</span>
      <span class="project-tile-meta">${notes.length} project note${notes.length === 1 ? "" : "s"}</span>
      <span class="project-tile-last" title="${esc(projectLastTaskText(lastTask))}">${esc(projectLastTaskText(lastTask))}</span>
      <span class="project-drop-hint">${icon("task")} Drop task or note here</span>
    </button>`;
  }

  function renderProjectDetail(project) {
    const tasks = projectTasks(project);
    const notes = projectNotes(project);
    const notebooks = data.notebooks.filter((notebook) => notebook.projectId === project.id);
    const media = entityImage(project);
    const done = tasks.filter((task) => task.status === "Completed").length;
    const lastTask = projectLastEditedTask(project);
    const taskIds = tasks.map((task) => task.id);
    const selectedIds = taskIds.filter((taskId) => ui.selectedTasks.includes(taskId));
    const allSelected = taskIds.length > 0 && selectedIds.length === taskIds.length;
    const noteIds = notes.map((note) => note.id);
    const selectedNoteIds = noteIds.filter((noteId) => ui.selectedNotes.includes(noteId));
    const allNotesSelected = noteIds.length > 0 && selectedNoteIds.length === noteIds.length;
    return `<section class="screen">
      ${header(project.name, `<button class="icon-btn" data-action="open-modal" data-modal="editTask">${icon("plus")}</button><button class="icon-btn" data-action="close-project">${icon("close")}</button><button class="icon-btn" data-action="open-modal" data-modal="editProjectName" data-id="${project.id}">${icon("edit")}</button>`)}
      <section class="project-detail-hero">
        <button class="project-detail-cover editable-cover" data-action="open-modal" data-modal="editProjectName" data-id="${project.id}" title="Update project picture" ${imageStyleAttr(project)}>
          ${media ? `<img src="${esc(media)}" alt="">` : `<span class="round-icon" style="color:#fff;background:${esc(project.color || "#1a1f36")}">${icon("folder")}</span>`}
          <span class="cover-edit-badge">${icon("camera")} Update</span>
        </button>
        <div>
          <h2>${esc(project.name)}</h2>
          <p>${esc(project.description || "No project description yet.")}</p>
          <div class="task-meta">${projectLevelBadge(project.level)}<span class="status info">${tasks.length} tasks</span><span class="status info">${notes.length} notes</span><span class="status muted">${notebooks.length} notebooks</span><span class="status warn">Due ${dateLabel(project.dueDate)}</span></div>
          <p class="project-last-edited-line">${esc(projectLastTaskText(lastTask))}</p>
        </div>
      </section>
      <section class="section-card project-task-toolbar">
        <div>
          <h2 class="panel-title">Project Tasks</h2>
          <p class="muted">${done}/${tasks.length} completed. New tasks added here are assigned to ${esc(project.name)} automatically.</p>
          <div class="project-bulk-toolbar project-detail-bulk-toolbar">
            <button class="outline-btn" data-action="select-visible-project-tasks" data-project-id="${project.id}">${icon("check")} ${allSelected ? "Deselect visible" : "Select visible"}</button>
            ${selectedIds.length ? `<button class="outline-btn" data-action="open-modal" data-modal="duplicateTasks">${icon("note")} Copy selected</button><button class="outline-btn" data-action="open-modal" data-modal="assignProject" data-id="${selectedIds[0]}">${icon("folder")} Change project</button><button class="danger-btn" data-action="delete-selected-tasks">${icon("trash")} Delete selected</button><button class="outline-btn" data-action="clear-selected-tasks">${icon("close")} Clear</button>` : ""}
            <span class="muted">${selectedIds.length}/${tasks.length} selected</span>
          </div>
        </div>
        <div class="project-task-toolbar-actions">
          <div class="segmented-mini">
            ${["regular", "compact", "gallery"].map((view) => `<button class="${ui.projectTaskView === view ? "active" : ""}" data-action="set-tab" data-key="projectTaskView" data-value="${view}">${filterLabel(view)}</button>`).join("")}
          </div>
          <button class="primary-btn" data-action="open-modal" data-modal="editTask">${icon("plus")} Add Task</button>
        </div>
      </section>
      <div class="list project-detail-task-list project-tasks-${esc(ui.projectTaskView)}">
        ${tasks.length ? tasks.map((task) => taskBoardCard(task)).join("") : `<section class="section-card"><p class="muted">No tasks are assigned to this project yet.</p></section>`}
      </div>
      <section class="section-card project-task-toolbar project-note-toolbar" data-project-note-drop="${project.id}">
        <div>
          <h2 class="panel-title">Project Notes</h2>
          <p class="muted">${notes.length} note${notes.length === 1 ? "" : "s"} attached. Drag notes onto this project, or add one here and it will stay with ${esc(project.name)}.</p>
          <div class="project-bulk-toolbar project-detail-bulk-toolbar">
            <button class="outline-btn" data-action="select-visible-project-notes" data-project-id="${project.id}">${icon("check")} ${allNotesSelected ? "Deselect visible" : "Select visible"}</button>
            ${selectedNoteIds.length ? `<button class="outline-btn" data-action="open-modal" data-modal="duplicateNotes">${icon("note")} Copy selected</button><button class="outline-btn" data-action="open-modal" data-modal="bulkNoteSubject">${icon("edit")} Change subject</button><button class="outline-btn" data-action="open-modal" data-modal="bulkNoteNotebook">${icon("book")} Change notebook</button><button class="outline-btn" data-action="unassign-selected-project-notes" data-project-id="${project.id}">${icon("close")} Remove from project</button><button class="danger-btn" data-action="delete-selected-notes">${icon("trash")} Delete selected</button><button class="outline-btn" data-action="clear-selected-notes">${icon("close")} Clear</button>` : ""}
            <span class="muted">${selectedNoteIds.length}/${notes.length} selected</span>
          </div>
        </div>
        <button class="primary-btn" data-action="open-project-note" data-id="${project.id}">${icon("plus")} Add Note</button>
      </section>
      <div class="project-detail-note-list notes-list notes-compact" data-project-note-drop="${project.id}">
        ${notes.length ? notes.map((note) => noteCard(note)).join("") : `<section class="section-card project-note-empty"><p class="muted">No notes are attached yet. Drag a note here from Notes/Notebooks, or use Add Note.</p></section>`}
      </div>
    </section>`;
  }

  function goalContributionHistory(goalId) {
    return safeArray(data.goalContributions)
      .filter((entry) => entry.goalId === goalId)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }

  function goalContributionTotal(goalId) {
    return sum(goalContributionHistory(goalId), "amount");
  }

  function goalRemainingAmount(goal) {
    return Math.max(moneyNumber(Number(goal?.target || 0) - Number(goal?.current || 0)), 0);
  }

  function goalAccount(goal) {
    return data.accounts.find((account) => account.id === goal.contributionAccountId) || data.accounts[0] || null;
  }

  function goalNextContributionLabel(goal) {
    if (!goal || goal.contributionSchedule === "None" || !goal.contributionAmount) return "No automatic plan";
    const latest = goalContributionHistory(goal.id)[0]?.date || goal.createdAt || todayIso();
    const base = new Date(`${latest}T12:00:00`);
    if (goal.contributionSchedule === "Weekly") base.setDate(base.getDate() + 7);
    if (goal.contributionSchedule === "Bi-weekly") base.setDate(base.getDate() + 14);
    if (goal.contributionSchedule === "Monthly") base.setMonth(base.getMonth() + 1);
    const nextDate = base.toISOString().slice(0, 10);
    return `${money(goal.contributionAmount)} ${goal.contributionSchedule.toLowerCase()} - next ${dateLabel(nextDate)}`;
  }

  function goalDurationLabel(goal) {
    const history = goalContributionHistory(goal.id);
    const start = goal.createdAt || history[history.length - 1]?.date || "";
    const end = goal.status === "Completed" ? (goal.completedAt || history[0]?.date || todayIso()) : todayIso();
    if (!start) return goal.status === "Completed" ? "Reached" : "Tracking";
    const days = dateDiffDays(start, end);
    return goal.status === "Completed" ? `Reached in ${days || 1} day${days === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"} in progress`;
  }

  function renderGoals() {
    const compact = ui.goalView === "compact";
    const activeGoals = data.goals.filter((goal) => goal.status !== "Completed");
    const completedGoals = data.goals.filter((goal) => goal.status === "Completed");
    const visibleGoals = data.goals.filter((goal) => {
      if (ui.goalStatusFilter === "completed") return goal.status === "Completed";
      if (ui.goalStatusFilter === "all") return true;
      return goal.status !== "Completed";
    });
    return `<section class="screen">
      ${header("Financial Goals", `<button class="icon-btn" data-action="open-modal" data-modal="editGoal">${icon("plus")}</button>`)}
      <section class="section-card balance-panel" style="margin-bottom:16px;">
        <div class="card-row">
          <div><div class="balance-label">Active Goal Balance</div><div class="balance-amount">${moneyWhole(sum(activeGoals, "current"))}</div></div>
          <span class="pill dark">${activeGoals.length} active</span>
        </div>
        <div class="balance-meta"><span>${icon("chart")} Active target ${moneyWhole(sum(activeGoals, "target"))}</span><span>${icon("check")} Completed ${completedGoals.length}</span><span>${icon("task")} Linked tasks ${data.tasks.filter((task) => task.goalId).length}</span></div>
      </section>
      <div class="filter-row goal-view-row">
        ${[["active", "In Progress"], ["completed", "Completed"], ["all", "All"]].map(([status, label]) => `<button class="${ui.goalStatusFilter === status ? "active" : ""}" data-action="set-tab" data-key="goalStatusFilter" data-value="${status}">${label}</button>`).join("")}
        ${[["full", "Full"], ["compact", "Compact"]].map(([view, label]) => `<button class="${ui.goalView === view ? "active" : ""}" data-action="set-tab" data-key="goalView" data-value="${view}">${label}</button>`).join("")}
      </div>
      <div class="goal-grid ${compact ? "compact-goals" : ""}">${visibleGoals.length ? visibleGoals.map((goal) => goalDetailCard(goal, compact)).join("") : `<section class="section-card"><p class="muted">No goals in this view yet.</p></section>`}</div>
    </section>`;
  }

  function goalDetailCard(goal, compact = false) {
    const pct = progressPct(goal.current, goal.target);
    const linkedTasks = data.tasks.filter((task) => task.goalId === goal.id);
    const media = entityImage(goal);
    const remaining = goalRemainingAmount(goal);
    const account = goalAccount(goal);
    const history = goalContributionHistory(goal.id);
    const contributionTotal = goalContributionTotal(goal.id);
    const completed = goal.status === "Completed";
    const cardStyle = `--goal-paid:${pct}%;`;
    const planLine = goalNextContributionLabel(goal);
    if (compact) {
      return `<article class="project-card compact-goal-card goal-funded-card clickable-card ${completed ? "goal-completed-card" : ""}" style="${cardStyle}" data-action="open-modal" data-modal="editGoal" data-id="${goal.id}" title="Click blank space to edit ${esc(goal.name)}">
        <div class="compact-goal-head">
          ${media ? `<span class="media-thumb compact-goal-thumb" ${imageStyleAttr(goal)}><img src="${esc(media)}" alt=""></span>` : `<span class="round-icon" style="color:var(--${goal.color});background:${softColor(goal.color)};">${icon("chart")}</span>`}
          <div class="compact-goal-title">
            <h2 class="entity-title">${esc(goal.name)}</h2>
            <div class="entity-subtitle">${completed ? "Completed" : `Target ${dateLabel(goal.targetDate)}`}</div>
          </div>
          <div class="compact-goal-tools">
            <button class="icon-btn" data-action="open-modal" data-modal="editGoal" data-id="${goal.id}" aria-label="Edit goal">${icon("edit")}</button>
            <button class="icon-btn danger-text" data-action="delete-goal" data-id="${goal.id}" aria-label="Delete goal">${icon("trash")}</button>
          </div>
        </div>
        <div class="compact-goal-amounts">
          <span><strong class="positive">${moneyWhole(goal.current)}</strong><small>saved</small></span>
          <span><strong>${moneyWhole(goal.target)}</strong><small>target</small></span>
          <span><strong>${moneyWhole(remaining)}</strong><small>to go</small></span>
        </div>
        <div class="progress ${goal.color}" style="--value:${pct}%"><span></span></div>
        <div class="compact-goal-meta">
          <span class="${pct >= 50 ? "positive" : "money-blue"}">${pct}% complete</span>
          <span>${goalDurationLabel(goal)}</span>
        </div>
        <div class="goal-plan-mini">${icon("wallet")} ${esc(account?.name || "No account")} ${goal.contributionSchedule !== "None" ? `- ${esc(planLine)}` : ""}</div>
        <div class="compact-goal-actions">
          ${!completed ? `<button class="outline-btn" data-action="open-modal" data-modal="goalContribution" data-id="${goal.id}">${icon("plus")} Add</button>` : ""}
          ${goal.contributionSchedule !== "None" && !completed ? `<button class="success-btn" data-action="open-modal" data-modal="goalPlanConfirm" data-id="${goal.id}">${icon("check")} Confirm</button>` : ""}
          <button class="outline-btn" data-action="navigate" data-view="calendar">${icon("calendar")} Calendar</button>
        </div>
      </article>`;
    }
    return `<article class="project-card goal-funded-card clickable-card ${completed ? "goal-completed-card" : ""}" style="${cardStyle}" data-action="open-modal" data-modal="editGoal" data-id="${goal.id}" title="Click blank space to edit ${esc(goal.name)}">
      <div class="card-row">
        <div style="display:flex;gap:12px;align-items:center;">
          ${media ? `<span class="media-thumb" ${imageStyleAttr(goal)}><img src="${esc(media)}" alt=""></span>` : `<span class="round-icon" style="color:var(--${goal.color});background:${softColor(goal.color)};">${icon("chart")}</span>`}
          <div><h2 class="entity-title">${esc(goal.name)}</h2><div class="entity-subtitle">${completed ? `Completed ${dateLabel(goal.completedAt)}` : `Target by ${dateLabel(goal.targetDate)}`} - ${goalDurationLabel(goal)}</div></div>
        </div>
        <div style="display:flex;gap:6px;">
          <span class="status ${completed ? "success" : "info"}">${esc(goal.status)}</span>
          <button class="icon-btn" data-action="open-modal" data-modal="editGoal" data-id="${goal.id}">${icon("edit")}</button>
          <button class="icon-btn danger-text" data-action="delete-goal" data-id="${goal.id}" aria-label="Delete goal">${icon("trash")}</button>
        </div>
      </div>
      <div class="goal-money-line">
        <span><strong class="amount-large positive">${moneyWhole(goal.current)}</strong><small>of ${moneyWhole(goal.target)}</small></span>
        <strong class="goal-remaining">${moneyWhole(remaining)} to go</strong>
      </div>
      <div class="progress ${goal.color}" style="--value:${pct}%"><span></span></div>
      <div class="card-row" style="margin-top:10px;">
        <strong class="${pct >= 50 ? "positive" : "money-blue"}">${pct}% Complete</strong>
        <span class="status info">${linkedTasks.length} linked tasks</span>
      </div>
      <div class="goal-plan-card">
        <div><strong>${icon("wallet")} Funding account</strong><button class="link-title" data-action="open-modal" data-modal="accountDetail" data-id="${account?.id || ""}">${esc(account?.name || "Choose account")}</button></div>
        <div><strong>${icon("calendar")} Plan</strong><span>${esc(planLine)}</span></div>
        <div><strong>${icon("note")} Confirmed</strong><span>${history.length} contributions - ${money(contributionTotal)}</span></div>
      </div>
      ${history.length ? `<div class="goal-history">
        ${history.slice(0, 3).map((entry) => `<div class="goal-history-row"><span>${dateLabel(entry.date)}</span><strong>${money(entry.amount)}</strong><small>${esc(entry.accountName || "Account")}</small>${entry.notes ? `<p>${esc(entry.notes)}</p>` : ""}</div>`).join("")}
      </div>` : `<p class="muted goal-empty-history">No confirmed contributions yet.</p>`}
      <div class="sheet-actions" style="grid-template-columns:repeat(3,minmax(0,1fr));">
        ${!completed ? `<button class="outline-btn" data-action="open-modal" data-modal="goalContribution" data-id="${goal.id}">${icon("plus")} Add Contribution</button>` : ""}
        ${goal.contributionSchedule !== "None" && !completed ? `<button class="success-btn" data-action="open-modal" data-modal="goalPlanConfirm" data-id="${goal.id}">${icon("check")} Confirm Plan</button>` : ""}
        <button class="outline-btn" data-action="navigate" data-view="calendar">${icon("calendar")} Milestones</button>
      </div>
    </article>`;
  }

  function projectGroup(project, tasks) {
    const media = entityImage(project);
    const unassigned = !project.id;
    const visibleIds = tasks.map((task) => task.id);
    const selectedIds = visibleIds.filter((taskId) => ui.selectedTasks.includes(taskId));
    const allSelected = visibleIds.length > 0 && selectedIds.length === visibleIds.length;
    const bulkTools = unassigned ? `<div class="project-bulk-toolbar">
      <button class="outline-btn" data-action="select-visible-project-tasks">${icon("check")} ${allSelected ? "Deselect visible" : "Select visible"}</button>
      <button class="${ui.projectDragSelectMode ? "primary-btn" : "outline-btn"}" data-action="toggle-project-drag-select">${icon("edit")} ${ui.projectDragSelectMode ? "Drag select on" : "Drag select"}</button>
      ${selectedIds.length ? `<button class="outline-btn" data-action="open-modal" data-modal="duplicateTasks">${icon("note")} Copy selected</button><button class="outline-btn" data-action="open-modal" data-modal="assignProject" data-id="${selectedIds[0]}">${icon("folder")} Change project</button><button class="danger-btn" data-action="delete-selected-tasks">${icon("trash")} Delete selected</button><button class="outline-btn" data-action="clear-selected-tasks">${icon("close")} Clear</button>` : ""}
      <span class="muted">${selectedIds.length}/${tasks.length} selected</span>
    </div>` : "";
    return `<section class="project-card">
      <div class="section-title"><h2>${media ? `<span class="media-thumb project-list-thumb" ${imageStyleAttr(project)}><img src="${esc(media)}" alt=""></span>` : icon("folder")} ${esc(project.name)}</h2><span style="display:flex;align-items:center;gap:8px;">${project.id ? `<button class="icon-btn" data-action="open-project" data-id="${project.id}" aria-label="Open project">${icon("folder")}</button><button class="icon-btn" data-action="open-modal" data-modal="editProjectName" data-id="${project.id}" aria-label="Edit project">${icon("edit")}</button>` : ""}<span class="status muted">${tasks.length}</span>${project.id ? `<button class="icon-btn danger-text" data-action="delete-project" data-id="${project.id}" aria-label="Delete project">${icon("trash")}</button>` : ""}</span></div>
      ${unassigned ? `<p class="subtle project-drag-note">${ui.projectDragSelectMode ? "Drag a rectangle across task cards to select a row, column, or custom group. Turn Drag select off to drag cards onto project tiles." : "Drag any task card onto a project tile above to assign it."}</p>` : ""}
      ${bulkTools}
      <div class="${unassigned ? `unassigned-task-grid ${ui.projectDragSelectMode ? "drag-select-mode" : ""}` : "list"}" ${unassigned ? "data-project-task-select-grid" : ""}>${tasks.map((task) => projectTaskCard(task, project, unassigned)).join("") || `<p class="muted">No unassigned tasks.</p>`}</div>
    </section>`;
  }

  function projectTaskCard(task, project, unassigned = false) {
    const selected = ui.selectedTasks.includes(task.id);
    const canDragAssign = unassigned && !ui.projectDragSelectMode;
    return `<article class="data-row project-task-mini ${unassigned ? "draggable-task" : ""} ${ui.projectDragSelectMode ? "selectable-task" : ""} ${selected ? "selected" : ""}" data-action="open-modal" data-modal="editTask" data-id="${task.id}" ${unassigned ? `draggable="${canDragAssign ? "true" : "false"}" data-project-task-id="${task.id}" title="${ui.projectDragSelectMode ? `Drag select ${esc(task.title)}` : `Open ${esc(task.title)} or drag it onto a project tile`}"` : ""} role="button" tabindex="0">
      ${unassigned ? `<button class="task-mini-select ${selected ? "active" : ""}" data-action="toggle-task-select" data-id="${task.id}" aria-label="${selected ? "Deselect" : "Select"} ${esc(task.title)}">${selected ? icon("check") : ""}</button>` : ""}
      <span class="dot" style="background:${priorityColor(task.priority)}"></span>
      <div class="project-task-mini-body">
        <strong>${esc(task.title)}</strong>
        <div class="subtle">${shortDate(task.date)}</div>
        <button class="outline-btn" style="min-height:30px;margin-top:6px;color:${project.color};border-color:${project.color};" data-action="open-modal" data-modal="${project.id ? "editTask" : "assignProject"}" data-id="${task.id}">${project.id ? "Edit Task" : "Assign to Project"}</button>
      </div>
      <span class="project-task-mini-badges">${taskQuickBadge(task, "priority")}${taskQuickBadge(task, "status")}</span>
    </article>`;
  }

  function selectedUnassignedTaskIds(fallbackId = "") {
    const unassignedIds = new Set(data.tasks.filter((task) => !task.projectId).map((task) => task.id));
    const ids = ui.selectedTasks.filter((taskId) => unassignedIds.has(taskId));
    if (fallbackId && unassignedIds.has(fallbackId) && !ids.includes(fallbackId)) ids.push(fallbackId);
    return Array.from(new Set(ids));
  }

  function selectedProjectAssignmentIds(fallbackId = "") {
    const realIds = new Set(data.tasks.map((task) => task.id));
    const fallbackTask = data.tasks.find((task) => task.id === fallbackId);
    let scopedIds = null;
    if (ui.view === "projects") {
      if (ui.projectId) {
        scopedIds = new Set(data.tasks.filter((task) => task.projectId === ui.projectId).map((task) => task.id));
      } else {
        scopedIds = new Set(data.tasks.filter((task) => !task.projectId).map((task) => task.id));
      }
    }
    const selected = ui.selectedTasks.filter((taskId) => realIds.has(taskId) && (!scopedIds || scopedIds.has(taskId)));
    if (selected.length && (!fallbackId || selected.includes(fallbackId))) return Array.from(new Set(selected));
    if (fallbackTask) return [fallbackTask.id];
    return Array.from(new Set(selected));
  }

  function assignTaskToProject(taskId, projectId) {
    return assignTasksToProject([taskId], projectId);
  }

  function assignTasksToProject(taskIds, projectId) {
    const project = projectId ? data.projects.find((item) => item.id === projectId) : null;
    if (projectId && !project) return;
    const ids = new Set(taskIds.filter(Boolean));
    let count = 0;
    data.tasks.forEach((task) => {
      if (!ids.has(task.id)) return;
      task.projectId = project?.id || null;
      task.updatedAt = new Date().toISOString();
      count += 1;
    });
    if (!count) {
      showToast("Select at least one task first.", "danger");
      return;
    }
    ui.selectedTasks = ui.selectedTasks.filter((taskId) => !ids.has(taskId));
    saveData();
    render();
    showToast(project ? `${count} task${count === 1 ? "" : "s"} assigned to ${project.name}.` : `${count} task${count === 1 ? "" : "s"} moved to Unassigned.`);
  }

  function selectVisibleProjectTasks(projectId = "") {
    const scopeProjectId = projectId || (ui.view === "projects" && ui.projectId ? ui.projectId : "");
    const ids = data.tasks.filter((task) => scopeProjectId ? task.projectId === scopeProjectId : !task.projectId).map((task) => task.id);
    const allSelected = ids.length > 0 && ids.every((taskId) => ui.selectedTasks.includes(taskId));
    ui.selectedTasks = allSelected
      ? ui.selectedTasks.filter((taskId) => !ids.includes(taskId))
      : Array.from(new Set([...ui.selectedTasks, ...ids]));
    render();
  }

  function toggleProjectDragSelectMode() {
    ui.projectDragSelectMode = !ui.projectDragSelectMode;
    render();
    showToast(ui.projectDragSelectMode ? "Drag select is on. Draw across task cards to select just what you need." : "Drag select is off. You can drag cards onto project tiles again.");
  }

  function visibleTaskListIds() {
    return sortedTaskList(data.tasks.filter((task) => {
      if (ui.taskFilter === "today") return task.date === "2026-05-06";
      if (ui.taskFilter === "week") return weekDates().includes(task.date);
      if (ui.taskFilter === "done") return task.status === "Completed";
      return true;
    })).map((task) => task.id);
  }

  function selectVisibleTasks() {
    const ids = visibleTaskListIds();
    const allSelected = ids.length > 0 && ids.every((taskId) => ui.selectedTasks.includes(taskId));
    ui.selectedTasks = allSelected
      ? ui.selectedTasks.filter((taskId) => !ids.includes(taskId))
      : Array.from(new Set([...ui.selectedTasks, ...ids]));
    render();
  }

  function saveTaskProjectAssignment(taskId) {
    const projectId = value("assignProjectId");
    if (projectId === "__choose__") {
      showToast("Choose a project or Unassigned first.", "danger");
      return;
    }
    const ids = selectedProjectAssignmentIds(taskId);
    if (!ids.length) {
      showToast("Select at least one task first.", "danger");
      return;
    }
    assignTasksToProject(ids, projectId);
    closeModal();
  }

  function assignNoteToNotebook(noteId, notebookId) {
    return assignNotesToNotebook([noteId], notebookId);
  }

  function assignNotesToNotebook(noteIds, notebookId) {
    const ids = Array.from(new Set((Array.isArray(noteIds) ? noteIds : [noteIds]).filter(Boolean)));
    const notebook = data.notebooks.find((item) => item.id === notebookId);
    const notes = ids.map((noteId) => data.notes.find((item) => item.id === noteId)).filter(Boolean);
    if (!notes.length || !notebook) return;
    notes.forEach((note) => {
      note.notebookId = notebook.id;
      if (note.subject) ensureNotebookSubject(notebook.id, note.subject);
      note.updatedAt = new Date().toISOString();
    });
    ui.selectedNotes = ui.selectedNotes.filter((noteId) => !ids.includes(noteId));
    saveData();
    render();
    showToast(`${notes.length} note${notes.length === 1 ? "" : "s"} moved to ${notebook.title}. Undo is available.`);
  }

  function assignNotesToProject(noteIds, projectId) {
    const ids = Array.from(new Set((Array.isArray(noteIds) ? noteIds : [noteIds]).filter(Boolean)));
    const project = data.projects.find((item) => item.id === projectId);
    const notes = ids.map((noteId) => data.notes.find((item) => item.id === noteId)).filter(Boolean);
    if (!notes.length) return;
    notes.forEach((note) => {
      note.projectId = project ? project.id : null;
      note.updatedAt = new Date().toISOString();
    });
    ui.selectedNotes = ui.selectedNotes.filter((noteId) => !ids.includes(noteId));
    saveData();
    render();
    showToast(project ? `${notes.length} note${notes.length === 1 ? "" : "s"} attached to ${project.name}.` : `${notes.length} note${notes.length === 1 ? "" : "s"} removed from project.`);
  }

  function selectedProjectNoteIds(projectId) {
    const scoped = new Set(projectNotes({ id: projectId }).map((note) => note.id));
    return ui.selectedNotes.filter((noteId) => scoped.has(noteId));
  }

  function selectVisibleProjectNotes(projectId) {
    const noteIds = projectNotes({ id: projectId }).map((note) => note.id);
    if (!noteIds.length) return;
    const allSelected = noteIds.every((noteId) => ui.selectedNotes.includes(noteId));
    ui.selectedNotes = allSelected
      ? ui.selectedNotes.filter((noteId) => !noteIds.includes(noteId))
      : Array.from(new Set([...ui.selectedNotes, ...noteIds]));
    render();
  }

  function unassignSelectedProjectNotes(projectId) {
    const ids = selectedProjectNoteIds(projectId);
    if (!ids.length) return showToast("Select at least one project note first.", "danger");
    assignNotesToProject(ids, "");
  }

  function openProjectNote(projectId) {
    const project = data.projects.find((item) => item.id === projectId);
    if (!project) return showToast("Choose a project first.", "danger");
    ui.modal = { type: "editNote", id: "", projectId };
    ui.noteColor = null;
    render();
  }

  function noteNotebookDropStrip(options = {}) {
    const notebooks = data.notebooks;
    const selectedCount = selectedNoteRecords().length;
    const compact = options.compact || options.mode === "organized";
    const dropCopy = selectedCount
      ? `Drag one selected note onto a notebook to move all ${selectedCount} selected notes together.`
      : "Drag any note card below onto a notebook to file it without opening the note.";
    const title = options.title || "Drag Notes To Notebooks";
    const subtitle = options.subtitle || dropCopy;
    return `<section class="notes-notebook-strip ${compact ? "organizer-drop-strip" : ""}" aria-label="Notebook drop targets">
      <div class="section-title compact-title">
        <h2>${icon("book")} ${esc(title)}</h2>
        <span class="status info">${selectedCount ? `${selectedCount} selected` : `${notebooks.length} notebooks`}</span>
      </div>
      <p class="subtle project-drag-note">${esc(subtitle)}</p>
      <div class="note-notebook-drop-grid">
        ${notebooks.map((nb) => noteNotebookDropTile(nb, { compact })).join("") || `<p class="muted">Create a notebook first, then drag notes here.</p>`}
      </div>
    </section>`;
  }

  function noteNotebookDropTile(nb, options = {}) {
    const notes = data.notes.filter((note) => note.notebookId === nb.id);
    const media = entityImage(nb);
    const selectedCount = selectedNoteRecords().length;
    const hint = selectedCount ? `Drop ${selectedCount} selected` : "Drop note";
    return `<article class="note-notebook-drop-tile ${options.compact ? "organizer-drop-tile" : ""}" data-notebook-drop="${nb.id}" title="Drop notes into ${esc(nb.title)}">
      <button class="note-notebook-cover ${media ? "has-image" : ""}" data-action="navigate-notes" data-id="${nb.id}" ${imageStyleAttr(nb)} aria-label="Open ${esc(nb.title)}">
        ${media ? `<img src="${esc(media)}" alt="">` : `<span>${icon(nb.icon || "book")}</span>`}
      </button>
      <div class="note-notebook-drop-copy">
        <strong>${esc(nb.title)}</strong>
        <span>${notes.length} note${notes.length === 1 ? "" : "s"}</span>
      </div>
      <span class="notebook-drop-hint">${icon("note")} ${esc(hint)}</span>
    </article>`;
  }

  function noteProjectDropStrip() {
    const selectedCount = selectedNoteRecords().length;
    const hint = selectedCount ? `Drop ${selectedCount} selected` : "Drop note";
    return `<section class="notes-notebook-strip note-project-strip" aria-label="Project drop targets">
      <div class="section-title compact-title">
        <h2>${icon("folder")} Drag Notes To Projects</h2>
        <span class="status info">${selectedCount ? `${selectedCount} selected` : `${data.projects.length} projects`}</span>
      </div>
      <p class="subtle project-drag-note">${selectedCount ? `Drag one selected note onto a project to attach all ${selectedCount} selected notes together.` : "Project notes live with project tasks. Drag a note here when it belongs to a project."}</p>
      <div class="note-project-drop-grid">
        ${data.projects.map((project) => {
          const media = entityImage(project);
          const notes = projectNotes(project);
          return `<article class="note-project-drop-tile" data-project-note-drop="${project.id}" title="Drop notes into ${esc(project.name)}">
            <span class="note-project-drop-cover ${media ? "has-image" : ""}" ${imageStyleAttr(project)}>
              ${media ? `<img src="${esc(media)}" alt="">` : icon("folder")}
            </span>
            <div><strong>${esc(project.name)}</strong><span>${notes.length} note${notes.length === 1 ? "" : "s"}</span></div>
            <span class="project-drop-hint">${icon("note")} ${esc(hint)}</span>
          </article>`;
        }).join("") || `<p class="muted">Create a project first, then drag notes here.</p>`}
      </div>
    </section>`;
  }

  function renderNotebooks() {
    const query = ui.notebookQuery.trim().toLowerCase();
    const notebooks = data.notebooks.filter((nb) => {
      const subjects = notebookSubjects(nb.id).join(" ");
      return !query || [nb.title, nb.description, subjects].some((part) => String(part || "").toLowerCase().includes(query));
    });
    const totalNotes = data.notes.length;
    const unassignedNotes = data.notes.filter((note) => !note.notebookId);
    const totalSubjects = new Set(data.notes.map((note) => String(note.subject || "").trim()).filter(Boolean)).size;
    const visibleNotebookIds = notebooks.map((nb) => nb.id);
    const selectedVisibleNotebooks = visibleNotebookIds.filter((idValue) => ui.selectedNotebooks.includes(idValue)).length;
    const selectedUnassignedNotes = unassignedNotes.filter((note) => ui.selectedNotes.includes(note.id)).length;
    const organizedView = ui.notebookView === "organized";
    return `<section class="screen">
      ${header("Notebooks", `<button class="icon-btn" data-action="open-modal" data-modal="editNotebook">${icon("plus")}</button>`)}
      <section class="notebook-library-head">
        <div>
          <span class="eyebrow">Notebook Library</span>
          <h2>${notebooks.length} notebooks</h2>
        </div>
        <div class="notebook-library-stats">
          <span><strong>${totalNotes}</strong> notes</span>
          <span><strong>${unassignedNotes.length}</strong> unassigned</span>
          <span><strong>${totalSubjects}</strong> subjects</span>
          <span><strong>${data.notebooks.filter((nb) => entityImage(nb)).length}</strong> covers</span>
        </div>
      </section>
      <label class="search-field notebook-search">${icon("search")}<input id="notebookSearch" value="${esc(ui.notebookQuery)}" data-action="notebook-search" placeholder="Search notebooks, subjects, descriptions..." /></label>
      <div class="filter-row notebook-view-switcher">
        ${["regular", "compact", "gallery", "organized"].map((view) => `<button class="${ui.notebookView === view ? "active" : ""}" data-action="set-tab" data-key="notebookView" data-value="${view}">${filterLabel(view)}</button>`).join("")}
      </div>
      ${organizedView ? "" : `<div class="note-action-bar notebook-action-bar">
        <span>${ui.selectedNotebooks.length ? `${ui.selectedNotebooks.length} notebook${ui.selectedNotebooks.length === 1 ? "" : "s"} selected` : "Select notebooks to duplicate the notebook and every note inside it"}</span>
        <button class="outline-btn" data-action="select-visible-notebooks">${selectedVisibleNotebooks === visibleNotebookIds.length && visibleNotebookIds.length ? "Deselect visible" : "Select visible"}</button>
        ${ui.selectedNotebooks.length ? `<button class="outline-btn" data-action="duplicate-selected-notebooks">${icon("note")} Duplicate selected</button><button class="danger-btn" data-action="delete-selected-notebooks">${icon("trash")} Delete selected</button><button class="outline-btn" data-action="clear-selected-notebooks">Clear</button>` : ""}
      </div>`}
      ${organizedView ? noteNotebookDropStrip({
        compact: true,
        title: "Organized Filing View",
        subtitle: selectedUnassignedNotes
          ? `Drag one selected unassigned note onto a notebook tile to move all ${selectedUnassignedNotes} selected notes.`
          : "Use these compact notebook tiles as drop targets. Drag loose notes below into the right notebook."
      }) : `<div class="notebook-grid notebooks-${esc(ui.notebookView)}">${notebooks.length ? notebooks.map((nb) => notebookCard(nb)).join("") : `<section class="section-card notebook-grid-empty"><p class="muted">No notebooks match this search.</p></section>`}</div>`}
      <section class="section-card unassigned-notes-section ${organizedView ? "organized-unassigned-section" : ""}">
        <div class="section-title compact-title">
          <h2>${icon("note")} ${organizedView ? "Unassigned Notes To File" : "Unassigned Notes"}</h2>
          <span class="status info">${unassignedNotes.length}</span>
        </div>
        <p class="subtle project-drag-note">${organizedView ? "This view is built for clean-up: select one or many unassigned notes, then drag a selected note onto the compact notebook row above." : "Quick notes can live here first. Drag any unassigned note onto a notebook tile above when you are ready."}</p>
        <div class="note-action-bar unassigned-note-actions">
          <span>${selectedUnassignedNotes ? `${selectedUnassignedNotes} unassigned note${selectedUnassignedNotes === 1 ? "" : "s"} selected` : "Select unassigned notes, then copy them or drag one selected note onto a notebook to move them all"}</span>
          <button class="outline-btn" data-action="select-unassigned-notes">${selectedUnassignedNotes === unassignedNotes.length && unassignedNotes.length ? "Deselect unassigned" : "Select unassigned"}</button>
          ${selectedUnassignedNotes ? `<button class="outline-btn" data-action="open-modal" data-modal="duplicateNotes">${icon("note")} Copy selected</button><button class="outline-btn" data-action="open-modal" data-modal="bulkNoteSubject">${icon("edit")} Change subject</button><button class="outline-btn" data-action="open-modal" data-modal="bulkNoteNotebook">${icon("book")} Change notebook</button><button class="outline-btn" data-action="clear-selected-notes">Clear</button>` : ""}
        </div>
        <div class="unassigned-note-grid">${unassignedNotes.map((note) => unassignedNoteCard(note)).join("") || `<p class="muted">No unassigned notes right now.</p>`}</div>
      </section>
    </section>`;
  }

  function notebookCard(nb) {
    const notes = data.notes.filter((note) => note.notebookId === nb.id);
    const count = notes.length;
    const subjects = notebookSubjects(nb.id);
    const media = entityImage(nb);
    const project = data.projects.find((item) => item.id === nb.projectId);
    const latestNote = notes.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
    const accent = nb.color || "#4388f3";
    const selected = ui.selectedNotebooks.includes(nb.id);
    const selectedNoteCount = selectedNoteRecords().length;
    const dropHint = selectedNoteCount ? `Drop ${selectedNoteCount} selected` : "Drop note";
    return `<article class="notebook-tile ${selected ? "selected" : ""}" style="--notebook-color:${esc(accent)};" data-action="navigate-notes" data-id="${nb.id}" data-notebook-drop="${nb.id}" title="Open notebook or drop notes here" role="button" tabindex="0">
      <button class="notebook-select-button ${selected ? "active" : ""}" data-action="toggle-notebook-select" data-id="${nb.id}" aria-label="${selected ? "Deselect" : "Select"} notebook">${selected ? icon("check") : ""}</button>
      <div class="notebook-cover-wrap">
        <button class="notebook-cover ${media ? "has-image" : ""}" data-action="navigate-notes" data-id="${nb.id}" ${imageStyleAttr(nb)}>
          ${media ? `<img src="${esc(media)}" alt="">` : `<span class="notebook-fallback-cover"><span class="round-icon" style="color:#fff;background:rgba(255,255,255,.18);">${icon(nb.icon || "book")}</span></span>`}
        </button>
        <span class="notebook-drop-hint">${icon("note")} ${esc(dropHint)}</span>
        <button class="cover-edit-badge notebook-cover-edit" data-action="open-modal" data-modal="notebookPicture" data-id="${nb.id}" aria-label="Update ${esc(nb.title)} picture">${icon("camera")}</button>
      </div>
      <div class="notebook-tile-body">
        <div class="notebook-title-row">
          <button class="link-title notebook-title" data-action="navigate-notes" data-id="${nb.id}">${esc(nb.title)}</button>
          <span class="notebook-actions"><button class="icon-btn" data-action="duplicate-notebook" data-id="${nb.id}" aria-label="Duplicate notebook">${icon("note")}</button><button class="icon-btn" data-action="open-modal" data-modal="editNotebook" data-id="${nb.id}" aria-label="Edit notebook">${icon("edit")}</button><button class="icon-btn danger-text" data-action="delete-notebook" data-id="${nb.id}" aria-label="Delete notebook">${icon("trash")}</button></span>
        </div>
        <div class="notebook-count-row">
          <span><strong>${count}</strong><small>notes</small></span>
          <span><strong>${subjects.length}</strong><small>subjects</small></span>
          <span><strong>${latestNote ? dateLabel(latestNote.date) : "-"}</strong><small>latest</small></span>
        </div>
        ${subjects.length ? `<div class="subject-chip-row subject-manage-row">${subjects.slice(0, 3).map((subject) => `<button type="button" class="subject-chip-delete" data-action="delete-notebook-subject" data-id="${nb.id}" data-subject="${esc(subject)}" title="Delete subject ${esc(subject)} from ${esc(nb.title)}">${esc(subject)} ${icon("close")}</button>`).join("")}</div>` : `<div class="subject-chip-row"><span>No subjects yet</span></div>`}
        <p class="notebook-description">${esc(nb.description || "No description yet.")}</p>
        <div class="notebook-footer"><span>${project ? `${icon("folder")} ${esc(project.name)}` : "General library"}</span>${nb.title === "General Notes" ? `<span class="status info">Default</span>` : ""}</div>
      </div>
    </article>`;
  }

  function unassignedNoteCard(note) {
    const importanceColor = noteImportanceColor(note.importance);
    const selected = ui.selectedNotes.includes(note.id);
    return `<article class="project-task-mini unassigned-note-mini draggable-note ${selected ? "selected" : ""}" draggable="true" data-action="open-modal" data-modal="editNote" data-id="${note.id}" data-notebook-note-id="${note.id}" title="Click to edit, or drag ${esc(note.title)} onto a notebook tile" role="button" tabindex="0">
      <button class="note-select-button ${selected ? "active" : ""}" data-action="toggle-note-select" data-id="${note.id}" aria-label="${selected ? "Deselect" : "Select"} note">${selected ? icon("check") : ""}</button>
      <span class="dot" style="background:${importanceColor}"></span>
      <div class="project-task-mini-body">
        <strong>${esc(note.title)}</strong>
        <div class="subtle">${dateLabel(note.date)} &middot; ${esc(note.subject || "No subject")}</div>
        <div class="mini-note-actions"><button class="outline-btn" style="min-height:30px;margin-top:6px;color:${importanceColor};border-color:${importanceColor};" data-action="open-modal" data-modal="editNote" data-id="${note.id}">Edit Note</button><button class="outline-btn" style="min-height:30px;margin-top:6px;" data-action="open-modal" data-modal="duplicateNotes" data-id="${note.id}">${icon("note")} Copy</button></div>
      </div>
      <span class="project-task-mini-badges"><span class="status importance-pill" style="--importance-color:${importanceColor}">${esc(note.importance || "Low")}</span></span>
    </article>`;
  }

  function renderNotes() {
    const notebookId = ui.notebookId;
    const baseNotes = notebookId ? data.notes.filter((note) => note.notebookId === notebookId) : data.notes;
    const subjects = notebookId ? notebookSubjects(notebookId) : allNotebookSubjects();
    const activeSubject = normalizedNoteSubjectFilter(subjects);
    const notes = filteredNotesForBase(baseNotes, activeSubject);
    const nb = data.notebooks.find((item) => item.id === notebookId);
    const unassignedCount = baseNotes.filter((note) => !String(note.subject || "").trim()).length;
    const noteCounts = ["Low", "Medium", "High", "Critical"].reduce((counts, level) => {
      counts[level] = baseNotes.filter((note) => note.importance === level).length;
      return counts;
    }, {});
    const selectedVisibleNotes = notes.filter((note) => ui.selectedNotes.includes(note.id)).length;
    const selectedNoteCount = ui.selectedNotes.length;
    return `<section class="screen">
      ${header(nb ? nb.title : "All Notes", `<button class="icon-btn" data-action="open-modal" data-modal="editNote" aria-label="Add note">${icon("plus")}</button><button class="icon-btn">${icon("search")}</button>`)}
      ${nb ? notebookDetailHero(nb, baseNotes, unassignedCount, noteCounts) : ""}
      <label class="search-field" style="margin-bottom:12px;">${icon("search")}<input id="notesSearch" value="${esc(ui.notesQuery)}" data-action="notes-search" placeholder="Search notes, subjects, importance..." /></label>
      <div class="notes-control-panel">
        <div class="filter-row">
          ${["stream", "compact", "gallery"].map((view) => `<button class="${ui.notesView === view ? "active" : ""}" data-action="set-tab" data-key="notesView" data-value="${view}">${filterLabel(view)}</button>`).join("")}
        </div>
        <div class="filter-row">
          ${[
            ["newest", "Newest"],
            ["oldest", "Oldest"],
            ["important", "Important"],
            ["subject", "Subject"],
            ["title", "Title"]
          ].map(([sort, label]) => `<button class="${ui.notesSort === sort ? "active" : ""}" data-action="set-tab" data-key="notesSort" data-value="${sort}">${label}</button>`).join("")}
        </div>
        <label class="notes-subject-select">
          <span>Subject</span>
          <select id="notesSubjectFilter">
            <option value="all" ${activeSubject === "all" ? "selected" : ""}>All subjects</option>
            <option value="none" ${activeSubject === "none" ? "selected" : ""}>No subject</option>
            ${subjects.map((subject) => `<option value="${esc(subject)}" ${activeSubject === subject ? "selected" : ""}>${esc(subject)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${nb ? "" : `${noteNotebookDropStrip()}${noteProjectDropStrip()}`}
      <div class="filter-row notes-importance-filters" style="margin-bottom:14px;">
        <button class="${ui.notesFilter === "all" ? "active" : ""}" data-action="set-tab" data-key="notesFilter" data-value="all">All</button>
        <button class="${ui.notesFilter === "unassigned" ? "active" : ""}" data-action="set-tab" data-key="notesFilter" data-value="unassigned" title="No Subject">None <span class="filter-count">${unassignedCount}</span></button>
        ${["Low", "Medium", "High", "Critical"].map((level) => `<button class="${ui.notesFilter === level ? "active" : ""}" style="--importance-color:${noteImportanceColor(level)}" data-action="set-tab" data-key="notesFilter" data-value="${level}" title="${esc(level)}">${esc(noteImportanceShortLabel(level))} <span class="filter-count">${noteCounts[level]}</span></button>`).join("")}
      </div>
      <div class="note-action-bar">
        <span>${selectedNoteCount ? `${selectedNoteCount} selected` : "Select notes to duplicate, move, retag, or delete"}</span>
        <button class="outline-btn" data-action="select-visible-notes">${selectedVisibleNotes === notes.length && notes.length ? "Deselect visible" : "Select visible"}</button>
        ${selectedNoteCount ? `<button class="outline-btn" data-action="open-modal" data-modal="duplicateNotes">${icon("note")} Duplicate</button><button class="outline-btn" data-action="open-modal" data-modal="bulkNoteSubject">${icon("edit")} Change subject</button><button class="outline-btn" data-action="open-modal" data-modal="bulkNoteNotebook">${icon("book")} Change notebook</button><button class="danger-btn" data-action="delete-selected-notes">${icon("trash")} Delete selected</button><button class="outline-btn" data-action="clear-selected-notes">Clear</button>` : ""}
      </div>
      <div class="list notes-list notes-${esc(ui.notesView)}">${notes.length ? notes.map((note) => noteCard(note)).join("") : `<section class="section-card"><p class="muted">No notes match this view.</p></section>`}</div>
    </section>`;
  }

  function notebookDetailHero(nb, notes, unassignedCount, noteCounts) {
    const media = entityImage(nb);
    const subjects = notebookSubjects(nb.id);
    const latestNote = notes.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
    const accent = nb.color || "#4388f3";
    return `<section class="notebook-detail-hero" style="--notebook-color:${esc(accent)};">
      <button class="notebook-detail-cover ${media ? "has-image" : ""}" data-action="open-modal" data-modal="notebookPicture" data-id="${nb.id}" aria-label="Update notebook cover" ${imageStyleAttr(nb)}>
        ${media ? `<img src="${esc(media)}" alt="">` : `<span class="notebook-fallback-cover"><span class="round-icon" style="color:#fff;background:rgba(255,255,255,.18);">${icon(nb.icon || "book")}</span></span>`}
        <span class="cover-edit-badge">${icon("camera")} Update</span>
      </button>
      <div class="notebook-detail-copy">
        <span class="eyebrow">Inside Notebook</span>
        <h2>${esc(nb.title)}</h2>
        <p>${esc(nb.description || "Notes, subjects, images, and importance levels live here.")}</p>
        <div class="notebook-detail-stats">
          <span><strong>${notes.length}</strong><small>notes</small></span>
          <span><strong>${subjects.length}</strong><small>subjects</small></span>
          <span><strong>${unassignedCount}</strong><small>unassigned</small></span>
          <span><strong>${latestNote ? dateLabel(latestNote.date) : "-"}</strong><small>latest</small></span>
        </div>
        <div class="subject-chip-row subject-manage-row">${subjects.length ? subjects.slice(0, 5).map((subject) => `<button type="button" class="subject-chip-delete" data-action="delete-notebook-subject" data-id="${nb.id}" data-subject="${esc(subject)}" title="Delete subject ${esc(subject)} from ${esc(nb.title)}">${esc(subject)} ${icon("close")}</button>`).join("") : `<span>No subjects yet</span>`}</div>
        <div class="notebook-importance-strip">
          ${["Low", "Medium", "High", "Critical"].map((level) => `<span style="--importance-color:${noteImportanceColor(level)}"><strong>${noteCounts[level] || 0}</strong>${level}</span>`).join("")}
        </div>
      </div>
    </section>`;
  }

  function sortNotes(a, b) {
    if (ui.notesSort === "oldest") return String(a.date || "").localeCompare(String(b.date || ""));
    if (ui.notesSort === "important") return noteImportanceRank(b.importance) - noteImportanceRank(a.importance) || String(b.date || "").localeCompare(String(a.date || ""));
    if (ui.notesSort === "subject") return String(a.subject || "").localeCompare(String(b.subject || "")) || String(a.title || "").localeCompare(String(b.title || ""));
    if (ui.notesSort === "title") return String(a.title || "").localeCompare(String(b.title || ""));
    return String(b.date || "").localeCompare(String(a.date || ""));
  }

  function noteSubjectsForNotes(notes) {
    return Array.from(new Set(notes
      .map((note) => String(note.subject || "").trim())
      .filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }

  function normalizeNoteSubjectName(subject) {
    return String(subject || "").trim().replace(/\s+/g, " ");
  }

  function notebookById(notebookId) {
    return data.notebooks.find((notebook) => notebook.id === notebookId);
  }

  function allNotebookSubjects() {
    const subjects = [];
    data.notebooks.forEach((notebook) => subjects.push(...notebookSubjects(notebook.id)));
    data.notes.forEach((note) => {
      const subject = normalizeNoteSubjectName(note.subject);
      if (subject) subjects.push(subject);
    });
    return Array.from(new Set(subjects)).sort((a, b) => a.localeCompare(b));
  }

  function ensureNotebookSubject(notebookId, subject) {
    const clean = normalizeNoteSubjectName(subject);
    const notebook = notebookById(notebookId);
    if (!clean || !notebook) return clean;
    notebook.subjects = Array.isArray(notebook.subjects) ? notebook.subjects : [];
    if (!notebook.subjects.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      notebook.subjects.push(clean);
      notebook.subjects.sort((a, b) => a.localeCompare(b));
    }
    return clean;
  }

  function deleteNotebookSubject(notebookId, subject) {
    const notebook = notebookById(notebookId);
    const clean = normalizeNoteSubjectName(subject);
    if (!notebook || !clean) return;
    notebook.subjects = (Array.isArray(notebook.subjects) ? notebook.subjects : [])
      .filter((item) => item.toLowerCase() !== clean.toLowerCase());
    data.notes.forEach((note) => {
      if (note.notebookId === notebook.id && normalizeNoteSubjectName(note.subject).toLowerCase() === clean.toLowerCase()) {
        note.subject = "";
        note.updatedAt = new Date().toISOString();
      }
    });
    notebook.updatedAt = new Date().toISOString();
    saveData();
    render();
    showToast(`Subject "${clean}" deleted from ${notebook.title}.`);
  }

  function createNotebookFromTitle(title) {
    const clean = String(title || "").trim().replace(/\s+/g, " ");
    if (!clean) return null;
    const existing = data.notebooks.find((notebook) => notebook.title.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const notebook = {
      id: id("nb"),
      title: clean,
      description: "Created while saving a note",
      projectId: null,
      color: "#4388f3",
      icon: "book",
      subjects: [],
      updatedAt: new Date().toISOString()
    };
    data.notebooks.unshift(notebook);
    return notebook;
  }

  function promptForNoteSubject(notebookId, currentValue = "") {
    const notebook = notebookById(notebookId);
    const promptTitle = notebook ? `New subject for ${notebook.title}` : "New subject";
    const entered = window.prompt(promptTitle, currentValue || "");
    if (entered === null) return "";
    return normalizeNoteSubjectName(entered);
  }

  function subjectOptionMarkup(note, includeDelete = true) {
    const current = normalizeNoteSubjectName(note.subject);
    const subjects = notebookSubjects(note.notebookId, current);
    return `
      <option value="" ${current ? "" : "selected"}>No subject</option>
      <option value="${ADD_NOTE_SUBJECT_VALUE}">+ Add subject</option>
      ${includeDelete && current && note.notebookId ? `<option value="${DELETE_NOTE_SUBJECT_VALUE}">Delete "${esc(current)}"</option>` : ""}
      ${subjects.map((subject) => `<option value="${esc(subject)}" ${current === subject ? "selected" : ""}>${esc(subject)}</option>`).join("")}`;
  }

  function activeModalNoteNotebookId() {
    const selected = value("noteNotebook");
    if (selected && selected !== ADD_NOTEBOOK_VALUE) return selected;
    return "";
  }

  function refreshModalNoteSubjectOptions(selectedSubject = "") {
    const subjectEl = document.getElementById("noteSubject");
    if (!subjectEl) return;
    const notebookId = activeModalNoteNotebookId();
    const subject = normalizeNoteSubjectName(selectedSubject || subjectEl.value);
    subjectEl.innerHTML = subjectOptionMarkup({ notebookId, subject });
  }

  function handleModalNoteSubjectChange(target) {
    const notebookId = activeModalNoteNotebookId();
    if (target.value === ADD_NOTE_SUBJECT_VALUE) {
      const subject = promptForNoteSubject(notebookId);
      if (!subject) return refreshModalNoteSubjectOptions("");
      ensureNotebookSubject(notebookId, subject);
      refreshModalNoteSubjectOptions(subject);
      saveData();
      return;
    }
    if (target.value === DELETE_NOTE_SUBJECT_VALUE) {
      const current = normalizeNoteSubjectName(target.dataset.currentSubject || "");
      const subject = current || normalizeNoteSubjectName(Array.from(target.options).find((option) => option.selected)?.textContent?.replace(/^Delete\s+"|"\s*$/g, ""));
      if (notebookId && subject) return deleteNotebookSubject(notebookId, subject);
      refreshModalNoteSubjectOptions("");
    }
    target.dataset.currentSubject = target.value;
  }

  function normalizedNoteSubjectFilter(subjects) {
    const filter = ui.notesSubjectFilter || "all";
    if (filter === "all" || filter === "none" || subjects.includes(filter)) return filter;
    ui.notesSubjectFilter = "all";
    return "all";
  }

  function noteMatchesSubjectFilter(note, subjectFilter = normalizedNoteSubjectFilter(noteSubjectsForNotes(data.notes))) {
    const subject = String(note.subject || "").trim();
    if (subjectFilter === "all") return true;
    if (subjectFilter === "none") return !subject;
    return subject === subjectFilter;
  }

  function filteredNotesForBase(baseNotes, subjectFilter = normalizedNoteSubjectFilter(noteSubjectsForNotes(baseNotes))) {
    const query = ui.notesQuery.trim().toLowerCase();
    return baseNotes
      .filter((note) => noteMatchesSubjectFilter(note, subjectFilter))
      .filter((note) => ui.notesFilter !== "unassigned" || !String(note.subject || "").trim())
      .filter((note) => ["all", "unassigned"].includes(ui.notesFilter) || note.importance === ui.notesFilter)
      .filter((note) => !query || [note.title, note.content, note.subject, note.importance].some((part) => String(part || "").toLowerCase().includes(query)))
      .sort(sortNotes);
  }

  function noteImportanceShortLabel(level) {
    return { Low: "Low", Medium: "Med", High: "High", Critical: "Crit" }[level] || level;
  }

  function renderContacts() {
    const contacts = filteredContacts();
    return `<section class="screen">
      ${header("Contacts", `<button class="icon-btn" data-action="open-modal" data-modal="editContact">${icon("plus")}</button>`)}
      <label class="search-field" style="margin-bottom:12px;">${icon("search")}<input id="contactSearch" value="${esc(ui.contactQuery)}" data-action="contact-search" placeholder="Search contacts, groups, phone, email..." /></label>
      ${contactGroupFilterBar()}
      <div class="contacts-grid">${contacts.map((contact) => contactCard(contact)).join("") || `<div class="empty-state compact-empty">${icon("home")}<h3>No contacts found</h3><p>Try another group or search term.</p></div>`}</div>
    </section>`;
  }

  function filteredContacts() {
    const query = String(ui.contactQuery || "").trim().toLowerCase();
    const groupFilter = ui.contactGroupFilter || "all";
    return data.contacts.filter((contact) => {
      const groups = contactGroupsForContact(contact.id);
      const matchesGroup = groupFilter === "all" || groups.some((group) => group.id === groupFilter);
      if (!matchesGroup) return false;
      if (!query) return true;
      const text = [contact.name, contact.email, contact.phone, contact.textEmail, contact.source, groups.map((group) => group.name).join(" ")].join(" ").toLowerCase();
      return text.includes(query);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  function contactSearchText(contact) {
    const groups = contactGroupsForContact(contact.id).map((group) => group.name).join(" ");
    return [
      contact.name,
      contact.email,
      contact.phone,
      contact.textEmail,
      contact.source,
      contact.address,
      groups
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function loanContactMatches(query = "", pinnedContact = null) {
    const normalized = String(query || "").trim().toLowerCase();
    let matches = normalized && normalized !== "+ add new contact"
      ? data.contacts.filter((contact) => contactSearchText(contact).includes(normalized))
      : data.contacts.slice(0, 12);
    if (pinnedContact && !matches.some((contact) => contact.id === pinnedContact.id)) matches = [pinnedContact, ...matches];
    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }

  function findLoanContactFromText(text) {
    const normalized = String(text || "").trim().toLowerCase();
    if (!normalized || normalized === "+ add new contact") return null;
    return data.contacts.find((contact) => contact.name.toLowerCase() === normalized)
      || data.contacts.find((contact) => contactSearchText(contact).includes(normalized));
  }

  function fillLoanContactFields(contact) {
    const hidden = document.getElementById("loanContact");
    const search = document.getElementById("loanContactSearch");
    const borrower = document.getElementById("loanBorrower");
    const phone = document.getElementById("loanPhone");
    const email = document.getElementById("loanEmail");
    if (hidden) hidden.value = contact?.id || "";
    if (search && contact) search.value = contact.name || "";
    if (borrower && contact) borrower.value = contact.name || "";
    if (phone && contact) phone.value = contact.phone || "";
    if (email && contact) email.value = contact.email || "";
  }

  function syncLoanContactCombo(input) {
    const typed = input?.value || "";
    const hidden = document.getElementById("loanContact");
    const panel = document.getElementById("loanNewContactPanel");
    const help = document.getElementById("loanContactHelp");
    if (typed.trim() === "+ Add new contact") {
      if (hidden) hidden.value = ADD_LOAN_CONTACT_VALUE;
      if (panel) panel.hidden = false;
      document.getElementById("loanBorrower")?.focus();
      if (help) help.textContent = "New contact mode. Fill borrower name, phone, and email, then save.";
      return;
    }
    const contact = findLoanContactFromText(typed);
    if (contact && contact.name.toLowerCase() === typed.trim().toLowerCase()) {
      fillLoanContactFields(contact);
      if (panel) panel.hidden = true;
      if (help) help.textContent = `Matched ${contact.name}. Phone and email filled when available.`;
      return;
    }
    if (hidden) hidden.value = contact?.id || "";
    if (panel) panel.hidden = true;
    const borrower = document.getElementById("loanBorrower");
    if (borrower && typed.trim() && !borrower.value.trim()) borrower.value = typed.trim();
    const count = loanContactMatches(typed).length;
    if (help) help.textContent = typed.trim() ? `${count} matching contact${count === 1 ? "" : "s"}. Choose one or keep this as a manual borrower.` : `${data.contacts.length} contacts available.`;
  }

  function pickLoanContact(contactId) {
    const search = document.getElementById("loanContactSearch");
    const hidden = document.getElementById("loanContact");
    const panel = document.getElementById("loanNewContactPanel");
    const help = document.getElementById("loanContactHelp");
    if (contactId === ADD_LOAN_CONTACT_VALUE) {
      if (search) search.value = "+ Add new contact";
      if (hidden) hidden.value = ADD_LOAN_CONTACT_VALUE;
      if (panel) panel.hidden = false;
      if (help) help.textContent = "New contact mode. Fill borrower name, phone, and email, then save.";
      document.getElementById("loanBorrower")?.focus();
      return;
    }
    if (!contactId) {
      if (hidden) hidden.value = "";
      if (panel) panel.hidden = true;
      if (help) help.textContent = "Manual borrower selected. Type the borrower name below.";
      document.getElementById("loanBorrower")?.focus();
      return;
    }
    const contact = data.contacts.find((item) => item.id === contactId);
    if (!contact) return;
    fillLoanContactFields(contact);
    if (panel) panel.hidden = true;
    if (help) help.textContent = `Matched ${contact.name}. Phone and email filled when available.`;
  }

  function contactGroupFilterBar() {
    const groups = safeArray(data.contactGroups).filter((group) => group.name);
    return `<div class="contact-group-toolbar">
      <button class="outline-btn ${ui.contactGroupFilter === "all" ? "active" : ""}" data-action="set-contact-group-filter" data-id="all">${icon("home")} All <small>${data.contacts.length}</small></button>
      ${groups.map((group) => {
        const count = data.contacts.filter((contact) => contactGroupsForContact(contact.id).some((item) => item.id === group.id)).length;
        return `<button class="outline-btn ${ui.contactGroupFilter === group.id ? "active" : ""}" data-action="set-contact-group-filter" data-id="${esc(group.id)}">${icon("folder")} ${esc(group.name)} <small>${count}</small></button>`;
      }).join("")}
    </div>`;
  }

  function setContactGroupFilter(groupId) {
    ui.contactGroupFilter = groupId || "all";
    render();
  }

  function contactCard(contact) {
    const addr = data.addresses.find((item) => item.id === contact.addressId);
    const tasks = data.tasks.filter((task) => task.contactId === contact.id);
    const loans = data.loans.filter((loan) => loan.contactId === contact.id || loan.borrower.toLowerCase() === contact.name.toLowerCase());
    const groupNames = contactGroupsForContact(contact.id).map((group) => group.name);
    return `<article class="project-card">
      <div class="card-row">
        <div style="display:flex;gap:12px;align-items:center;">
          <span class="round-icon" style="color:#fff;background:var(--navy-2);">${esc(contact.name.charAt(0))}</span>
          <div><h2 class="entity-title">${esc(contact.name)}</h2><div class="entity-subtitle">${esc(contact.email || "No email")}${contact.phone ? ` · ${esc(contact.phone)}` : ""}</div></div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" data-action="open-modal" data-modal="editContact" data-id="${contact.id}">${icon("edit")}</button>
          <button class="icon-btn danger-text" data-action="delete-contact" data-id="${contact.id}" aria-label="Delete contact">${icon("trash")}</button>
        </div>
      </div>
      ${addr ? `<div class="address-row"><span class="round-icon">${icon("map")}</span><div><strong>${esc(addr.label)}</strong><div class="subtle">${esc(addressText(addr))}</div></div><a class="outline-btn" href="${esc(mapsSearchUrl(addr))}" target="_blank" rel="noopener">Maps</a></div>` : ""}
      ${groupNames.length ? `<div class="subject-chip-row">${groupNames.map((name) => `<span>${esc(name)}</span>`).join("")}</div>` : ""}
      <div class="amount-grid">
        <div class="amount-cell"><label>Tasks</label><strong>${tasks.length}</strong></div>
        <div class="amount-cell"><label>Lending</label><strong>${loans.length}</strong></div>
        <div class="amount-cell"><label>Remaining</label><strong class="negative">${money(loans.reduce((total, loan) => total + loanRemaining(loan), 0))}</strong></div>
      </div>
      <div class="list">${tasks.slice(0, 3).map((task) => `<div class="data-row"><span class="dot amber"></span><div><strong>${esc(task.title)}</strong><div class="subtle">${dateLabel(task.date)}</div></div><span class="status ${statusClass(task.status)}">${esc(task.status)}</span></div>`).join("")}</div>
    </article>`;
  }

  function noteCard(note) {
    const nb = data.notebooks.find((item) => item.id === note.notebookId);
    const media = entityImage(note);
    const importanceColor = noteImportanceColor(note.importance);
    const selected = ui.selectedNotes.includes(note.id);
    return `<article class="note-card note-${String(note.importance || "Low").toLowerCase()} ${selected ? "selected" : ""}" style="--importance-color:${importanceColor};" data-action="open-modal" data-modal="editNote" data-id="${note.id}" draggable="true" data-notebook-note-id="${note.id}" role="button" tabindex="0" aria-label="Open note ${esc(note.title)}">
      <div class="cover-frame ${media ? "has-image" : "empty"}" ${media ? imageStyleAttr(note) : ""}>
        ${media ? `<img class="cover" src="${esc(media)}" alt="">` : `<span class="note-cover-placeholder">${icon("image")} No picture</span>`}
      </div>
      <div class="note-body">
        <div class="card-row"><div class="note-heading-line"><button class="note-select-button ${selected ? "active" : ""}" data-action="toggle-note-select" data-id="${note.id}" aria-label="${selected ? "Deselect" : "Select"} note">${selected ? icon("check") : ""}</button><span class="round-icon note-icon" style="color:#fff;background:${importanceColor}">${icon(note.icon || "note")}</span><h2 class="entity-title">${esc(note.title)}</h2></div><div class="note-card-actions"><button class="icon-btn" data-action="open-modal" data-modal="duplicateNotes" data-id="${note.id}" aria-label="Duplicate note">${icon("note")}</button><button class="icon-btn" data-action="open-modal" data-modal="editNote" data-id="${note.id}">${icon("edit")}</button><button class="icon-btn danger-text" data-action="delete-note" data-id="${note.id}" aria-label="Delete note">${icon("trash")}</button></div></div>
        <div class="task-meta"><span>${icon("calendar")} ${dateLabel(note.date)}</span></div>
        <div class="note-inline-controls">
          <label><span>Priority</span><select data-action="note-inline" data-field="importance" data-id="${note.id}">
            ${["Low", "Medium", "High", "Critical"].map((level) => `<option value="${level}" ${note.importance === level ? "selected" : ""}>${level}</option>`).join("")}
          </select></label>
          <label><span>Subject</span><select data-action="note-inline" data-field="subject" data-id="${note.id}">${subjectOptionMarkup(note)}</select></label>
          <label><span>Notebook</span><select data-action="note-inline" data-field="notebookId" data-id="${note.id}">
            <option value="" ${note.notebookId ? "" : "selected"}>Unassigned</option>
            <option value="${ADD_NOTEBOOK_VALUE}">+ New notebook</option>
            ${data.notebooks.map((item) => `<option value="${item.id}" ${note.notebookId === item.id ? "selected" : ""}>${esc(item.title)}</option>`).join("")}
          </select></label>
        </div>
        <p class="muted">${esc(note.content)}</p>
        <div class="subtle note-notebook-label">${icon("book")} <strong>Notebook:</strong> ${esc(nb ? nb.title : "Unassigned")}</div>
      </div>
    </article>`;
  }

  function coverImage(kind) {
    const isBanana = kind === "bananas";
    const svg = isBanana
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300" viewBox="0 0 640 300"><rect width="640" height="300" fill="#fff4d3"/><circle cx="504" cy="72" r="62" fill="#00bcd4" opacity=".25"/><path d="M110 200C180 90 310 90 386 196" fill="none" stroke="#ffc107" stroke-width="36" stroke-linecap="round"/><path d="M150 218C220 126 322 124 402 216" fill="none" stroke="#ffb300" stroke-width="26" stroke-linecap="round"/><circle cx="456" cy="152" r="54" fill="#1a1f36"/><circle cx="440" cy="138" r="8" fill="#fff"/><circle cx="474" cy="138" r="8" fill="#fff"/><path d="M432 170q25 24 52 0" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300" viewBox="0 0 640 300"><rect width="640" height="300" fill="#eff8fb"/><path d="M0 220h640v80H0z" fill="#d9e6ef"/><circle cx="160" cy="142" r="44" fill="#d9233f"/><circle cx="224" cy="122" r="40" fill="#e63946"/><circle cx="300" cy="150" r="45" fill="#c9184a"/><circle cx="378" cy="120" r="42" fill="#e63946"/><circle cx="448" cy="154" r="46" fill="#d9233f"/><path d="M164 96c38-48 95-56 154-20M300 105c44-62 99-76 164-35" stroke="#278b45" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M70 70h500" stroke="#fff" stroke-width="22" opacity=".8"/></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function renderAddresses() {
    const selected = ui.selectedAddresses
      .map((addressId) => data.addresses.find((addr) => addr.id === addressId))
      .filter(Boolean);
    const routeUrl = mapsRouteUrl(selected);
    return `<section class="screen">
      ${header("Address Database")}
      <section class="address-route-panel">
        <div class="route-panel-copy"><span class="round-icon">${icon("map")}</span><div><strong>${selected.length} selected</strong><span>Select two or more addresses to build a Google Maps route.</span></div></div>
        <div class="route-panel-actions">
          ${selected.length >= 2 ? `<a class="primary-btn" href="${esc(routeUrl)}" target="_blank" rel="noopener">${icon("map")} Open Route</a><button class="outline-btn" data-action="copy-route-link">${icon("note")} Copy Route URL</button><button class="outline-btn" data-action="open-modal" data-modal="addressRoute">${icon("edit")} View Link</button>` : `<button class="outline-btn" data-action="open-modal" data-modal="addressRoute" disabled>${icon("note")} Route Link</button>`}
          ${selected.length ? `<button class="outline-btn" data-action="clear-address-selection">${icon("close")} Clear</button>` : ""}
        </div>
      </section>
      <div class="address-grid">${data.addresses.map((addr) => addressCard(addr)).join("")}</div>
    </section>`;
  }

  function addressCard(addr) {
    const selected = ui.selectedAddresses.includes(addr.id);
    const mapsUrl = mapsSearchUrl(addr);
    const verified = addressVerified(addr);
    const reviewing = addressReviewing(addr);
    const validationClass = verified ? "verified" : (reviewing ? "reviewing" : "");
    return `<article class="address-card compact ${selected ? "selected" : ""}">
      <div class="address-card-head">
        <button class="address-select ${selected ? "active" : ""}" data-action="toggle-address-select" data-id="${addr.id}" aria-label="${selected ? "Deselect" : "Select"} ${esc(addr.label)}">${selected ? icon("check") : icon("plus")}</button>
        <div class="address-main">
          <button class="round-icon address-map-icon ${validationClass}" data-action="verify-address-online" data-id="${addr.id}" title="${esc(addressValidationLabel(addr))}" aria-label="Check ${esc(addr.label)} online with Google Maps">${icon("map")}</button>
          <div>
            <h2 class="entity-title">${esc(addr.label)}</h2>
            <div class="entity-subtitle">${esc(displayStreetLine(addr) || "No street saved")}</div>
            <div class="address-verify-text ${validationClass}">${esc(addressValidationLabel(addr))}</div>
          </div>
        </div>
      </div>
      <div class="address-location-line">${icon("map")} ${esc([addr.city, addr.state, addr.zip].filter(Boolean).join(", ")) || "No city/state saved"}</div>
      <div class="address-actions">
        <a class="outline-btn" href="${esc(mapsUrl)}" target="_blank" rel="noopener">${icon("map")} Maps</a>
        <button class="outline-btn" data-action="open-modal" data-modal="editAddress" data-id="${addr.id}">${icon("edit")} Edit</button>
        <button class="icon-btn danger-text" data-action="delete-address" data-id="${addr.id}" aria-label="Delete address">${icon("trash")}</button>
      </div>
    </article>`;
  }

  function renderLending() {
    const summary = lendingSummary();
    const lendingFilters = ["all", "outstanding", "partial", "repaid", "forgiven"];
    if (!lendingFilters.includes(ui.lendingFilter)) ui.lendingFilter = "all";
    const query = ui.loanQuery.trim().toLowerCase();
    const filteredLoans = data.loans
      .filter((loan) => matchesLendingFilter(loan, ui.lendingFilter))
      .filter((loan) => !query || String(loan.borrower || "").toLowerCase().includes(query) || String(loan.description || "").toLowerCase().includes(query));
    return `<section class="screen">
      ${header("Money Lending Tracker", `<button class="icon-btn">${icon("bell")}</button><button class="icon-btn">${icon("filter")}</button>`)}
      <div class="metrics-grid lending-stats" style="margin-bottom:14px;">
        <div class="stat-card" style="border-color:#ffd79d;"><span class="muted">${icon("wallet")}</span><strong class="amount-large" style="color:#ff9800">${money(summary.outstanding)}</strong><div class="subtle">Outstanding</div></div>
        <div class="stat-card" style="border-color:#cbe9ff;"><span class="muted">${icon("chart")}</span><strong class="amount-large money-blue">${money(summary.partial)}</strong><div class="subtle">Money Owed</div></div>
        <div class="stat-card" style="border-color:#c5ebce;"><span class="muted">${icon("check")}</span><strong class="amount-large positive">${money(summary.repaid)}</strong><div class="subtle">Repaid</div></div>
        <div class="stat-card" style="border-color:#d9dce5;"><span class="muted">${icon("close")}</span><strong class="amount-large muted">${money(summary.forgiven)}</strong><div class="subtle">Forgiven</div></div>
        <div class="stat-card" style="border-color:#d0ccff;"><span class="muted">${icon("loan")}</span><strong class="amount-large" style="color:var(--accent)">${summary.total}</strong><div class="subtle">Total Loans</div></div>
      </div>
      <label class="search-field" style="margin-bottom:12px;">${icon("search")}<input id="loanSearch" value="${esc(ui.loanQuery)}" data-action="loan-search" placeholder="Search borrower name..." /></label>
      <div class="filter-row">${lendingFilters.map((filter) => `<button class="${ui.lendingFilter === filter ? "active" : ""}" data-action="set-tab" data-key="lendingFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}</div>
      <div class="loan-grid">${filteredLoans.length ? filteredLoans.map((loan) => loanCard(loan)).join("") : `<section class="section-card loan-grid-empty"><p class="muted">No ${esc(filterLabel(ui.lendingFilter).toLowerCase())} loans right now.</p></section>`}</div>
    </section>`;
  }

  function matchesLendingFilter(loan, filter) {
    const status = loanStatusFromAmounts(loan);
    if (filter === "done") return loanIsDone(loan);
    if (loanIsDone(loan)) return false;
    if (filter === "outstanding") return loanRemaining(loan) > 0;
    if (filter === "partial") return status === "Money Owed";
    if (filter === "repaid") return status === "Repaid" || status === "Closed";
    if (filter === "forgiven") return loanForgiven(loan) > 0;
    return true;
  }

  function loanCard(loan) {
    const status = loanStatusFromAmounts(loan);
    const amount = loanAmount(loan);
    const repaid = loanRepaid(loan);
    const forgiven = loanForgiven(loan);
    const remaining = loanRemaining(loan);
    const dueOrOverdue = daysBetween(loan.dueDate) <= 0 && remaining > 0;
    const repaidPct = amount ? clamp((repaid / amount) * 100, 0, 100) : 0;
    const forgivenStartPct = repaidPct;
    const forgivenEndPct = amount ? clamp(((repaid + forgiven) / amount) * 100, forgivenStartPct, 100) : forgivenStartPct;
    const baseBg = dueOrOverdue ? "#fff4f4" : "#ffffff";
    const media = entityImage(loan);
    const done = loanIsDone(loan);
    return `<article class="loan-card compact-loan-card ${dueOrOverdue ? "overdue" : ""} ${done ? "loan-done-card" : ""}" style="--repaid-pct:${round1(repaidPct)}%;--forgiven-start-pct:${round1(forgivenStartPct)}%;--forgiven-end-pct:${round1(forgivenEndPct)}%;--loan-base-bg:${baseBg};" data-action="open-modal" data-modal="addLoan" data-id="${loan.id}" title="Click blank space to edit ${esc(loan.borrower)}">
      <div class="loan-card-top">
        <div class="loan-person">${media ? `<span class="media-thumb" ${imageStyleAttr(loan)}><img src="${esc(media)}" alt=""></span>` : `<span class="round-icon" style="color:#1d6fd9;background:#e7f3ff;">${esc(loan.borrower.charAt(0))}</span>`}<div><h2 class="entity-title"><button class="link-title" data-action="open-modal" data-modal="addLoan" data-id="${loan.id}">${esc(loan.borrower)}</button></h2><div class="entity-subtitle">${esc(loan.description)}</div>${loan.borrowerPhone || loan.borrowerEmail ? `<div class="entity-subtitle">${esc([loan.borrowerPhone, loan.borrowerEmail].filter(Boolean).join(" · "))}</div>` : ""}</div></div>
        <div class="loan-amount-block"><strong class="amount-large">${money(remaining)}</strong><span class="status ${statusClass(status)}">${esc(status)}</span></div>
      </div>
      <div class="progress loan-progress" style="--value:${repaidPct}%"><span></span></div>
      <div class="loan-breakdown">
        <span class="loan-repaid"><strong>${money(repaid)}</strong> repaid</span>
        <span><strong>${money(forgiven)}</strong> forgiven</span>
        <span><strong>${money(remaining)}</strong> outstanding</span>
      </div>
      <div class="loan-meta-row"><span class="muted">Original <strong class="loan-original">${money(amount)}</strong></span><span class="loan-date">${icon("calendar")} Due: ${dateLabel(loan.dueDate)}</span></div>
      <div class="sheet-actions loan-actions">
        <button class="outline-btn" data-action="open-modal" data-modal="addLoan" data-id="${loan.id}">${icon("edit")} Edit</button>
        <button class="outline-btn" data-action="open-modal" data-modal="repayLoan" data-id="${loan.id}">${icon("wallet")} Pay</button>
        <button class="outline-btn" data-action="open-modal" data-modal="forgiveLoan" data-id="${loan.id}">${icon("check")} Forgive</button>
        <button class="${done ? "secondary-btn" : "outline-btn"}" data-action="${done ? "restore-loan" : "mark-loan-done"}" data-id="${loan.id}">${icon(done ? "back" : "check")} ${done ? "Restore" : "Done"}</button>
        <button class="outline-btn" data-action="open-loan-alert" data-id="${loan.id}">${icon("bell")} Notify</button>
        <button class="danger-btn loan-delete-btn" data-action="delete-loan" data-id="${loan.id}" aria-label="Delete loan">${icon("trash")} Delete</button>
      </div>
    </article>`;
  }

  function renderAi() {
    const aiVoiceAvailable = Boolean(speechRecognitionCtor());
    const lastAiText = lastAiMessageText();
    return `<section class="screen">
      ${header("AI Assistant")}
      <section class="section-card balance-panel" style="margin-bottom:16px;">
        <h2 class="panel-title" style="color:#fff;">Financial Monitor</h2>
        <p style="color:rgba(255,255,255,.82);">Ask out loud or type a question about your schedule, habits, goals, bills, subscriptions, notes, projects, and money.</p>
      </section>
      <div class="ai-chat section-card">
        ${data.aiMessages.map((msg) => `<div class="message ${msg.role}">${esc(msg.text)}</div>`).join("")}
        <div class="filter-row">
          <button data-action="ai-prompt" data-prompt="What do I have going on this week?">This week</button>
          <button data-action="ai-prompt" data-prompt="Do I have meditation this week?">Meditation</button>
          <button data-action="ai-prompt" data-prompt="What are my biggest expenses?">Biggest expenses</button>
          <button data-action="ai-prompt" data-prompt="Am I on track for my goals?">Goal check</button>
          <button data-action="ai-prompt" data-prompt="Do I have notes about bills?">Notes</button>
        </div>
        <div class="quick-add">
          <button class="round-icon ai-voice-btn ${ui.aiListening ? "is-listening" : ""}" data-action="${ui.aiListening ? "stop-ai-voice" : "start-ai-voice"}" aria-label="${ui.aiListening ? "Stop listening" : "Ask BillMaster by voice"}" title="${aiVoiceAvailable ? ui.aiListening ? "Stop listening" : "Ask by voice" : "Voice may need Chrome or Edge microphone support"}">${icon(ui.aiListening ? "close" : "mic")}</button>
          <input id="aiInput" value="${esc(ui.aiDraft)}" placeholder="${ui.aiListening ? "Listening for your question..." : "Type a question, tap the mic, or press Enter..."}" />
          <button class="icon-btn ai-speak-btn" data-action="speak-last-ai" title="Read last answer aloud" aria-label="Read last answer aloud" ${lastAiText ? "" : "disabled"}>${icon("speaker")}</button>
          <button class="primary-btn ai-send-btn" data-action="send-ai" title="Ask BillMaster AI">${icon("ai")} Ask</button>
        </div>
        ${ui.aiVoiceError ? `<div class="voice-message ai-voice-message">${esc(ui.aiVoiceError)}</div>` : ""}
      </div>
    </section>`;
  }

  function renderFloatingAction() {
    if (ui.modal) return "";
    const map = {
      bills: ["addBill", "plus", "warning"],
      inbox: ["importStatement", "plus", ""],
      tracking: ["addTransaction", "plus", ""],
      subscriptions: ["addSubscription", "plus", ""],
      tasks: ["editTask", "plus", ""],
      habits: ["editHabit", "plus", ""],
      lending: ["addLoan", "plus", ""],
      addresses: ["editAddress", "plus", "warning"],
      calendar: ["editTask", "plus", ""],
      notebooks: ["editNotebook", "plus", ""],
      notes: ["editNote", "plus", ""],
      goals: ["editGoal", "plus", ""],
      contacts: ["editContact", "plus", ""]
    };
    const config = map[ui.view];
    if (!config) return "";
    return `<button class="floating-fab ${config[2]}" data-action="open-modal" data-modal="${config[0]}" aria-label="Add">${icon(config[1])}</button>`;
  }

  function renderModal() {
    if (!ui.modal) return "";
    const { type, id: modalId } = ui.modal;
    let content = "";
    if (type === "addBill") content = modalBill(modalId);
    if (type === "addTransaction") content = modalTransaction();
    if (type === "transactionDetail") content = modalTransactionDetail(modalId);
    if (type === "editTransaction") content = modalTransaction(modalId);
    if (type === "subscriptionDetail") content = modalSubscriptionDetail(modalId);
    if (type === "editSubscriptionActual" || type === "editSubscriptionProjected") content = modalSubscriptionAmount(modalId, type);
    if (type === "paySubscription") content = modalPaySubscription(modalId);
    if (type === "subscriptionTransactions") content = modalSubscriptionTransactions();
    if (type === "subscriptionStatus") content = modalSubscriptionStatus(modalId);
    if (type === "addLoan") content = modalLoan(modalId);
    if (type === "repayLoan") content = modalRepayLoan(modalId);
    if (type === "forgiveLoan") content = modalForgiveLoan(modalId);
    if (type === "editAddress") content = modalAddress(modalId);
    if (type === "editTask") content = modalTask(modalId);
    if (type === "blockQuickCreate") content = modalBlockQuickCreate();
    if (type === "editHabit") content = modalHabit(modalId);
    if (type === "habitFreshStart") content = modalHabitFreshStart(modalId);
    if (type === "saveHabitTemplate") content = modalSaveHabitTemplate(modalId);
    if (type === "voiceTask") content = modalVoiceTask();
    if (type === "voiceHabit") content = modalVoiceHabit();
    if (type === "blockTaskMenu") content = modalBlockTaskMenu(modalId);
    if (type === "blockStatus") content = modalBlockStatus(modalId);
    if (type === "dayEventActions") content = modalDayEventActions(modalId);
    if (type === "quickTime") content = modalQuickTime(modalId);
    if (type === "blockDuplicateHorizontal") content = modalBlockDuplicate(modalId, "horizontal");
    if (type === "blockDuplicateVertical") content = modalBlockDuplicate(modalId, "vertical");
    if (type === "selectedDuplicateHorizontal") content = modalSelectedDuplicate("horizontal");
    if (type === "selectedDuplicateVertical") content = modalSelectedDuplicate("vertical");
    if (type === "duplicateTasks") content = modalDuplicateTasks();
    if (type === "taskActions") content = modalTaskActions();
    if (type === "copyTasksDate") content = modalCopyTasksDate();
    if (type === "taskNotify") content = modalTaskNotify(modalId);
    if (type === "taskRoute") content = modalTaskRoute();
    if (type === "assignProject") content = modalAssignProject(modalId);
    if (type === "editProjectName") content = modalProjectName(modalId);
    if (type === "editNote") content = modalNote(modalId);
    if (type === "duplicateNotes") content = modalDuplicateNotes(modalId);
    if (type === "bulkNoteSubject") content = modalBulkNoteSubject();
    if (type === "bulkNoteNotebook") content = modalBulkNoteNotebook();
    if (type === "editNotebook") content = modalNotebook(modalId);
    if (type === "notebookPicture") content = modalNotebookPicture(modalId);
    if (type === "editGoal") content = modalGoal(modalId);
    if (type === "goalContribution") content = modalGoalContribution(modalId);
    if (type === "goalPlanConfirm") content = modalGoalPlanConfirm(modalId);
    if (type === "editContact") content = modalContact(modalId);
    if (type === "addressRoute") content = modalAddressRoute();
    if (type === "calendarSync") content = modalCalendarSync();
    if (type === "calendarDatePicker") content = modalCalendarDatePicker(modalId);
    if (type === "calendarMonthPicker") content = modalCalendarMonthPicker();
    if (type === "taskDefaults") content = modalTaskDefaults();
    if (type === "profiles") content = modalProfiles();
    if (type === "profileLogin") content = modalProfileLogin(modalId);
    if (type === "cloudSetup") content = modalCloudSetup();
    if (type === "restoreBackup") content = modalRestoreBackup();
    if (type === "cloudAuth") content = modalCloudAuth();
    if (type === "googleContactsSetup") content = modalGoogleContactsSetup();
    if (type === "copyFallback") content = modalCopyFallback();
    if (type === "friendOnboarding") content = modalFriendOnboarding();
    if (type === "friendFeedback") content = modalFriendFeedback();
    if (type === "importStatement") content = modalImportStatement();
    if (type === "accountConnections") content = modalAccountConnections();
    if (type === "accountDetail") content = modalAccountDetail(modalId);
    if (type === "addSubscription") content = modalAddSubscription();
    if (type === "dataTools") content = modalDataTools();
    if (!content) return "";
    const quickCreate = type === "blockQuickCreate";
    const backdropClass = quickCreate ? " sheet-backdrop--block-quick-create" : "";
    const sheetClass = quickCreate ? " sheet--block-quick-create" : "";
    return `<div class="sheet-backdrop${backdropClass}" data-action="close-modal">
      <section class="sheet${sheetClass}" role="dialog" aria-modal="true" tabindex="-1" data-sheet data-modal-type="${esc(type)}">
        <div class="sheet-handle"></div>
        ${content}
      </section>
    </div>`;
  }

  function modalHeader(title, subtitle = "", danger = false) {
    return `<div class="sheet-header"><div><h2>${esc(title)}</h2>${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ""}</div><button class="icon-btn ${danger ? "danger-text" : ""}" data-action="close-modal">${icon("close")}</button></div>`;
  }

  function modalBill(billId) {
    const bill = data.bills.find((item) => item.id === billId) || {};
    return `${modalHeader(bill.id ? "Edit Bill" : "Add New Bill", "Enter bill details manually, scan a photo, or detect automatically.")}
      <div class="sheet-actions">
        <button class="primary-btn" data-action="simulate-scan">${icon("camera")} Scan Bill Photo (AI)</button>
        <button class="outline-btn" data-action="simulate-detect">${icon("search")} Auto-Detect Bills</button>
      </div>
      <div class="field-grid" style="margin-top:16px;">
        ${field("billName", "Payee Name", bill.name || "", "Enter payee name")}
        ${field("billAmount", "Amount", bill.amount || "", "Enter amount", "number")}
        ${field("billProjected", "Projected Amount", bill.projected || bill.amount || "", "Expected amount", "number")}
        ${field("billDue", "Due Date", bill.dueDate || "2026-05-12", "", "date")}
        ${selectField("billCategory", "Category", ["Utilities", "Phone", "Insurance", "Housing", "Subscriptions", "Credit"], bill.category || "Utilities")}
        ${selectField("billAutopay", "Autopay", ["None", "Chase Checking", "Capital One Credit Card", "Wells Fargo Savings"], bill.autopay ? bill.method : "None")}
        ${imageAttachmentField("bill", bill.image || "", "Bill Picture / Graphic", bill.imageZoom, bill.imageX, bill.imageY, bill.imageFit, bill.imageOpacity)}
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-bill" data-id="${bill.id || ""}">${bill.id ? "Save Changes" : "Add Bill"}</button></div>`;
  }

  function modalTransaction(txId) {
    const tx = data.transactions.find((item) => item.id === txId) || { type: ui.trackingTab === "income" ? "income" : "expense", date: "2026-05-06", frequency: "Monthly" };
    const income = tx.type === "income";
    const categoryOptions = transactionCategoryOptions(tx.type, tx.category || (income ? "Salary" : "Utilities"));
    const currentCategory = normalizeCategoryName(tx.category || (income ? "Salary" : "Utilities"));
    const selectedCategory = categoryOptions.find((category) => category.toLowerCase() === currentCategory.toLowerCase()) || currentCategory || (income ? "Salary" : "Utilities");
    return `${modalHeader(tx.id ? `Edit ${income ? "Income" : "Expense"}` : "Add Transaction")}
      <div class="field-grid">
        ${selectField("txType", "Type", ["expense", "income"], tx.type)}
        ${field("txName", "Name", tx.name || "", income ? "Income source" : "Expense name")}
        ${selectField("txCategory", "Category", categoryOptions, selectedCategory, transactionCategoryLabel)}
        <section id="txNewCategoryPanel" class="inline-add-panel" ${selectedCategory === ADD_TRANSACTION_CATEGORY_VALUE ? "" : "hidden"}>
          ${field("txNewCategory", "New Category", "", "Category name")}
        </section>
        ${field("txAmount", "Actual Amount", tx.amount || "", "0.00", "number")}
        ${field("txProjected", "Projected Amount", tx.projected || "", "0.00", "number")}
        ${field("txDate", "Date", tx.date || "2026-05-06", "", "date")}
        ${selectField("txFrequency", "Frequency", ["One time", "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Yearly"], tx.frequency || "Monthly")}
        ${textArea("txNotes", "Notes", tx.notes || "", "Notes (optional)")}
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-transaction" data-id="${tx.id || ""}">${tx.id ? "Update" : "Save Transaction"}</button></div>`;
  }

  function modalTransactionDetail(txId) {
    const tx = data.transactions.find((item) => item.id === txId);
    if (!tx) return "";
    const q = tx.amount * 3;
    const six = tx.amount * 6;
    const yearly = tx.amount * 12;
    return `${modalHeader(tx.name, `${tx.category} - ${tx.frequency}`)}
      <div class="card-row" style="margin-bottom:18px;">
        <span class="round-icon" style="color:var(--${tx.type === "income" ? "green" : "coral"});background:${tx.type === "income" ? "#eafaf1" : "#fff0f0"}">${icon(categoryIcon(tx.category))}</span>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" data-action="open-modal" data-modal="editTransaction" data-id="${tx.id}">${icon("edit")}</button>
          <button class="icon-btn danger-text" data-action="delete-transaction" data-id="${tx.id}" aria-label="Delete transaction">${icon("trash")}</button>
        </div>
      </div>
      <div class="detail-table">
        <div class="row head"><span>Period</span><span>Actual</span><span>Projected</span><span>Variance</span></div>
        ${detailPeriod("Monthly", tx.amount, tx.projected, tx.type)}
        ${detailPeriod("Quarterly", q, tx.projected * 3, tx.type)}
        ${detailPeriod("6 Months", six, tx.projected * 6, tx.type)}
        ${detailPeriod("Yearly", yearly, tx.projected * 12, tx.type)}
      </div>
      <section style="margin-top:18px;"><h3>Payment Method</h3><p class="muted">${esc(tx.method || "No method")}</p><h3>Notes</h3><p class="muted">${esc(tx.notes || "No notes.")}</p></section>`;
  }

  function detailPeriod(label, actual, projected, type) {
    const variance = budgetVariance(actual, projected, type);
    return `<div class="row"><span>${esc(label)}</span><strong class="${type === "income" ? "money-income" : "money-expense"}">${money(actual)}</strong><span class="${projectedClass(actual, projected, type)}">${money(projected)}</span><span class="${varianceClass(actual, projected, type)}">${money(variance)}</span></div>`;
  }

  function modalSubscriptionDetail(subId) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub) return "";
    return `${modalHeader(sub.name, sub.plan)}
      ${imageAttachmentField("subDetail", sub.image || "", "Subscription Picture / Logo", sub.imageZoom, sub.imageX, sub.imageY, sub.imageFit, sub.imageOpacity)}
      <div class="detail-table">
        <div class="row head"><span>Period</span><span>Actual</span><span>Projected</span><span>Variance</span></div>
        ${detailPeriod("Quarterly", sub.amount * 3, sub.projected * 3, "expense")}
        ${detailPeriod("6 Months", sub.amount * 6, sub.projected * 6, "expense")}
        ${detailPeriod("Yearly", sub.amount * 12, sub.projected * 12, "expense")}
      </div>
      <h3>Subscription Details</h3>
      <div class="detail-table">
        <div class="row"><span>Status</span><span></span><span></span><strong class="positive">${esc(sub.status)}</strong></div>
        <div class="row"><span>Billing Frequency</span><span></span><span></span><strong>${esc(sub.cycle)}</strong></div>
        <div class="row"><span>Next Charge</span><span></span><span></span><strong>${dateLabel(sub.nextDate)}</strong></div>
        <div class="row"><span>Last Charged</span><span></span><span></span><strong>${dateLabel(sub.lastDate)}</strong></div>
        <div class="row"><span>Auto-Pay</span><span></span><span></span><strong class="${sub.autopay ? "positive" : "muted"}">${sub.autopay ? "Enabled" : "Manual"}</strong></div>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;"><button class="secondary-btn" data-action="save-subscription-media" data-id="${sub.id}">${icon("camera")} Save Picture</button><button class="danger-btn" data-action="cancel-subscription" data-id="${sub.id}">${icon("close")} Cancel Subscription</button><button class="danger-btn" data-action="delete-subscription" data-id="${sub.id}" style="grid-column:1 / -1;">${icon("trash")} Delete</button></div>`;
  }

  function modalSubscriptionAmount(subId, mode) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub) return "";
    const projected = mode === "editSubscriptionProjected";
    return `${modalHeader(projected ? "Edit Projected Amount" : `Edit Amounts - ${sub.name}`, projected ? `${sub.name} - ${filterLabel(sub.cycle)}` : "")}
      <div class="field-grid">
        ${field("subAmount", projected ? "Projected Amount ($)" : "Actual Amount ($)", projected ? sub.projected : sub.amount, "0.00", "number")}
      </div>
      ${projected ? `<div class="sheet-actions" style="grid-template-columns:1fr 1fr;"><button class="outline-btn" data-action="reset-projected" data-id="${sub.id}">Reset to Actual</button><button class="success-btn" data-action="save-sub-amount" data-id="${sub.id}" data-mode="${mode}">Save</button></div>` : `<div class="sheet-actions"><button class="primary-btn" data-action="save-sub-amount" data-id="${sub.id}" data-mode="${mode}">Save Changes</button></div>`}`;
  }

  function modalPaySubscription(subId) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub) return "";
    return `${modalHeader(`Pay ${sub.name}`, `${money(sub.amount)} / ${sub.cycle}`)}
      <section class="section-card" style="box-shadow:none;background:#eef3f9;margin-bottom:16px;"><div class="card-row"><div><span class="subtle">Payment Amount</span><div class="amount-large money-blue">${money(sub.amount)}</div></div><div><span class="subtle">Billing Cycle</span><div><strong>${filterLabel(sub.cycle)}</strong></div></div></div></section>
      <div class="section-title"><h2>Pay From</h2><button class="text-btn">${icon("plus")} Link Account</button></div>
      <div class="list">${data.accounts.map((acct) => `<button class="data-row" style="background:transparent;width:100%;text-align:left;border:1px solid var(--line);border-radius:8px;padding:12px;" data-action="pay-subscription" data-id="${sub.id}" data-account="${acct.id}">
        <span class="round-icon">${icon("wallet")}</span><div><strong>${esc(acct.name)}</strong><div class="subtle">****${esc(acct.last4)} - ${money(acct.balance)}</div></div><span class="status ${acct.type === "Credit" ? "muted" : "success"}">${esc(acct.type)}</span>
      </button>`).join("")}</div>
      <p class="muted">${icon("check")} Payments are secured with 256-bit encryption via Stripe.</p>`;
  }

  function modalSubscriptionTransactions() {
    return `${modalHeader("Subscription Transactions")}
      <div class="metrics-grid" style="margin-bottom:18px;">
        <div class="metric"><label>Total</label><strong>${data.subscriptionHistory.length}</strong></div>
        <div class="metric"><label>Completed</label><strong class="positive">${data.subscriptionHistory.filter((h) => h.status === "Paid").length}</strong></div>
        <div class="metric"><label>Failed</label><strong class="negative">${data.subscriptionHistory.filter((h) => h.status === "Failed").length}</strong></div>
      </div>
      <div class="list">${data.subscriptionHistory.map((h) => `<article class="data-row" style="border:1px solid var(--line);border-radius:8px;padding:12px;">
        <span class="round-icon">${icon("playcard")}</span><div><strong>${esc(h.name)}</strong><div class="subtle">${dateLabel(h.date)}<br>${esc(h.code)}</div></div><div style="text-align:right;"><strong>${money(h.amount)}</strong><br><span class="status ${statusClass(h.status)}">${esc(h.status)}</span></div>
      </article>`).join("")}</div>`;
  }

  function modalSubscriptionStatus(subId) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub) return "";
    const statuses = ["Active", "Trial", "Expiring Soon", "Cancelled"];
    return `${modalHeader("Change Status", sub.name)}
      <div class="list">${statuses.map((status) => `<button class="data-row" style="background:transparent;border:1px solid var(--line);border-radius:8px;padding:12px;width:100%;text-align:left;" data-action="set-sub-status" data-id="${sub.id}" data-status="${status}">
        <span class="status ${statusClass(status)}">${esc(status)}</span><span>${status === "Cancelled" ? "Cancel Subscription" : `Set ${status}`}</span><span>${sub.status === status ? icon("check") : ""}</span>
      </button>`).join("")}</div>`;
  }

  function modalLoan(loanId) {
    const defaultDate = todayIso();
    const loan = data.loans.find((item) => item.id === loanId) || { date: defaultDate, dueDate: addDaysIso(defaultDate, 14), amount: "", repaid: 0, forgiven: 0 };
    const editing = Boolean(loan.id);
    const matchedContact = data.contacts.find((contact) => contact.id === loan.contactId) || data.contacts.find((contact) => contact.name.toLowerCase() === String(loan.borrower || "").toLowerCase());
    const comboValue = ui.loanContactQuery || matchedContact?.name || loan.borrower || "";
    const loanContactQuery = String(comboValue || "").trim().toLowerCase();
    const loanContacts = loanContactMatches(loanContactQuery, matchedContact);
    return `${modalHeader(editing ? "Edit Loan Transaction" : "Record Loan", editing ? "Borrower name, amount, repayments, forgiveness, and due date can all be corrected here." : "")}
      <div class="field-grid">
        <div class="field loan-contact-picker contact-combo-field">
          <label for="loanContactSearch">Borrower From Contacts</label>
          <label class="search-field">${icon("search")}<input id="loanContactSearch" value="${esc(comboValue)}" data-action="loan-contact-search" list="loanContactOptions" placeholder="Search contacts or type a borrower name..." autocomplete="off"></label>
          <input id="loanContact" type="hidden" value="${esc(matchedContact?.id || "")}">
          <datalist id="loanContactOptions">
            <option value="+ Add new contact"></option>
            ${data.contacts.map((contact) => `<option value="${esc(contact.name)}">${esc([contact.phone, contact.email].filter(Boolean).join(" | "))}</option>`).join("")}
          </datalist>
          <p id="loanContactHelp" class="subtle">${loanContactQuery ? `${loanContacts.length} matching contact${loanContacts.length === 1 ? "" : "s"}` : "Start typing, choose a contact, or type a manual borrower."}</p>
          <div class="contact-suggestion-row">
            <button type="button" class="contact-suggestion-chip" data-action="pick-loan-contact" data-id="">Manual borrower</button>
            <button type="button" class="contact-suggestion-chip" data-action="pick-loan-contact" data-id="${ADD_LOAN_CONTACT_VALUE}">+ Add new contact</button>
            ${loanContacts.slice(0, 6).map((contact) => `<button type="button" class="contact-suggestion-chip" data-action="pick-loan-contact" data-id="${esc(contact.id)}">${esc(contact.name)}</button>`).join("")}
          </div>
        </div>
        <section id="loanNewContactPanel" class="inline-add-panel" hidden>
          <div class="inline-add-heading">${icon("plus")} New contact will be saved with this loan</div>
          <p class="subtle">Fill in Borrower Name, Phone, and Email below. When you save, BillMaster will add that person to Contacts and link the loan.</p>
        </section>
        ${field("loanBorrower", "Borrower Name", loan.borrower || "", "Borrower Name")}
        <div class="field-row">${field("loanPhone", "Phone", loan.borrowerPhone || matchedContact?.phone || "", "Phone", "tel")}${field("loanEmail", "Email", loan.borrowerEmail || matchedContact?.email || "", "Email", "email")}</div>
        ${field("loanAmount", "Original Amount", loan.amount || "", "Amount", "number")}
        ${editing ? field("loanRepaid", "Repaid to Date", loan.repaid || 0, "0.00", "number") : ""}
        ${editing ? field("loanForgiven", "Forgiven Amount", loan.forgiven || 0, "0.00", "number") : ""}
        ${field("loanDescription", "Description", loan.description || "", "Description (optional)")}
        ${field("loanDate", "Loan Date", loan.date || "2026-05-06", "", "date")}
        ${field("loanDue", "Due Date", loan.dueDate || "", "", "date")}
        ${imageAttachmentField("loan", loan.image || "", "Lending Picture / Graphic", loan.imageZoom, loan.imageX, loan.imageY, loan.imageFit, loan.imageOpacity)}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;"><button class="outline-btn" data-action="close-modal">Cancel</button><button class="success-btn" data-action="save-loan" data-id="${loan.id || ""}">${editing ? "Update Loan" : "Save"}</button></div>`;
  }

  function modalRepayLoan(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (!loan) return "";
    const outstanding = loanRemaining(loan);
    return `${modalHeader("Record Repayment", `Outstanding: ${money(outstanding)}`)}
      <div class="field-grid">
        ${field("repayAmount", "Repayment Amount", "", "Repayment Amount", "number")}
        ${field("repayDate", "Repayment Date", "2026-05-06", "", "date")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;"><button class="outline-btn" data-action="open-modal" data-modal="addLoan" data-id="${loan.id}">${icon("edit")} Edit Loan</button><button class="outline-btn" data-action="open-modal" data-modal="forgiveLoan" data-id="${loan.id}">Forgive</button><button class="secondary-btn" data-action="save-repayment" data-id="${loan.id}" style="grid-column:1 / -1;">Save Repayment</button></div>`;
  }

  function modalForgiveLoan(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (!loan) return "";
    const outstanding = loanRemaining(loan);
    return `${modalHeader("Forgive Loan", `${loan.borrower} - remaining ${money(outstanding)}`)}
      <div class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="card-row"><span class="subtle">Outstanding now</span><strong class="negative">${money(outstanding)}</strong></div>
        <div class="card-row"><span class="subtle">Remaining after forgiveness</span><strong id="forgivePreviewRemaining" class="money-blue">${money(outstanding)}</strong></div>
        <p class="subtle" style="margin-top:8px;">Only the amount you enter here will be forgiven. Enter the full outstanding balance only when you want to close the loan.</p>
      </div>
      <div class="field-grid">
        <div class="field"><label for="forgiveAmount">Forgiven Amount</label><input id="forgiveAmount" type="number" min="0.01" max="${esc(outstanding)}" step="0.01" value="" placeholder="Amount to forgive"></div>
        ${field("forgiveDate", "Forgiven Date", "2026-05-06", "", "date")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;"><button class="outline-btn" data-action="close-modal">Cancel</button><button class="success-btn" data-action="save-forgiveness" data-id="${loan.id}">Save Forgiveness</button></div>`;
  }

  function modalAddress(addrId) {
    const addr = data.addresses.find((item) => item.id === addrId) || {};
    const saved = Boolean(addr.id);
    const verified = addressVerified(addr);
    const reviewing = addressReviewing(addr);
    const validationClass = verified ? "verified" : (reviewing ? "reviewing" : "");
    return `${modalHeader(addr.id ? "Edit Address" : "Add Address")}
      <div class="field-grid">
        ${field("addrLabel", "Label", addr.label || "", "Label")}
        ${field("addrStreet", "Street Address", mapsStreetLine(addr), "Street Address")}
        ${field("addrUnit", "Apartment / Unit", addressUnit(addr), "Apt, Unit, Suite")}
        <div class="field-row">${field("addrCity", "City", addr.city || "", "City")}${field("addrState", "State", addr.state || "", "State")}</div>
        <div class="field-row">${field("addrZip", "ZIP Code", addr.zip || "", "ZIP Code")}${field("addrCountry", "Country", addr.country || "USA", "Country")}</div>
        <section class="address-validation-panel ${validationClass}">
          <div class="card-row">
            <div>
              <strong>${icon("map")} Online address review</strong>
              <p class="subtle">${saved ? esc(addressValidationLabel(addr)) : "Save this address first, then check it online with Google Maps."}</p>
            </div>
            ${verified ? `<span class="status success">Verified</span>` : reviewing ? `<span class="status warn">Reviewing</span>` : `<span class="status muted">Not checked</span>`}
          </div>
          <div class="address-validation-actions">
            ${saved ? `<button class="outline-btn" data-action="verify-address-online" data-id="${addr.id}">${icon("map")} Check on Google Maps</button><button class="success-btn" data-action="mark-address-verified" data-id="${addr.id}">${icon("check")} Mark verified after review</button>${verified || reviewing ? `<button class="outline-btn" data-action="clear-address-verification" data-id="${addr.id}">${icon("close")} Clear</button>` : ""}` : `<button class="outline-btn" disabled>${icon("map")} Check on Google Maps</button>`}
          </div>
        </section>
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-address" data-id="${addr.id || ""}">Save Changes</button></div>`;
  }

  function modalAddressRoute() {
    const selected = ui.selectedAddresses
      .map((addressId) => data.addresses.find((addr) => addr.id === addressId))
      .filter(Boolean);
    const routeUrl = mapsRouteUrl(selected);
    if (selected.length < 2) {
      return `${modalHeader("Map Addresses", "Select at least two addresses to create a Google Maps route.")}
        <div class="section-card" style="box-shadow:none;"><p class="muted">Tap the plus icon on address cards, then open this route link panel again.</p></div>`;
    }
    return `${modalHeader("Map Addresses", `${selected.length} addresses selected`)}
      <div class="list">
        ${selected.map((addr, index) => `<div class="address-row"><span class="status info">${index + 1}</span><div><strong>${esc(addr.label)}</strong><div class="subtle">${esc(addressText(addr))}</div></div><button class="icon-btn" data-action="toggle-address-select" data-id="${addr.id}">${icon("close")}</button></div>`).join("")}
      </div>
      <div class="field" style="margin-top:16px;"><label>Route URL</label><textarea id="routeUrl" readonly>${esc(routeUrl)}</textarea></div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="copy-route-link">${icon("note")} Copy Link</button>
        <a class="primary-btn" href="${esc(routeUrl)}" target="_blank" rel="noopener">${icon("map")} Open Route</a>
      </div>`;
  }

  function modalCalendarSync() {
    const visibleCount = calendarExportItems().length;
    return `${modalHeader("Google Calendar", "OAuth sync needs a backend connection; this prototype can export import-ready events now.")}
      <div class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="card-row"><strong>${icon("calendar")} Visible task events</strong><span class="status info">${visibleCount}</span></div>
        <p class="muted">Use the export to import your current visible BillMaster tasks into Google Calendar while full two-way sync is staged.</p>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="download-calendar-ics">${icon("note")} Export .ics</button>
        <a class="primary-btn" href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noopener">${icon("calendar")} Open Google Calendar</a>
      </div>`;
  }

  function modalCalendarDatePicker(initialDate) {
    const startingDate = initialDate || ui.selectedDate;
    return `${modalHeader("Go To Date", isBlockLikeCalendarView() || ui.calendarView === "week" ? "Pick any date to jump to that week." : "Pick any date to open.")}
      <div class="field-grid">
        ${field("calendarJumpDate", "Date", startingDate, "", "date")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="jump-calendar-date">${icon("calendar")} Go</button>
      </div>`;
  }

  function modalCalendarMonthPicker() {
    const monthValue = ui.selectedDate.slice(0, 7);
    return `${modalHeader("Go To Month", "Pick a month and year to open that month.")}
      <div class="field-grid">
        ${field("calendarJumpMonth", "Month and Year", monthValue, "", "month")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="jump-calendar-month">${icon("calendar")} Go</button>
      </div>`;
  }

  function modalTaskDefaults() {
    const selected = defaultTaskBgColor();
    return `${modalHeader("Calendar Settings", "Choose the default new-task color and category colors used in Block View.")}
      <div class="field-grid">
        ${swatchChoiceField("defaultTaskBgColor", "Default Event Background", taskBackgrounds, selected)}
        <section class="section-card" style="box-shadow:none;background:#f8fbff;">
          <div class="section-title"><h2>Block View Category Colors</h2></div>
          <div class="category-color-grid">
            ${taskCategories.map((category) => `<label class="category-color-control"><span>${esc(category)}</span><input id="categoryColor${esc(category)}" type="color" value="${esc(taskCategoryColor(category))}"></label>`).join("")}
          </div>
        </section>
        <section class="section-card" style="box-shadow:none;background:#f8fbff;">
          <div class="event-default-preview" style="--event-bg:${esc(selected)};">
            <span class="block-resize block-resize-top"></span>
            <strong>New task preview</strong>
            <span>2:00 PM - 3:00 PM</span>
            <span class="block-resize block-resize-bottom"></span>
          </div>
        </section>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="save-task-defaults">Save Settings</button>
      </div>`;
  }

  function modalTask(taskId) {
    const projectDefault = ui.view === "projects" && ui.projectId ? ui.projectId : null;
    const task = data.tasks.find((item) => item.id === taskId) || { date: ui.selectedDate, endDate: ui.selectedDate, start: "09:00", end: "10:00", priority: "Medium", status: "Not Started", repeat: "None", includeHours: true, bgColor: defaultTaskBgColor(), projectId: projectDefault, alertOffsets: TASK_ALERT_DEFAULT_OFFSETS, alertDevice: true, alertSound: true, alertEmail: false, alertConfigured: true, alertFiredKeys: [] };
    return `${modalHeader(task.id ? "Edit Task" : "Add Task")}
      <div class="field-grid">
        ${field("taskTitle", "Task Title", task.title || "", "Task Title")}
        ${textArea("taskDescription", "Description", task.description || "", "Description (optional)")}
        <div class="task-date-time-grid" aria-label="Task start and end date and time">
          ${field("taskDate", "Start Date", task.date || ui.selectedDate, "", "date")}
          ${field("taskStart", "Start Time", task.start || "", "", "time")}
          ${field("taskEndDate", "End Date", taskEndDate(task), "", "date")}
          ${field("taskEnd", "End Time", task.end || "", "", "time")}
        </div>
        ${choiceField("taskPriority", "Priority", taskPriorityOptions, task.priority || "Medium", priorityColor)}
        ${choiceField("taskStatus", "Status", taskStatusOptions, task.status || "Not Started", statusHandleColor)}
        ${selectField("taskRepeat", "Repeat", ["None", "Daily", "Weekly", "Bi-Weekly", "Monthly", "Custom"], task.repeat || "None")}
        ${selectField("taskCategory", "Category", [ADD_TASK_CATEGORY_VALUE, ...taskCategories], taskCategory(task), taskCategoryLabel)}
        <button class="outline-btn inline-add-trigger" data-action="show-task-category-panel">${icon("plus")} Add new category</button>
        <div id="taskNewCategoryPanel" class="inline-add-panel" hidden>
          <div class="inline-add-heading">${icon("plus")} New task category</div>
          <div class="field-row">${field("taskNewCategory", "Category Name", "", "Errands, Calls, Clients")}${field("taskNewCategoryColor", "Category Color", customCategoryColor(task.title || "New Category"), "", "color")}</div>
        </div>
        ${swatchChoiceField("taskBgColor", "Event Background", taskBackgrounds, taskBackgroundColor(task))}
        ${selectField("taskFont", "Event Font", taskFonts, task.fontFamily || "System")}
        ${selectField("taskAddress", "Location", [ADD_TASK_ADDRESS_VALUE, "", ...data.addresses.map((a) => a.id)], task.addressId || "", taskAddressLabel)}
        <div id="taskNewAddressPanel" class="inline-add-panel" hidden>
          <div class="inline-add-heading">${icon("plus")} New task address</div>
          <div class="field-grid">
            ${field("taskNewAddrLabel", "Address Label", "", "Home, Work, Court, Gym")}
            ${field("taskNewAddrStreet", "Street Address", "", "Street Address")}
            <div class="field-row">${field("taskNewAddrCity", "City", "", "City")}${field("taskNewAddrState", "State", "", "State")}</div>
            <div class="field-row">${field("taskNewAddrZip", "ZIP Code", "", "ZIP Code")}${field("taskNewAddrCountry", "Country", "USA", "Country")}</div>
          </div>
        </div>
        ${selectField("taskBill", "Link to Bill", ["", ...data.bills.map((b) => b.id)], task.billId || "", (value) => value ? data.bills.find((b) => b.id === value).name : "No bill")}
        ${selectField("taskGoal", "Link to Goal", ["", ...data.goals.map((g) => g.id)], task.goalId || "", (value) => value ? data.goals.find((g) => g.id === value).name : "No goal")}
        ${selectField("taskProject", "Project", ["", ...data.projects.map((p) => p.id)], task.projectId || "", (value) => value ? data.projects.find((p) => p.id === value).name : "No project")}
        ${task.projectId ? `<button class="outline-btn inline-project-edit" data-action="open-modal" data-modal="editProjectName" data-id="${task.projectId}" data-return-modal="editTask" data-return-id="${task.id || ""}">${icon("edit")} Edit selected project</button>` : ""}
        ${selectField("taskContact", "Primary Contact", ["", ...data.contacts.map((contact) => contact.id)], task.contactId || "", (value) => value ? data.contacts.find((contact) => contact.id === value)?.name || "Contact" : "No primary contact")}
        ${taskAlertPanel(task)}
        <section class="inline-add-panel task-notify-panel">
          <div class="inline-add-heading">${icon("bell")} Notify Contacts</div>
          <p class="subtle">${taskNotifySummary(task)}</p>
          <p class="subtle">${taskNotifyTriggerSummary(task)}</p>
          ${task.id ? `<button class="outline-btn" data-action="open-modal" data-modal="taskNotify" data-id="${task.id}" data-return-modal="editTask">${icon("plus")} Select contacts or groups</button>` : `<p class="subtle">Save this task first, then select contacts or groups to notify.</p>`}
        </section>
        ${textArea("taskSubtasks", "Checklist Items", taskChecklistText(task), "One item per line. Use [x] to mark something done.")}
        ${imageAttachmentField("task", task.image || "", "Task Picture / Graphic", task.imageZoom, task.imageX, task.imageY, task.imageFit, task.imageOpacity === undefined ? 0.28 : task.imageOpacity)}
        <label class="section-card" style="box-shadow:none;background:#f0f7ff;display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <span><strong>Include in hour totals</strong><br><span class="subtle">Count this task's hours in daily, weekly and monthly totals</span></span>
          <input id="taskIncludeHours" type="checkbox" ${task.includeHours ? "checked" : ""} style="width:24px;height:24px;">
        </label>
      </div>
      <div class="sheet-actions"><button class="secondary-btn" data-action="save-task" data-id="${task.id || ""}">Save Changes</button></div>`;
  }

  function modalBlockQuickCreate() {
    const draft = ui.blockQuickCreateDraft || {};
    const date = draft.date || ui.selectedDate;
    const start = draft.start || "09:00";
    const end = draft.end || addMinutesToTime(start, 60);
    const startMinute = minutes(start);
    let endMinute = minutes(end);
    if (endMinute <= startMinute) endMinute += 24 * 60;
    const spanMinutes = Math.max(15, endMinute - startMinute);
    const spanLabel = spanMinutes >= 60 ? `${round1(spanMinutes / 60)}h` : `${spanMinutes}m`;
    return `${modalHeader("Create Task", "Your dragged time is ready. Add the title, check details, save.")}
      <section class="quick-create-summary" aria-label="Selected task time">
        <div>
          <span class="subtle">Selected block</span>
          <strong>${esc(dateLabel(date))}</strong>
        </div>
        <div>
          <span class="subtle">Time</span>
          <strong>${esc(timeLabel(start))} - ${esc(timeLabel(end))}</strong>
        </div>
        <div>
          <span class="subtle">Length</span>
          <strong>${esc(spanLabel)}</strong>
        </div>
      </section>
      <div class="field-grid block-quick-create-form">
        ${field("blockQuickTitle", "Task Title", draft.title || "", "New timed task")}
        ${field("blockQuickDate", "Date", date, "", "date")}
        <div class="field-row">${field("blockQuickStart", "Start Time", start, "", "time")}${field("blockQuickEnd", "End Time", end, "", "time")}</div>
        ${selectField("blockQuickCategory", "Category", taskCategories, draft.category || "General", taskCategoryLabel)}
        ${swatchChoiceField("blockQuickBgColor", "Event Background", taskBackgrounds, draft.bgColor || defaultTaskBgColor())}
        ${choiceField("blockQuickPriority", "Priority", taskPriorityOptions, draft.priority || "Medium", priorityColor)}
        ${choiceField("blockQuickStatus", "Status", taskStatusOptions, draft.status || "Not Started", statusHandleColor)}
        <label class="section-card block-quick-hours" style="box-shadow:none;background:#f0f7ff;display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <span><strong>Include in hour totals</strong><br><span class="subtle">Turn this off when the task should not count toward the day total.</span></span>
          <input id="blockQuickIncludeHours" type="checkbox" ${draft.includeHours === false ? "" : "checked"} style="width:24px;height:24px;">
        </label>
      </div>
      <div class="sheet-actions block-quick-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="save-block-quick-task">${icon("plus")} Create Task</button>
      </div>`;
  }

  function modalProfiles() {
    const current = activeProfile();
    return `${modalHeader("User Profiles", current ? `Signed in as ${current.displayName}` : "Create or sign in to a local workspace.")}
      <section class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="section-title"><h2>Local Workspaces</h2><span class="status info">${profiles.length}</span></div>
        <p class="muted">This is local profile separation for the prototype. Do not use real passwords here yet; real friend accounts need Supabase Auth.</p>
        <div class="profile-list">
          ${profiles.map((profile) => `<div class="profile-row">
            <span class="round-icon">${icon("home")}</span>
            <span><strong>${esc(profile.displayName)}</strong><span>@${esc(profile.username)}${profile.id === currentProfileId ? " - current" : ""}</span></span>
            <span style="display:flex;gap:6px;">${profile.id === currentProfileId ? `<span class="status success">Active</span>` : `<button class="outline-btn" data-action="open-modal" data-modal="profileLogin" data-id="${profile.id}">Sign In</button>`}${profiles.length > 1 ? `<button class="icon-btn danger-text" data-action="delete-profile" data-id="${profile.id}" aria-label="Delete profile">${icon("trash")}</button>` : ""}</span>
          </div>`).join("")}
        </div>
      </section>
      <div class="field-grid">
        ${field("profileDisplayName", "Display Name", "", "Your name")}
        ${field("profileUsername", "Username", "", "username")}
        ${field("profilePassword", "Password", "", "password", "password")}
        <label class="check-row"><input id="profileSampleData" type="checkbox" checked> Start with BillMaster sample data</label>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="lock-profile">${icon("settings")} Lock App</button>
        <button class="secondary-btn" data-action="save-profile">${icon("plus")} Create Profile</button>
      </div>`;
  }

  function modalProfileLogin(profileId) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return "";
    return `${modalHeader("Sign In", `${profile.displayName} (@${profile.username})`)}
      <div class="field-grid">
        ${field("profileLoginPassword", "Password", "", "password", "password")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="open-modal" data-modal="profiles">Back</button>
        <button class="secondary-btn" data-action="login-profile" data-id="${profile.id}">${icon("check")} Sign In</button>
      </div>`;
  }

  function modalRestoreBackup() {
    const preview = ui.backupRestorePreview;
    if (!preview) {
      return `${modalHeader("Restore Backup", "Choose a BillMaster backup JSON file first.")}
        <div class="empty-state compact-empty">
          ${icon("folder")}
          <h3>No backup selected</h3>
          <p>Use Import / restore from Sync Center to select a backup file.</p>
        </div>
        <div class="sheet-actions">
          <button class="outline-btn" data-action="close-modal">Close</button>
        </div>`;
    }
    const counts = workspaceSummaryCounts(preview.workspace);
    return `${modalHeader("Restore Backup", "Review this file before replacing this device's workspace.")}
      <div class="restore-warning">
        ${icon("alert")}
        <span>This replaces this device first, saves a local safety copy, and turns Auto Sync off until you review it.</span>
      </div>
      <div class="restore-preview-grid">
        <span><strong>${esc(preview.fileName || "Backup file")}</strong><small>file</small></span>
        <span><strong>${esc(backupTimeLabel(preview.exportedAt))}</strong><small>exported</small></span>
        <span><strong>${esc(preview.accountEmail || "Unknown account")}</strong><small>account</small></span>
        <span><strong>${esc(counts.tasks)}</strong><small>tasks</small></span>
        <span><strong>${esc(counts.notes)}</strong><small>notes</small></span>
        <span><strong>${esc(counts.loans)}</strong><small>loans</small></span>
        <span><strong>${esc(counts.contacts)}</strong><small>contacts</small></span>
        <span><strong>${esc(counts.addresses)}</strong><small>addresses</small></span>
      </div>
      <div class="sheet-actions">
        <button class="outline-btn" data-action="clear-backup-preview">${icon("close")} Cancel</button>
        <button class="danger-btn" data-action="restore-backup-confirm">${icon("refresh")} Restore this backup</button>
      </div>`;
  }

  function modalCloudSetup() {
    const hostedStatus = hostedCloudConfigReady()
      ? `<span class="status success">Hosted config ready</span>`
      : hostedCloudConfigStarted()
        ? `<span class="status warn">Publishable key needed</span>`
        : `<span class="status info">Manual setup</span>`;
    return `${modalHeader("Supabase Setup", "Advanced setup for the hosted cloud project. Friends should not need this once the public config is complete.")}
      <section class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="section-title"><h2>Hosted Cloud Project</h2>${hostedStatus}</div>
        <p class="muted">Use the Supabase API URL that ends in <strong>.supabase.co</strong>. Use the publishable/anon public key, never the service role key. The publishable key is browser-safe when Row Level Security is on.</p>
        <p class="muted"><strong>Important:</strong> saving here fixes this browser. To make phone/iPad and friends work without manual setup, paste the same publishable key into <strong>billmaster-config.js</strong> and push it to GitHub.</p>
      </section>
      <div class="field-grid">
        ${field("cloudUrl", "Supabase Project URL", cloudConfig.url || "", "https://your-project.supabase.co", "url")}
        ${field("cloudAnonKey", "Supabase Public Anon / Publishable Key", cloudConfig.anonKey || "", "sb_publishable_... or eyJhbGciOi...", "password")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:repeat(3, minmax(0, 1fr));">
        <button class="outline-btn" data-action="test-cloud-config">${icon("search")} Test</button>
        <button class="outline-btn" data-action="copy-hosted-cloud-config">${icon("note")} Copy hosted config</button>
        <button class="secondary-btn" data-action="save-cloud-config">${icon("check")} Save Setup</button>
      </div>`;
  }

  function modalCloudAuth() {
    const profile = activeProfile();
    return `${modalHeader("Cloud Sign In", "Create or sign into the BillMaster account that owns this private synced workspace.")}
      <section class="section-card" style="box-shadow:none;background:#fff8e5;margin-bottom:14px;">
        <div class="section-title"><h2>Use App Credentials</h2><span class="status warn">Beta</span></div>
        <p class="muted">This is not your Supabase dashboard password, database password, API URL, or publishable key. Use the email and password you want for BillMaster itself.</p>
      </section>
      <div class="field-grid">
        ${field("cloudDisplayName", "Display Name", profile?.displayName || "", "Your name")}
        ${field("cloudEmail", "Email", profile?.username?.includes("@") ? profile.username : "", "you@example.com", "email")}
        ${field("cloudPassword", "BillMaster Cloud Password", "", "Create or enter your app password", "password")}
        <label class="check-row"><input id="cloudStartClean" type="checkbox" checked> First-time users: create a clean private workspace if this account has no saved cloud data yet</label>
        <p class="muted">Leave this on for friends. Turn it off only when you intentionally want to upload this device's current workspace.</p>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="cloud-sign-up">${icon("plus")} Create account first</button>
        <button class="secondary-btn" data-action="cloud-sign-in">${icon("check")} Sign in</button>
      </div>`;
  }

  function modalGoogleContactsSetup() {
    const origin = typeof window !== "undefined" && window.location ? window.location.origin : "https://marksman2g.github.io";
    return `${modalHeader("Google Contacts Setup", "This connects BillMaster to your Google Contacts in read-only mode. Use a Web OAuth Client ID, not a client secret.")}
      <section class="section-card google-setup-card" style="box-shadow:none;margin-bottom:14px;">
        <div class="section-title"><h2>What You Need To Verify</h2><span class="status info">Google Cloud</span></div>
        <ol class="setup-steps">
          <li>Enable the <strong>People API</strong> for your Google Cloud project.</li>
          <li>Configure the OAuth consent screen and add yourself as a test user if Google asks.</li>
          <li>Create an <strong>OAuth Client ID</strong> with application type <strong>Web application</strong>.</li>
          <li>Add authorized JavaScript origins: <strong>https://marksman2g.github.io</strong>, <strong>http://127.0.0.1:4180</strong>, and <strong>http://localhost:4180</strong>.</li>
          <li>Copy the Client ID that ends with <strong>.apps.googleusercontent.com</strong> and paste it below.</li>
        </ol>
      </section>
      <div class="field-grid">
        ${field("googleContactsClientId", "Google OAuth Web Client ID", data.settings?.googleContactsClientId || "", "1234567890-abc.apps.googleusercontent.com")}
        <div class="field"><label>Current Browser Origin</label><input value="${esc(origin)}" readonly></div>
        <div class="field"><label>Scope BillMaster Requests</label><input value="${esc(GOOGLE_CONTACTS_SCOPE)}" readonly></div>
      </div>
      <div class="sheet-actions" style="grid-template-columns:repeat(3, minmax(0, 1fr));">
        <button class="outline-btn" data-action="copy-google-contacts-checklist">${icon("note")} Copy steps</button>
        <button class="secondary-btn" data-action="save-google-contacts-config">${icon("check")} Save Client ID</button>
        <button class="primary-btn" data-action="google-contacts-import" ${data.settings?.googleContactsClientId ? "" : "disabled"}>${icon("wallet")} Import now</button>
      </div>`;
  }

  function modalCopyFallback() {
    const title = ui.modal?.title || "Copy Text";
    const helper = ui.modal?.helper || "Select the text below and copy it.";
    const text = ui.modal?.text || "";
    return `${modalHeader(title, helper)}
      <div class="copy-fallback-panel">
        <textarea id="copyFallbackText" class="copy-fallback-text" readonly>${esc(text)}</textarea>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="select-copy-fallback">${icon("search")} Select text</button>
        <button class="secondary-btn" data-action="close-modal">${icon("check")} Done</button>
      </div>`;
  }

  function modalFriendOnboarding() {
    return `${modalHeader("Friend Alpha Walkthrough", "Use this with the first trusted tester while you watch what feels clear or confusing.")}
      <section class="section-card friend-onboarding-modal-card" style="box-shadow:none;">
        <div class="section-title compact-title"><h2>Before They Start</h2><span class="status warn">Safe alpha</span></div>
        <p class="muted">Tell them BillMaster is ready for personal organization and manual finance testing, but not ready for live bank passwords, real bill payments, or direct cancellation APIs.</p>
        <div class="friend-onboarding-checklist">
          <label><input type="checkbox"> Open the live app from a phone, iPad, or desktop.</label>
          <label><input type="checkbox"> Create a new BillMaster account with their own email.</label>
          <label><input type="checkbox"> Add one task with a time and address.</label>
          <label><input type="checkbox"> Add one note or notebook picture.</label>
          <label><input type="checkbox"> Add one safe sample loan or manual expense.</label>
          <label><input type="checkbox"> Refresh, sign back in, and confirm the data is still there.</label>
          <label><input type="checkbox"> Try another device if available.</label>
        </div>
      </section>
      <section class="section-card friend-onboarding-modal-card" style="box-shadow:none;">
        <div class="section-title compact-title"><h2>Feedback Questions</h2><span class="status info">Watch closely</span></div>
        <div class="friend-feedback-grid">
          <span><strong>Find</strong><small>Could they find Calendar, Tasks, Notes, Loans, and Sync Center?</small></span>
          <span><strong>Save</strong><small>Did every save feel obvious and safe?</small></span>
          <span><strong>Sync</strong><small>Did they understand push, pull, smart merge, and auto sync?</small></span>
          <span><strong>Money</strong><small>Did BillMaster help them make or imagine a better financial decision?</small></span>
        </div>
      </section>
      <div class="sheet-actions" style="grid-template-columns:repeat(3, minmax(0, 1fr));">
        <button class="outline-btn" data-action="copy-friend-onboarding">${icon("note")} Copy quick start</button>
        <a class="outline-btn" href="${esc(friendAlphaHostedUrl())}" target="_blank" rel="noopener">${icon("playcard")} Open live app</a>
        <button class="secondary-btn" data-action="close-modal">${icon("check")} Done</button>
      </div>`;
  }

  function modalFriendFeedback() {
    return `${modalHeader("Alpha Feedback", "Save what a friend felt while testing BillMaster. Keep it practical and tied to real decisions.")}
      <section class="section-card friend-onboarding-modal-card" style="box-shadow:none;">
        <div class="section-title compact-title"><h2>Tester Details</h2><span class="status info">Friend alpha</span></div>
        <div class="field-grid">
          ${field("feedbackTester", "Tester Name", "", "Friend name")}
          <div class="field-row">
            ${selectField("feedbackDevice", "Device", ["Phone", "iPad", "Desktop", "Multiple devices"], "Phone")}
            ${selectField("feedbackRating", "Overall Rating", ["5", "4", "3", "2", "1"], "5", (value) => `${value} / 5`)}
          </div>
        </div>
      </section>
      <section class="section-card friend-onboarding-modal-card" style="box-shadow:none;">
        <div class="section-title compact-title"><h2>What Happened?</h2><span class="status warn">Watch closely</span></div>
        <div class="field-grid">
          ${textArea("feedbackConfused", "What confused them?", "", "Where did they pause, ask a question, or click the wrong thing?")}
          ${textArea("feedbackHelped", "What felt useful or fast?", "", "What did they like or understand quickly?")}
          ${textArea("feedbackMoneyDecision", "What money decision could BillMaster help with?", "", "Example: cancel a subscription, track bill timing, compare income vs spending, plan a purchase.")}
          ${textArea("feedbackNextFeature", "What would make them keep using it?", "", "What would make this feel necessary in their life?")}
        </div>
      </section>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="primary-btn" data-action="save-alpha-feedback">${icon("check")} Save Feedback</button>
      </div>`;
  }

  function modalHabit(habitId) {
    const draft = habitId ? null : ui.habitTemplateDraft;
    const habit = data.habits.find((item) => item.id === habitId) || {
      title: "",
      description: "",
      type: "Personal",
      schedule: "Daily",
      days: [parseLocalDate(ui.selectedDate).getDay()],
      startDate: ui.selectedDate,
      endDate: "",
      start: "08:00",
      end: "08:30",
      priority: "Medium",
      status: "Active",
      includeHours: true,
      targetCount: 1,
      addressId: null,
      color: taskCategoryColor("Habit"),
      ...(draft || {}),
      startDate: draft?.startDate || ui.selectedDate,
      endDate: draft?.endDate || ""
    };
    return `${modalHeader(habit.id ? "Edit Habit" : "Add Habit", "Habits stay separate from tasks, but appear in Month, Week, Day, and Block calendar views.")}
      <div class="field-grid">
        ${habit.id ? "" : habitTemplatePicker()}
        ${field("habitTitle", "Habit Name", habit.title || "", "Habit name")}
        ${textArea("habitDescription", "Notes", habit.description || "", "What are you trying to build?")}
        <div class="field-row">${selectField("habitType", "Activity Type", habitTypeOptions, habit.type || "Personal")}${selectField("habitSchedule", "Schedule", habitScheduleOptions, habit.schedule || "Daily")}</div>
        <div class="habit-days-field">
          <label>Weekly Days</label>
          <div class="habit-day-picks">
            ${weekdayLabels.map((label, index) => `<label class="habit-day-chip"><input type="checkbox" id="habitDay${index}" ${habit.days?.includes(index) ? "checked" : ""}><span>${label}</span></label>`).join("")}
          </div>
        </div>
        <div class="field-row">${field("habitStartDate", "Start Date", habit.startDate || ui.selectedDate, "", "date")}${field("habitEndDate", "End Date", habit.endDate || "", "", "date")}</div>
        <div class="field-row">${field("habitStart", "Start Time", habit.start || "08:00", "", "time")}${field("habitEnd", "End Time", habit.end || "08:30", "", "time")}</div>
        ${choiceField("habitPriority", "Priority", taskPriorityOptions, habit.priority || "Medium", priorityColor)}
        ${selectField("habitStatus", "Habit Status", ["Active", "Paused", "Archived"], habit.status || "Active")}
        ${field("habitTargetCount", "Target Completions Per Day", habit.targetCount || 1, "1", "number")}
        ${swatchChoiceField("habitColor", "Habit Block Color", taskBackgrounds, habit.color || taskCategoryColor("Habit"))}
        ${selectField("habitAddress", "Location", [ADD_TASK_ADDRESS_VALUE, "", ...data.addresses.map((a) => a.id)], habit.addressId || "", taskAddressLabel)}
        <div id="habitNewAddressPanel" class="inline-add-panel" hidden>
          <div class="inline-add-heading">${icon("plus")} New habit address</div>
          <div class="field-grid">
            ${field("habitNewAddrLabel", "Address Label", "", "Gym, Park, Home, Work")}
            ${field("habitNewAddrStreet", "Street Address", "", "Street Address")}
            <div class="field-row">${field("habitNewAddrCity", "City", "", "City")}${field("habitNewAddrState", "State", "", "State")}</div>
            <div class="field-row">${field("habitNewAddrZip", "ZIP Code", "", "ZIP Code")}${field("habitNewAddrCountry", "Country", "USA", "Country")}</div>
          </div>
        </div>
        ${imageAttachmentField("habit", habit.image || "", "Habit Picture / Graphic", habit.imageZoom, habit.imageX, habit.imageY, habit.imageFit, habit.imageOpacity)}
        <label class="section-card" style="box-shadow:none;background:#f0f7ff;display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <span><strong>Include in hour totals</strong><br><span class="subtle">Habit time counts in daily, weekly, monthly and block totals</span></span>
          <input id="habitIncludeHours" type="checkbox" ${habit.includeHours !== false ? "checked" : ""} style="width:24px;height:24px;">
        </label>
      </div>
      <div class="sheet-actions" style="grid-template-columns:${habit.id ? "1fr 1fr" : "1fr"};">
        ${habit.id ? `<button class="danger-btn" data-action="delete-habit" data-id="${habit.id}">${icon("trash")} Delete</button>` : ""}
        <button class="secondary-btn" data-action="save-habit" data-id="${habit.id || ""}">${habit.id ? "Save Habit" : "Create Habit"}</button>
      </div>`;
  }

  function modalHabitFreshStart(habitId) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return "";
    const defaultDate = habit.freshStartDate || todayIso();
    return `${modalHeader("Start Fresh", "Pick the date BillMaster should use as the new starting point for this habit's percentages and streaks. Older history stays saved, and that start date resets clean.")}
      <section class="section-card habit-fresh-modal">
        <div>
          <strong>${esc(habit.title)}</strong>
          <span>Currently counting since ${dateLabel(habitEffectiveStartDate(habit))}</span>
        </div>
        ${field("habitFreshStartDate", "Fresh Start Date", defaultDate, "", "date")}
      </section>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="save-habit-fresh-start" data-id="${habit.id}">${icon("check")} Start Fresh</button>
      </div>`;
  }

  function habitTemplatePicker() {
    return `<section class="template-panel">
      <div class="section-title"><h2>Quick Templates</h2><span class="status info">5 slots</span></div>
      <div class="template-slot-grid">
        ${data.habitTemplates.map((template) => `<button class="template-slot" data-action="apply-habit-template" data-slot="${template.slot}">
          <span class="template-slot-number">${template.slot}</span>
          <span><strong>${esc(template.name)}</strong><small>${esc(habitTemplateSummary(template))}</small></span>
        </button>`).join("")}
      </div>
    </section>`;
  }

  function habitTemplateSummary(template) {
    const payload = template.payload || {};
    const days = payload.schedule === "Weekly" || payload.schedule === "Weekdays" ? (payload.days || []).map((day) => weekdayLabels[day]).filter(Boolean).join(", ") : payload.schedule;
    return `${payload.type || "Habit"} - ${days || payload.schedule || "Daily"} - ${timeLabel(payload.start)}-${timeLabel(payload.end)}`;
  }

  function modalSaveHabitTemplate(habitId) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return "";
    return `${modalHeader("Save Habit Template?", "Store this setup in one of five quick slots for next time.")}
      <section class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="card-row"><strong>${esc(habit.title)}</strong><span class="status info">${timeLabel(habit.start)}-${timeLabel(habit.end)}</span></div>
        <p class="muted">Saving a template keeps the setup, schedule, time, color, picture, location, and hour-count setting. It does not copy streak/completion history.</p>
      </section>
      <div class="template-slot-grid">
        ${data.habitTemplates.map((template) => `<button class="template-slot" data-action="save-habit-template-slot" data-id="${habit.id}" data-slot="${template.slot}">
          <span class="template-slot-number">${template.slot}</span>
          <span><strong>${esc(template.name)}</strong><small>Overwrite slot ${template.slot}</small></span>
        </button>`).join("")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;margin-top:14px;">
        <button class="outline-btn" data-action="skip-habit-template">Skip</button>
        <button class="secondary-btn" data-action="open-modal" data-modal="editHabit">${icon("plus")} Add Another Habit</button>
      </div>`;
  }

  function modalVoiceTask() {
    const transcript = ui.voiceTranscript || "";
    const parsed = ui.voiceParsedTask || (transcript ? parseVoiceTask(transcript) : null);
    const speechAvailable = Boolean(speechRecognitionCtor());
    const listenAction = ui.voiceListening ? "stop-voice-task" : "start-voice-task";
    const listenClass = ui.voiceListening ? "danger-btn" : "primary-btn";
    const listenLabel = ui.voiceListening ? "Stop Listening" : "Listen";
    const statusHelp = ui.voiceListening
      ? "Microphone is active. Speak the task, then tap Stop Listening."
      : transcript
        ? "Captured text is below. Tap Parse Details to review it before saving."
        : speechAvailable
          ? "Tap Listen, speak naturally, then stop when you are done."
          : "Voice capture is unavailable here. Type or paste the task sentence.";
    const example = `<div class="voice-example">
        <span class="voice-example-label">Example voice memo</span>
        <span>Add task: Call Isaiah</span>
        <span>Tomorrow</span>
        <span>From 3 PM to 4 PM</span>
        <span>Or: every Monday, Tuesday, and Wednesday</span>
        <span>At 217 Alexander Avenue, Bronx, NY</span>
        <span>High priority</span>
        <span>Project Isaiah</span>
      </div>`;
    return `${modalHeader("Add Task By Voice", speechAvailable ? "Speak a task, repeating task, or app question." : "Voice capture may be blocked here. Type or paste a task or question.")}
      <section class="voice-panel">
        <div class="voice-status ${ui.voiceListening ? "listening" : ""}">
          <span class="round-icon">${icon(ui.voiceListening ? "ai" : "mic")}</span>
          <div>
            <strong>${ui.voiceListening ? "Listening..." : speechAvailable ? "Ready for voice input" : "Typed fallback ready"}</strong>
            <div class="subtle">${esc(statusHelp)}</div>
          </div>
        </div>
        ${ui.voiceError ? `<div class="voice-message">${esc(ui.voiceError)}</div>` : example}
        <div class="sheet-actions" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:12px;">
          <button class="${listenClass}" data-action="${listenAction}" ${!ui.voiceListening && !speechAvailable ? "disabled" : ""}>${icon(ui.voiceListening ? "close" : "mic")} ${listenLabel}</button>
          <button class="outline-btn" data-action="parse-voice-task">${icon("search")} Parse Details</button>
          <button class="outline-btn" data-action="ask-ai-from-voice">${icon("ai")} Ask AI</button>
        </div>
      </section>
      <div class="field" style="margin-top:16px;">
        <label for="voiceTranscript">Task sentence</label>
        <textarea id="voiceTranscript" placeholder="Add task..." autocomplete="off">${esc(transcript)}</textarea>
      </div>
      ${parsed ? voiceTaskPreview(parsed) : ""}
      <div class="sheet-actions"><button class="secondary-btn" data-action="save-voice-task">${icon("check")} ${parsed?.recurring ? "Save Repeating Task" : voicePromptLooksLikeQuestion(transcript) ? "Ask AI" : "Save Voice Task"}</button></div>`;
  }

  function modalVoiceHabit() {
    const transcript = ui.habitVoiceTranscript || "";
    const parsed = ui.habitVoiceParsedHabit || (transcript ? parseVoiceHabit(transcript) : null);
    const speechAvailable = Boolean(speechRecognitionCtor());
    const listenAction = ui.habitVoiceListening ? "stop-voice-habit" : "start-voice-habit";
    const listenClass = ui.habitVoiceListening ? "danger-btn" : "primary-btn";
    const listenLabel = ui.habitVoiceListening ? "Stop Listening" : "Listen";
    const statusHelp = ui.habitVoiceListening
      ? "Microphone is active. Speak the habit, then tap Stop Listening."
      : transcript
        ? "Captured text is below. Tap Parse Details to review it before saving."
        : speechAvailable
          ? "Tap Listen, say the habit setup, then stop when you are done."
          : "Voice capture is unavailable here. Type or paste the habit sentence.";
    const example = `<div class="voice-example">
        <span class="voice-example-label">Example voice memo</span>
        <span>Add habit: Morning planning</span>
        <span>Weekdays</span>
        <span>From 8 AM to 8:30 AM</span>
        <span>Work category</span>
        <span>At 217 Alexander Avenue, Bronx, NY</span>
        <span>Notes: Review the day before work starts</span>
      </div>`;
    return `${modalHeader("Add Habit By Voice", speechAvailable ? "Speak the habit name, schedule, days, time, location, category, or notes." : "Voice capture may be blocked here. Type or paste the sentence, then parse it.")}
      <section class="voice-panel">
        <div class="voice-status ${ui.habitVoiceListening ? "listening" : ""}">
          <span class="round-icon">${icon(ui.habitVoiceListening ? "ai" : "mic")}</span>
          <div>
            <strong>${ui.habitVoiceListening ? "Listening..." : speechAvailable ? "Ready for habit voice input" : "Typed fallback ready"}</strong>
            <div class="subtle">${esc(statusHelp)}</div>
          </div>
        </div>
        ${ui.habitVoiceError ? `<div class="voice-message">${esc(ui.habitVoiceError)}</div>` : example}
        <div class="sheet-actions" style="grid-template-columns:1fr 1fr;margin-top:12px;">
          <button class="${listenClass}" data-action="${listenAction}" ${!ui.habitVoiceListening && !speechAvailable ? "disabled" : ""}>${icon(ui.habitVoiceListening ? "close" : "mic")} ${listenLabel}</button>
          <button class="outline-btn" data-action="parse-voice-habit">${icon("search")} Parse Details</button>
        </div>
      </section>
      <div class="field" style="margin-top:16px;">
        <label for="habitVoiceTranscript">Habit sentence</label>
        <textarea id="habitVoiceTranscript" placeholder="Add habit..." autocomplete="off">${esc(transcript)}</textarea>
      </div>
      ${parsed ? voiceHabitPreview(parsed) : ""}
      <div class="sheet-actions"><button class="secondary-btn" data-action="save-voice-habit">${icon("check")} Save Voice Habit</button></div>`;
  }

  function modalBlockTaskMenu(taskId) {
    const task = findCalendarItemById(taskId);
    if (!task) return "";
    const editRows = task.isHabit
      ? `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="edit-habit-instance" data-id="${task.id}">
          <span class="round-icon" style="color:#0b7b4b;background:#edf9f2;">${icon("edit")}</span><span>Edit this occurrence</span><span class="muted">${dateLabel(task.date)}</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="editHabit" data-id="${task.habitId}">
          <span class="round-icon">${icon("edit")}</span><span>Edit whole habit</span><span class="muted">All dates</span>
        </button>`
      : `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="editTask" data-id="${task.id}">
          <span class="round-icon">${icon("edit")}</span><span>Edit task</span><span class="muted">Double-click</span>
        </button>`;
    const deleteRows = task.isHabit
      ? `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="delete-habit" data-id="${task.id}">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete this occurrence</span><span class="muted">${dateLabel(task.date)}</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="delete-habit-series" data-id="${task.habitId}">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete whole habit</span><span class="muted">All dates</span>
        </button>`
      : `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="delete-task" data-id="${task.id}">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete task</span><span></span>
        </button>`;
    return `${modalHeader("Block Actions", task.title)}
      <div class="list">
        ${editRows}
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="blockDuplicateHorizontal" data-id="${task.id}">
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${icon("calendar")}</span><span>Duplicate across</span><span class="muted">Choose count</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="blockDuplicateVertical" data-id="${task.id}">
          <span class="round-icon" style="color:#6c63ff;background:#efedff;">${icon("note")}</span><span>Duplicate down</span><span class="muted">Choose count</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="start-block-multi-select" data-id="${task.id}">
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${icon("check")}</span><span>Multi-select tasks</span><span class="muted">Then delete selected</span>
        </button>
        ${deleteRows}
      </div>`;
  }

  function modalBlockStatus(taskId) {
    const task = findCalendarItemById(taskId);
    if (!task) return "";
    return `${modalHeader("Change Status", task.title)}
      <div class="choice-row block-status-choices">
        ${taskStatusOptions.map((status) => {
          const color = statusHandleColor(status);
          const bg = badgeBackground(color);
          const text = badgeTextColor(color);
          return `<button class="choice-chip ${task.status === status ? "active" : ""}" style="--choice-color:${color};background:${bg};border-color:${color};color:${text};" data-action="set-task-status" data-id="${task.id}" data-value="${esc(status)}">${esc(status)}</button>`;
        }).join("")}
      </div>
      <p class="muted" style="margin-top:12px;">Click the bottom handle to open this chooser. Drag the same handle to resize the end time.</p>`;
  }

  function modalDayEventActions(taskId) {
    const task = findCalendarItemById(taskId);
    if (!task) return "";
    const selected = ui.selectedTasks.includes(task.id);
    const editRows = task.isHabit
      ? `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="edit-habit-instance" data-id="${task.id}">
          <span class="round-icon" style="color:#0b7b4b;background:#edf9f2;">${icon("edit")}</span><span>Edit this occurrence</span><span class="muted">${dateLabel(task.date)}</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="editHabit" data-id="${task.habitId}">
          <span class="round-icon">${icon("edit")}</span><span>Edit whole habit</span><span class="muted">All dates</span>
        </button>`
      : `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="editTask" data-id="${task.id}">
          <span class="round-icon">${icon("edit")}</span><span>Edit task</span><span class="muted">Tap event</span>
        </button>`;
    const deleteRows = task.isHabit
      ? `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="delete-habit" data-id="${task.id}">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete this occurrence</span><span class="muted">${dateLabel(task.date)}</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="delete-habit-series" data-id="${task.habitId}">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete whole habit</span><span class="muted">All dates</span>
        </button>`
      : `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="delete-task" data-id="${task.id}">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete task</span><span></span>
        </button>`;
    return `${modalHeader("Event Actions", task.title)}
      <div class="list">
        ${editRows}
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="quickTime" data-id="${task.id}">
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${icon("bell")}</span><span>Quick change times</span><span class="muted">${timeLabel(task.start)}-${timeLabel(task.end)}</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="duplicate-calendar-item" data-id="${task.id}">
          <span class="round-icon" style="color:#6c63ff;background:#efedff;">${icon("note")}</span><span>Duplicate event</span><span class="muted">Next open slot</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="toggle-task-select" data-id="${task.id}">
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${selected ? icon("check") : icon("more")}</span><span>${selected ? "Deselect event" : "Select event"}</span><span class="muted">Multi-select</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="taskActions" ${ui.selectedTasks.length ? "" : "disabled"}>
          <span class="round-icon" style="color:#6c63ff;background:#efedff;">${icon("note")}</span><span>Duplicate selected</span><span class="muted">${ui.selectedTasks.length || "Select first"}</span>
        </button>
        ${deleteRows}
      </div>`;
  }

  function modalQuickTime(taskId) {
    const task = findCalendarItemById(taskId);
    if (!task) return "";
    return `${modalHeader("Quick Time", `${task.title} - no full edit needed`)}
      <div class="field-grid">
        <div class="field-row">${field("quickTimeDate", "Start Date", task.date || ui.selectedDate, "", "date")}${field("quickTimeStart", "Start Time", task.start || "09:00", "", "time")}</div>
        <div class="field-row">${field("quickTimeEndDate", "End Date", taskEndDate(task), "", "date")}${field("quickTimeEnd", "End Time", task.end || "10:00", "", "time")}</div>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="open-modal" data-modal="dayEventActions" data-id="${task.id}">Back</button>
        <button class="secondary-btn" data-action="save-quick-time" data-id="${task.id}">${icon("check")} Save Time</button>
      </div>`;
  }

  function modalBlockDuplicate(taskId, direction) {
    const task = findCalendarItemById(taskId);
    if (!task) return "";
    const horizontal = direction === "horizontal";
    return `${modalHeader(horizontal ? "Duplicate Across" : "Duplicate Down", task.title)}
      <div class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="card-row"><strong>${horizontal ? "Across days" : "Below this time block"}</strong><span class="status info">${timeLabel(task.start)} - ${timeLabel(task.end)}</span></div>
        <p class="muted">${horizontal ? "Each copy moves one day later while keeping the same time and task details." : "Each copy is placed after the previous block using the same duration."}</p>
      </div>
      <div class="field-grid">
        <div class="field"><label for="blockDuplicateCount">Number of copies</label><input id="blockDuplicateCount" type="number" min="1" max="24" step="1" value="1" placeholder="1"></div>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="open-modal" data-modal="blockTaskMenu" data-id="${task.id}">Back</button>
        <button class="secondary-btn" data-action="${horizontal ? "save-block-duplicate-horizontal" : "save-block-duplicate-vertical"}" data-id="${task.id}">${icon("note")} Duplicate</button>
      </div>`;
  }

  function modalSelectedDuplicate(direction) {
    const selected = ui.selectedTasks.map((taskId) => findCalendarItemById(taskId)).filter(Boolean);
    const horizontal = direction === "horizontal";
    return `${modalHeader(horizontal ? "Duplicate Selected Across" : "Duplicate Selected Down", `${selected.length} selected`)}
      <div class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="card-row"><strong>${horizontal ? "Across days" : "Below each selected block"}</strong><span class="status info">${selected.length} tasks</span></div>
        <p class="muted">${horizontal ? "Each selected task gets the number of day-by-day copies you enter." : "Each selected task gets stacked copies after its own end time."}</p>
      </div>
      <div class="field-grid">
        <div class="field"><label for="selectedDuplicateCount">Number of copies per selected task</label><input id="selectedDuplicateCount" type="number" min="1" max="24" step="1" value="1" placeholder="1"></div>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="open-modal" data-modal="taskActions">Back</button>
        <button class="secondary-btn" data-action="${horizontal ? "save-selected-duplicate-horizontal" : "save-selected-duplicate-vertical"}">${icon("note")} Duplicate</button>
      </div>`;
  }

  function modalTaskActions() {
    const selected = ui.selectedTasks.map((taskId) => findCalendarItemById(taskId)).filter(Boolean);
    const addresses = selected.map((task) => data.addresses.find((addr) => addr.id === task.addressId)).filter(Boolean);
    const allHaveAddresses = selected.length > 0 && addresses.length === selected.length;
    return `${modalHeader(`${selected.length} tasks selected`)}
      <div class="list">
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="selectedDuplicateHorizontal">
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${icon("calendar")}</span><span>Duplicate across</span><span class="muted">Choose count</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="selectedDuplicateVertical">
          <span class="round-icon" style="color:#6c63ff;background:#efedff;">${icon("note")}</span><span>Duplicate down</span><span class="muted">Choose count</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="duplicateTasks">
          <span class="round-icon" style="color:#6c63ff;background:#efedff;">${icon("note")}</span><span>Copy selected</span><span class="muted">Choose count</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="map-selected-tasks" ${allHaveAddresses ? "" : "disabled"}>
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${icon("map")}</span><span>Open address route</span><span class="muted">${addresses.length}/${selected.length}</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="copy-selected-task-route" ${allHaveAddresses ? "" : "disabled"}>
          <span class="round-icon" style="color:#0b7b4b;background:#edf9f2;">${icon("check")}</span><span>Copy route URL</span><span class="muted">${allHaveAddresses ? "Ready" : "Needs addresses"}</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="complete-selected-tasks">
          <span class="round-icon" style="color:#18a85c;background:#e9f8ef;">${icon("check")}</span><span>Change status to completed</span><span></span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="priority-selected" data-priority="High">
          <span class="round-icon" style="color:#ff9800;background:#fff5d6;">${icon("alert")}</span><span>Change priority to high</span><span></span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="copy-selected-tomorrow">
          <span class="round-icon" style="color:#6c63ff;background:#efedff;">${icon("note")}</span><span>Copy to tomorrow</span><span></span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="copyTasksDate">
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${icon("calendar")}</span><span>Copy to another date...</span><span></span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="clear-selected-tasks">
          <span class="round-icon">${icon("close")}</span><span>Clear selection</span><span></span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="delete-selected-tasks">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete selected</span><span></span>
        </button>
      </div>`;
  }

  function modalDuplicateTasks() {
    const selected = ui.selectedTasks.map((taskId) => findCalendarItemById(taskId)).filter(Boolean);
    return `${modalHeader("Copy Selected Tasks", `${selected.length || 0} selected task${selected.length === 1 ? "" : "s"}`)}
      <section class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="list">
          ${selected.slice(0, 5).map((task) => {
            const project = task.projectId ? data.projects.find((item) => item.id === task.projectId) : null;
            return `<div class="data-row"><span class="dot" style="background:${priorityColor(task.priority)}"></span><div><strong>${esc(task.title)}</strong><div class="subtle">${shortDate(task.date)} ${timeLabel(task.start)} - ${project ? esc(project.name) : "Unassigned"}</div></div>${taskQuickBadge(task, "status")}</div>`;
          }).join("") || `<p class="muted">Select at least one task first.</p>`}
          ${selected.length > 5 ? `<p class="muted">And ${selected.length - 5} more selected.</p>` : ""}
        </div>
      </section>
      <div class="field-grid">
        <div class="field"><label for="duplicateTaskCount">Copies per selected task</label><input id="duplicateTaskCount" type="number" min="1" max="25" step="1" value="1" placeholder="1"></div>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="save-duplicate-selected-tasks">${icon("note")} Copy Tasks</button>
      </div>`;
  }

  function modalCopyTasksDate() {
    const tomorrow = ui.dayCopyTargetDate || addDaysIso(ui.selectedDate, 1);
    return `${modalHeader("Copy Selected Tasks", `${ui.selectedTasks.length} selected`)}
      <div class="field-grid">
        ${field("copyTaskDate", "Copy To Date", tomorrow, "", "date")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;"><button class="outline-btn" data-action="close-modal">Cancel</button><button class="secondary-btn" data-action="copy-selected-to-date">Copy Tasks</button></div>`;
  }

  function contactHasNotifyTarget(contact, channels = ["email"]) {
    if (!contact) return false;
    if (channels.includes("email") && contact.email) return true;
    if (channels.includes("emailToText") && contact.textEmail) return true;
    return false;
  }

  function notifyGroupButton(group, selectedGroupIds, channels) {
    const contacts = safeArray(group.contactIds)
      .map((idValue) => data.contacts.find((item) => item.id === idValue))
      .filter(Boolean);
    const readyCount = contacts.filter((contact) => contactHasNotifyTarget(contact, channels)).length;
    const searchText = [group.name, group.source, contacts.map((contact) => contact.name).join(" ")].join(" ").toLowerCase();
    return `<button class="outline-btn notify-group-chip ${selectedGroupIds.has(group.id) ? "active" : ""}" data-action="toggle-notify-group" data-id="${group.id}" data-notify-search-group="${esc(searchText)}">${icon("home")}<span>${esc(group.name)}</span><small>${contacts.length} people | ${readyCount} ready</small></button>`;
  }

  function taskNotifyPreviewStats(task, selectedContactIds, selectedGroupIds, channels, extraRecipient = "") {
    const contactIds = new Set(Array.from(selectedContactIds || []));
    Array.from(selectedGroupIds || []).forEach((groupId) => {
      const group = (data.contactGroups || []).find((item) => item.id === groupId);
      safeArray(group?.contactIds).forEach((contactId) => contactIds.add(contactId));
    });
    const contacts = Array.from(contactIds)
      .map((contactId) => data.contacts.find((contact) => contact.id === contactId))
      .filter(Boolean);
    const recipients = [];
    const missing = [];
    contacts.forEach((contact) => {
      let added = false;
      if (channels.includes("email") && contact.email) {
        recipients.push(contact.email);
        added = true;
      }
      if (channels.includes("emailToText") && contact.textEmail) {
        recipients.push(contact.textEmail);
        added = true;
      }
      if (!added) missing.push(contact);
    });
    if (extraRecipient) recipients.push(extraRecipient);
    return {
      contacts,
      missing,
      recipients: Array.from(new Set(recipients.map((recipient) => String(recipient || "").trim()).filter(Boolean)))
    };
  }

  function taskNotifyPreviewMarkup(stats) {
    const missingNames = safeArray(stats.missing).slice(0, 3).map((contact) => contact.name).join(", ");
    return `<div class="notify-preview-grid">
      <span><strong>${safeArray(stats.contacts).length}</strong><small>people selected</small></span>
      <span><strong>${safeArray(stats.recipients).length}</strong><small>email/text targets</small></span>
      <span class="${safeArray(stats.missing).length ? "warn" : "ready"}"><strong>${safeArray(stats.missing).length}</strong><small>${safeArray(stats.missing).length ? "missing target" : "ready"}</small></span>
    </div>
    ${missingNames ? `<p class="subtle">${esc(missingNames)} ${stats.missing.length > 3 ? `and ${stats.missing.length - 3} more ` : ""}need an email or email-to-text address.</p>` : `<p class="subtle">Selected contacts are ready for Gmail drafts or device email.</p>`}`;
  }

  function modalTaskNotify(taskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return "";
    const contact = taskContact(task);
    const selectedContactIds = new Set(task.notifyContactIds || []);
    if (!task.notifyConfigured && task.contactId) selectedContactIds.add(task.contactId);
    const selectedGroupIds = new Set(task.notifyGroupIds || []);
    const recipient = task.notifyExtraRecipient || (!task.notifyConfigured ? (contact?.email || contact?.textEmail || "") : "");
    const message = task.notifyMessage || taskAlertMessage(task);
    const channels = taskNotifyChannels(task);
    const notifyEveryStatus = task.notifyOnAnyStatus !== false;
    const selectedStatuses = new Set(task.notifyOnStatuses || []);
    const notifyPreset = notifyStatusPresetFromState(notifyEveryStatus, selectedStatuses);
    const previewStats = taskNotifyPreviewStats(task, selectedContactIds, selectedGroupIds, channels, recipient);
    return `${modalHeader("Notify About Task", task.title)}
      <div class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="card-row"><strong>${icon("bell")} Alert preview</strong><span class="status muted">${esc(task.status)}</span></div>
        <p class="muted">${esc(message)}</p>
        <p class="subtle">Pick contacts or groups, then open a Gmail draft, device email draft, or copy the full alert. Gmail sends from whichever Google account is signed in on that device.</p>
      </div>
      <div class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="inline-add-heading">${icon("settings")} When to notify</div>
        <div class="notify-preset-row">
          <button class="outline-btn ${notifyPreset === "all" ? "active" : ""}" data-action="set-notify-status-preset" data-preset="all">${icon("bell")} Every change</button>
          <button class="outline-btn ${notifyPreset === "active" ? "active" : ""}" data-action="set-notify-status-preset" data-preset="active">${icon("task")} Start + done</button>
          <button class="outline-btn ${notifyPreset === "completed" ? "active" : ""}" data-action="set-notify-status-preset" data-preset="completed">${icon("check")} Done only</button>
          <button class="outline-btn ${notifyPreset === "custom" ? "active" : ""}" data-action="set-notify-status-preset" data-preset="custom">${icon("settings")} Custom</button>
        </div>
        <label class="check-row"><input id="taskNotifyAnyStatus" type="checkbox" ${notifyEveryStatus ? "checked" : ""}> Every status change</label>
        <div class="notify-status-grid">
          ${taskStatusOptions.map((status) => `<label class="check-row compact-check" style="border-left:4px solid ${statusHandleColor(status)};"><input class="taskNotifyStatus" type="checkbox" value="${esc(status)}" ${selectedStatuses.has(status) ? "checked" : ""}> ${esc(status)}</label>`).join("")}
        </div>
        <p class="subtle">Leave every status on for full updates, or turn it off and choose only the statuses that should send alerts.</p>
      </div>
      <div class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="inline-add-heading">${icon("mail")} Delivery method</div>
        <div class="notify-channel-grid">
          <label class="check-row"><input class="taskNotifyChannel" type="checkbox" value="email" ${channels.includes("email") ? "checked" : ""}> Email</label>
          <label class="check-row"><input class="taskNotifyChannel" type="checkbox" value="emailToText" ${channels.includes("emailToText") ? "checked" : ""}> Email-to-text</label>
        </div>
        <p class="subtle">Free text alerts usually require a carrier email gateway. Direct SMS can be added later as a paid/premium provider feature.</p>
      </div>
      <label class="search-field notify-search">${icon("search")}<input id="taskNotifySearch" data-action="notify-search" value="${esc(ui.notifyQuery || "")}" placeholder="Search imported contacts, groups, email, or phone..." autocomplete="off"></label>
      <div id="taskNotifyRecipientPreview" class="notify-preview">
        ${taskNotifyPreviewMarkup(previewStats)}
      </div>
      <div class="notify-group-row">
        ${(data.contactGroups || []).map((group) => notifyGroupButton(group, selectedGroupIds, channels)).join("") || `<span class="subtle">Create groups from the Contacts screen.</span>`}
      </div>
      <div class="notify-contact-list">
        ${data.contacts.map((item) => `<label class="notify-contact-row">
          <input type="checkbox" id="notifyContact_${item.id}" value="${esc(item.id)}" ${selectedContactIds.has(item.id) ? "checked" : ""}>
          <span><strong>${esc(item.name)}</strong><small>${esc([item.phone, item.email].filter(Boolean).join(" · ") || "No phone/email yet")}</small></span>
          <span class="round-icon">${esc(item.name.charAt(0))}</span>
        </label>`).join("") || `<p class="muted">No contacts yet.</p>`}
      </div>
      <p id="taskNotifySearchCount" class="subtle notify-search-count"></p>
      <div class="field-grid">
        ${field("taskNotifyRecipient", "Extra Email or Email-to-Text Address", recipient, "person@example.com")}
        ${textArea("taskNotifyMessage", "Message", message, "Alert message")}
      </div>
      <div class="sheet-actions notify-task-actions">
        <button class="outline-btn" data-action="open-modal" data-modal="editContact">${icon("plus")} New Contact</button>
        <button class="success-btn" data-action="save-task-notify" data-id="${task.id}">${icon("check")} Save Selection</button>
        <button class="outline-btn" data-action="copy-task-alert" data-id="${task.id}">${icon("note")} Copy Alert</button>
        <button class="primary-btn" data-action="open-task-alert-gmail" data-id="${task.id}">${icon("mail")} Open Gmail</button>
        <button class="primary-btn" data-action="open-task-alert" data-id="${task.id}">${icon("bell")} Open Email</button>
      </div>`;
  }

  function modalTaskRoute() {
    const { selected, addresses, allHaveAddresses } = selectedTaskAddresses();
    const routeUrl = allHaveAddresses ? mapsRouteUrl(addresses) : "";
    return `${modalHeader("Task Route URL", allHaveAddresses ? `${selected.length} selected tasks` : "Every selected task needs an address.")}
      ${allHaveAddresses ? `
        <div class="list">
          ${addresses.map((addr, index) => `<div class="task-address-row"><span class="status info">${index + 1}</span><div><strong>${esc(addr.label)}</strong><div class="subtle">${esc(addressText(addr))}</div></div></div>`).join("")}
        </div>
        <div class="field" style="margin-top:16px;"><label>Route URL</label><textarea id="taskRouteUrl" readonly>${esc(routeUrl)}</textarea></div>
        <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
          <button class="outline-btn" data-action="copy-task-route-from-modal">${icon("note")} Copy Link</button>
          <button class="primary-btn" data-action="open-task-route">${icon("map")} Open Route</button>
        </div>` : `<div class="section-card" style="box-shadow:none;"><p class="muted">Select tasks with addresses before opening a route.</p></div>`}`;
  }

  function modalAssignProject(taskId) {
    const selectedIds = selectedProjectAssignmentIds(taskId);
    const task = data.tasks.find((item) => item.id === taskId) || data.tasks.find((item) => item.id === selectedIds[0]);
    if (!selectedIds.length || !task) return `${modalHeader("Change Project", "Select one or more tasks first.")}
      <section class="section-card" style="box-shadow:none;"><p class="muted">Select a task, then choose Change project.</p></section>`;
    const defaultProjectId = selectedIds.length === 1 ? (task.projectId || "") : "__choose__";
    return `${modalHeader("Change Project", selectedIds.length > 1 ? `${selectedIds.length} selected tasks` : task.title)}
      <section class="section-card assign-project-preview" style="box-shadow:none;margin-bottom:14px;">
        <div class="list">
          ${selectedIds.slice(0, 5).map((taskIdValue) => {
            const selectedTask = data.tasks.find((item) => item.id === taskIdValue);
            const selectedProject = selectedTask ? data.projects.find((project) => project.id === selectedTask.projectId) : null;
            return selectedTask ? `<div class="data-row"><span class="dot" style="background:${priorityColor(selectedTask.priority)}"></span><div><strong>${esc(selectedTask.title)}</strong><div class="subtle">${shortDate(selectedTask.date)} ${timeLabel(selectedTask.start)} - ${selectedProject ? esc(selectedProject.name) : "Unassigned"}</div></div>${taskQuickBadge(selectedTask, "status")}</div>` : "";
          }).join("")}
          ${selectedIds.length > 5 ? `<p class="muted">+${selectedIds.length - 5} more selected tasks</p>` : ""}
        </div>
      </section>
      <div class="field">
        <label for="assignProjectId">Project</label>
        <select id="assignProjectId">
          ${defaultProjectId === "__choose__" ? `<option value="__choose__" selected>Choose project</option>` : ""}
          <option value="" ${defaultProjectId === "" ? "selected" : ""}>No project / Unassigned</option>
          ${data.projects.map((project) => `<option value="${project.id}" ${project.id === defaultProjectId ? "selected" : ""}>${esc(project.name)}</option>`).join("")}
        </select>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="save-task-project-assignment" data-id="${task.id}">${icon("folder")} Save ${selectedIds.length > 1 ? `${selectedIds.length} Tasks` : "Task"}</button>
      </div>`;
  }

  function modalProjectName(projectId) {
    const project = data.projects.find((item) => item.id === projectId);
    if (!project) return "";
    return `${modalHeader("Edit Project", project.name)}
      <div class="field-grid">
        ${field("projectQuickName", "Project Name", project.name, "Project name")}
        ${selectField("projectLevel", "Project Level", projectLevelOptions, project.level || "Medium")}
        ${imageAttachmentField("project", project.image || "", "Project Picture / Tile Image", project.imageZoom, project.imageX, project.imageY, project.imageFit, project.imageOpacity)}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;"><button class="outline-btn" data-action="close-modal">Cancel</button><button class="secondary-btn" data-action="save-project-name" data-id="${project.id}">Save Project</button></div>`;
  }

  function modalNote(noteId) {
    const defaultNotebookId = ui.notebookId || "";
    const defaultProjectId = ui.modal?.projectId || (ui.view === "projects" ? ui.projectId : "") || "";
    const note = data.notes.find((item) => item.id === noteId) || { date: "2026-05-06", importance: "Low", notebookId: defaultNotebookId, projectId: defaultProjectId, color: "#6c63ff", icon: "note" };
    const insideNotebook = !note.id && ui.notebookId;
    const project = data.projects.find((item) => item.id === (note.projectId || defaultProjectId));
    return `${modalHeader(note.id ? "Edit Note" : "New Note")}
      <div class="field-grid">
        ${field("noteTitle", "Note Title", note.title || "", "Note Title")}
        ${textArea("noteContent", "Content", note.content || "", "Content (optional)")}
        ${field("noteDate", "Note Date", note.date || "2026-05-06", "", "date")}
        ${noteSubjectField(note)}
        ${selectField("noteImportance", "Importance Level", ["Low", "Medium", "High", "Critical"], note.importance || "Low")}
        ${noteNotebookField(note)}
        ${insideNotebook ? `<p class="subtle notebook-auto-note">${icon("book")} This note defaults to ${esc(data.notebooks.find((nb) => nb.id === ui.notebookId)?.title || "this notebook")}, or you can choose + New notebook above.</p>` : ""}
        ${project ? `<p class="subtle notebook-auto-note">${icon("folder")} Project: ${esc(project.name)}</p>` : ""}
        ${selectField("noteCover", "Stock Image", ["", "cherries", "bananas"], note.cover || "", (value) => value ? filterLabel(value) : "No stock image")}
        ${imageAttachmentField("note", note.image || note.cover || "", "Note Picture / Graphic", note.imageZoom, note.imageX, note.imageY, note.imageFit, note.imageOpacity)}
        <div class="field"><label>Color</label><div class="swatches">${["#4388f3", "#6c63ff", "#10b981", "#ff9800", "#f44336", "#8b5cf6", "#ec4899", "#14b8a6"].map((c) => `<button class="swatch ${note.color === c ? "active" : ""}" style="background:${c}" data-action="pick-note-color" data-color="${c}"></button>`).join("")}</div></div>
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-note" data-id="${note.id || ""}">${note.id ? "Update Note" : "Save Note"}</button></div>`;
  }

  function noteSubjectField(note) {
    const current = String(note.subject || "").trim();
    const subjectNote = { ...note, subject: current };
    return `<div class="field">
      <label for="noteSubject">Subject</label>
      <select id="noteSubject" data-note-id="${esc(note.id || "")}" data-current-subject="${esc(current)}">
        ${subjectOptionMarkup(subjectNote)}
      </select>
      <span class="field-hint">Subjects are saved to the selected notebook.</span>
    </div>`;
  }

  function noteNotebookField(note) {
    const currentNotebookId = note.notebookId || "";
    const creatingNew = currentNotebookId === ADD_NOTEBOOK_VALUE;
    const options = ["", ADD_NOTEBOOK_VALUE, ...data.notebooks.map((nb) => nb.id)];
    return `${selectField("noteNotebook", "Notebook", options, currentNotebookId, (value) => {
      if (!value) return "Unassigned / decide later";
      return value === ADD_NOTEBOOK_VALUE ? "+ New notebook" : data.notebooks.find((nb) => nb.id === value)?.title || "Notebook";
    })}
      <div id="noteNotebookNewWrap" ${creatingNew ? "" : "hidden"}>${field("noteNewNotebookTitle", "New Notebook Name", "", "Notebook name")}</div>`;
  }

  function modalDuplicateNotes(noteId) {
    const selected = noteId ? [noteId] : ui.selectedNotes;
    const notes = selected.map((idValue) => data.notes.find((note) => note.id === idValue)).filter(Boolean);
    return `${modalHeader("Duplicate Notes", `${notes.length || 0} note${notes.length === 1 ? "" : "s"} selected`)}
      <section class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="list">
          ${notes.slice(0, 4).map((note) => `<div class="data-row"><span class="round-icon note-icon" style="color:#fff;background:${noteImportanceColor(note.importance)}">${icon(note.icon || "note")}</span><div><strong>${esc(note.title)}</strong><div class="subtle">${esc(data.notebooks.find((nb) => nb.id === note.notebookId)?.title || "Unassigned")}</div></div><span class="status muted">${esc(note.importance || "Low")}</span></div>`).join("") || `<p class="muted">Select at least one note first.</p>`}
        </div>
      </section>
      <div class="field-grid">
        ${field("duplicateNoteCount", "Duplicates per selected note", 1, "1", "number")}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="duplicate-notes" data-id="${esc(noteId || "")}">${icon("note")} Duplicate</button>
      </div>`;
  }

  function modalBulkNoteSubject() {
    const notes = selectedNoteRecords();
    const subjectNames = Array.from(new Set(data.notebooks.flatMap((notebook) => notebookSubjects(notebook.id)))).sort((a, b) => a.localeCompare(b));
    return `${modalHeader("Change Subject", `${notes.length || 0} selected note${notes.length === 1 ? "" : "s"}`)}
      <section class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="list">
          ${notes.slice(0, 5).map((note) => `<div class="data-row"><span class="round-icon note-icon" style="color:#fff;background:${noteImportanceColor(note.importance)}">${icon(note.icon || "note")}</span><div><strong>${esc(note.title)}</strong><div class="subtle">${esc(data.notebooks.find((nb) => nb.id === note.notebookId)?.title || "Unassigned")} ${note.subject ? `- ${esc(note.subject)}` : "- No subject"}</div></div><span class="status muted">${esc(note.importance || "Low")}</span></div>`).join("") || `<p class="muted">Select at least one note first.</p>`}
          ${notes.length > 5 ? `<p class="muted">And ${notes.length - 5} more selected.</p>` : ""}
        </div>
      </section>
      <div class="field">
        <label for="bulkNoteSubject">Subject</label>
        <select id="bulkNoteSubject">
          <option value="">No subject</option>
          <option value="${ADD_NOTE_SUBJECT_VALUE}">+ Add subject</option>
          ${subjectNames.map((subject) => `<option value="${esc(subject)}">${esc(subject)}</option>`).join("")}
        </select>
        <span class="field-hint">The subject will be applied to every selected note. If notes are in different notebooks, BillMaster saves that subject to each notebook.</span>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="save-selected-note-subject">${icon("check")} Save Subject</button>
      </div>`;
  }

  function modalBulkNoteNotebook() {
    const notes = selectedNoteRecords();
    return `${modalHeader("Change Notebook", `${notes.length || 0} selected note${notes.length === 1 ? "" : "s"}`)}
      <section class="section-card" style="box-shadow:none;background:#f8fbff;margin-bottom:14px;">
        <div class="list">
          ${notes.slice(0, 5).map((note) => `<div class="data-row"><span class="round-icon note-icon" style="color:#fff;background:${noteImportanceColor(note.importance)}">${icon(note.icon || "note")}</span><div><strong>${esc(note.title)}</strong><div class="subtle">${esc(data.notebooks.find((nb) => nb.id === note.notebookId)?.title || "Unassigned")} ${note.subject ? `- ${esc(note.subject)}` : "- No subject"}</div></div><span class="status muted">${esc(note.importance || "Low")}</span></div>`).join("") || `<p class="muted">Select at least one note first.</p>`}
          ${notes.length > 5 ? `<p class="muted">And ${notes.length - 5} more selected.</p>` : ""}
        </div>
      </section>
      <div class="field">
        <label for="bulkNoteNotebook">Notebook</label>
        <select id="bulkNoteNotebook">
          <option value="">Unassigned / decide later</option>
          <option value="${ADD_NOTEBOOK_VALUE}">+ New notebook</option>
          ${data.notebooks.map((notebook) => `<option value="${notebook.id}">${esc(notebook.title)}</option>`).join("")}
        </select>
      </div>
      <div id="bulkNoteNotebookNewWrap" hidden>${field("bulkNoteNewNotebookTitle", "New Notebook Name", "", "Notebook name")}</div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="secondary-btn" data-action="save-selected-note-notebook">${icon("check")} Save Notebook</button>
      </div>`;
  }

  function notebookSubjects(notebookId, includeSubject = "") {
    const notebook = data.notebooks.find((item) => item.id === notebookId);
    const subjects = [...(Array.isArray(notebook?.subjects) ? notebook.subjects.map(normalizeNoteSubjectName) : [])];
    subjects.push(...data.notes
      .filter((note) => !notebookId || note.notebookId === notebookId)
      .map((note) => String(note.subject || "").trim())
      .filter(Boolean));
    const current = String(includeSubject || "").trim();
    if (current) subjects.push(current);
    return Array.from(new Set(subjects)).sort((a, b) => a.localeCompare(b));
  }

  function modalNotebook(notebookId) {
    const notebook = data.notebooks.find((item) => item.id === notebookId) || {};
    return `${modalHeader(notebook.id ? "Edit Notebook" : "New Notebook")}
      <div class="field-grid">
        ${field("nbTitle", "Title", notebook.title || "", "Notebook title")}
        ${field("nbDescription", "Description", notebook.description || "", "Description")}
        ${selectField("nbProject", "Linked Project", ["", ...data.projects.map((p) => p.id)], notebook.projectId || "", (value) => value ? data.projects.find((p) => p.id === value).name : "No project")}
        ${imageAttachmentField("nb", notebook.image || notebook.cover || "", "Notebook Picture / Cover", notebook.imageZoom, notebook.imageX, notebook.imageY, notebook.imageFit, notebook.imageOpacity)}
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-notebook" data-id="${notebook.id || ""}">Save Notebook</button></div>`;
  }

  function modalNotebookPicture(notebookId) {
    const notebook = data.notebooks.find((item) => item.id === notebookId);
    if (!notebook) return "";
    return `${modalHeader("Notebook Picture", notebook.title || "Notebook")}
      <div class="field-grid">
        ${imageAttachmentField("nbPicture", notebook.image || notebook.cover || "", "Notebook Picture / Cover", notebook.imageZoom, notebook.imageX, notebook.imageY, notebook.imageFit, notebook.imageOpacity)}
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="close-modal">Cancel</button>
        <button class="primary-btn" data-action="save-notebook-picture" data-id="${notebook.id}">${icon("camera")} Save Picture</button>
      </div>`;
  }

  function modalGoal(goalId) {
    const goal = data.goals.find((item) => item.id === goalId) || { targetDate: "2026-12-31", color: "green" };
    const accountOptions = data.accounts.map((acct) => acct.id);
    return `${modalHeader(goal.id ? "Edit Goal" : "New Goal")}
      <div class="field-grid">
        ${field("goalName", "Goal Name", goal.name || "", "Emergency Fund")}
        ${field("goalTarget", "Target Amount", goal.target || "", "10000", "number")}
        ${field("goalCurrent", "Current Amount", goal.current || "", "4200", "number")}
        ${field("goalDate", "Target Date", goal.targetDate || "2026-12-31", "", "date")}
        ${selectField("goalColor", "Color", ["green", "teal", "purple", "amber"], goal.color || "green", filterLabel)}
        ${selectField("goalContributionSchedule", "Automatic Contribution Plan", goalScheduleOptions, goal.contributionSchedule || "None")}
        ${field("goalContributionPlanAmount", "Planned Contribution Amount", goal.contributionAmount || "", "100", "number")}
        ${selectField("goalContributionPlanAccount", "Default Funding Account", accountOptions, goal.contributionAccountId || data.accounts[0]?.id || "", (value) => {
          const account = data.accounts.find((acct) => acct.id === value);
          return account ? `${account.name} - ${money(account.balance)}` : "Choose an account";
        })}
        <div class="info-note">${icon("check")} Automatic contributions are planned only. You still confirm each one before money moves.</div>
        ${imageAttachmentField("goal", goal.image || "", "Goal Picture / Graphic", goal.imageZoom, goal.imageX, goal.imageY, goal.imageFit, goal.imageOpacity)}
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-goal" data-id="${goal.id || ""}">Save Goal</button></div>`;
  }

  function modalGoalContribution(goalId) {
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal) return "";
    const accountOptions = data.accounts.map((acct) => acct.id);
    return `${modalHeader("Add Contribution", goal.name)}
      <div class="field-grid">
        ${field("goalContributionAmount", "Contribution Amount", goal.contributionAmount || "", "100", "number")}
        ${selectField("goalContributionAccount", "From Account", accountOptions, goal.contributionAccountId || data.accounts[0]?.id || "", (value) => {
          const account = data.accounts.find((acct) => acct.id === value);
          return account ? `${account.name} - ${money(account.balance)}` : "Choose an account";
        })}
        ${field("goalContributionDate", "Date", todayIso(), "", "date")}
        ${textArea("goalContributionNote", "Note", "", "Optional note")}
      </div>
      <div class="sheet-actions"><button class="success-btn" data-action="save-goal-contribution" data-id="${goal.id}">Add Contribution</button></div>`;
  }

  function modalGoalPlanConfirm(goalId) {
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal) return "";
    const accountOptions = data.accounts.map((acct) => acct.id);
    const account = goalAccount(goal);
    return `${modalHeader("Confirm Planned Contribution", goal.name)}
      <div class="section-card soft-panel">
        <strong>${esc(goalNextContributionLabel(goal))}</strong>
        <p class="muted">Nothing moves until you confirm. After confirmation, the selected account balance decreases and the goal balance increases.</p>
      </div>
      <div class="field-grid">
        ${field("goalContributionAmount", "Contribution Amount", goal.contributionAmount || "", "100", "number")}
        ${selectField("goalContributionAccount", "From Account", accountOptions, account?.id || data.accounts[0]?.id || "", (value) => {
          const selected = data.accounts.find((acct) => acct.id === value);
          return selected ? `${selected.name} - ${money(selected.balance)}` : "Choose an account";
        })}
        ${field("goalContributionDate", "Confirmation Date", todayIso(), "", "date")}
        ${textArea("goalContributionNote", "Contribution Note", "", "What was this contribution for?")}
      </div>
      <div class="sheet-actions"><button class="success-btn" data-action="save-goal-plan-contribution" data-id="${goal.id}">${icon("check")} Confirm Contribution</button></div>`;
  }

  function modalContact(contactId) {
    const contact = data.contacts.find((item) => item.id === contactId) || {};
    return `${modalHeader(contact.id ? "Edit Contact" : "New Contact")}
      <div class="field-grid">
        ${field("contactName", "Name", contact.name || "", "Contact name")}
        ${field("contactEmail", "Email", contact.email || "", "email@example.com", "email")}
        ${field("contactPhone", "Phone", contact.phone || "", "Phone number", "tel")}
        ${field("contactTextEmail", "Email-to-Text Address", contact.textEmail || "", "number@carrier-gateway.com", "email")}
        ${contactGroupPicker(contact)}
        ${selectField("contactAddress", "Address", [ADD_TASK_ADDRESS_VALUE, "", ...data.addresses.map((addr) => addr.id)], contact.addressId || "", contactAddressLabel)}
        <div id="contactNewAddressPanel" class="inline-add-panel" hidden>
          <div class="inline-add-heading">${icon("plus")} New contact address</div>
          <div class="field-grid">
            ${field("contactNewAddrLabel", "Address Label", "", "Home, Work, Office")}
            ${field("contactNewAddrStreet", "Street Address", "", "Street Address")}
            ${field("contactNewAddrUnit", "Apartment / Unit", "", "Apt, Unit, Suite")}
            <div class="field-row">${field("contactNewAddrCity", "City", "", "City")}${field("contactNewAddrState", "State", "", "State")}</div>
            <div class="field-row">${field("contactNewAddrZip", "ZIP Code", "", "ZIP Code")}${field("contactNewAddrCountry", "Country", "USA", "Country")}</div>
          </div>
        </div>
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-contact" data-id="${contact.id || ""}">Save Contact</button></div>`;
  }

  function contactGroupPicker(contact) {
    const selected = new Set(contactGroupsForContact(contact.id).map((group) => group.id));
    const groups = safeArray(data.contactGroups).filter((group) => group.name);
    return `<div class="field contact-group-picker">
      <label>Groups</label>
      <div class="contact-group-picks">
        ${groups.map((group) => {
          const count = data.contacts.filter((item) => contactGroupsForContact(item.id).some((memberGroup) => memberGroup.id === group.id)).length;
          return `<label class="contact-group-pick ${selected.has(group.id) ? "active" : ""}"><input class="contactGroupChoice" type="checkbox" value="${esc(group.id)}" ${selected.has(group.id) ? "checked" : ""}><span>${icon("folder")} ${esc(group.name)}</span><small>${count}</small></label>`;
        }).join("") || `<span class="subtle">No groups yet.</span>`}
      </div>
      <input id="contactNewGroups" placeholder="Add new group names, separated by commas">
    </div>`;
  }

  function modalImportStatement() {
    return `${modalHeader("Import Card Statement")}
      <div class="section-card" style="box-shadow:none;background:#e9f8ef;color:#0b7b4b;margin-bottom:16px;">${icon("check")} Last synced: 15:48 - tap to re-scan for new/cancelled subscriptions</div>
      <div class="section-card" style="box-shadow:none;background:#eef6ff;color:#1871d6;margin-bottom:16px;">${icon("alert")} Import a card statement, bill PDF, screenshot, or email forward. BillMaster will stage detections in Review Inbox before creating anything.</div>
      ${selectField("statementCard", "Select Card", data.accounts.map((acct) => acct.id), data.accounts[0]?.id, (value) => data.accounts.find((acct) => acct.id === value)?.name || "Choose a card")}
      <div class="sheet-actions"><button class="secondary-btn" data-action="simulate-import">${icon("note")} Import from Device</button><button class="outline-btn" data-action="simulate-import">${icon("camera")} Screenshot / PDF</button><button class="outline-btn" data-action="simulate-import">${icon("note")} Google Drive / Email</button></div>`;
  }

  function modalAccountConnections() {
    const sync = safeArray(data.syncConnections).find((item) => item.id === "sync_1") || {};
    const sandboxAccounts = safeArray(data.accounts).filter((account) => account.provider === "Plaid Sandbox" || account.plaidSandbox);
    const sandboxTransactions = safeArray(data.transactions).filter((tx) => tx.source === "Plaid Sandbox" || tx.plaidSandbox);
    const inboxCount = billInboxItems().filter((item) => item.source === "Plaid Sandbox" || item.source === "Plaid recurring detector").length;
    const connected = Boolean(data.settings.plaidSandboxConnected || sandboxAccounts.length || sandboxTransactions.length);
    const lastImport = data.settings.plaidLastImportAt || sync.lastSync || "Not imported yet";
    const accountRows = safeArray(data.accounts).map((acct) => {
      const sandbox = acct.provider === "Plaid Sandbox" || acct.plaidSandbox;
      const status = sandbox ? "Sandbox linked" : "Local account";
      return `<article class="account-connection-row">
        <span class="round-icon" style="color:${sandbox ? "var(--teal)" : "var(--navy)"};background:${sandbox ? "#e7fbff" : "#eef6ff"};">${icon(sandbox ? "cloud" : "wallet")}</span>
        <div>
          <strong>${esc(acct.name)}</strong>
          <small>${esc(acct.type)} ****${esc(acct.last4 || "----")} &middot; ${money(acct.balance || 0)}</small>
        </div>
        <span class="status ${sandbox ? "success" : "info"}">${esc(status)}</span>
      </article>`;
    }).join("");
    return `${modalHeader("Account Connections", "Phase 1: prove safe bank/card sync in sandbox before real credentials or production tokens.")}
      <section class="section-card plaid-foundation-panel account-sync-modal-panel" style="box-shadow:none;">
        <div class="plaid-foundation-copy">
          <span class="round-icon plaid-icon">${icon("wallet")}</span>
          <div>
            <div class="section-title compact-title">
              <h2>Bank/Card Sync Foundation</h2>
              <span class="status ${connected ? "success" : "warn"}">${connected ? "Sandbox ready" : "Ready to test"}</span>
            </div>
            <p class="muted">No real bank passwords belong in BillMaster. Phase 1 uses sandbox-style token accounts, imports transactions, and stages recurring bills/subscriptions in Review Inbox before anything becomes permanent.</p>
          </div>
        </div>
        <div class="plaid-stage-grid">
          <span><strong>${sandboxAccounts.length}</strong><small>sandbox accounts</small></span>
          <span><strong>${sandboxTransactions.length}</strong><small>transactions imported</small></span>
          <span><strong>${inboxCount}</strong><small>review candidates</small></span>
          <span><strong>${esc(lastImport)}</strong><small>last import</small></span>
        </div>
        <div class="plaid-flow">
          ${plaidFlowStep("1", "Sandbox", "Run the safe import and verify balances.")}
          ${plaidFlowStep("2", "Review", "Approve bill and subscription candidates.")}
          ${plaidFlowStep("3", "Backend", "Add Supabase Edge Function for real token exchange.")}
          ${plaidFlowStep("4", "Production", "Move to real Plaid only after privacy and reconnect tests.")}
        </div>
        <div class="sheet-actions plaid-actions">
          <button class="primary-btn" data-action="run-plaid-sandbox-import">${icon("cloud")} Run Sandbox Import</button>
          <button class="outline-btn" data-action="navigate" data-view="inbox">${icon("receipt")} Review Inbox</button>
          <button class="outline-btn" data-action="navigate" data-view="sync">${icon("filter")} Sync Center</button>
          <button class="outline-btn" data-action="copy-plaid-production-plan">${icon("note")} Copy Plan</button>
        </div>
      </section>
      <h3 class="section-kicker">Linked Accounts</h3>
      <div class="list account-connection-list">${accountRows || `<p class="muted">No accounts yet. Run the sandbox import to create safe test accounts.</p>`}</div>
      <section class="section-card account-sync-safety-card" style="box-shadow:none;">
        <strong>${icon("alert")} What full access means for Phase 1</strong>
        <p class="muted">Helpful access means app/backend access and Plaid sandbox/developer keys. It does not mean sharing bank usernames, passwords, or card logins in this app.</p>
      </section>`;
  }

  function modalAccountDetail(accountId) {
    const account = data.accounts.find((acct) => acct.id === accountId);
    if (!account) return `${modalHeader("Account Detail")}<p class="muted">Account not found.</p>`;
    const contributions = safeArray(data.goalContributions)
      .filter((entry) => entry.accountId === account.id)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const transfers = data.transactions.filter((tx) => tx.accountId === account.id).slice(0, 8);
    return `${modalHeader(account.name, `${account.type} ****${account.last4}`)}
      <section class="section-card account-detail-card" style="box-shadow:none;">
        <div class="amount-large money-blue">${money(account.balance)}</div>
        <p class="muted">Current prototype balance. Goal contributions deduct from here after confirmation.</p>
      </section>
      <div class="account-detail-grid">
        <span><strong>${money(sum(contributions, "amount"))}</strong><small>goal contributions</small></span>
        <span><strong>${contributions.length}</strong><small>confirmed moves</small></span>
        <span><strong>${transfers.length}</strong><small>account ledger rows</small></span>
      </div>
      <h3 class="section-kicker">Contribution History</h3>
      <div class="goal-history">
        ${contributions.length ? contributions.slice(0, 8).map((entry) => `<div class="goal-history-row"><span>${dateLabel(entry.date)}</span><strong>${money(entry.amount)}</strong><small>${esc(entry.goalName || data.goals.find((goal) => goal.id === entry.goalId)?.name || "Goal")}</small>${entry.notes ? `<p>${esc(entry.notes)}</p>` : ""}</div>`).join("") : `<p class="muted">No confirmed goal contributions from this account yet.</p>`}
      </div>`;
  }

  function modalAddSubscription() {
    return `${modalHeader("Add Subscription")}
      <div class="field-grid">
        ${field("newSubName", "Service Name", "", "Netflix")}
        ${field("newSubPlan", "Plan", "", "Standard Plan")}
        ${field("newSubAmount", "Actual Amount", "", "15.99", "number")}
        ${field("newSubProjected", "Projected Amount", "", "14.99", "number")}
        ${selectField("newSubCycle", "Billing Cycle", ["monthly", "yearly", "weekly"], "monthly")}
        ${field("newSubNext", "Next Billing Date", "2026-05-20", "", "date")}
        ${selectField("newSubStatus", "Status", ["Active", "Trial", "Expiring Soon", "Cancelled"], "Active")}
        ${imageAttachmentField("newSub", "", "Subscription Picture / Logo", 1, 0, 0, "contain", 1)}
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-subscription">Save Subscription</button></div>`;
  }

  function modalDataTools() {
    return `${modalHeader("Data Tools", "Demo data is saved locally in this browser.")}
      <div class="list">
        <button class="data-row" style="background:transparent;border:1px solid var(--line);border-radius:8px;padding:12px;width:100%;text-align:left;" data-action="download-data">
          <span class="round-icon">${icon("note")}</span><div><strong>Download Backup</strong><div class="subtle">Export the current app data as JSON.</div></div><span>${icon("check")}</span>
        </button>
        <button class="data-row" style="background:transparent;border:1px solid #ffc2c2;border-radius:8px;padding:12px;width:100%;text-align:left;" data-action="reset-data">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><div><strong>Reset Demo Data</strong><div class="subtle">Restore the original BillMaster sample workspace.</div></div><span class="danger-text">${icon("alert")}</span>
        </button>
      </div>`;
  }

  function field(idValue, label, value, placeholder = "", type = "text") {
    return `<div class="field"><label for="${idValue}">${esc(label)}</label><input id="${idValue}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>`;
  }

  function textArea(idValue, label, value, placeholder = "") {
    return `<div class="field"><label for="${idValue}">${esc(label)}</label><textarea id="${idValue}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`;
  }

  function choiceField(idValue, label, options, selected, colorer) {
    return `<div class="field"><label>${esc(label)}</label><input id="${idValue}" type="hidden" value="${esc(selected)}"><div class="choice-row">
      ${options.map((option) => `<button class="choice-chip ${option === selected ? "active" : ""}" style="--choice-color:${colorer(option)}" data-action="pick-choice" data-target="${idValue}" data-value="${esc(option)}">${esc(option)}</button>`).join("")}
    </div></div>`;
  }

  function swatchChoiceField(idValue, label, options, selected) {
    return `<div class="field"><label>${esc(label)}</label><input id="${idValue}" type="hidden" value="${esc(selected)}"><div class="swatches task-swatches">
      ${options.map((color) => `<button class="swatch ${color === selected ? "active" : ""}" style="background:${color}" data-action="pick-choice" data-target="${idValue}" data-value="${esc(color)}" aria-label="${esc(color)}"></button>`).join("")}
    </div></div>`;
  }

  function selectField(idValue, label, options, selected, labeler) {
    return `<div class="field"><label for="${idValue}">${esc(label)}</label><select id="${idValue}">${options.map((option) => {
      const text = labeler ? labeler(option) : option;
      return `<option value="${esc(option)}" ${option === selected ? "selected" : ""}>${esc(text || "None")}</option>`;
    }).join("")}</select></div>`;
  }

  function imageAttachmentField(prefix, currentImage = "", label = "Picture / Graphic", currentZoom = 1, currentX = 0, currentY = 0, currentFit = "cover", currentOpacity = 1) {
    const current = String(currentImage || "");
    const preview = imageSrc(current);
    const hiddenValue = isDataImage(current) ? current : "";
    const urlValue = current && !isDataImage(current) ? current : "";
    const zoom = imageZoom(currentZoom);
    const panX = imagePan(currentX);
    const panY = imagePan(currentY);
    const fit = imageFit(currentFit);
    const opacity = imageOpacity(currentOpacity);
    return `<section class="image-attach">
      <label class="image-preview" id="${prefix}ImagePreview" for="${prefix}ImageFile" style="--media-zoom:${zoom};--media-x:${panX}%;--media-y:${panY}%;--media-fit:${fit};--media-opacity:${opacity};">${preview ? `<img src="${esc(preview)}" alt="">` : `<span>${icon("camera")}</span>`}</label>
      <div class="image-fields">
        <input id="${prefix}Image" type="hidden" value="${esc(hiddenValue)}">
        <input id="${prefix}ImageFit" type="hidden" value="${esc(fit)}">
        <div class="field"><label for="${prefix}ImageUrl">${esc(label)} URL or Google Drive Link</label><input id="${prefix}ImageUrl" data-action="image-url" data-target="${prefix}Image" data-preview="${prefix}ImagePreview" value="${esc(urlValue)}" placeholder="https://... or Google Drive share link"></div>
        <div class="image-fit-row" role="group" aria-label="Picture fit">
          <button class="${fit === "contain" ? "active" : ""}" data-action="image-fit" data-target="${prefix}ImageFit" data-preview="${prefix}ImagePreview" data-value="contain">${icon("search")} Fit whole image</button>
          <button class="${fit === "cover" ? "active" : ""}" data-action="image-fit" data-target="${prefix}ImageFit" data-preview="${prefix}ImagePreview" data-value="cover">${icon("settings")} Fill frame</button>
        </div>
        <div class="field zoom-field"><label for="${prefix}ImageZoom">Picture Zoom</label><input id="${prefix}ImageZoom" data-action="image-zoom" data-preview="${prefix}ImagePreview" type="range" min="0.6" max="2.4" step="0.05" value="${zoom}"></div>
        <div class="field zoom-field"><label for="${prefix}ImageOpacity">Picture Opacity</label><input id="${prefix}ImageOpacity" data-action="image-opacity" data-preview="${prefix}ImagePreview" type="range" min="0.15" max="1" step="0.05" value="${opacity}"></div>
        <div class="field-row image-pan-row">
          <div class="field zoom-field"><label for="${prefix}ImageX">Move Left / Right</label><input id="${prefix}ImageX" data-action="image-pan" data-axis="x" data-preview="${prefix}ImagePreview" type="range" min="-40" max="40" step="1" value="${panX}"></div>
          <div class="field zoom-field"><label for="${prefix}ImageY">Move Up / Down</label><input id="${prefix}ImageY" data-action="image-pan" data-axis="y" data-preview="${prefix}ImagePreview" type="range" min="-40" max="40" step="1" value="${panY}"></div>
        </div>
        <label class="upload-strip">${icon("camera")} Upload PNG/JPEG/WebP/GIF<input id="${prefix}ImageFile" data-action="image-upload" data-target="${prefix}Image" data-url="${prefix}ImageUrl" data-preview="${prefix}ImagePreview" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"></label>
        <label class="check-row"><input id="${prefix}ImageRemove" type="checkbox"> Remove picture</label>
      </div>
    </section>`;
  }

  function imageValue(prefix) {
    if (document.getElementById(`${prefix}ImageRemove`)?.checked) return "";
    const uploaded = value(`${prefix}Image`);
    const url = value(`${prefix}ImageUrl`);
    return uploaded || normalizeImageUrl(url);
  }

  function imageZoomValue(prefix) {
    return imageZoom(value(`${prefix}ImageZoom`) || 1);
  }

  function imagePanValue(prefix, axis) {
    return imagePan(value(`${prefix}Image${axis.toUpperCase()}`) || 0);
  }

  function imageOpacityValue(prefix) {
    return imageOpacity(value(`${prefix}ImageOpacity`) || 1);
  }

  function imageFitValue(prefix) {
    return imageFit(value(`${prefix}ImageFit`) || "cover");
  }

  function entityImage(entity) {
    if (!entity) return "";
    if (entity.image) return imageSrc(entity.image);
    if (entity.cover) return imageSrc(entity.cover);
    return "";
  }

  function imageZoom(value) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : 1, 0.6, 2.4);
  }

  function imagePan(value) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : 0, -40, 40);
  }

  function imageOpacity(value) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : 1, 0.15, 1);
  }

  function imageFit(value) {
    return value === "contain" ? "contain" : "cover";
  }

  function imageStyleAttr(entity) {
    return `style="--media-zoom:${imageZoom(entity?.imageZoom || 1)};--media-x:${imagePan(entity?.imageX || 0)}%;--media-y:${imagePan(entity?.imageY || 0)}%;--media-fit:${imageFit(entity?.imageFit || "cover")};--media-opacity:${imageOpacity(entity?.imageOpacity || 1)};"`;
  }

  function imageSrc(source) {
    if (!source) return "";
    if (source === "cherries" || source === "bananas") return coverImage(source);
    return normalizeImageUrl(source);
  }

  function normalizeImageUrl(source) {
    const raw = String(source || "").trim();
    if (!raw) return "";
    if (/^(data:image\/|blob:|https?:\/\/|file:\/\/\/)/i.test(raw)) return googleDriveImageUrl(raw);
    if (/^[a-zA-Z]:\\/.test(raw)) return `file:///${raw.replaceAll("\\", "/").replace(/^([a-zA-Z]):/, "$1:")}`;
    return googleDriveImageUrl(raw);
  }

  function googleDriveImageUrl(url) {
    const text = String(url || "").trim();
    const fileMatch = text.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    const openMatch = text.match(/[?&]id=([^&]+)/i);
    const idValue = fileMatch?.[1] || (text.includes("drive.google.com") ? openMatch?.[1] : "");
    if (!idValue) return text;
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(idValue)}`;
  }

  function isDataImage(value) {
    return /^data:image\//i.test(String(value || ""));
  }

  function imageThumb(entity, iconName = "camera", extraClass = "") {
    const src = entityImage(entity);
    if (src) return `<span class="media-thumb ${extraClass}" ${imageStyleAttr(entity)}><img src="${esc(src)}" alt=""></span>`;
    return `<span class="round-icon ${extraClass}">${icon(iconName)}</span>`;
  }

  function updateImagePreview(preview, source) {
    const previewEl = typeof preview === "string" ? document.getElementById(preview) : preview;
    if (!previewEl) return;
    const src = imageSrc(source);
    previewEl.innerHTML = src ? `<img src="${esc(src)}" alt="">` : `<span>${icon("camera")}</span>`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (typeof FileReader === "undefined") {
        reject(new Error("FileReader is unavailable."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read image."));
      reader.readAsDataURL(file);
    });
  }

  function optimizedImageDataUrl(file) {
    const canOptimize = /^image\/(png|jpe?g|webp)$/i.test(file.type || "")
      && typeof Image !== "undefined"
      && typeof document !== "undefined";
    return readFileAsDataUrl(file).then((original) => {
      if (!canOptimize) return original;
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          const width = image.naturalWidth || image.width || 1;
          const height = image.naturalHeight || image.height || 1;
          const maxSide = 1400;
          const scale = Math.min(1, maxSide / Math.max(width, height));
          if (scale >= 1 && original.length < 900000) {
            resolve(original);
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            resolve(original);
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const outputType = /^image\/png$/i.test(file.type || "") ? "image/webp" : "image/jpeg";
          const optimized = canvas.toDataURL(outputType, 0.82);
          resolve(optimized && optimized.length < original.length ? optimized : original);
        };
        image.onerror = () => resolve(original);
        image.src = original;
      });
    });
  }

  function handleImageUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Choose an image file.", "danger");
      return;
    }
    if (typeof FileReader === "undefined") {
      showToast("Local image upload is not available here. Use an image URL.", "danger");
      return;
    }
    if (file.size > 1800000) showToast("Optimizing image for local save...", "success", { render: false });
    optimizedImageDataUrl(file)
      .then((result) => {
        const hidden = document.getElementById(input.dataset.target);
        const urlInput = document.getElementById(input.dataset.url);
        const removeInput = document.getElementById(String(input.dataset.target || "").replace(/Image$/, "ImageRemove"));
        if (hidden) hidden.value = result;
        if (urlInput) urlInput.value = "";
        if (removeInput) removeInput.checked = false;
        updateImagePreview(input.dataset.preview, result);
        showToast(result.length > 1800000
          ? "Image attached, but it is still large. Image links save more reliably."
          : "Image attached.", "success", { render: false });
      })
      .catch(() => showToast("Could not read that image.", "danger", { render: false }));
  }

  function mediaTrackedCollections() {
    return [
      ["tasks", "Tasks"],
      ["habits", "Habits"],
      ["projects", "Projects"],
      ["notebooks", "Notebooks"],
      ["notes", "Notes"],
      ["subscriptions", "Subscription"],
      ["loans", "Lending"],
      ["goals", "Goals"],
      ["bills", "Bills"]
    ];
  }

  function mediaSourceKind(source) {
    const raw = String(source || "").trim();
    if (!raw) return "";
    if (isDataImage(raw)) return "localData";
    if (/drive\.google\.com|googleusercontent\.com/i.test(raw)) return "googleDrive";
    if (/^https?:\/\//i.test(raw)) return "web";
    if (/^(file:\/\/\/|[a-zA-Z]:\\)/.test(raw)) return "devicePath";
    if (raw === "cherries" || raw === "bananas") return "stock";
    return "other";
  }

  function mediaFieldForItem(item) {
    if (item?.image) return "image";
    if (item?.cover) return "cover";
    return "image";
  }

  function mediaCloudPath(item, field = mediaFieldForItem(item)) {
    return String(item?.[`${field}CloudPath`] || item?.imageCloudPath || item?.coverCloudPath || "").trim();
  }

  function mediaTrackedEntries() {
    const entries = [];
    mediaTrackedCollections().forEach(([collection, label]) => {
      safeArray(data[collection]).forEach((item) => {
        const field = mediaFieldForItem(item);
        const source = item?.[field] || "";
        const kind = mediaSourceKind(source);
        const cloudPath = mediaCloudPath(item, field);
        if (!kind && !cloudPath) return;
        entries.push({ collection, label, item, field, source, kind: cloudPath ? "cloudStorage" : kind, cloudPath });
      });
    });
    return entries;
  }

  function sanitizeStorageSegment(value, fallback = "item") {
    const clean = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
    return clean || fallback;
  }

  function encodeStoragePath(path) {
    return String(path || "")
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
  }

  function dataUrlToBlob(dataUrl) {
    const match = String(dataUrl || "").match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!match) throw new Error("This picture is not a valid local image.");
    const mime = match[1] || "image/jpeg";
    const payload = match[3] || "";
    const binary = match[2] ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  function mediaExtensionFromMime(mime) {
    const text = String(mime || "").toLowerCase();
    if (text.includes("png")) return "png";
    if (text.includes("webp")) return "webp";
    if (text.includes("gif")) return "gif";
    if (text.includes("svg")) return "svg";
    return "jpg";
  }

  function mediaStoragePath(entry, blob) {
    if (entry.cloudPath) return entry.cloudPath;
    const userId = cloudSession?.user?.id || "user";
    const collection = sanitizeStorageSegment(entry.collection, "media");
    const itemId = sanitizeStorageSegment(entry.item?.id || id("media"), "item");
    const field = sanitizeStorageSegment(entry.field, "image");
    const stamp = Date.now();
    const extension = mediaExtensionFromMime(blob?.type);
    return `${userId}/${collection}/${itemId}-${field}-${stamp}.${extension}`;
  }

  function signedMediaUrlFromResponse(body) {
    const signed = String(body?.signedURL || body?.signedUrl || body?.signed_url || "");
    if (!signed) throw new Error("Supabase did not return a signed picture link.");
    if (/^https?:\/\//i.test(signed)) return signed;
    if (signed.startsWith("/storage/v1")) return `${cloudConfig.url}${signed}`;
    if (signed.startsWith("/object")) return `${cloudConfig.url}/storage/v1${signed}`;
    if (signed.startsWith("/")) return `${cloudConfig.url}${signed}`;
    return `${cloudConfig.url}/storage/v1/${signed}`;
  }

  async function signCloudMediaPath(path, expiresIn = 31536000) {
    const body = await cloudStorageFetch(`/object/sign/billmaster-media/${encodeStoragePath(path)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn })
    });
    return {
      url: signedMediaUrlFromResponse(body),
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    };
  }

  async function uploadMediaEntryToCloud(entry) {
    const blob = dataUrlToBlob(entry.source);
    const path = mediaStoragePath(entry, blob);
    await cloudStorageFetch(`/object/billmaster-media/${encodeStoragePath(path)}`, {
      method: "POST",
      headers: { "Content-Type": blob.type || "application/octet-stream", "x-upsert": "true" },
      body: blob
    });
    const signed = await signCloudMediaPath(path);
    const now = new Date().toISOString();
    entry.item[entry.field] = signed.url;
    entry.item[`${entry.field}CloudBucket`] = "billmaster-media";
    entry.item[`${entry.field}CloudPath`] = path;
    entry.item[`${entry.field}CloudSignedAt`] = now;
    entry.item[`${entry.field}CloudExpiresAt`] = signed.expiresAt;
    entry.item.updatedAt = now;
    return path;
  }

  async function uploadLocalMediaToCloud() {
    if (!cloudSignedIn()) {
      showToast("Sign in to Supabase before uploading pictures.", "danger");
      return;
    }
    const entries = mediaTrackedEntries().filter((entry) => entry.kind === "localData" && isDataImage(entry.source));
    if (!entries.length) {
      showToast("No local pictures need uploading right now.");
      return;
    }
    let uploaded = 0;
    let failed = 0;
    showToast(`Uploading ${entries.length} local picture${entries.length === 1 ? "" : "s"} to Supabase...`, "success", { render: false });
    for (const entry of entries) {
      try {
        await uploadMediaEntryToCloud(entry);
        uploaded += 1;
      } catch (error) {
        failed += 1;
        console.warn("BillMaster media upload failed.", entry.collection, entry.item?.id, error);
      }
    }
    if (uploaded) {
      const saved = saveData();
      if (saved) {
        try {
          await pushWorkspaceToCloud("media");
        } catch (error) {
          console.warn("BillMaster could not push media workspace changes.", error);
          showToast(`Pictures uploaded, but push needs retry: ${error.message}`, "danger");
          render();
          return;
        }
      }
    }
    render();
    if (uploaded && !failed) showToast(`${uploaded} picture${uploaded === 1 ? "" : "s"} uploaded and synced.`);
    else if (uploaded) showToast(`${uploaded} uploaded. ${failed} need another try.`, "danger");
    else showToast("Picture upload failed. Check the Supabase storage bucket policies.", "danger");
  }

  async function refreshCloudMediaLinks() {
    if (!cloudSignedIn()) {
      showToast("Sign in to Supabase before refreshing picture links.", "danger");
      return;
    }
    const entries = mediaTrackedEntries().filter((entry) => entry.cloudPath);
    if (!entries.length) {
      showToast("No cloud picture links need refreshing yet.");
      return;
    }
    let refreshed = 0;
    let failed = 0;
    for (const entry of entries) {
      try {
        const signed = await signCloudMediaPath(entry.cloudPath);
        const now = new Date().toISOString();
        entry.item[entry.field] = signed.url;
        entry.item[`${entry.field}CloudSignedAt`] = now;
        entry.item[`${entry.field}CloudExpiresAt`] = signed.expiresAt;
        entry.item.updatedAt = now;
        refreshed += 1;
      } catch (error) {
        failed += 1;
        console.warn("BillMaster media link refresh failed.", entry.collection, entry.item?.id, error);
      }
    }
    if (refreshed) {
      saveData();
      try {
        await pushWorkspaceToCloud("media-links");
      } catch (error) {
        console.warn("BillMaster could not push refreshed media links.", error);
      }
    }
    render();
    if (refreshed && !failed) showToast(`${refreshed} cloud picture link${refreshed === 1 ? "" : "s"} refreshed.`);
    else if (refreshed) showToast(`${refreshed} refreshed. ${failed} need another try.`, "danger");
    else showToast("Could not refresh cloud picture links.", "danger");
  }

  function mediaPortabilityStats() {
    const stats = {
      total: 0,
      web: 0,
      googleDrive: 0,
      localData: 0,
      cloudStorage: 0,
      devicePath: 0,
      stock: 0,
      other: 0,
      byCollection: []
    };
    const entries = mediaTrackedEntries();
    mediaTrackedCollections().forEach(([collection, label]) => {
      const row = { collection, label, total: 0, localData: 0, cloudStorage: 0 };
      entries.filter((entry) => entry.collection === collection).forEach((entry) => {
        const kind = entry.kind;
        if (!kind) return;
        stats.total += 1;
        row.total += 1;
        if (stats[kind] !== undefined) stats[kind] += 1;
        else stats.other += 1;
        if (kind === "localData") row.localData += 1;
        if (kind === "cloudStorage") row.cloudStorage += 1;
      });
      stats.byCollection.push(row);
    });
    return stats;
  }

  async function copyMediaStoragePlan() {
    const stats = mediaPortabilityStats();
    const lines = [
      "BillMaster Media Storage Plan",
      "",
      `Total pictures tracked: ${stats.total}`,
      `Portable web/Google/cloud links: ${stats.web + stats.googleDrive + stats.cloudStorage}`,
      `Local uploads currently stored in workspace JSON: ${stats.localData}`,
      `Private Supabase Storage pictures: ${stats.cloudStorage}`,
      `Device-only file paths: ${stats.devicePath}`,
      "",
      "Next production step:",
      "1. Keep using links for images that already live online.",
      "2. Upload local pictures to the private Supabase Storage bucket named billmaster-media.",
      "3. Store each uploaded file under the signed-in user's folder.",
      "4. Save the storage path and use short-lived signed URLs for previews.",
      "",
      "By area:",
      ...stats.byCollection
        .filter((item) => item.total)
        .map((item) => `- ${item.label}: ${item.total} image(s), ${item.localData} local upload(s), ${item.cloudStorage} cloud-backed`)
    ];
    try {
      await copyText(lines.join("\n"));
      showToast("Media storage plan copied.");
    } catch (error) {
      showToast("Could not copy the media plan.", "danger");
    }
  }

  function taskAddressLabel(value) {
    if (value === ADD_TASK_ADDRESS_VALUE) return "+ Add new address";
    if (!value) return "No location";
    return data.addresses.find((address) => address.id === value)?.label || "Saved address";
  }

  function contactAddressLabel(value) {
    if (value === ADD_TASK_ADDRESS_VALUE) return "+ Add new address";
    if (!value) return "No address";
    return data.addresses.find((address) => address.id === value)?.label || "Saved address";
  }

  function afterRender() {
    const chart = document.getElementById("analyticsChart");
    if (chart) drawAnalyticsChart(chart);
    startTaskAlertScheduler();
    attachDashboardSwipe();
    attachBlockInteractions();
    attachDayTaskInteractions();
    attachHabitInteractions();
    attachProjectTaskInteractions();
    attachNoteNotebookInteractions();
  }

  function attachDashboardSwipe() {
    if (ui.view !== "dashboard" || typeof window === "undefined") return;
    if (typeof document === "undefined" || typeof document.querySelector !== "function") return;
    const scroller = document.querySelector("[data-dashboard-swipe]");
    if (!scroller || !window.matchMedia?.("(max-width: 999px)")?.matches) return;
    const panels = Array.from(scroller.querySelectorAll("[data-dashboard-panel]"));
    if (!panels.length) return;
    const targetPanel = panels.find((panel) => panel.dataset.dashboardPanel === ui.dashboardPanel) || panels.find((panel) => panel.dataset.dashboardPanel === "today") || panels[0];
    const centerPanel = (panel) => {
      const left = panel.offsetLeft - Math.max(0, (scroller.clientWidth - panel.clientWidth) / 2);
      scroller.scrollLeft = left;
    };
    centerPanel(targetPanel);
    let ticking = false;
    scroller.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const center = scroller.scrollLeft + (scroller.clientWidth / 2);
        const active = panels.reduce((best, panel) => {
          const panelCenter = panel.offsetLeft + (panel.clientWidth / 2);
          const distance = Math.abs(panelCenter - center);
          return !best || distance < best.distance ? { panel, distance } : best;
        }, null)?.panel;
        if (active?.dataset.dashboardPanel) ui.dashboardPanel = active.dataset.dashboardPanel;
      });
    }, { passive: true });
  }

  function attachDayTaskInteractions() {
    document.querySelectorAll(".day-task-card").forEach((card) => {
      if (card.dataset.bound === "true") return;
      card.dataset.bound = "true";
      card.addEventListener("pointerdown", startDayTaskDrag);
      card.addEventListener("click", handleDayTaskCardClick);
    });
  }

  function handleDayTaskCardClick(event) {
    if (event.target.closest("button,a,input,select,textarea,.quick-picker")) return;
    const card = event.currentTarget;
    if (card.dataset.skipCardClick === "true") {
      delete card.dataset.skipCardClick;
      return;
    }
    openCalendarItemEditor(card.dataset.taskId);
  }

  function suppressNextDayCardClick(card) {
    if (!card) return;
    card.dataset.skipCardClick = "true";
    setTimeout(() => {
      if (card.dataset.skipCardClick === "true") delete card.dataset.skipCardClick;
    }, 300);
  }

  function attachHabitInteractions() {
    if (ui.view !== "habits") return;
    document.querySelectorAll(".habit-card[data-habit-id]").forEach((card) => {
      if (card.dataset.dragBound === "true") return;
      card.dataset.dragBound = "true";
      card.addEventListener("dragstart", (event) => {
        const timeRow = event.target.closest?.(".habit-time-row[data-habit-time-swap]");
        if (timeRow) {
          habitTimeDragId = timeRow.dataset.habitTimeSwap || card.dataset.habitId || "";
          card.classList.add("is-dragging", "is-time-dragging");
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("application/x-billmaster-habit-time", habitTimeDragId);
          event.dataTransfer.setData("text/plain", `habit-time:${habitTimeDragId}`);
          return;
        }
        if (event.target.closest("button,input,select,textarea,a")) {
          event.preventDefault();
          return;
        }
        card.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.dataset.habitId || "");
      });
      card.addEventListener("dragend", () => {
        habitTimeDragId = "";
        card.classList.remove("is-dragging");
        card.classList.remove("is-time-dragging");
        document.querySelectorAll(".habit-card.drag-over").forEach((item) => item.classList.remove("drag-over"));
        document.querySelectorAll(".habit-card.time-drag-over").forEach((item) => item.classList.remove("time-drag-over"));
      });
      card.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (habitTimeDragId) card.classList.add("time-drag-over");
        else card.classList.add("drag-over");
      });
      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
        card.classList.remove("time-drag-over");
      });
      card.addEventListener("drop", (event) => {
        event.preventDefault();
        card.classList.remove("drag-over");
        card.classList.remove("time-drag-over");
        const plainDragData = event.dataTransfer.getData("text/plain") || "";
        const timeSource = event.dataTransfer.getData("application/x-billmaster-habit-time") || (plainDragData.startsWith("habit-time:") ? plainDragData.replace(/^habit-time:/, "") : "");
        if (timeSource) {
          swapHabitTimes(timeSource, card.dataset.habitId || "");
          habitTimeDragId = "";
          return;
        }
        const sourceId = plainDragData;
        const targetId = card.dataset.habitId || "";
        swapHabits(sourceId, targetId);
      });
    });
  }

  function attachProjectTaskInteractions() {
    if (ui.view !== "projects" || ui.projectId) return;
    const selectGrid = document.querySelectorAll("[data-project-task-select-grid]")[0];
    if (selectGrid && ui.projectDragSelectMode && selectGrid.dataset.dragSelectBound !== "true") {
      selectGrid.dataset.dragSelectBound = "true";
      selectGrid.addEventListener("pointerdown", (event) => startProjectDragSelect(event, selectGrid));
    }
    document.querySelectorAll("[data-project-task-id]").forEach((card) => {
      if (card.dataset.dragBound === "true") return;
      card.dataset.dragBound = "true";
      card.addEventListener("dragstart", (event) => {
        if (ui.projectDragSelectMode || event.target.closest("button,input,select,textarea,a")) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        const draggedId = card.dataset.projectTaskId || "";
        const taskIds = ui.selectedTasks.includes(draggedId) ? selectedUnassignedTaskIds(draggedId) : [draggedId].filter(Boolean);
        event.dataTransfer.setData("text/plain", draggedId);
        event.dataTransfer.setData("application/x-billmaster-task", draggedId);
        event.dataTransfer.setData("application/x-billmaster-tasks", JSON.stringify(taskIds));
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("is-dragging");
        document.querySelectorAll(".project-drop-active").forEach((tile) => tile.classList.remove("project-drop-active"));
      });
    });
    document.querySelectorAll("[data-project-drop]").forEach((tile) => {
      if (tile.dataset.dropBound === "true") return;
      tile.dataset.dropBound = "true";
      tile.addEventListener("dragover", (event) => {
        const types = Array.from(event.dataTransfer.types || []);
        if (!types.includes("application/x-billmaster-tasks") && !types.includes("application/x-billmaster-task")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        tile.classList.add("project-drop-active");
      });
      tile.addEventListener("dragleave", () => tile.classList.remove("project-drop-active"));
      tile.addEventListener("drop", (event) => {
        let taskIds = [];
        try {
          taskIds = JSON.parse(event.dataTransfer.getData("application/x-billmaster-tasks") || "[]");
        } catch (error) {
          taskIds = [];
        }
        const taskId = event.dataTransfer.getData("application/x-billmaster-task");
        if (!taskIds.length && taskId) taskIds = [taskId];
        if (!taskIds.length) return;
        event.preventDefault();
        tile.classList.remove("project-drop-active");
        assignTasksToProject(taskIds, tile.dataset.projectDrop);
      });
    });
  }

  function startProjectDragSelect(event, grid) {
    if (!ui.projectDragSelectMode || event.button !== 0) return;
    if (event.target.closest("button,input,select,textarea,a")) return;
    if (!event.target.closest("[data-project-task-select-grid]")) return;
    event.preventDefault();
    suppressCardEditUntil = Date.now() + 700;
    const marquee = document.createElement("span");
    marquee.className = "project-selection-marquee";
    marquee.setAttribute("aria-hidden", "true");
    grid.appendChild(marquee);
    projectDragSelectState = {
      grid,
      marquee,
      startX: event.clientX,
      startY: event.clientY,
      baseSelected: new Set(ui.selectedTasks),
      currentSelected: new Set(ui.selectedTasks),
      moved: false
    };
    grid.classList.add("is-selecting");
    updateProjectDragSelect(event.clientX, event.clientY);
    document.addEventListener("pointermove", moveProjectDragSelect, { passive: false });
    document.addEventListener("pointerup", endProjectDragSelect, { once: true });
    document.addEventListener("pointercancel", endProjectDragSelect, { once: true });
  }

  function moveProjectDragSelect(event) {
    if (!projectDragSelectState) return;
    event.preventDefault();
    suppressCardEditUntil = Date.now() + 700;
    updateProjectDragSelect(event.clientX, event.clientY);
  }

  function updateProjectDragSelect(clientX, clientY) {
    const state = projectDragSelectState;
    if (!state) return;
    const gridRect = state.grid.getBoundingClientRect();
    const left = Math.min(state.startX, clientX);
    const right = Math.max(state.startX, clientX);
    const top = Math.min(state.startY, clientY);
    const bottom = Math.max(state.startY, clientY);
    if (Math.abs(clientX - state.startX) > 4 || Math.abs(clientY - state.startY) > 4) state.moved = true;
    Object.assign(state.marquee.style, {
      left: `${left - gridRect.left + state.grid.scrollLeft}px`,
      top: `${top - gridRect.top + state.grid.scrollTop}px`,
      width: `${Math.max(1, right - left)}px`,
      height: `${Math.max(1, bottom - top)}px`
    });
    const nextSelected = new Set(state.baseSelected);
    state.grid.querySelectorAll("[data-project-task-id]").forEach((card) => {
      const rect = card.getBoundingClientRect();
      const intersects = rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom;
      if (intersects) nextSelected.add(card.dataset.projectTaskId);
    });
    ui.selectedTasks = Array.from(nextSelected);
    state.currentSelected = nextSelected;
    state.grid.querySelectorAll("[data-project-task-id]").forEach((card) => {
      const selected = nextSelected.has(card.dataset.projectTaskId);
      card.classList.toggle("selected", selected);
      const button = card.querySelector(".task-mini-select");
      if (button) {
        button.classList.toggle("active", selected);
        button.innerHTML = selected ? icon("check") : "";
      }
    });
  }

  function endProjectDragSelect(event) {
    if (projectDragSelectState && event?.clientX !== undefined) updateProjectDragSelect(event.clientX, event.clientY);
    const selectedCount = selectedUnassignedTaskIds().length;
    cleanupProjectDragSelect();
    suppressCardEditUntil = Date.now() + 700;
    render();
    showToast(selectedCount ? `${selectedCount} unassigned task${selectedCount === 1 ? "" : "s"} selected.` : "No task cards selected.");
  }

  function cleanupProjectDragSelect() {
    document.removeEventListener("pointermove", moveProjectDragSelect);
    document.removeEventListener("pointerup", endProjectDragSelect);
    document.removeEventListener("pointercancel", endProjectDragSelect);
    projectDragSelectState?.grid?.classList.remove("is-selecting");
    projectDragSelectState?.marquee?.remove();
    projectDragSelectState = null;
  }

  function attachNoteNotebookInteractions() {
    if (!["notebooks", "notes", "projects"].includes(ui.view)) return;
    document.querySelectorAll("[data-notebook-note-id]").forEach((card) => {
      if (card.dataset.dragBound === "true") return;
      card.dataset.dragBound = "true";
      card.addEventListener("dragstart", (event) => {
        if (event.target.closest("button,input,select,textarea,a")) {
          event.preventDefault();
          return;
        }
        const noteId = card.dataset.notebookNoteId || "";
        const noteIds = selectedNoteDragIds(noteId);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", noteIds[0] || "");
        event.dataTransfer.setData("application/x-billmaster-note", noteIds[0] || "");
        event.dataTransfer.setData("application/x-billmaster-notes", JSON.stringify(noteIds));
        card.dataset.dragCount = String(noteIds.length);
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => {
        delete card.dataset.dragCount;
        card.classList.remove("is-dragging");
        document.querySelectorAll(".notebook-drop-active").forEach((tile) => tile.classList.remove("notebook-drop-active"));
        document.querySelectorAll(".project-note-drop-active").forEach((tile) => tile.classList.remove("project-note-drop-active"));
      });
    });
    document.querySelectorAll("[data-notebook-drop]").forEach((tile) => {
      if (tile.dataset.dropBound === "true") return;
      tile.dataset.dropBound = "true";
      tile.addEventListener("dragover", (event) => {
        const types = Array.from(event.dataTransfer.types || []);
        if (!types.includes("application/x-billmaster-notes") && !types.includes("application/x-billmaster-note") && !types.includes("text/plain")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        tile.classList.add("notebook-drop-active");
      });
      tile.addEventListener("dragleave", (event) => {
        if (!isDragOutsideElement(event, tile)) return;
        tile.classList.remove("notebook-drop-active");
      });
      tile.addEventListener("drop", (event) => {
        let noteIds = [];
        try {
          noteIds = JSON.parse(event.dataTransfer.getData("application/x-billmaster-notes") || "[]");
        } catch (error) {
          noteIds = [];
        }
        const noteId = event.dataTransfer.getData("application/x-billmaster-note") || event.dataTransfer.getData("text/plain");
        if (!noteIds.length && noteId) noteIds = [noteId];
        if (!noteIds.length) return;
        event.preventDefault();
        tile.classList.remove("notebook-drop-active");
        assignNotesToNotebook(noteIds, tile.dataset.notebookDrop);
      });
    });
    document.querySelectorAll("[data-project-note-drop]").forEach((tile) => {
      if (tile.dataset.noteProjectDropBound === "true") return;
      tile.dataset.noteProjectDropBound = "true";
      tile.addEventListener("dragover", (event) => {
        const types = Array.from(event.dataTransfer.types || []);
        if (!types.includes("application/x-billmaster-notes") && !types.includes("application/x-billmaster-note")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        tile.classList.add("project-note-drop-active");
      });
      tile.addEventListener("dragleave", (event) => {
        if (!isDragOutsideElement(event, tile)) return;
        tile.classList.remove("project-note-drop-active");
      });
      tile.addEventListener("drop", (event) => {
        let noteIds = [];
        try {
          noteIds = JSON.parse(event.dataTransfer.getData("application/x-billmaster-notes") || "[]");
        } catch (error) {
          noteIds = [];
        }
        const noteId = event.dataTransfer.getData("application/x-billmaster-note");
        if (!noteIds.length && noteId) noteIds = [noteId];
        if (!noteIds.length) return;
        event.preventDefault();
        tile.classList.remove("project-note-drop-active");
        assignNotesToProject(noteIds, tile.dataset.projectNoteDrop);
      });
    });
  }

  function isDragOutsideElement(event, element) {
    const rect = element.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    return x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom;
  }

  function startDayTaskDrag(event) {
    if (event.target.closest("button,a,input,select,textarea")) return;
    const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
    if (touchLike && !ui.daySwapMode) return;
    const swapTouch = touchLike && ui.daySwapMode;
    const card = event.currentTarget;
    const task = findCalendarItemById(card.dataset.taskId);
    if (!task) return;
    if (ui.daySwapMode) {
      event.preventDefault();
      event.stopPropagation();
    }
    card.setPointerCapture?.(event.pointerId);
    if (swapTouch) {
      document.body.classList.add("day-touch-swap-active");
      card.classList.add("swap-ready");
    }
    dayDragState = {
      taskId: task.id,
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      targetId: "",
      touchLike,
      swapTouch,
      holdOpened: false,
      holdTimer: null
    };
    if (!swapTouch) scheduleDayHoldMenu(dayDragState);
    document.addEventListener("pointermove", moveDayTaskDrag, { passive: false });
    document.addEventListener("pointerup", endDayTaskDrag, { once: true });
    document.addEventListener("pointercancel", cancelDayTaskDrag, { once: true });
  }

  function moveDayTaskDrag(event) {
    if (!dayDragState) return;
    const state = dayDragState;
    if (state.touchLike || ui.daySwapMode) {
      event.preventDefault();
      event.stopPropagation();
    }
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    state.moved = state.moved || Math.abs(dx) > 6 || Math.abs(dy) > 6;
    if (!state.moved) return;
    clearDayHoldTimer(state);
    state.card.classList.add("is-dragging");
    state.card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    const target = dayTaskDropTarget(event.clientX, event.clientY, state);
    document.querySelectorAll(".day-task-card.drop-target").forEach((card) => card.classList.remove("drop-target"));
    state.targetId = target && target.dataset.taskId !== state.taskId ? target.dataset.taskId : "";
    if (state.targetId) target.classList.add("drop-target");
  }

  function dayTaskDropTarget(x, y, state) {
    state.card.style.pointerEvents = "none";
    const target = document.elementFromPoint(x, y)?.closest(".day-task-card");
    state.card.style.pointerEvents = "";
    return target;
  }

  function endDayTaskDrag(event) {
    document.removeEventListener("pointermove", moveDayTaskDrag);
    if (!dayDragState) return;
    const state = dayDragState;
    if (state.touchLike || ui.daySwapMode) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
    }
    clearDayHoldTimer(state);
    state.card.classList.remove("is-dragging", "swap-ready");
    state.card.style.transform = "";
    state.card.releasePointerCapture?.(state.pointerId);
    document.body.classList.remove("day-touch-swap-active");
    document.querySelectorAll(".day-task-card.drop-target").forEach((card) => card.classList.remove("drop-target"));
    if (state.holdOpened) {
      suppressNextDayCardClick(state.card);
      dayDragState = null;
      return;
    }
    if (state.moved && state.targetId) {
      suppressNextDayCardClick(state.card);
      swapTaskTimes(state.taskId, state.targetId);
    } else if (state.moved) {
      suppressNextDayCardClick(state.card);
      showToast("Drag onto another task to swap times.", "danger");
    }
    dayDragState = null;
  }

  function cancelDayTaskDrag() {
    document.removeEventListener("pointermove", moveDayTaskDrag);
    if (dayDragState) {
      clearDayHoldTimer(dayDragState);
      dayDragState.card.classList.remove("is-dragging", "swap-ready");
      dayDragState.card.style.transform = "";
      dayDragState.card.releasePointerCapture?.(dayDragState.pointerId);
      document.body.classList.remove("day-touch-swap-active");
      document.querySelectorAll(".day-task-card.drop-target").forEach((card) => card.classList.remove("drop-target"));
      dayDragState = null;
    }
  }

  function scheduleDayHoldMenu(state) {
    if (state?.swapTouch) return;
    clearDayHoldTimer(state);
    state.holdTimer = setTimeout(() => {
      if (dayDragState !== state || state.moved) return;
      state.holdOpened = true;
      document.removeEventListener("pointermove", moveDayTaskDrag);
      state.card.releasePointerCapture?.(state.pointerId);
      dayDragState = null;
      openModal("dayEventActions", state.taskId);
    }, dayHoldDelay);
  }

  function clearDayHoldTimer(state) {
    if (!state?.holdTimer) return;
    clearTimeout(state.holdTimer);
    state.holdTimer = null;
  }

  function openCalendarItemEditor(taskId) {
    const item = findCalendarItemById(taskId);
    if (!item) return;
    if (item.isHabit) return editHabitInstance(item.id);
    openModal("editTask", item.id);
  }

  function attachBlockInteractions() {
    document.querySelectorAll(".block-col").forEach((column) => {
      if (column.dataset.createBound === "true") return;
      column.dataset.createBound = "true";
      column.addEventListener("pointerdown", startBlockCreate, { passive: false });
      column.addEventListener("dblclick", (event) => {
        if (event.target.closest(".event-block")) return;
        event.preventDefault();
        event.stopPropagation();
        if (blockLastTouchAnchor?.createdAt && Date.now() - blockLastTouchAnchor.createdAt < 800) return;
        const anchor = blockCreateAnchorFromPointer(event, column);
        if (anchor) scheduleBlockQuickCreate(anchor, { delay: 90 });
      });
    });
    document.querySelectorAll(".event-block").forEach((block) => {
      if (block.dataset.bound === "true") return;
      block.dataset.bound = "true";
      block.addEventListener("pointerdown", startBlockDrag);
      block.addEventListener("pointerenter", enterBlockSelectBrush);
      block.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearBlockHoldTimer(blockDragState);
        openCalendarItemEditor(block.dataset.taskId);
      });
      block.addEventListener("contextmenu", (event) => {
        if (!ui.blockSelectMode || !ui.selectedTasks.includes(block.dataset.taskId)) return;
        event.preventDefault();
        event.stopPropagation();
        openModal("taskActions", "");
      });
      block.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCalendarItemEditor(block.dataset.taskId);
        }
      });
    });
  }

  function startBlockDrag(event) {
    clearBlockTapCreateDraft();
    const block = event.currentTarget;
    const task = findCalendarItemById(block.dataset.taskId);
    const column = block.closest(".block-col");
    if (!task || !column) return;
    if (event.target.closest("[data-action='toggle-task-select']")) return;
    if (ui.blockSelectMode && !event.target.closest("[data-resize],[data-repeat]")) {
      startBlockSelectBrush(event, block, task.id);
      return;
    }
    const repeat = event.target.closest("[data-repeat]");
    if (repeat) return startBlockRepeatDrag(event, block, task, column);
    const resize = event.target.closest("[data-resize]");
    if (!resize && event.detail && event.detail > 1) {
      event.preventDefault();
      event.stopPropagation();
      openCalendarItemEditor(task.id);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    block.setPointerCapture?.(event.pointerId);
    const colRect = column.getBoundingClientRect();
    const eventWindow = blockEventWindow(task, blockFocusRange());
    blockDragState = {
      taskId: task.id,
      mode: resize ? resize.dataset.resize : "move",
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      colWidth: colRect.width,
      originalDate: task.date,
      originalStart: eventWindow.start,
      originalEnd: eventWindow.end,
      range: blockFocusRange(),
      block,
      moved: false,
      holdOpened: false,
      holdTimer: null
    };
    if (!resize) scheduleBlockHoldMenu(blockDragState);
    block.classList.add("is-dragging");
    document.addEventListener("pointermove", moveBlockDrag);
    document.addEventListener("pointerup", endBlockDrag, { once: true });
    document.addEventListener("pointercancel", cancelBlockDrag, { once: true });
  }

  function startBlockSelectBrush(event, block, taskId) {
    event.preventDefault();
    event.stopPropagation();
    const startedWithSelection = ui.selectedTasks.length > 0;
    blockSelectBrushState = { pointerId: event.pointerId, ids: new Set(), block, startX: event.clientX, startY: event.clientY, moved: false, holdTimer: null, startedWithSelection, anchorTaskId: taskId, overlay: null };
    block.setPointerCapture?.(event.pointerId);
    brushSelectBlockTask(block, taskId);
    createBlockSelectMarquee(blockSelectBrushState);
    if (startedWithSelection) scheduleBlockSelectHoldMenu(blockSelectBrushState);
    document.addEventListener("pointermove", moveBlockSelectBrush);
    document.addEventListener("pointerup", endBlockSelectBrush, { once: true });
    document.addEventListener("pointercancel", endBlockSelectBrush, { once: true });
  }

  function moveBlockSelectBrush(event) {
    if (!blockSelectBrushState || event.pointerId !== blockSelectBrushState.pointerId) return;
    const state = blockSelectBrushState;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    state.moved = state.moved || Math.abs(dx) > blockHoldMoveTolerance || Math.abs(dy) > blockHoldMoveTolerance;
    if (state.moved) clearBlockSelectHoldTimer(state);
    updateBlockSelectMarquee(state, event.clientX, event.clientY);
    const hitRect = blockSelectMarqueeRect(state.startX, state.startY, event.clientX, event.clientY);
    if (hitRect.width < 8 && hitRect.height < 8) {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const block = element?.closest?.(".event-block");
      if (block) brushSelectBlockTask(block, block.dataset.taskId);
      return;
    }
    document.querySelectorAll(".block-calendar .event-block").forEach((block) => {
      if (rectsIntersect(hitRect, block.getBoundingClientRect())) {
        brushSelectBlockTask(block, block.dataset.taskId, { toggle: true });
      }
    });
  }

  function enterBlockSelectBrush(event) {
    if (!ui.blockSelectMode || !blockSelectBrushState || event.pointerId !== blockSelectBrushState.pointerId) return;
    brushSelectBlockTask(event.currentTarget, event.currentTarget.dataset.taskId, { toggle: blockSelectBrushState.moved });
  }

  function brushSelectBlockTask(block, taskId, options = {}) {
    if (!taskId || !blockSelectBrushState || blockSelectBrushState.ids.has(taskId)) return;
    blockSelectBrushState.ids.add(taskId);
    const selected = ui.selectedTasks.includes(taskId);
    const shouldDeselect = Boolean(options.toggle && selected && taskId !== blockSelectBrushState.anchorTaskId);
    block.classList.remove("is-brush-hit", "is-brush-removed");
    void block.offsetWidth;
    if (shouldDeselect) {
      ui.selectedTasks = ui.selectedTasks.filter((id) => id !== taskId);
      block.classList.remove("is-selected");
      block.classList.add("is-brush-removed");
      updateBlockSelectButton(block, false);
      setTimeout(() => block.classList.remove("is-brush-removed"), 220);
      return;
    }
    if (!selected) ui.selectedTasks.push(taskId);
    block.classList.add("is-selected", "is-brush-hit");
    updateBlockSelectButton(block, true);
    setTimeout(() => block.classList.remove("is-brush-hit"), 220);
  }

  function updateBlockSelectButton(block, selected) {
    const button = block.querySelector(".block-select-button");
    if (button) {
      button.classList.toggle("active", selected);
      button.innerHTML = selected ? icon("check") : "";
      button.setAttribute("aria-label", selected ? "Selected task" : "Select task");
    }
  }

  function endBlockSelectBrush() {
    document.removeEventListener("pointermove", moveBlockSelectBrush);
    clearBlockSelectHoldTimer(blockSelectBrushState);
    removeBlockSelectMarquee(blockSelectBrushState);
    blockSelectBrushState?.block?.releasePointerCapture?.(blockSelectBrushState.pointerId);
    blockSelectBrushState = null;
    render();
  }

  function createBlockSelectMarquee(state) {
    if (!state || state.overlay) return;
    const overlay = document.createElement("div");
    overlay.className = "block-select-marquee";
    document.body.appendChild(overlay);
    state.overlay = overlay;
    updateBlockSelectMarquee(state, state.startX, state.startY);
  }

  function updateBlockSelectMarquee(state, clientX, clientY) {
    if (!state?.overlay) return;
    const rect = blockSelectMarqueeRect(state.startX, state.startY, clientX, clientY);
    Object.assign(state.overlay.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
    state.overlay.classList.toggle("is-active", rect.width >= 8 || rect.height >= 8);
  }

  function removeBlockSelectMarquee(state) {
    state?.overlay?.remove();
    if (state) state.overlay = null;
  }

  function blockSelectMarqueeRect(startX, startY, endX, endY) {
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  function rectsIntersect(a, b) {
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  function scheduleBlockSelectHoldMenu(state) {
    clearBlockSelectHoldTimer(state);
    state.holdTimer = setTimeout(() => {
      if (blockSelectBrushState !== state || state.moved || !ui.selectedTasks.length) return;
      clearBlockSelectHoldTimer(state);
      document.removeEventListener("pointermove", moveBlockSelectBrush);
      document.removeEventListener("pointerup", endBlockSelectBrush);
      document.removeEventListener("pointercancel", endBlockSelectBrush);
      removeBlockSelectMarquee(state);
      state.block.releasePointerCapture?.(state.pointerId);
      blockSelectBrushState = null;
      openModal("taskActions", "");
    }, blockHoldDelay);
  }

  function clearBlockSelectHoldTimer(state) {
    if (!state?.holdTimer) return;
    clearTimeout(state.holdTimer);
    state.holdTimer = null;
  }

  function scheduleBlockHoldMenu(state) {
    clearBlockHoldTimer(state);
    state.holdTimer = setTimeout(() => {
      if (blockDragState !== state || state.moved) return;
      state.holdOpened = true;
      clearBlockHoldTimer(state);
      document.removeEventListener("pointermove", moveBlockDrag);
      document.removeEventListener("pointerup", endBlockDrag);
      document.removeEventListener("pointercancel", cancelBlockDrag);
      state.block.classList.remove("is-dragging");
      state.block.style.transform = "";
      ui.blockSelectMode = true;
      blockDragState = null;
      blockSelectBrushState = {
        pointerId: state.pointerId,
        ids: new Set(),
        block: state.block,
        startX: state.startX,
        startY: state.startY,
        moved: false,
        holdTimer: null,
        startedWithSelection: ui.selectedTasks.length > 0,
        anchorTaskId: state.taskId,
        overlay: null
      };
      brushSelectBlockTask(state.block, state.taskId);
      createBlockSelectMarquee(blockSelectBrushState);
      state.block.setPointerCapture?.(state.pointerId);
      document.addEventListener("pointermove", moveBlockSelectBrush);
      document.addEventListener("pointerup", endBlockSelectBrush, { once: true });
      document.addEventListener("pointercancel", endBlockSelectBrush, { once: true });
      showToast("Selection brush on. Drag across tasks, then choose Select tasks.");
    }, blockSelectHoldDelay);
  }

  function clearBlockHoldTimer(state) {
    if (!state?.holdTimer) return;
    clearTimeout(state.holdTimer);
    state.holdTimer = null;
  }

  function blockCreateAnchorFromPointer(event, fallbackColumn) {
    if (!event || !fallbackColumn) return null;
    const calendar = fallbackColumn.closest(".block-calendar");
    const columns = Array.from(calendar?.querySelectorAll(".block-col") || []);
    if (!columns.length) return null;
    const column = blockColumnFromCrosshair(columns, event.clientX, event.clientY, fallbackColumn);
    const startIndex = columns.indexOf(column);
    if (startIndex < 0) return null;
    const rect = column.getBoundingClientRect();
    const range = blockFocusRange();
    const startMinute = clamp(snapGridMinuteCeil(blockPixelToMinute(event.clientY - rect.top)), range.start, range.end - 15);
    return {
      columns,
      column,
      startIndex,
      date: column.dataset.date || ui.selectedDate,
      startMinute,
      x: event.clientX,
      y: event.clientY,
      createdAt: Date.now()
    };
  }

  function rememberBlockCreateAnchor(anchor) {
    if (!anchor?.date || !Number.isFinite(anchor.startMinute)) return;
    blockLastCreateAnchor = {
      date: anchor.date,
      startMinute: anchor.startMinute,
      endMinute: Number.isFinite(anchor.endMinute) ? anchor.endMinute : null,
      x: anchor.x,
      y: anchor.y,
      createdAt: Date.now()
    };
    ui.selectedDate = anchor.date;
  }

  function scheduleBlockQuickCreate(anchor, options = {}) {
    if (!anchor?.date || !Number.isFinite(anchor.startMinute)) return;
    const delay = Number.isFinite(options.delay) ? options.delay : 120;
    const createAnchor = {
      ...anchor,
      endMinute: Number.isFinite(options.endMinute) ? options.endMinute : anchor.endMinute
    };
    rememberBlockCreateAnchor(createAnchor);
    if (blockDeferredCreateTimer) clearTimeout(blockDeferredCreateTimer);
    blockDeferredCreateTimer = setTimeout(() => {
      blockDeferredCreateTimer = null;
      if (ui.modal?.type === "blockQuickCreate") return;
      openBlockQuickCreate(createAnchor);
    }, delay);
  }

  function isBlockDoubleTap(anchor) {
    const last = blockLastTouchAnchor;
    const now = Date.now();
    blockLastTouchAnchor = {
      date: anchor.date,
      startMinute: anchor.startMinute,
      x: anchor.x,
      y: anchor.y,
      createdAt: now
    };
    if (!last) return false;
    const closeInTime = now - last.createdAt <= 650;
    const sameCell = last.date === anchor.date && Math.abs(last.startMinute - anchor.startMinute) <= 15;
    const closeInSpace = Math.hypot((last.x || 0) - anchor.x, (last.y || 0) - anchor.y) <= 48;
    return closeInTime && (sameCell || closeInSpace);
  }

  function startBlockCreate(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
    if (event.isPrimary === false) return;
    if (event.target.closest(".event-block")) return;
    const column = event.currentTarget;
    const anchor = blockCreateAnchorFromPointer(event, column);
    if (!anchor) return;
    rememberBlockCreateAnchor(anchor);
    const doubleTapDrag = touchLike && !ui.blockDrawMode && isBlockDoubleTap(anchor);
    if (touchLike && !ui.blockDrawMode && !doubleTapDrag) {
      return;
    }
    if (touchLike || ui.blockDrawMode || doubleTapDrag) {
      event.preventDefault();
      event.stopPropagation();
    }
    const { columns, column: startColumn, startIndex, startMinute } = anchor;
    if (startIndex < 0) return;
    startColumn.setPointerCapture?.(event.pointerId);
    blockCreateState = {
      columns,
      startIndex,
      pointerColumn: startColumn,
      pointerId: event.pointerId,
      startMinute,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      touchLike,
      doubleTapDrag,
      previews: []
    };
    document.addEventListener("pointermove", moveBlockCreate, { passive: false });
    document.addEventListener("pointerup", endBlockCreate, { once: true });
    document.addEventListener("pointercancel", cancelBlockCreate, { once: true });
  }

  function moveBlockCreate(event) {
    if (!blockCreateState) return;
    const state = blockCreateState;
    if (state.touchLike || ui.blockDrawMode) {
      event.preventDefault();
      event.stopPropagation();
    }
    const selection = blockCreateSelection(event, state);
    const wasMoved = state.moved;
    state.moved = state.moved || Math.abs(event.clientX - state.startX) > 5 || Math.abs(event.clientY - state.startY) > 5;
    if (!wasMoved && state.moved) clearBlockTapCreateDraft();
    renderBlockCreatePreview(state, selection);
  }

  function endBlockCreate(event) {
    document.removeEventListener("pointermove", moveBlockCreate);
    if (!blockCreateState) return;
    const state = blockCreateState;
    if (state.touchLike || ui.blockDrawMode) {
      event.preventDefault();
      event.stopPropagation();
    }
    let selection = blockCreateSelection(event, state);
    const horizontalDelta = Math.abs((event.clientX || state.startX) - state.startX);
    const firstRect = state.columns[0]?.getBoundingClientRect?.();
    const columnWidth = Math.max(1, firstRect?.width || 1);
    if (selection.endIndex > selection.startIndex && horizontalDelta < columnWidth * 0.65) {
      selection = { ...selection, startIndex: state.startIndex, endIndex: state.startIndex };
    }
    clearBlockCreatePreview(state);
    state.pointerColumn?.releasePointerCapture?.(state.pointerId);
    blockCreateState = null;
    if (state.touchLike && (ui.blockDrawMode || state.doubleTapDrag)) {
      const touchDate = state.columns[state.startIndex]?.dataset.date || ui.selectedDate;
      const range = blockFocusRange();
      const startMinute = selection.startMinute;
      const endMinute = state.moved
        ? selection.endMinute
        : clamp(state.startMinute + 60, range.start + 15, range.end);
      scheduleBlockQuickCreate({
        date: touchDate,
        startMinute,
        endMinute: clamp(Math.max(startMinute + 15, endMinute), range.start + 15, range.end),
        x: event.clientX || state.startX,
        y: event.clientY || state.startY
      }, { delay: 90 });
      return;
    }
    if (!state.moved && ui.blockDrawMode) {
      if (finishBlockTapCreate(state)) return;
    } else if (!state.moved) {
      return;
    }
    const duration = selection.endMinute - selection.startMinute;
    if (duration < 15) return;
    createTasksFromBlockSelection(selection);
  }

  function cancelBlockCreate() {
    document.removeEventListener("pointermove", moveBlockCreate);
    if (blockCreateState) {
      blockCreateState.pointerColumn?.releasePointerCapture?.(blockCreateState.pointerId);
      clearBlockCreatePreview(blockCreateState);
      blockCreateState = null;
    }
  }

  function blockColumnFromCrosshair(columns, x, y, fallback) {
    const firstRect = columns[0]?.getBoundingClientRect();
    if (!firstRect) return fallback;
    const colWidth = Math.max(1, firstRect.width);
    const rawIndex = Math.floor((x + 4 - firstRect.left) / colWidth);
    const index = clamp(rawIndex, 0, columns.length - 1);
    return columns[index] || fallback;
  }

  function blockCreateSelection(event, state) {
    const firstRect = state.columns[0].getBoundingClientRect();
    const colWidth = Math.max(1, firstRect.width);
    const rawIndex = Math.floor((event.clientX + 4 - firstRect.left) / colWidth);
    const endIndex = clamp(rawIndex, 0, state.columns.length - 1);
    const range = blockFocusRange();
    const y = event.clientY - firstRect.top;
    let endMinute = snapGridMinute(blockPixelToMinute(y));
    if (endMinute === state.startMinute) endMinute = clamp(state.startMinute + 60, range.start + 15, range.end);
    const startMinute = Math.min(state.startMinute, endMinute);
    const finalEnd = Math.max(state.startMinute, endMinute);
    const startIndex = Math.min(state.startIndex, endIndex);
    const finalIndex = Math.max(state.startIndex, endIndex);
    return {
      startIndex,
      endIndex: finalIndex,
      startMinute,
      endMinute: clamp(Math.max(startMinute + 15, finalEnd), range.start + 15, range.end),
      columns: state.columns
    };
  }

  function renderBlockCreatePreview(state, selection) {
    clearBlockCreatePreview(state);
    for (let index = selection.startIndex; index <= selection.endIndex; index += 1) {
      const preview = document.createElement("div");
      preview.className = "block-create-preview";
      preview.style.top = `${blockMinuteToPixel(selection.startMinute)}px`;
      preview.style.height = `${Math.max(15, (selection.endMinute - selection.startMinute) * blockMinuteScale())}px`;
      preview.textContent = `${timeLabel(timeFromBlockMinute(selection.startMinute))} - ${timeLabel(timeFromBlockMinute(selection.endMinute))}`;
      selection.columns[index].appendChild(preview);
      state.previews.push(preview);
    }
  }

  function clearBlockCreatePreview(state) {
    state.previews.forEach((preview) => preview.remove());
    state.previews = [];
  }

  function finishBlockTapCreate(state) {
    const range = blockFocusRange();
    if (!blockTapCreateState) {
      blockTapCreateState = {
        columns: state.columns,
        startIndex: state.startIndex,
        startMinute: state.startMinute,
        previews: []
      };
      renderBlockCreatePreview(blockTapCreateState, {
        startIndex: state.startIndex,
        endIndex: state.startIndex,
        startMinute: state.startMinute,
        endMinute: clamp(state.startMinute + 30, range.start + 15, range.end),
        columns: state.columns
      });
      blockTapCreateState.previews.forEach((preview) => {
        preview.classList.add("block-tap-start-preview");
        preview.textContent = `Start ${timeLabel(timeFromBlockMinute(state.startMinute))}. Tap end time.`;
      });
      showToast("Start time set. Tap the end time to create the task.");
      return true;
    }
    const draft = blockTapCreateState;
    const startIndex = Math.min(draft.startIndex, state.startIndex);
    const endIndex = Math.max(draft.startIndex, state.startIndex);
    let startMinute = Math.min(draft.startMinute, state.startMinute);
    let endMinute = Math.max(draft.startMinute, state.startMinute);
    if (endMinute === startMinute) endMinute = clamp(startMinute + 30, range.start + 15, range.end);
    const selection = {
      startIndex,
      endIndex,
      startMinute,
      endMinute: clamp(Math.max(startMinute + 15, endMinute), range.start + 15, range.end),
      columns: state.columns
    };
    clearBlockTapCreateDraft();
    createTasksFromBlockSelection(selection);
    return true;
  }

  function clearBlockTapCreateDraft() {
    if (!blockTapCreateState) return;
    clearBlockCreatePreview(blockTapCreateState);
    blockTapCreateState = null;
  }

  function createTasksFromBlockSelection(selection) {
    const start = timeFromBlockMinute(selection.startMinute);
    const end = timeFromBlockMinute(selection.endMinute);
    if (selection.endIndex > selection.startIndex) {
      const dates = [];
      for (let index = selection.startIndex; index <= selection.endIndex; index += 1) {
        const date = selection.columns[index]?.dataset.date;
        if (date) dates.push(date);
      }
      if (!dates.length) return;
      const writeKey = `block-direct:habit:${dates.join(",")}:${start}:${end}`;
      if (shouldSkipRecentWrite(writeKey, 5000)) {
        showToast("That habit block was already saved.", "danger");
        return;
      }
      const days = dates.map((date) => parseLocalDate(date).getDay());
      data.habits.unshift({
        id: id("habit"),
        title: "New habit block",
        description: "",
        type: "Personal",
        schedule: "Weekly",
        days: Array.from(new Set(days)),
        startDate: dates[0],
        endDate: "",
        start,
        end,
        priority: "Medium",
        status: "Active",
        includeHours: true,
        targetCount: 1,
        addressId: null,
        color: taskCategoryColor("Habit"),
        completions: []
      });
      saveData();
      showToast("Habit created from block selection.");
      return;
    }
    const created = [];
    for (let index = selection.startIndex; index <= selection.endIndex; index += 1) {
      const column = selection.columns[index];
      const date = column.dataset.date;
      const writeKey = `block-direct:task:${date}:${start}:${end}`;
      if (shouldSkipRecentWrite(writeKey, 5000)) {
        showToast("That timed task was already saved.", "danger");
        continue;
      }
      created.push({
        id: id("task"),
        title: selection.endIndex > selection.startIndex ? "New habit block" : "New timed task",
        description: "",
        date,
        endDate: blockEndDateFor(date, selection.startMinute, selection.endMinute),
        start,
        end,
        priority: "Medium",
        status: "Not Started",
        repeat: "None",
        category: selection.endIndex > selection.startIndex ? "Habit" : "General",
        bgColor: defaultTaskBgColor(),
        fontFamily: "System",
        includeHours: true,
        projectId: null,
        billId: null,
        goalId: null,
        contactId: null,
        addressId: null,
        tags: selection.endIndex > selection.startIndex ? ["habit"] : []
      });
    }
    data.tasks.unshift(...created);
    saveData();
    showToast(created.length === 1 ? "Timed task created." : `${created.length} habit blocks created.`);
  }

  function startBlockRepeatDrag(event, block, task, column) {
    event.preventDefault();
    event.stopPropagation();
    block.setPointerCapture?.(event.pointerId);
    const calendar = column.closest(".block-calendar");
    const columns = Array.from(calendar?.querySelectorAll(".block-col") || []);
    const startIndex = columns.indexOf(column);
    if (startIndex < 0) return;
    const eventWindow = blockEventWindow(task, blockFocusRange());
    blockRepeatState = {
      taskId: task.id,
      block,
      columns,
      startIndex,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      colWidth: Math.max(1, column.getBoundingClientRect().width),
      originalStart: eventWindow.start,
      originalEnd: eventWindow.end,
      range: blockFocusRange(),
      previews: [],
      moved: false
    };
    block.classList.add("is-repeating");
    document.addEventListener("pointermove", moveBlockRepeatDrag);
    document.addEventListener("pointerup", endBlockRepeatDrag, { once: true });
    document.addEventListener("pointercancel", cancelBlockRepeatDrag, { once: true });
  }

  function moveBlockRepeatDrag(event) {
    if (!blockRepeatState) return;
    const state = blockRepeatState;
    const selection = blockRepeatSelection(event, state);
    state.moved = state.moved || selection.endIndex !== state.startIndex || Math.abs(event.clientY - state.startY) > 4;
    renderBlockRepeatPreview(state, selection);
  }

  function endBlockRepeatDrag(event) {
    document.removeEventListener("pointermove", moveBlockRepeatDrag);
    if (!blockRepeatState) return;
    const state = blockRepeatState;
    const selection = blockRepeatSelection(event, state);
    clearBlockRepeatPreview(state);
    state.block.classList.remove("is-repeating");
    state.block.releasePointerCapture?.(state.pointerId);
    blockRepeatState = null;
    if (!state.moved) return;
    const dates = repeatDatesForSelection(selection, state.startIndex);
    if (dates.length) {
      createRepeatedTasksFromBlock(state.taskId, dates, selection.minuteDelta);
      return;
    }
    if (selection.minuteDelta) shiftCalendarItemFromHandle(state.taskId, selection.minuteDelta);
  }

  function cancelBlockRepeatDrag() {
    document.removeEventListener("pointermove", moveBlockRepeatDrag);
    if (!blockRepeatState) return;
    clearBlockRepeatPreview(blockRepeatState);
    blockRepeatState.block.classList.remove("is-repeating");
    blockRepeatState.block.releasePointerCapture?.(blockRepeatState.pointerId);
    blockRepeatState = null;
  }

  function blockRepeatSelection(event, state) {
    const rawIndex = state.startIndex + Math.round((event.clientX - state.startX) / state.colWidth);
    const endIndex = clamp(rawIndex, 0, state.columns.length - 1);
    return { columns: state.columns, endIndex, minuteDelta: blockMinuteDelta(event.clientY - state.startY) };
  }

  function renderBlockRepeatPreview(state, selection) {
    clearBlockRepeatPreview(state);
    const task = findCalendarItemById(state.taskId);
    if (!task) return;
    const step = selection.endIndex < state.startIndex ? -1 : 1;
    const window = shiftedBlockWindow(state, selection.minuteDelta);
    if (selection.endIndex === state.startIndex && selection.minuteDelta) {
      const preview = blockRepeatPreviewElement(task, window);
      preview.classList.add("source-preview");
      selection.columns[state.startIndex].appendChild(preview);
      state.previews.push(preview);
      return;
    }
    for (let index = state.startIndex + step; step > 0 ? index <= selection.endIndex : index >= selection.endIndex; index += step) {
      const preview = blockRepeatPreviewElement(task, window);
      selection.columns[index].appendChild(preview);
      state.previews.push(preview);
    }
  }

  function shiftedBlockWindow(state, minuteDelta = 0) {
    const range = state.range || blockFocusRange();
    const duration = Math.max(15, state.originalEnd - state.originalStart || 60);
    const start = clamp(state.originalStart + minuteDelta, range.start, range.end - duration);
    return { start, end: start + duration };
  }

  function blockRepeatPreviewElement(task, window) {
    const preview = document.createElement("div");
    preview.className = "block-repeat-preview";
    preview.style.top = `${blockMinuteToPixel(window.start)}px`;
    preview.style.height = `${Math.max(24, (window.end - window.start) * blockMinuteScale())}px`;
    preview.style.setProperty("--event-bg", blockTaskColor(task));
    preview.innerHTML = `<strong>${esc(task.title)}</strong><span>${timeLabel(timeFromBlockMinute(window.start))} - ${timeLabel(timeFromBlockMinute(window.end))}</span>`;
    return preview;
  }

  function clearBlockRepeatPreview(state) {
    state.previews.forEach((preview) => preview.remove());
    state.previews = [];
  }

  function repeatDatesForSelection(selection, startIndex) {
    const dates = [];
    const step = selection.endIndex < startIndex ? -1 : 1;
    for (let index = startIndex + step; step > 0 ? index <= selection.endIndex : index >= selection.endIndex; index += step) {
      const date = selection.columns[index]?.dataset.date;
      if (date) dates.push(date);
    }
    return dates;
  }

  function createRepeatedTasksFromBlock(taskId, dates, minuteDelta = 0) {
    const source = findCalendarItemById(taskId);
    if (!source || !dates.length) return;
    const copies = repeatedTaskCopies(source, dates, minuteDelta);
    data.tasks.unshift(...copies);
    saveData();
    render();
    showToast(`${copies.length} ${copies.length === 1 ? "task copy" : "task copies"} created.`);
  }

  function repeatedTaskCopies(source, dates, minuteDelta = 0) {
    const span = dateSpanDays(source.date, taskEndDate(source));
    const range = blockFocusRange();
    const sourceWindow = source.start && source.end ? blockEventWindow(source, range) : null;
    const start = sourceWindow ? sourceWindow.start : 9 * 60;
    const end = sourceWindow ? sourceWindow.end : start + 60;
    const duration = Math.max(15, end - start || 60);
    const shiftedStart = clamp(start + minuteDelta, range.start, range.end - duration);
    const shiftedEnd = shiftedStart + duration;
    return dates.map((date) => taskCopyFromCalendarItem(source, {
      date,
      endDate: shiftedStart < 24 * 60 && shiftedEnd >= 24 * 60 ? addDaysIso(date, 1) : addDaysIso(date, span),
      start: timeFromBlockMinute(shiftedStart),
      end: timeFromBlockMinute(shiftedEnd)
    }));
  }

  function shiftCalendarItemFromHandle(taskId, minuteDelta) {
    const item = findCalendarItemById(taskId);
    if (!item || !minuteDelta) return;
    const range = blockFocusRange();
    const sourceWindow = item.start && item.end ? blockEventWindow(item, range) : null;
    const start = sourceWindow ? sourceWindow.start : 9 * 60;
    const end = sourceWindow ? sourceWindow.end : start + 60;
    const duration = Math.max(15, end - start || 60);
    const shiftedStart = clamp(start + minuteDelta, range.start, range.end - duration);
    updateCalendarItemSchedule(item, {
      start: timeFromBlockMinute(shiftedStart),
      end: timeFromBlockMinute(shiftedStart + duration),
      endDate: blockEndDateFor(item.date, shiftedStart, shiftedStart + duration)
    });
    saveData();
    render();
    showToast(item.isHabit ? "Habit time shifted." : "Task time shifted.");
  }

  function taskCopyFromCalendarItem(source, overrides = {}) {
    const copy = clone(source);
    delete copy.isHabit;
    delete copy.habitId;
    delete copy.color;
    return {
      ...copy,
      id: id("task"),
      status: "Not Started",
      category: source.isHabit ? "Habit" : taskCategory(source),
      tags: Array.from(new Set([...(source.tags || []), ...(source.isHabit ? ["habit"] : [])])),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  function skipHabitOccurrence(habit, iso) {
    if (!habit || !iso) return false;
    habit.skippedDates = Array.from(new Set([...(habit.skippedDates || []), iso])).sort();
    habit.completions = Array.isArray(habit.completions) ? habit.completions.filter((date) => date !== iso) : [];
    return true;
  }

  function detachHabitOccurrenceToTask(itemOrId, overrides = {}) {
    const item = typeof itemOrId === "string" ? findCalendarItemById(itemOrId) : itemOrId;
    const parsed = parseHabitInstanceId(item?.id);
    if (!item?.isHabit || !parsed) return null;
    const habit = data.habits.find((entry) => entry.id === parsed.habitId);
    if (!habit) return null;
    const task = taskCopyFromCalendarItem(item, {
      title: item.title,
      date: item.date,
      endDate: taskEndDate(item),
      repeat: "None",
      status: item.status || "Not Started",
      ...overrides
    });
    skipHabitOccurrence(habit, parsed.date);
    data.tasks.unshift(task);
    ui.selectedTasks = ui.selectedTasks.map((idValue) => idValue === item.id ? task.id : idValue);
    return task;
  }

  function deleteHabitOccurrence(taskId) {
    const parsed = parseHabitInstanceId(taskId);
    if (!parsed) return false;
    const habit = data.habits.find((item) => item.id === parsed.habitId);
    if (!habit) return false;
    skipHabitOccurrence(habit, parsed.date);
    ui.selectedTasks = ui.selectedTasks.filter((idValue) => idValue !== taskId);
    ui.modal = null;
    saveData();
    render();
    showToast("This habit occurrence was deleted. The rest of the habit stays.");
    return true;
  }

  function updateCalendarItemSchedule(item, updates) {
    if (!item) return;
    if (item.isHabit) {
      const nextUpdates = { ...updates };
      if (updates.date !== undefined && updates.endDate === undefined) {
        nextUpdates.endDate = addDaysIso(updates.date, dateSpanDays(item.date, taskEndDate(item)));
      }
      detachHabitOccurrenceToTask(item, nextUpdates);
      return;
    }
    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  }

  function dateSpanDays(startIso, endIso) {
    const start = parseLocalDate(startIso);
    const end = parseLocalDate(endIso || startIso);
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  function moveBlockDrag(event) {
    if (!blockDragState) return;
    const state = blockDragState;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const dayDelta = Math.round(dx / Math.max(1, state.colWidth));
    const minuteDelta = blockMinuteDelta(dy);
    const range = state.range || blockFocusRange();
    state.moved = state.moved || Math.abs(dx) > blockHoldMoveTolerance || Math.abs(dy) > blockHoldMoveTolerance;
    if (state.moved) clearBlockHoldTimer(state);
    if (state.mode === "top") {
      const newStart = clamp(state.originalStart + minuteDelta, range.start, state.originalEnd - 15);
      state.block.style.top = `${blockMinuteToPixel(newStart)}px`;
      state.block.style.height = `${Math.max(34, (state.originalEnd - newStart) * blockMinuteScale())}px`;
      return;
    }
    if (state.mode === "bottom") {
      const newEnd = clamp(state.originalEnd + minuteDelta, state.originalStart + 15, range.end);
      state.block.style.height = `${Math.max(34, (newEnd - state.originalStart) * blockMinuteScale())}px`;
      return;
    }
    state.block.style.transform = `translate(${dayDelta * state.colWidth}px, ${minuteDelta * blockMinuteScale()}px)`;
  }

  function endBlockDrag(event) {
    document.removeEventListener("pointermove", moveBlockDrag);
    if (!blockDragState) return;
    const state = blockDragState;
    clearBlockHoldTimer(state);
    const task = findCalendarItemById(state.taskId);
    state.block.classList.remove("is-dragging");
    state.block.style.transform = "";
    if (!task) {
      blockDragState = null;
      return;
    }
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const dayDelta = Math.round(dx / Math.max(1, state.colWidth));
    const minuteDelta = blockMinuteDelta(dy);
    const range = state.range || blockFocusRange();
    if (!state.moved) {
      if (state.mode === "bottom") openModal("blockStatus", state.taskId);
      blockDragState = null;
      return;
    }
    if (state.mode === "top") {
      const newStart = clamp(state.originalStart + minuteDelta, range.start, state.originalEnd - 15);
      updateCalendarItemSchedule(task, { start: timeFromBlockMinute(newStart), endDate: blockEndDateFor(task.date, newStart, state.originalEnd) });
    } else if (state.mode === "bottom") {
      const newEnd = clamp(state.originalEnd + minuteDelta, state.originalStart + 15, range.end);
      updateCalendarItemSchedule(task, { end: timeFromBlockMinute(newEnd), endDate: blockEndDateFor(task.date, state.originalStart, newEnd) });
    } else {
      const duration = state.originalEnd - state.originalStart;
      const newStart = clamp(state.originalStart + minuteDelta, range.start, range.end - duration);
      const newEnd = newStart + duration;
      const nextDate = addDaysIso(state.originalDate, dayDelta);
      updateCalendarItemSchedule(task, { start: timeFromBlockMinute(newStart), end: timeFromBlockMinute(newEnd), date: nextDate, endDate: blockEndDateFor(nextDate, newStart, newEnd) });
    }
    saveData();
    blockDragState = null;
    render();
    showToast(task.isHabit ? "Habit occurrence updated." : "Task time updated.");
  }

  function cancelBlockDrag() {
    document.removeEventListener("pointermove", moveBlockDrag);
    if (blockDragState) {
      clearBlockHoldTimer(blockDragState);
      blockDragState.block.classList.remove("is-dragging");
      blockDragState.block.style.transform = "";
      blockDragState = null;
    }
  }

  function snapMinutes(pixelDelta) {
    return Math.round(pixelDelta / 15) * 15;
  }

  function snapGridMinute(rawMinute) {
    const range = blockFocusRange();
    return clamp(Math.round(rawMinute / 15) * 15, range.start, range.end);
  }

  function snapGridMinuteCeil(rawMinute) {
    const range = blockFocusRange();
    return clamp(Math.ceil(rawMinute / 15) * 15, range.start, range.end - 15);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function timeFromMinutes(totalMinutes) {
    const normalized = clamp(Math.round(totalMinutes), 0, 23 * 60 + 59);
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function timeFromBlockMinute(totalMinutes) {
    const day = 24 * 60;
    const normalized = ((Math.round(totalMinutes) % day) + day) % day;
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function drawAnalyticsChart(canvas) {
    const ctx = canvas.getContext("2d");
    const type = canvas.dataset.type;
    const chart = canvas.dataset.chart;
    if (type === "compare") return drawIncomeExpenseChart(ctx, canvas, chart);
    const rows = categoryBreakdown(reportableTransactions(type));
    const colors = ["#00bcd4", "#4caf50", "#2196f3", "#ff6b6b", "#ffc107", "#6c63ff"];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!rows.length) return;
    if (chart === "bar") {
      const max = Math.max(...rows.map((row) => row.actual), 1);
      const barW = Math.max(28, (canvas.width - 60) / rows.length - 12);
      rows.forEach((row, index) => {
        const h = (row.actual / max) * 210;
        const x = 40 + index * (barW + 12);
        const y = 250 - h;
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barW, h);
        ctx.fillStyle = "#82919a";
        ctx.font = "13px sans-serif";
        ctx.fillText(row.name.slice(0, 8), x, 280);
      });
      return;
    }
    const total = sum(rows, "actual");
    let start = -Math.PI / 2;
    rows.forEach((row, index) => {
      const angle = (row.actual / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(210, 138);
      ctx.arc(210, 138, 110, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      start += angle;
    });
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(210, 138, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  function drawIncomeExpenseChart(ctx, canvas, chart) {
    const totals = incomeExpenseTotals();
    const rows = [
      { name: "Income", actual: totals.incomeActual, color: "#25a95d" },
      { name: "Expenses", actual: totals.expenseActual, color: "#ff3b30" }
    ];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (chart === "bar") {
      const max = Math.max(...rows.map((row) => row.actual), 1);
      rows.forEach((row, index) => {
        const h = (row.actual / max) * 200;
        const barW = 92;
        const x = 105 + index * 130;
        const y = 245 - h;
        ctx.fillStyle = row.color;
        ctx.fillRect(x, y, barW, h);
        ctx.fillStyle = "#10233d";
        ctx.font = "700 13px sans-serif";
        ctx.fillText(row.name, x, 272);
        ctx.fillStyle = "#617386";
        ctx.font = "12px sans-serif";
        ctx.fillText(money(row.actual), x, Math.max(22, y - 8));
      });
      return;
    }
    const total = rows.reduce((sumValue, row) => sumValue + row.actual, 0);
    if (!total) return;
    let start = -Math.PI / 2;
    rows.forEach((row) => {
      const angle = (row.actual / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(210, 138);
      ctx.arc(210, 138, 110, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = row.color;
      ctx.fill();
      start += angle;
    });
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(210, 138, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  function guardBlockDrawTouch(event) {
    if (!ui.blockDrawMode || ui.view !== "calendar" || !isBlockLikeCalendarView()) return;
    const target = event.target;
    if (!target?.closest?.(".block-calendar")) return;
    if (target.closest(".event-block")) return;
    event.preventDefault();
  }

  document.addEventListener("touchstart", guardBlockDrawTouch, { passive: false });
  document.addEventListener("touchmove", guardBlockDrawTouch, { passive: false });

  function handleDateZoneTouch(event) {
    const zone = event.target.closest?.(".date-zone[data-action='set-calendar-date-view']");
    if (!zone) return;
    event.preventDefault();
    event.stopPropagation();
    setCalendarDateView(zone.dataset.date, zone.dataset.view);
  }

  document.addEventListener("touchend", handleDateZoneTouch, { passive: false });

  document.addEventListener("pointerdown", (event) => {
    const active = document.activeElement;
    if (active?.matches?.("select") && !event.target.closest?.("select")) {
      suppressCardEditUntil = Date.now() + 350;
    }
  }, true);

  document.addEventListener("click", (event) => {
    const sheet = event.target.closest("[data-sheet]");
    const actionEl = event.target.closest("[data-action]");
    const copyTargetEl = event.target.closest("[data-copy-target-date]");
    const projectSelectCard = event.target.closest(".project-task-mini[data-project-task-id]");
    if (projectSelectCard && actionEl?.dataset.action !== "toggle-task-select" && (ui.projectDragSelectMode || Date.now() < suppressCardEditUntil)) {
      event.preventDefault();
      return;
    }
    if (!actionEl && copyTargetEl && ui.view === "calendar" && ui.calendarView === "day" && ui.selectedTasks.length) {
      const targetDate = copyTargetEl.dataset.copyTargetDate;
      if (targetDate && targetDate !== ui.selectedDate) {
        event.preventDefault();
        ui.dayCopyTargetDate = targetDate;
        render();
        showToast(`Copy target set to ${shortDate(targetDate)}.`);
        return;
      }
    }
    if (!actionEl) {
      if (ui.taskPicker) {
        ui.taskPicker = null;
        render();
        suppressCardEditUntil = Date.now() + 350;
        return;
      }
      if (Date.now() < suppressCardEditUntil) return;
      const habitCardEl = event.target.closest(".habit-card[data-habit-id]");
      if (habitCardEl && !event.target.closest("button,input,select,textarea,a")) {
        ui.modal = { type: "editHabit", id: habitCardEl.dataset.habitId };
        render();
      }
      return;
    }
    const action = actionEl.dataset.action;
    if (action === "habit-inline") return;
    if (action === "note-inline") return;
    if (action === "image-upload") return;
    if (action === "close-modal" && sheet && actionEl.classList.contains("sheet-backdrop")) return;
    event.preventDefault();
    if (singleSubmitActions.has(action)) {
      const actionKey = singleSubmitKey(actionEl);
      if (pendingActions.has(actionKey)) return;
      pendingActions.add(actionKey);
      lockSubmitAction(actionEl);
      Promise.resolve(handleAction(actionEl))
        .catch((error) => {
          console.error(error);
          showToast("That action could not be completed.", "danger");
        })
        .finally(() => {
          setTimeout(() => pendingActions.delete(actionKey), 1400);
        });
      return;
    }
    handleAction(actionEl);
  });

  document.addEventListener("dblclick", (event) => {
    const dateEl = event.target.closest("[data-double-date]");
    if (!dateEl) return;
    event.preventDefault();
    ui.selectedDate = dateEl.dataset.doubleDate;
    ui.calendarView = "day";
    ui.selectedTasks = [];
    ui.dayCopyTargetDate = null;
    render();
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target && target.dataset.action === "bill-search") {
      ui.billQuery = target.value;
      renderPreservingInput(target);
    }
    if (target && target.dataset.action === "notes-search") {
      ui.notesQuery = target.value;
      renderPreservingInput(target);
    }
    if (target && target.dataset.action === "notebook-search") {
      ui.notebookQuery = target.value;
      renderPreservingInput(target);
    }
    if (target && target.dataset.action === "contact-search") {
      ui.contactQuery = target.value;
      renderPreservingInput(target);
    }
    if (target && target.dataset.action === "loan-search") {
      ui.loanQuery = target.value;
      renderPreservingInput(target);
    }
    if (target && target.dataset.action === "loan-contact-search") {
      ui.loanContactQuery = target.value;
      syncLoanContactCombo(target);
    }
    if (target && target.dataset.calendarDayColor !== undefined) {
      setCalendarDayColor(target.dataset.calendarDayColor, target.value, { live: true, quiet: true });
      return;
    }
    if (target && target.dataset.action === "notify-search") {
      filterNotifyPicker(target.value);
    }
    if (target && target.id === "taskNotifyRecipient") {
      updateTaskNotifyPreview();
    }
    if (target && target.id === "forgiveAmount" && ui.modal?.type === "forgiveLoan") {
      const loan = data.loans.find((item) => item.id === ui.modal.id);
      const preview = document.getElementById("forgivePreviewRemaining");
      if (loan && preview) {
        const remaining = Math.max(0, loanRemaining(loan) - parseMoneyInput(target.value));
        preview.textContent = money(remaining);
      }
    }
    if (target && target.id === "aiInput") ui.aiDraft = target.value;
    if (target && target.id === "voiceTranscript") {
      ui.voiceTranscript = target.value;
      ui.voiceParsedTask = null;
      ui.voiceCorrectionDraft = "";
      ui.voiceError = "";
    }
    if (target && target.id === "voiceCorrection") {
      ui.voiceCorrectionDraft = target.value;
    }
    if (target && target.id === "habitVoiceTranscript") {
      ui.habitVoiceTranscript = target.value;
      ui.habitVoiceParsedHabit = null;
      ui.habitVoiceError = "";
    }
    if (target && target.dataset.action === "habit-inline" && target.type === "time") {
      saveHabitInline(target, { render: false, toast: false, requireTimeValue: true });
      return;
    }
    if (target && target.dataset.action === "image-url") {
      const hidden = document.getElementById(target.dataset.target);
      const preview = document.getElementById(target.dataset.preview);
      if (hidden && target.value.trim()) hidden.value = "";
      updateImagePreview(preview, target.value);
    }
    if (target && target.dataset.action === "image-zoom") {
      const preview = document.getElementById(target.dataset.preview);
      if (preview) preview.style.setProperty("--media-zoom", imageZoom(target.value));
    }
    if (target && target.dataset.action === "image-opacity") {
      const preview = document.getElementById(target.dataset.preview);
      if (preview) preview.style.setProperty("--media-opacity", imageOpacity(target.value));
    }
    if (target && target.dataset.action === "image-pan") {
      const preview = document.getElementById(target.dataset.preview);
      if (preview) preview.style.setProperty(target.dataset.axis === "y" ? "--media-y" : "--media-x", `${imagePan(target.value)}%`);
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target && target.dataset.calendarDayColor !== undefined) {
      setCalendarDayColor(target.dataset.calendarDayColor, target.value, { quiet: true });
      return;
    }
    if (target && target.id === "taskSortSelect") {
      ui.taskSort = target.value || "newest";
      render();
      return;
    }
    if (target && target.id === "taskStart") focusPairedEndTime("taskStart", "taskEnd", 60);
    if (target && target.id === "habitStart") focusPairedEndTime("habitStart", "habitEnd", 30);
    if (target && target.id === "taskAddress") toggleTaskAddressPanel(target.value === ADD_TASK_ADDRESS_VALUE);
    if (target && target.id === "taskCategory") toggleTaskCategoryPanel(target.value === ADD_TASK_CATEGORY_VALUE);
    if (target && target.id === "txCategory") toggleTransactionCategoryPanel(target.value === ADD_TRANSACTION_CATEGORY_VALUE);
    if (target && target.id === "habitAddress") toggleHabitAddressPanel(target.value === ADD_TASK_ADDRESS_VALUE);
    if (target && target.id === "contactAddress") toggleContactAddressPanel(target.value === ADD_TASK_ADDRESS_VALUE);
    if (target && target.dataset.action === "habit-inline") {
      if (target.type === "time") saveHabitInline(target, { render: false, toast: false, requireTimeValue: true });
      else saveHabitInline(target);
    }
    if (target && target.dataset.action === "image-upload") handleImageUpload(target);
    if (target && target.classList?.contains("contactGroupChoice")) {
      target.closest(".contact-group-pick")?.classList.toggle("active", target.checked);
    }
    if (target && (target.classList?.contains("taskNotifyChannel") || target.classList?.contains("taskNotifyStatus") || target.id === "taskNotifyAnyStatus" || String(target.id || "").startsWith("notifyContact_"))) {
      if (target.id === "taskNotifyAnyStatus" && target.checked) {
        document.querySelectorAll(".taskNotifyStatus").forEach((input) => {
          input.checked = false;
        });
      }
      if (target.classList?.contains("taskNotifyStatus") && target.checked) {
        const anyStatus = document.getElementById("taskNotifyAnyStatus");
        if (anyStatus) anyStatus.checked = false;
      }
      updateTaskNotifyPreview();
    }
  });

  function focusPairedEndTime(startId, endId, defaultMinutes) {
    const startEl = document.getElementById(startId);
    const endEl = document.getElementById(endId);
    if (!startEl || !endEl || !startEl.value) return;
    const startValue = minutes(startEl.value);
    const endValue = minutes(endEl.value);
    if (!endEl.value || endValue <= startValue) {
      endEl.value = timeFromMinutes(startValue + defaultMinutes);
    }
    window.setTimeout(() => {
      endEl.focus({ preventScroll: false });
      if (typeof endEl.showPicker === "function") {
        try {
          endEl.showPicker();
        } catch (error) {
          // Some mobile browsers only allow showPicker directly in the tap handler.
        }
      }
    }, 120);
  }

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target && target.id === "noteSubject") {
      handleModalNoteSubjectChange(target);
    }
    if (target && target.id === "noteNotebook") {
      const panel = document.getElementById("noteNotebookNewWrap");
      if (panel) panel.hidden = target.value !== ADD_NOTEBOOK_VALUE;
      if (target.value === ADD_NOTEBOOK_VALUE) document.getElementById("noteNewNotebookTitle")?.focus();
      refreshModalNoteSubjectOptions();
    }
    if (target && target.id === "bulkNoteNotebook") {
      const panel = document.getElementById("bulkNoteNotebookNewWrap");
      if (panel) panel.hidden = target.value !== ADD_NOTEBOOK_VALUE;
      if (target.value === ADD_NOTEBOOK_VALUE) document.getElementById("bulkNoteNewNotebookTitle")?.focus();
    }
    if (target && target.dataset.action === "note-inline") {
      updateNoteInline(target.dataset.id, target.dataset.field, target.value);
      return;
    }
    if (target && target.id === "notesSubjectFilter") {
      ui.notesSubjectFilter = target.value || "all";
      ui.selectedNotes = [];
      render();
    }
    if (target && target.id === "loanContact") {
      const panel = document.getElementById("loanNewContactPanel");
      if (panel) panel.hidden = target.value !== ADD_LOAN_CONTACT_VALUE;
      if (target.value === ADD_LOAN_CONTACT_VALUE) {
        document.getElementById("loanBorrower")?.focus();
        return;
      }
      const contact = data.contacts.find((item) => item.id === target.value);
      if (!contact) return;
      const borrowerEl = document.getElementById("loanBorrower");
      const phoneEl = document.getElementById("loanPhone");
      const emailEl = document.getElementById("loanEmail");
      if (borrowerEl) borrowerEl.value = contact.name || "";
      if (phoneEl) phoneEl.value = contact.phone || "";
      if (emailEl) emailEl.value = contact.email || "";
    }
  });

  document.addEventListener("keydown", (event) => {
    const cardActionEl = event.target.closest?.(".note-card[data-action='open-modal'], .unassigned-note-mini[data-action='open-modal'], .notebook-tile[data-action='navigate-notes']");
    if (cardActionEl && (event.key === "Enter" || event.key === " ") && !event.target.closest("button,input,select,textarea,a")) {
      event.preventDefault();
      return handleAction(cardActionEl);
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "t") {
      event.preventDefault();
      const input = document.getElementById("quickTaskInput");
      if (input) input.focus();
    }
    if (event.key === "Enter" && event.target?.id === "aiInput") {
      event.preventDefault();
      return sendAi(event.target.value);
    }
    if (event.key === "Escape" && ui.modal) {
      ui.modal = null;
      render();
    }
  });

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("hashchange", () => {
      const next = getHashView();
      if (next && next !== ui.view) {
        ui.view = next;
        ui.modal = null;
        render();
      }
    });
    window.addEventListener("focus", () => {
      resumeCloudAutoSyncNow(350);
    });
    window.addEventListener("online", () => {
      if (cloudAutoSyncEnabled()) {
        setCloudSyncState("checking", "Back online. BillMaster is catching this device up with the cloud.", { checked: true });
        saveData({ undo: false, cloudSync: false, syncStamp: false });
        resumeCloudAutoSyncNow(350);
      }
    });
    window.addEventListener("offline", () => {
      if (cloudAutoSyncEnabled()) {
        setCloudSyncState(cloudHasLocalUnsyncedChanges ? "queued" : "checked", cloudOfflineMessage(), { queued: cloudHasLocalUnsyncedChanges, checked: !cloudHasLocalUnsyncedChanges });
        saveData({ undo: false, cloudSync: false, syncStamp: false });
        if (ui.view === "sync") render();
      }
    });
  }

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") resumeCloudAutoSyncNow(350);
    });
  }

  function singleSubmitKey(el) {
    return [
      el.dataset.action || "",
      el.dataset.id || "",
      el.dataset.mode || "",
      el.dataset.status || "",
      el.dataset.account || "",
      el.dataset.priority || "",
      el.dataset.date || "",
      ui.modal ? ui.modal.type : "",
      ui.modal ? ui.modal.id : "",
      ui.view
    ].join("|");
  }

  function lockSubmitAction(el) {
    if (typeof HTMLButtonElement !== "undefined" && el instanceof HTMLButtonElement) el.disabled = true;
    else if (el.tagName === "BUTTON") el.disabled = true;
    el.setAttribute("aria-busy", "true");
    el.classList.add("is-submitting");
  }

  function handleAction(el) {
    const action = el.dataset.action;
    if (action === "navigate-root") return navigate(el.dataset.view, true);
    if (action === "navigate") return navigate(el.dataset.view);
    if (action === "back") return back();
    if (action === "undo-last-change") return undoLastChange();
    if (action === "reload-app") return render();
    if (action === "calendar-nav") return moveCalendar(Number(el.dataset.direction || 1));
    if (action === "go-calendar-today") return goCalendarToday(el.dataset.view);
    if (action === "open-day") return openCalendarDay(el.dataset.date);
    if (action === "open-modal") return openModal(el.dataset.modal, el.dataset.id, el.dataset.returnModal, el.dataset.returnId);
    if (action === "close-modal") return closeModal();
    if (action === "set-tab") {
      ui[el.dataset.key] = el.dataset.value;
      return render();
    }
    if (action === "toggle-nav-section") return toggleNavSection(el.dataset.section);
    if (action === "toggle-interface-mode") return toggleInterfaceMode();
    if (action === "toggle-task-category") return toggleTaskCategory(el.dataset.category);
    if (action === "toggle-calendar-colors") {
      ui.calendarColorsOpen = !ui.calendarColorsOpen;
      return render();
    }
    if (action === "set-calendar-palette") return setCalendarPalette(el.dataset.palette);
    if (action === "reset-calendar-day-colors") return resetCalendarDayColors();
    if (action === "set-calendar-date-view") return setCalendarDateView(el.dataset.date, el.dataset.view);
    if (action === "pick-choice") return pickChoice(el);
    if (action === "image-fit") return setImageFit(el);
    if (action === "show-task-category-panel") return showTaskCategoryPanel();
    if (action === "quick-add-task") return quickAddTask();
    if (action === "quick-ask-ai") return askAiFromCalendarQuickAdd();
    if (action === "start-voice-task") return startVoiceTask();
    if (action === "stop-voice-task") return stopVoiceTask();
    if (action === "parse-voice-task") return parseVoiceTaskFromInput();
    if (action === "ask-ai-from-voice") return askAiFromVoiceTask();
    if (action === "start-voice-correction") return startVoiceCorrection();
    if (action === "stop-voice-correction") return stopVoiceCorrection();
    if (action === "apply-voice-correction") return applyVoiceCorrection();
    if (action === "save-voice-task") return saveVoiceTask();
    if (action === "start-voice-habit") return startVoiceHabit();
    if (action === "stop-voice-habit") return stopVoiceHabit();
    if (action === "parse-voice-habit") return parseVoiceHabitFromInput();
    if (action === "save-voice-habit") return saveVoiceHabit();
    if (action === "apply-habit-template") return applyHabitTemplate(Number(el.dataset.slot || 1));
    if (action === "save-habit-template-slot") return saveHabitTemplateSlot(el.dataset.id, Number(el.dataset.slot || 1));
    if (action === "skip-habit-template") return closeModal();
    if (action === "dismiss-alert") return el.closest(".alert-panel")?.remove();
    if (action === "pay-bill") return payBill(el.dataset.id);
    if (action === "delete-bill") return deleteBill(el.dataset.id);
    if (action === "save-bill") return saveBill(el.dataset.id);
    if (action === "delete-transaction") return deleteTransaction(el.dataset.id);
    if (action === "save-transaction") return saveTransaction(el.dataset.id);
    if (action === "save-sub-amount") return saveSubscriptionAmount(el.dataset.id, el.dataset.mode);
    if (action === "reset-projected") return resetProjected(el.dataset.id);
    if (action === "pay-subscription") return paySubscription(el.dataset.id, el.dataset.account);
    if (action === "delete-subscription") return deleteSubscription(el.dataset.id);
    if (action === "cancel-subscription") return setSubscriptionStatus(el.dataset.id, "Cancelled");
    if (action === "set-sub-status") return setSubscriptionStatus(el.dataset.id, el.dataset.status);
    if (action === "save-loan") return saveLoan(el.dataset.id);
    if (action === "pick-loan-contact") return pickLoanContact(el.dataset.id || "");
    if (action === "save-repayment") return saveRepayment(el.dataset.id);
    if (action === "save-forgiveness") return saveForgiveness(el.dataset.id);
    if (action === "forgive-loan") return forgiveLoan(el.dataset.id);
    if (action === "mark-loan-done") return markLoanDone(el.dataset.id);
    if (action === "restore-loan") return restoreLoan(el.dataset.id);
    if (action === "open-loan-alert") return openLoanAlert(el.dataset.id);
    if (action === "delete-loan") return deleteLoan(el.dataset.id);
    if (action === "save-address") return saveAddress(el.dataset.id);
    if (action === "delete-address") return deleteAddress(el.dataset.id);
    if (action === "open-maps") return openMaps(el.dataset.id);
    if (action === "verify-address-online") return verifyAddressOnline(el.dataset.id);
    if (action === "mark-address-verified") return markAddressVerified(el.dataset.id);
    if (action === "clear-address-verification") return clearAddressVerification(el.dataset.id);
    if (action === "toggle-address-select") return toggleAddressSelect(el.dataset.id);
    if (action === "clear-address-selection") return clearAddressSelection();
    if (action === "copy-route-link") return copyRouteLink();
    if (action === "open-block-quick-create") return openBlockQuickCreate();
    if (action === "save-task") return saveTask(el.dataset.id);
    if (action === "save-block-quick-task") return saveBlockQuickTask();
    if (action === "save-habit") return saveHabit(el.dataset.id);
    if (action === "save-habit-fresh-start") return saveHabitFreshStart(el.dataset.id);
    if (action === "edit-habit-instance") return editHabitInstance(el.dataset.id);
    if (action === "delete-habit") return deleteHabit(el.dataset.id);
    if (action === "delete-habit-series") return deleteHabitSeries(el.dataset.id);
    if (action === "toggle-habit-completion") return toggleHabitCompletion(el.dataset.id, el.dataset.date);
    if (action === "adjust-habit-end") return adjustHabitEnd(el.dataset.id, Number(el.dataset.delta || 0));
    if (action === "toggle-habit-select") return toggleHabitSelect(el.dataset.id);
    if (action === "select-visible-habits") return selectVisibleHabits();
    if (action === "clear-selected-habits") return clearSelectedHabits();
    if (action === "copy-habit") return copyHabit(el.dataset.id);
    if (action === "open-habit-calendar") return openHabitCalendar(el.dataset.id, el.dataset.view);
    if (action === "copy-selected-habits") return copySelectedHabits();
    if (action === "delete-selected-habits") return deleteSelectedHabits();
    if (action === "save-task-defaults") return saveTaskDefaults();
    if (action === "jump-calendar-date") return jumpCalendarDate();
    if (action === "jump-calendar-month") return jumpCalendarMonth();
    if (action === "delete-task") return deleteTask(el.dataset.id);
    if (action === "complete-task") return completeTask(el.dataset.id);
    if (action === "toggle-task-picker") return toggleTaskPicker(el.dataset.id, el.dataset.kind);
    if (action === "set-task-priority") return setTaskPriority(el.dataset.id, el.dataset.value);
    if (action === "set-task-status") return setTaskStatus(el.dataset.id, el.dataset.value);
    if (action === "toggle-subtask") return toggleSubtask(el.dataset.id, el.dataset.subtask);
    if (action === "toggle-block-draw-mode") return toggleBlockDrawMode();
    if (action === "toggle-block-select-mode") return toggleBlockSelectMode();
    if (action === "toggle-day-swap-mode") return toggleDaySwapMode();
    if (action === "start-block-multi-select") return startBlockMultiSelect(el.dataset.id);
    if (action === "select-visible-block-tasks") return selectVisibleBlockTasks();
    if (action === "select-day-copy-target") return selectDayCopyTarget(el.dataset.date);
    if (action === "select-all-day-tasks") return selectAllDayTasks();
    if (action === "deselect-all-day-tasks") return deselectAllDayTasks();
    if (action === "swap-selected-day-tasks") return swapSelectedDayTasks();
    if (action === "select-date") {
      const changed = ui.selectedDate !== el.dataset.date;
      ui.selectedDate = el.dataset.date;
      ui.calendarView = ui.calendarView === "month" ? "day" : ui.calendarView;
      if (changed) {
        ui.selectedTasks = [];
        ui.dayCopyTargetDate = null;
      }
      return render();
    }
    if (action === "toggle-task-select") return toggleTaskSelect(el.dataset.id);
    if (action === "toggle-project-drag-select") return toggleProjectDragSelectMode();
    if (action === "select-visible-project-tasks") return selectVisibleProjectTasks(el.dataset.projectId || "");
    if (action === "select-visible-tasks") return selectVisibleTasks();
    if (action === "toggle-select-mode") return openTaskActions();
    if (action === "duplicate-calendar-item") return duplicateCalendarItem(el.dataset.id);
    if (action === "save-quick-time") return saveQuickTime(el.dataset.id);
    if (action === "map-selected-tasks") return mapSelectedTasks();
    if (action === "copy-selected-task-route") return copySelectedTaskRoute();
    if (action === "map-selected-day-tasks") return openSelectedDayTaskRoute();
    if (action === "copy-selected-day-task-route") return copySelectedDayTaskRoute();
    if (action === "complete-selected-tasks") return completeSelectedTasks();
    if (action === "priority-selected") return prioritySelectedTasks(el.dataset.priority);
    if (action === "duplicate-selected-tasks") return duplicateSelectedTasks();
    if (action === "save-duplicate-selected-tasks") return duplicateSelectedTasks(Number(value("duplicateTaskCount") || 1));
    if (action === "copy-selected-tomorrow") return copySelectedTomorrow();
    if (action === "copy-selected-to-date") return copySelectedToDate();
    if (action === "copy-selected-to-day-target") return copySelectedToDayTarget();
    if (action === "open-task-alert") return openTaskAlert(el.dataset.id);
    if (action === "open-task-alert-gmail") return openTaskAlertGmail(el.dataset.id);
    if (action === "copy-task-alert") return copyTaskAlert(el.dataset.id);
    if (action === "send-next-notification") return sendNextNotification();
    if (action === "send-next-notification-gmail") return sendNextNotification("gmail");
    if (action === "send-notification") return sendNotificationNotice(el.dataset.id);
    if (action === "send-notification-gmail") return sendNotificationNotice(el.dataset.id, "gmail");
    if (action === "copy-notification") return copyNotificationNotice(el.dataset.id);
    if (action === "mark-notification-sent") return markNotificationSent(el.dataset.id);
    if (action === "copy-notification-outbox") return copyNotificationOutbox();
    if (action === "clear-sent-notifications") return clearSentNotifications();
    if (action === "toggle-notify-group") return toggleNotifyGroup(el.dataset.id, el);
    if (action === "set-notify-status-preset") return setNotifyStatusPreset(el.dataset.preset);
    if (action === "save-task-notify") return saveTaskNotify(el.dataset.id);
    if (action === "request-task-alert-permission") return requestTaskAlertPermission();
    if (action === "test-task-alert") return testTaskAlert();
    if (action === "set-contact-group-filter") return setContactGroupFilter(el.dataset.id);
    if (action === "open-task-route") return openSelectedTaskRoute();
    if (action === "copy-task-route-from-modal") return copyTaskRouteFromModal();
    if (action === "duplicate-block-horizontal") return duplicateBlockHorizontal(el.dataset.id);
    if (action === "duplicate-block-vertical") return duplicateBlockVertical(el.dataset.id);
    if (action === "save-block-duplicate-horizontal") return duplicateBlockHorizontal(el.dataset.id, integerValue("blockDuplicateCount", 1, 1, 24));
    if (action === "save-block-duplicate-vertical") return duplicateBlockVertical(el.dataset.id, integerValue("blockDuplicateCount", 1, 1, 24));
    if (action === "save-selected-duplicate-horizontal") return duplicateSelectedHorizontal(integerValue("selectedDuplicateCount", 1, 1, 24));
    if (action === "save-selected-duplicate-vertical") return duplicateSelectedVertical(integerValue("selectedDuplicateCount", 1, 1, 24));
    if (action === "save-task-project-assignment") return saveTaskProjectAssignment(el.dataset.id);
    if (action === "save-project-name") return saveProjectName(el.dataset.id);
    if (action === "open-project") {
      ui.projectId = el.dataset.id;
      return render();
    }
    if (action === "close-project") {
      ui.projectId = null;
      return render();
    }
    if (action === "open-project-note") return openProjectNote(el.dataset.id);
    if (action === "clear-selected-tasks") return clearSelectedTasks();
    if (action === "delete-selected-tasks") return deleteSelectedTasks();
    if (action === "navigate-notes") {
      ui.notebookId = el.dataset.id;
      return navigate("notes");
    }
    if (action === "save-note") return saveNote(el.dataset.id);
    if (action === "delete-note") return deleteNote(el.dataset.id);
    if (action === "toggle-note-select") return toggleNoteSelect(el.dataset.id);
    if (action === "select-visible-notes") return selectVisibleNotes();
    if (action === "select-visible-project-notes") return selectVisibleProjectNotes(el.dataset.projectId);
    if (action === "select-unassigned-notes") return selectUnassignedNotes();
    if (action === "clear-selected-notes") return clearSelectedNotes();
    if (action === "delete-selected-notes") return deleteSelectedNotes();
    if (action === "unassign-selected-project-notes") return unassignSelectedProjectNotes(el.dataset.projectId);
    if (action === "duplicate-notes") return duplicateNotes(el.dataset.id);
    if (action === "save-selected-note-subject") return saveSelectedNoteSubject();
    if (action === "save-selected-note-notebook") return saveSelectedNoteNotebook();
    if (action === "pick-note-color") {
      ui.noteColor = el.dataset.color;
      document.querySelectorAll(".swatch").forEach((button) => button.classList.toggle("active", button === el));
      return;
    }
    if (action === "save-notebook") return saveNotebook(el.dataset.id);
    if (action === "save-notebook-picture") return saveNotebookPicture(el.dataset.id);
    if (action === "save-goal") return saveGoal(el.dataset.id);
    if (action === "toggle-notebook-select") return toggleNotebookSelect(el.dataset.id);
    if (action === "select-visible-notebooks") return selectVisibleNotebooks();
    if (action === "clear-selected-notebooks") return clearSelectedNotebooks();
    if (action === "duplicate-notebook") return duplicateNotebooks([el.dataset.id]);
    if (action === "duplicate-selected-notebooks") return duplicateSelectedNotebooks();
    if (action === "delete-selected-notebooks") return deleteSelectedNotebooks();
    if (action === "delete-notebook") return deleteNotebook(el.dataset.id);
    if (action === "delete-notebook-subject") return deleteNotebookSubject(el.dataset.id, el.dataset.subject);
    if (action === "delete-goal") return deleteGoal(el.dataset.id);
    if (action === "delete-project") return deleteProject(el.dataset.id);
    if (action === "save-goal-contribution") return saveGoalContribution(el.dataset.id);
    if (action === "save-goal-plan-contribution") return saveGoalContribution(el.dataset.id, "planned");
    if (action === "save-contact") return saveContact(el.dataset.id);
    if (action === "delete-contact") return deleteContact(el.dataset.id);
    if (action === "save-profile") return saveProfile();
    if (action === "login-profile") return loginProfile(el.dataset.id);
    if (action === "lock-profile") return lockProfile();
    if (action === "delete-profile") return deleteProfile(el.dataset.id);
    if (action === "save-cloud-config") return saveCloudConfig();
    if (action === "test-cloud-config") return testCloudConfig();
    if (action === "copy-hosted-cloud-config") return copyHostedCloudConfig();
    if (action === "copy-friend-alpha-link") return copyFriendAlphaLink();
    if (action === "copy-friend-alpha-invite") return copyFriendAlphaInvite();
    if (action === "copy-friend-alpha-script") return copyFriendAlphaScript();
    if (action === "copy-friend-feedback-request") return copyFriendFeedbackRequest();
    if (action === "email-friend-feedback-request") return emailFriendFeedbackRequest();
    if (action === "copy-friend-safety-checklist") return copyFriendSafetyChecklist();
    if (action === "copy-friend-onboarding") return copyFriendOnboardingQuickStart();
    if (action === "save-alpha-feedback") return saveAlphaFeedback();
    if (action === "copy-alpha-feedback") return copyAlphaFeedback();
    if (action === "select-copy-fallback") return selectCopyFallback();
    if (action === "save-google-contacts-config") return saveGoogleContactsConfig();
    if (action === "google-contacts-import") return importGoogleContacts();
    if (action === "copy-google-contacts-checklist") return copyGoogleContactsChecklist();
    if (action === "cloud-sign-in") return cloudSignIn();
    if (action === "cloud-sign-up") return cloudSignUp();
    if (action === "cloud-sign-out") return cloudSignOut();
    if (action === "cloud-push-workspace") return cloudPushWorkspace();
    if (action === "cloud-force-push-workspace") return cloudPushWorkspace({ force: true });
    if (action === "cloud-pull-workspace") return cloudPullWorkspace();
    if (action === "cloud-smart-merge") return cloudSmartMergeNow();
    if (action === "toggle-cloud-auto-sync") return toggleCloudAutoSync();
    if (action === "copy-media-storage-plan") return copyMediaStoragePlan();
    if (action === "cloud-upload-local-media") return uploadLocalMediaToCloud();
    if (action === "cloud-refresh-media-links") return refreshCloudMediaLinks();
    if (action === "run-plaid-sandbox-import") return runPlaidSandboxImport();
    if (action === "copy-plaid-production-plan") return copyPlaidProductionPlan();
    if (action === "simulate-scan") return simulateBillScan();
    if (action === "simulate-detect") return simulateBillDetect();
    if (action === "simulate-import") return simulateImport();
    if (action === "run-smart-sync") return runSmartSync();
    if (action === "sync-connection") return syncConnection(el.dataset.id);
    if (action === "add-inbox-bill") return addInboxAsBill(el.dataset.id);
    if (action === "add-inbox-subscription") return addInboxAsSubscription(el.dataset.id);
    if (action === "cancel-inbox-subscription") return cancelInboxSubscription(el.dataset.id);
    if (action === "link-inbox-item") return linkInboxItem(el.dataset.id);
    if (action === "dismiss-inbox-item") return dismissInboxItem(el.dataset.id);
    if (action === "save-subscription") return saveSubscription();
    if (action === "save-subscription-media") return saveSubscriptionMedia(el.dataset.id);
    if (action === "download-calendar-ics") return downloadCalendarIcs();
    if (action === "download-drive-backup") return downloadDriveBackup();
    if (action === "import-backup-file") return importBackupFile();
    if (action === "restore-backup-confirm") return restoreBackupFromPreview();
    if (action === "clear-backup-preview") return clearBackupPreview();
    if (action === "set-backup-frequency") return setBackupFrequency(el.dataset.value);
    if (action === "download-data") return downloadData();
    if (action === "reset-data") return resetData();
    if (action === "ai-prompt") return sendAi(el.dataset.prompt);
    if (action === "send-ai") return sendAi(document.getElementById("aiInput")?.value);
    if (action === "start-ai-voice") return startAiVoice();
    if (action === "stop-ai-voice") return stopAiVoice();
    if (action === "speak-last-ai") return speakLastAiAnswer(true);
  }

  function navigate(view, root = false) {
    if (!view) return;
    ui.modal = null;
    if (view === "subscriptions") {
      ui.billHubTab = "subscriptions";
      view = "bills";
    } else if (view === "bills" && root) {
      ui.billHubTab = "bills";
    }
    if (!root && ui.view !== view) ui.backStack.push(ui.view);
    if (root) ui.backStack = [];
    ui.view = view;
    if (view !== "calendar") ui.dayCopyTargetDate = null;
    syncHash(view);
    if (view !== "notes") {
      ui.notebookId = null;
      ui.selectedNotes = [];
    }
    if (view !== "projects") ui.projectId = null;
    render();
  }

  function back() {
    if (ui.view === "projects" && ui.projectId) {
      ui.projectId = null;
      render();
      return;
    }
    ui.view = ui.backStack.pop() || "dashboard";
    syncHash(ui.view);
    render();
  }

  function moveCalendar(direction) {
    const step = direction < 0 ? -1 : 1;
    if (ui.calendarView === "month") ui.selectedDate = addMonthsIso(ui.selectedDate, step);
    else if (ui.calendarView === "day") ui.selectedDate = addDaysIso(ui.selectedDate, step);
    else ui.selectedDate = addDaysIso(ui.selectedDate, step * 7);
    ui.dayCopyTargetDate = null;
    render();
  }

  function goCalendarToday(view = ui.calendarView) {
    const targetView = isCalendarView(view) ? view : "day";
    ui.selectedDate = todayIso();
    ui.calendarView = targetView;
    ui.selectedTasks = [];
    ui.dayCopyTargetDate = null;
    if (ui.view !== "calendar") {
      if (ui.view) ui.backStack.push(ui.view);
      ui.view = "calendar";
      syncHash("calendar");
    }
    render();
  }

  function openCalendarDay(date) {
    ui.selectedDate = date || ui.selectedDate;
    ui.calendarView = "day";
    ui.selectedTasks = [];
    ui.dayCopyTargetDate = null;
    render();
  }

  function setCalendarDateView(date, view) {
    if (!isCalendarView(view)) return;
    ui.selectedDate = date || ui.selectedDate;
    ui.calendarView = view;
    ui.selectedTasks = [];
    ui.dayCopyTargetDate = null;
    if (ui.view !== "calendar") return navigate("calendar");
    render();
  }

  function toggleTaskCategory(category) {
    if (!taskCategories.includes(category)) return;
    ui.taskCategoryFilters[category] = !isTaskCategoryEnabled(category);
    ui.selectedTasks = ui.selectedTasks.filter((taskId) => {
      const task = findCalendarItemById(taskId);
      return task && isTaskCategoryEnabled(taskCategory(task));
    });
    render();
  }

  function pickChoice(el) {
    const input = document.getElementById(el.dataset.target);
    if (!input) return;
    input.value = el.dataset.value || "";
    if (el.dataset.target === "defaultTaskBgColor") {
      const preview = document.querySelector(".event-default-preview");
      if (preview) preview.style.setProperty("--event-bg", input.value);
    }
    const group = el.closest(".choice-row, .swatches");
    if (group) group.querySelectorAll(".active").forEach((item) => item.classList.remove("active"));
    el.classList.add("active");
  }

  function setImageFit(el) {
    const fit = imageFit(el.dataset.value);
    const input = document.getElementById(el.dataset.target);
    const preview = document.getElementById(el.dataset.preview);
    if (input) input.value = fit;
    if (preview) preview.style.setProperty("--media-fit", fit);
    const row = el.closest(".image-fit-row");
    if (row) row.querySelectorAll(".active").forEach((button) => button.classList.remove("active"));
    el.classList.add("active");
  }

  function openModal(type, modalId, returnTo = "", returnId = "") {
    ui.modal = { type, id: modalId || "", returnTo: returnTo || "", returnId: returnId || "" };
    ui.noteColor = null;
    if (type === "voiceTask") {
      const quickInput = document.getElementById("quickTaskInput")?.value?.trim() || "";
      if (quickInput && !ui.voiceTranscript) ui.voiceTranscript = quickInput;
      ui.voiceParsedTask = ui.voiceTranscript ? parseVoiceTask(ui.voiceTranscript) : null;
      ui.voiceError = "";
    }
    if (type === "voiceHabit") {
      ui.habitVoiceParsedHabit = ui.habitVoiceTranscript ? parseVoiceHabit(ui.habitVoiceTranscript) : null;
      ui.habitVoiceError = "";
    }
    if (type === "taskNotify") {
      ui.notifyQuery = "";
    }
    if (type === "addLoan") {
      ui.loanContactQuery = "";
    }
    render();
  }

  function closeModal() {
    ui.modal = null;
    render();
  }

  function focusCurrentModal(preferredId = "", options = {}) {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const repeats = Number.isFinite(options.repeats) ? Math.max(1, options.repeats) : 1;
    const avoidKeyboardOnMobile = options.avoidKeyboardOnMobile !== false;
    const centerModal = options.centerModal === true;
    const settleDelays = [70, 170, 320, 520].slice(0, repeats);
    const settleModal = () => {
      const sheet = document.querySelector("[data-sheet]");
      if (!sheet) return;
      const backdrop = sheet.closest(".sheet-backdrop");
      const mobile = window.innerWidth <= 760;
      if (mobile) {
        if (!centerModal) {
          window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
          document.documentElement.scrollLeft = 0;
          document.body.scrollLeft = 0;
        }
        backdrop?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
        sheet.scrollTop = 0;
      }
      (centerModal ? sheet : (backdrop || sheet)).scrollIntoView?.({ block: "center", inline: "center", behavior: "smooth" });
      const target = mobile && avoidKeyboardOnMobile
        ? sheet
        : preferredId
          ? document.getElementById(preferredId)
          : sheet.querySelector("input, select, textarea, button");
      target?.focus?.({ preventScroll: true });
    };
    settleDelays.forEach((delay) => window.setTimeout(settleModal, delay));
  }

  function paintToastWithoutRender() {
    if (typeof document === "undefined" || !app) return;
    document.querySelectorAll(".toast").forEach((toast) => toast.remove());
    const html = renderToast();
    if (!html) return;
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    const toast = template.content.firstElementChild;
    if (toast) app.appendChild(toast);
  }

  function showToast(message, type = "success", options = {}) {
    if (type === "success" && ui.lastSaveError) {
      message = ui.lastSaveError;
      type = "danger";
    }
    ui.toast = { message, type };
    if (toastTimer) clearTimeout(toastTimer);
    if (options.render === false) paintToastWithoutRender();
    else render();
    toastTimer = setTimeout(() => {
      ui.toast = null;
      if (options.render === false) document.querySelectorAll(".toast").forEach((toast) => toast.remove());
      else render();
    }, 2400);
  }

  function confirmDelete(label) {
    if (typeof window === "undefined" || typeof window.confirm !== "function") return true;
    return window.confirm(`Delete ${label}? This only removes it from this local BillMaster workspace.`);
  }

  function shouldSkipRecentWrite(key, windowMs = 3000) {
    const now = Date.now();
    const last = recentWrites.get(key) || 0;
    if (now - last < windowMs) return true;
    recentWrites.set(key, now);
    return false;
  }

  function value(idValue) {
    return document.getElementById(idValue)?.value?.trim() || "";
  }

  function numberValue(idValue) {
    return parseMoneyInput(value(idValue));
  }

  function integerValue(idValue, fallback = 1, min = 1, max = 99) {
    const parsed = Number.parseInt(value(idValue), 10);
    return clamp(Number.isFinite(parsed) ? parsed : fallback, min, max);
  }

  function toggleTaskAddressPanel(show) {
    const panel = document.getElementById("taskNewAddressPanel");
    if (!panel) return;
    panel.hidden = !show;
  }

  function toggleTaskCategoryPanel(show) {
    const panel = document.getElementById("taskNewCategoryPanel");
    if (!panel) return;
    panel.hidden = !show;
    if (show) document.getElementById("taskNewCategory")?.focus();
  }

  function toggleTransactionCategoryPanel(show) {
    const panel = document.getElementById("txNewCategoryPanel");
    if (!panel) return;
    panel.hidden = !show;
    if (show) document.getElementById("txNewCategory")?.focus();
  }

  function showTaskCategoryPanel() {
    const select = document.getElementById("taskCategory");
    if (select) select.value = ADD_TASK_CATEGORY_VALUE;
    toggleTaskCategoryPanel(true);
  }

  function toggleHabitAddressPanel(show) {
    const panel = document.getElementById("habitNewAddressPanel");
    if (!panel) return;
    panel.hidden = !show;
  }

  function toggleContactAddressPanel(show) {
    const panel = document.getElementById("contactNewAddressPanel");
    if (!panel) return;
    panel.hidden = !show;
    if (show) document.getElementById("contactNewAddrLabel")?.focus();
  }

  function parseMoneyInput(rawValue) {
    const cleaned = String(rawValue ?? "").replace(/[$,\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function quickAddTask() {
    const input = document.getElementById("quickTaskInput");
    const title = input?.value.trim();
    if (!title) return;
    data.tasks.unshift({
      id: id("task"),
      title,
      description: "",
      date: ui.selectedDate || "2026-05-06",
      endDate: ui.selectedDate || "2026-05-06",
      start: "09:00",
      end: "10:00",
      priority: "Medium",
      status: "Not Started",
      repeat: "None",
      category: "General",
      bgColor: defaultTaskBgColor(),
      fontFamily: "System",
      includeHours: true,
      projectId: null,
      billId: null,
      goalId: null,
      contactId: null,
      addressId: null,
      tags: [],
      updatedAt: new Date().toISOString()
    });
    saveData();
    render();
  }

  function askAiFromCalendarQuickAdd() {
    const input = document.getElementById("quickTaskInput");
    const prompt = String(input?.value || "").trim();
    if (!prompt) {
      navigate("ai");
      showToast("Ask BillMaster about tasks, bills, goals, notes, and more.");
      return;
    }
    if (input) input.value = "";
    navigate("ai");
    sendAi(prompt);
    showToast("BillMaster AI answered from your app data.");
  }

  function lastAiMessageText() {
    const last = safeArray(data.aiMessages).slice().reverse().find((message) => message.role === "ai" && message.text);
    return last?.text || "";
  }

  function aiSpeechSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  function speakLastAiAnswer(manual = false) {
    const text = lastAiMessageText();
    if (!text) {
      if (manual) showToast("No AI answer to read yet.", "danger");
      return;
    }
    speakAiText(text, { manual });
  }

  function speakAiText(text, options = {}) {
    if (!text || !aiSpeechSupported()) {
      if (options.manual) showToast("This browser cannot read answers aloud.", "danger");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, " ").trim());
      utterance.lang = "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1.02;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      if (options.manual) showToast("BillMaster could not read that answer aloud.", "danger");
    }
  }

  function startAiVoice() {
    const Recognition = speechRecognitionCtor();
    if (!Recognition) {
      ui.aiVoiceError = "Voice questions are not available in this browser. You can still type your question and tap Ask.";
      showToast("Voice questions are not available here.", "danger");
      return;
    }
    if (voiceRecognition && ui.aiListening) {
      stopAiVoice();
      return;
    }
    if (voiceRecognition && ui.voiceListening) stopVoiceTask();
    if (voiceRecognition && ui.voiceCorrectionListening) stopVoiceCorrection();
    if (voiceRecognition && ui.habitVoiceListening) stopVoiceHabit();
    const recognition = new Recognition();
    voiceRecognition = recognition;
    voiceStopRequested = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    ui.aiListening = true;
    ui.aiVoiceError = "";
    render();
    recognition.onresult = (event) => {
      const transcript = collectSpeechTranscript(event) || ui.aiDraft;
      ui.aiDraft = transcript;
      ui.aiListening = false;
      ui.aiVoiceError = "";
      voiceRecognition = null;
      voiceStopRequested = false;
      if (transcript) {
        sendAi(transcript);
        showToast("BillMaster heard your question.");
      } else {
        ui.aiVoiceError = "I did not catch that. Tap the mic and ask again, or type the question.";
        render();
      }
    };
    recognition.onerror = (event) => {
      ui.aiListening = false;
      voiceRecognition = null;
      if (voiceStopRequested || event?.error === "aborted") {
        voiceStopRequested = false;
        ui.aiVoiceError = "Listening stopped. Tap the mic again when you are ready.";
        showToast("Listening stopped.");
        return;
      }
      ui.aiVoiceError = aiVoiceErrorMessage(event?.error);
      showToast(ui.aiVoiceError, "danger");
    };
    recognition.onend = () => {
      if (voiceRecognition === recognition) voiceRecognition = null;
      if (ui.aiListening) {
        ui.aiListening = false;
        if (voiceStopRequested) ui.aiVoiceError = "Listening stopped. Tap the mic again when you are ready.";
        render();
      }
      voiceStopRequested = false;
    };
    try {
      recognition.start();
    } catch (error) {
      ui.aiListening = false;
      voiceRecognition = null;
      voiceStopRequested = false;
      ui.aiVoiceError = "Could not start voice questions. Try typing the question instead.";
      showToast(ui.aiVoiceError, "danger");
    }
  }

  function stopAiVoice() {
    if (!voiceRecognition) {
      ui.aiListening = false;
      ui.aiVoiceError = ui.aiDraft ? "Listening stopped. Review the question or tap Ask." : "Listening stopped.";
      render();
      return;
    }
    voiceStopRequested = true;
    ui.aiListening = false;
    ui.aiVoiceError = ui.aiDraft ? "Listening stopped. Review the question or tap Ask." : "Listening stopped.";
    try {
      voiceRecognition.stop();
    } catch (error) {
      voiceRecognition = null;
      voiceStopRequested = false;
    }
    render();
  }

  function aiVoiceErrorMessage(errorCode) {
    const map = {
      "not-allowed": "Microphone permission was blocked. You can still type the question and tap Ask.",
      "no-speech": "I did not hear a question. Tap the mic and try again.",
      "audio-capture": "No microphone was found. Type the question instead.",
      network: "Voice questions need browser speech services. Type the question instead."
    };
    return map[errorCode] || "Voice question capture stopped. You can type the question and tap Ask.";
  }

  function speechRecognitionCtor() {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startVoiceTask() {
    const Recognition = speechRecognitionCtor();
    if (!Recognition) {
      ui.voiceError = "Speech recognition is not available in this browser. Type or paste the task sentence instead.";
      showToast("Voice capture is not available here.", "danger");
      return;
    }
    if (voiceRecognition && ui.voiceListening) {
      stopVoiceTask();
      return;
    }
    if (voiceRecognition && ui.voiceCorrectionListening) {
      stopVoiceCorrection();
      return;
    }
    if (voiceRecognition && ui.habitVoiceListening) {
      stopVoiceHabit();
      return;
    }
    const recognition = new Recognition();
    voiceRecognition = recognition;
    voiceStopRequested = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    ui.voiceListening = true;
    ui.voiceError = "";
    render();
    recognition.onresult = (event) => {
      const transcript = collectSpeechTranscript(event) || ui.voiceTranscript;
      ui.voiceTranscript = transcript;
      ui.voiceParsedTask = transcript ? parseVoiceTask(transcript) : null;
      ui.voiceListening = false;
      ui.voiceCorrectionListening = false;
      ui.voiceError = "";
      voiceRecognition = null;
      voiceStopRequested = false;
      showToast("Voice task captured.");
    };
    recognition.onerror = (event) => {
      ui.voiceListening = false;
      ui.voiceCorrectionListening = false;
      voiceRecognition = null;
      if (voiceStopRequested || event?.error === "aborted") {
        voiceStopRequested = false;
        ui.voiceError = "Listening stopped. Review the text below, type anything missing, or tap Listen again.";
        showToast("Listening stopped.");
        return;
      }
      ui.voiceError = voiceErrorMessage(event?.error);
      showToast(ui.voiceError, "danger");
    };
    recognition.onend = () => {
      if (voiceRecognition === recognition) voiceRecognition = null;
      if (ui.voiceListening) {
        ui.voiceListening = false;
        if (voiceStopRequested) ui.voiceError = "Listening stopped. Review the text below, type anything missing, or tap Listen again.";
        render();
      }
      voiceStopRequested = false;
    };
    try {
      recognition.start();
    } catch (error) {
      ui.voiceListening = false;
      ui.voiceCorrectionListening = false;
      voiceRecognition = null;
      voiceStopRequested = false;
      ui.voiceError = "Could not start voice capture. Try typing the task sentence.";
      showToast(ui.voiceError, "danger");
    }
  }

  function stopVoiceTask() {
    if (!voiceRecognition) {
      ui.voiceListening = false;
      ui.voiceError = ui.voiceTranscript
        ? "Listening stopped. Review the text below, type anything missing, or tap Parse Details."
        : "Listening stopped. No speech text was captured yet.";
      render();
      return;
    }
    voiceStopRequested = true;
    ui.voiceListening = false;
    ui.voiceError = ui.voiceTranscript
      ? "Listening stopped. Review the text below, type anything missing, or tap Parse Details."
      : "Listening stopped. If no text appears, type the task sentence or tap Listen again.";
    try {
      voiceRecognition.stop();
    } catch (error) {
      voiceRecognition = null;
      voiceStopRequested = false;
    }
    render();
  }

  function startVoiceCorrection() {
    const Recognition = speechRecognitionCtor();
    const transcript = value("voiceTranscript") || ui.voiceTranscript;
    if (!Recognition) {
      ui.voiceError = "Voice correction is not available in this browser. Type the correction and tap Apply.";
      showToast("Voice correction is not available here.", "danger");
      return;
    }
    if (!transcript && !ui.voiceParsedTask) {
      showToast("Parse a task first, then correct it.", "danger");
      return;
    }
    if (voiceRecognition && ui.voiceCorrectionListening) {
      stopVoiceCorrection();
      return;
    }
    if (voiceRecognition && ui.voiceListening) {
      stopVoiceTask();
      return;
    }
    if (voiceRecognition && ui.habitVoiceListening) {
      stopVoiceHabit();
      return;
    }
    const recognition = new Recognition();
    voiceRecognition = recognition;
    voiceStopRequested = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    ui.voiceCorrectionListening = true;
    ui.voiceListening = false;
    ui.voiceError = "";
    render();
    recognition.onresult = (event) => {
      const correction = collectSpeechTranscript(event) || ui.voiceCorrectionDraft;
      ui.voiceCorrectionListening = false;
      voiceRecognition = null;
      voiceStopRequested = false;
      applyVoiceCorrectionValue(correction, transcript);
    };
    recognition.onerror = (event) => {
      ui.voiceCorrectionListening = false;
      voiceRecognition = null;
      if (voiceStopRequested || event?.error === "aborted") {
        voiceStopRequested = false;
        ui.voiceError = "Correction listening stopped. Type the correction or tap Listen Correction again.";
        render();
        showToast("Correction listening stopped.");
        return;
      }
      ui.voiceError = voiceErrorMessage(event?.error);
      render();
      showToast(ui.voiceError, "danger");
    };
    recognition.onend = () => {
      if (voiceRecognition === recognition) voiceRecognition = null;
      if (ui.voiceCorrectionListening) {
        ui.voiceCorrectionListening = false;
        if (voiceStopRequested) ui.voiceError = "Correction listening stopped. Type the correction or tap Listen Correction again.";
        render();
      }
      voiceStopRequested = false;
    };
    try {
      recognition.start();
    } catch (error) {
      ui.voiceCorrectionListening = false;
      voiceRecognition = null;
      voiceStopRequested = false;
      ui.voiceError = "Could not start voice correction. Try typing the correction.";
      render();
      showToast(ui.voiceError, "danger");
    }
  }

  function stopVoiceCorrection() {
    if (!voiceRecognition) {
      ui.voiceCorrectionListening = false;
      ui.voiceError = ui.voiceCorrectionDraft
        ? "Correction listening stopped. Review the correction below or tap Apply."
        : "Correction listening stopped. No correction text was captured yet.";
      render();
      return;
    }
    voiceStopRequested = true;
    ui.voiceCorrectionListening = false;
    ui.voiceError = ui.voiceCorrectionDraft
      ? "Correction listening stopped. Review the correction below or tap Apply."
      : "Correction listening stopped. If no text appears, type the correction or tap Listen Correction again.";
    try {
      voiceRecognition.stop();
    } catch (error) {
      voiceRecognition = null;
      voiceStopRequested = false;
    }
    render();
  }

  function startVoiceHabit() {
    const Recognition = speechRecognitionCtor();
    if (!Recognition) {
      ui.habitVoiceError = "Voice capture is not available in this browser. Type or paste the habit sentence instead.";
      showToast("Voice capture is not available here.", "danger");
      return;
    }
    if (voiceRecognition && ui.habitVoiceListening) {
      stopVoiceHabit();
      return;
    }
    if (voiceRecognition && ui.voiceListening) {
      stopVoiceTask();
      return;
    }
    if (voiceRecognition && ui.voiceCorrectionListening) {
      stopVoiceCorrection();
      return;
    }
    const recognition = new Recognition();
    voiceRecognition = recognition;
    voiceStopRequested = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    ui.habitVoiceListening = true;
    ui.habitVoiceError = "";
    render();
    recognition.onresult = (event) => {
      const transcript = collectSpeechTranscript(event) || ui.habitVoiceTranscript;
      ui.habitVoiceTranscript = transcript;
      ui.habitVoiceParsedHabit = transcript ? parseVoiceHabit(transcript) : null;
      ui.habitVoiceListening = false;
      ui.voiceListening = false;
      ui.voiceCorrectionListening = false;
      ui.habitVoiceError = "";
      voiceRecognition = null;
      voiceStopRequested = false;
      render();
    };
    recognition.onerror = (event) => {
      ui.habitVoiceListening = false;
      voiceRecognition = null;
      if (voiceStopRequested || event?.error === "aborted") {
        voiceStopRequested = false;
        ui.habitVoiceError = "Listening stopped. Review the text below, type anything missing, or tap Listen again.";
        render();
        showToast("Habit listening stopped.");
        return;
      }
      ui.habitVoiceError = voiceErrorMessage(event?.error);
      render();
      showToast(ui.habitVoiceError, "danger");
    };
    recognition.onend = () => {
      if (voiceRecognition === recognition) voiceRecognition = null;
      if (ui.habitVoiceListening) {
        ui.habitVoiceListening = false;
        if (voiceStopRequested) ui.habitVoiceError = "Listening stopped. Review the text below, type anything missing, or tap Listen again.";
        render();
      }
      voiceStopRequested = false;
    };
    try {
      recognition.start();
    } catch (error) {
      ui.habitVoiceListening = false;
      voiceRecognition = null;
      voiceStopRequested = false;
      ui.habitVoiceError = "Could not start habit voice capture. Try typing the habit sentence.";
      render();
      showToast(ui.habitVoiceError, "danger");
    }
  }

  function stopVoiceHabit() {
    if (!voiceRecognition) {
      ui.habitVoiceListening = false;
      ui.habitVoiceError = ui.habitVoiceTranscript
        ? "Listening stopped. Review the text below or tap Parse Details."
        : "Listening stopped. No habit text was captured yet.";
      render();
      return;
    }
    voiceStopRequested = true;
    ui.habitVoiceListening = false;
    ui.habitVoiceError = ui.habitVoiceTranscript
      ? "Listening stopped. Review the text below or tap Parse Details."
      : "Listening stopped. If no text appears, type the habit sentence or tap Listen again.";
    try {
      voiceRecognition.stop();
    } catch (error) {
      voiceRecognition = null;
      voiceStopRequested = false;
    }
    render();
  }

  function collectSpeechTranscript(event) {
    const results = event?.results || [];
    const parts = [];
    for (let index = event?.resultIndex || 0; index < results.length; index += 1) {
      const result = results[index];
      if (result && result[0] && result[0].transcript) parts.push(result[0].transcript);
    }
    return parts.join(" ").trim();
  }

  function voiceErrorMessage(errorCode) {
    const map = {
      "not-allowed": "Microphone permission was blocked. You can still type or paste the task sentence.",
      "no-speech": "I did not hear speech. Try again or type the task sentence.",
      "audio-capture": "No microphone was found. Type or paste the task sentence instead.",
      network: "Voice capture needs browser speech services. Type or paste the task sentence instead."
    };
    return map[errorCode] || "Voice capture stopped. You can type or paste the task sentence.";
  }

  function parseVoiceTaskFromInput() {
    const transcript = value("voiceTranscript") || ui.voiceTranscript;
    if (!transcript) {
      showToast("Add a task sentence first.", "danger");
      return;
    }
    ui.voiceTranscript = transcript;
    ui.voiceParsedTask = parseVoiceTask(transcript);
    ui.voiceCorrectionListening = false;
    ui.voiceError = "";
    render();
    showToast("Task details parsed.");
  }

  function askAiFromVoiceTask(promptText = "") {
    const prompt = String(promptText || value("voiceTranscript") || ui.voiceTranscript || "").trim();
    if (!prompt) {
      showToast("Ask a question or type one in the task sentence box first.", "danger");
      return;
    }
    ui.voiceListening = false;
    ui.voiceCorrectionListening = false;
    ui.voiceError = "";
    ui.modal = null;
    ui.view = "ai";
    syncHash("ai");
    sendAi(prompt);
  }

  function applyVoiceCorrection() {
    const correction = value("voiceCorrection") || ui.voiceCorrectionDraft;
    const transcript = value("voiceTranscript") || ui.voiceTranscript;
    return applyVoiceCorrectionValue(correction, transcript);
  }

  function applyVoiceCorrectionValue(correction, transcript) {
    correction = String(correction || "");
    transcript = transcript || ui.voiceTranscript;
    if (!correction.trim()) {
      showToast("Say or type the correction first.", "danger");
      return;
    }
    if (!transcript && !ui.voiceParsedTask) {
      showToast("Parse a task first, then correct it.", "danger");
      return;
    }
    const parsed = { ...(ui.voiceParsedTask || parseVoiceTask(transcript)) };
    const changes = applyVoiceCorrectionText(parsed, correction);
    if (!changes.length) {
      ui.voiceCorrectionDraft = correction;
      render();
      showToast("I could not find a correction to apply.", "danger");
      return;
    }
    parsed.source = transcript || parsed.source || "";
    reconcileVoiceTaskDates(parsed);
    ui.voiceTranscript = transcript || parsed.source;
    ui.voiceParsedTask = parsed;
    ui.voiceCorrectionDraft = "";
    ui.voiceError = "";
    render();
    showToast(`Updated ${changes.join(", ")}.`);
  }

  function saveVoiceTask() {
    const transcript = value("voiceTranscript") || ui.voiceTranscript;
    if (!transcript) {
      showToast("Add a task sentence first.", "danger");
      return;
    }
    if (voicePromptLooksLikeQuestion(transcript)) return askAiFromVoiceTask(transcript);
    const parsed = ui.voiceParsedTask?.source === transcript ? ui.voiceParsedTask : parseVoiceTask(transcript);
    const title = parsed.title || "Voice Task";
    const writeKey = `voice-task:${title.toLowerCase()}:${parsed.date}:${parsed.start}:${parsed.end}:${parsed.repeatLabel || parsed.repeat}:${parsed.address ? addressKey(parsed.address) : ""}`;
    if (shouldSkipRecentWrite(writeKey)) {
      showToast("That voice task was already saved.", "danger");
      return;
    }
    const addressId = createAddressFromVoice(parsed.address, title);
    if (parsed.recurring) return saveVoiceRecurringTask(parsed, transcript, title, addressId);
    const task = {
      id: id("task"),
      title,
      description: transcript,
      date: parsed.date,
      endDate: parsed.endDate,
      start: parsed.start,
      end: parsed.end,
      priority: parsed.priority,
      status: parsed.status,
      repeat: parsed.repeat,
      category: parsed.category,
      bgColor: parsed.bgColor || defaultTaskBgColor(),
      fontFamily: "System",
      includeHours: Boolean(parsed.start && parsed.end),
      projectId: parsed.projectId,
      billId: null,
      goalId: null,
      contactId: null,
      addressId,
      alertOffsets: [...TASK_ALERT_DEFAULT_OFFSETS],
      alertDevice: true,
      alertSound: true,
      alertEmail: false,
      alertConfigured: true,
      alertFiredKeys: [],
      tags: parsed.category ? [parsed.category.toLowerCase()] : [],
      updatedAt: new Date().toISOString()
    };
    data.tasks.unshift(task);
    saveData();
    ui.voiceTranscript = "";
    ui.voiceParsedTask = null;
    ui.voiceCorrectionDraft = "";
    ui.voiceCorrectionListening = false;
    ui.voiceError = "";
    ui.selectedDate = task.date;
    ui.calendarView = "day";
    ui.view = "calendar";
    syncHash("calendar");
    ui.modal = null;
    showToast(addressId ? "Voice task saved with address." : "Voice task saved.");
  }

  function saveVoiceRecurringTask(parsed, transcript, title, addressId) {
    const habit = {
      id: id("habit"),
      title,
      description: transcript,
      type: voiceTaskHabitType(parsed),
      schedule: parsed.repeatSchedule || "Daily",
      days: parsed.repeatDays?.length ? parsed.repeatDays : parseVoiceHabitDays(normalizeVoiceText(transcript), parsed.date, parsed.repeatSchedule || "Daily"),
      startDate: parsed.date,
      endDate: parsed.repeatEndDate || "",
      start: parsed.start,
      end: parsed.end,
      priority: parsed.priority || "Medium",
      status: parsed.status === "Completed" || parsed.status === "Cancelled" ? "Active" : "Active",
      includeHours: Boolean(parsed.start && parsed.end),
      targetCount: 1,
      addressId,
      projectId: parsed.projectId || null,
      color: taskCategoryColor(parsed.category || "Habit"),
      image: "",
      imageZoom: 1,
      imageX: 0,
      imageY: 0,
      imageFit: "cover",
      imageOpacity: 1,
      completions: [],
      skippedDates: []
    };
    data.habits.unshift(habit);
    saveData();
    ui.voiceTranscript = "";
    ui.voiceParsedTask = null;
    ui.voiceCorrectionDraft = "";
    ui.voiceCorrectionListening = false;
    ui.voiceError = "";
    ui.selectedDate = habit.startDate;
    ui.calendarView = "week";
    ui.view = "calendar";
    syncHash("calendar");
    ui.modal = null;
    showToast(`${habit.title} saved as a repeating task: ${voiceRecurringScheduleLabel(habit)}.`);
  }

  function voiceTaskHabitType(parsed) {
    if (habitTypeOptions.includes(parsed.category)) return parsed.category;
    if (parsed.category === "Finance") return "Finance";
    if (parsed.category === "Personal") return "Personal";
    if (parsed.category === "Project") return "Work";
    if (parsed.category === "Habit") return "Personal";
    return "Custom";
  }

  function parseVoiceHabitFromInput() {
    const transcript = value("habitVoiceTranscript") || ui.habitVoiceTranscript;
    if (!transcript) {
      showToast("Add a habit sentence first.", "danger");
      return;
    }
    ui.habitVoiceTranscript = transcript;
    ui.habitVoiceParsedHabit = parseVoiceHabit(transcript);
    ui.habitVoiceListening = false;
    ui.habitVoiceError = "";
    render();
    showToast("Habit details parsed.");
  }

  function saveVoiceHabit() {
    const transcript = value("habitVoiceTranscript") || ui.habitVoiceTranscript;
    if (!transcript) {
      showToast("Add a habit sentence first.", "danger");
      return;
    }
    const parsed = ui.habitVoiceParsedHabit?.source === transcript ? ui.habitVoiceParsedHabit : parseVoiceHabit(transcript);
    const title = parsed.title || "Voice Habit";
    const writeKey = `voice-habit:${title.toLowerCase()}:${parsed.startDate}:${parsed.start}:${parsed.end}:${parsed.schedule}:${parsed.address ? addressKey(parsed.address) : ""}`;
    if (shouldSkipRecentWrite(writeKey)) {
      showToast("That voice habit was already saved.", "danger");
      return;
    }
    const addressId = createAddressFromVoice(parsed.address, title, "habit");
    const habit = {
      id: id("habit"),
      title,
      description: parsed.description || "",
      type: parsed.type || "Personal",
      schedule: parsed.schedule || "Daily",
      days: parsed.days?.length ? parsed.days : [parseLocalDate(parsed.startDate).getDay()],
      startDate: parsed.startDate,
      endDate: parsed.endDate || "",
      start: parsed.start,
      end: parsed.end,
      priority: parsed.priority || "Medium",
      status: parsed.status || "Active",
      includeHours: parsed.includeHours !== false,
      targetCount: Math.max(1, Number(parsed.targetCount || 1)),
      addressId,
      color: parsed.color || taskCategoryColor("Habit"),
      image: "",
      imageZoom: 1,
      imageX: 0,
      imageY: 0,
      imageFit: "cover",
      imageOpacity: 1,
      completions: [],
      skippedDates: []
    };
    data.habits.unshift(habit);
    const saved = saveData();
    ui.habitVoiceTranscript = "";
    ui.habitVoiceParsedHabit = null;
    ui.habitVoiceListening = false;
    ui.habitVoiceError = "";
    ui.habitFilter = "all";
    ui.view = "habits";
    syncHash("habits");
    ui.modal = saved ? { type: "saveHabitTemplate", id: habit.id } : null;
    render();
    showToast(saved ? (addressId ? "Voice habit saved with address." : "Voice habit saved.") : ui.lastSaveError, saved ? "success" : "danger");
  }

  function voiceHabitPreview(parsed) {
    const rows = [
      ["Habit Name", parsed.title || "Voice Habit"],
      ["Start Date", dateLabel(parsed.startDate)],
      ["Start Time", timeLabel(parsed.start)],
      ["End Time", timeLabel(parsed.end)],
      ["Schedule", parsed.schedule],
      ["Days", habitDaysLabel(parsed)],
      ["Type", parsed.type],
      ["Status", parsed.status],
      ["Target", `${parsed.targetCount || 1}x per day`],
      ["Hour Totals", parsed.includeHours === false ? "Not counted" : "Counted"],
      ["Address", parsed.address ? addressText(parsed.address) : "No address"],
      ["Notes", parsed.description || "No notes"]
    ];
    return `<section class="voice-preview section-card">
      <div class="section-title"><h2>${icon("check")} Parsed Habit</h2><span class="status ${parsed.address ? "success" : "muted"}">${parsed.address ? "address ready" : "no address"}</span></div>
      <div class="voice-preview-grid">${rows.map(([label, text]) => `<div><span>${esc(label)}</span><strong>${esc(text)}</strong></div>`).join("")}</div>
    </section>`;
  }

  function habitDaysLabel(habit) {
    if (habit.schedule === "Daily") return "Every day";
    if (habit.schedule === "Weekdays") return "Mon-Fri";
    if (habit.schedule === "Monthly") return `Monthly on day ${Number(habit.startDate.slice(-2))}`;
    return (habit.days || []).map((day) => weekdayLabels[day]).filter(Boolean).join(", ") || "Weekly";
  }

  function voiceRecurringScheduleLabel(habit) {
    const time = habit.start ? ` ${timeLabel(habit.start)}${habit.end ? `-${timeLabel(habit.end)}` : ""}` : "";
    return `${habitDaysLabel(habit)}${time}`;
  }

  function voiceTaskPreview(parsed) {
    const project = data.projects.find((item) => item.id === parsed.projectId);
    const rows = [
      ["Saved As", parsed.recurring ? "Repeating calendar item" : voicePromptLooksLikeQuestion(parsed.source) ? "AI question" : "One-time task"],
      ["Title", parsed.title || "Voice Task"],
      ["Start Date", dateLabel(parsed.date)],
      ["Start Time", timeLabel(parsed.start)],
      ["End Date", dateLabel(parsed.endDate)],
      ["End Time", timeLabel(parsed.end)],
      ["Priority", parsed.priority],
      ["Status", parsed.status],
      ["Category", parsed.category],
      ["Repeat", parsed.repeatLabel || parsed.repeat],
      ["Project", project ? project.name : "No project"],
      ["Address", parsed.address ? addressText(parsed.address) : "No address"]
    ];
    return `<section class="voice-preview section-card">
      <div class="section-title"><h2>${icon("task")} Parsed Task</h2><span class="status ${parsed.address ? "success" : "muted"}">${parsed.address ? "address ready" : "no address"}</span></div>
      <div class="voice-preview-grid">${rows.map(([label, text]) => `<div><span>${esc(label)}</span><strong>${esc(text)}</strong></div>`).join("")}</div>
      <div class="voice-correction-box">
        <label for="voiceCorrection">Quick voice correction</label>
        <div class="voice-correction-row">
          <input id="voiceCorrection" placeholder="Example: change status to in progress, date tomorrow, start time 2 PM, end time 4 PM" value="${esc(ui.voiceCorrectionDraft || "")}" autocomplete="off">
          <button class="outline-btn" data-action="${ui.voiceCorrectionListening ? "stop-voice-correction" : "start-voice-correction"}" ${!speechRecognitionCtor() && !ui.voiceCorrectionListening ? "disabled" : ""}>${icon(ui.voiceCorrectionListening ? "close" : "mic")} ${ui.voiceCorrectionListening ? "Stop" : "Listen Correction"}</button>
          <button class="outline-btn" data-action="apply-voice-correction">${icon("edit")} Apply</button>
        </div>
        <p class="subtle">${parsed.recurring ? "Repeating voice tasks save as recurring calendar items so they appear on each scheduled day." : "Correct one thing at a time: status, priority, date, start time, end time, title, category, repeat, project, or address."}</p>
      </div>
    </section>`;
  }

  function createAddressFromVoice(address, title, entity = "task") {
    if (!address || !address.street) return null;
    const payload = {
      label: address.label || `${title} Location`,
      street: address.street,
      city: address.city || "",
      state: address.state || "",
      zip: address.zip || "",
      country: address.country || "USA",
      entity
    };
    const duplicate = data.addresses.find((item) => addressKey(item) === addressKey(payload));
    if (duplicate) return duplicate.id;
    const newAddress = { id: id("addr"), ...payload };
    data.addresses.unshift(newAddress);
    return newAddress.id;
  }

  function parseVoiceTask(rawText) {
    const source = String(rawText || "").trim();
    const normalized = normalizeVoiceText(source);
    const date = parseVoiceDate(normalized);
    const range = parseVoiceTimeRange(source);
    const endDate = range.start && range.end && minutes(range.end) <= minutes(range.start) ? addDaysIso(date, 1) : date;
    const category = parseVoiceCategory(normalized);
    const priority = parseVoicePriority(normalized);
    const status = parseVoiceStatus(normalized);
    const repeat = parseVoiceRepeat(normalized);
    const recurrence = parseVoiceTaskRecurrence(normalized, date);
    const address = parseVoiceAddress(source);
    return {
      source,
      title: extractVoiceTaskTitle(source, address?.raw || ""),
      date,
      endDate,
      start: range.start || "09:00",
      end: range.end || (range.start ? timeFromMinutes(minutes(range.start) + 60) : "10:00"),
      priority,
      status,
      repeat: recurrence.repeat || repeat,
      repeatSchedule: recurrence.schedule,
      repeatDays: recurrence.days,
      repeatLabel: recurrence.label,
      recurring: recurrence.recurring,
      category,
      projectId: parseVoiceProject(normalized),
      address,
      bgColor: defaultTaskBgColor()
    };
  }

  function voicePromptLooksLikeQuestion(text) {
    const normalized = normalizeVoiceText(text);
    return /\?$/.test(String(text || "").trim())
      || /^(what|when|where|which|who|why|how)\b/.test(normalized)
      || /^(do i|did i|am i|can i|can you|tell me|show me|list|find)\b/.test(normalized)
      || /\b(how close|what do i have|coming up|do i have|any notes|what events|what appointments)\b/.test(normalized);
  }

  function parseVoiceTaskRecurrence(text, startDate) {
    if (!voiceTaskHasRecurrence(text)) return { recurring: false, repeat: "None", schedule: "None", days: [], label: "None" };
    const schedule = parseVoiceHabitSchedule(text);
    const days = parseVoiceHabitDays(text, startDate, schedule);
    const label = voiceRecurrenceLabel(schedule, days, startDate);
    return {
      recurring: true,
      repeat: schedule === "Weekdays" ? "Custom" : schedule,
      schedule,
      days,
      label
    };
  }

  function voiceTaskHasRecurrence(text) {
    return /\b(repeat|recurring|daily|every day|each day|weekdays?|workdays?|weekly|every week|monthly|every month|every other week|bi weekly|bi-weekly)\b/.test(text)
      || voiceTextHasSpecificDays(text);
  }

  function voiceTextHasSpecificDays(text) {
    const dayMatches = Array.from(text.matchAll(/\b(sundays?|sun|mondays?|mon|tuesdays?|tues?|wednesdays?|wed|thursdays?|thurs?|thur|thu|fridays?|fri|saturdays?|sat)\b/g)).map((match) => match[1]);
    const uniqueDays = new Set(dayMatches.map((day) => day.slice(0, 3)));
    return /\bevery\s+(sundays?|sun|mondays?|mon|tuesdays?|tues?|wednesdays?|wed|thursdays?|thurs?|thur|thu|fridays?|fri|saturdays?|sat)\b/.test(text)
      || /\b(sundays|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays)\b/.test(text)
      || (/\b(every|on)\b/.test(text) && uniqueDays.size > 1);
  }

  function voiceRecurrenceLabel(schedule, days, startDate) {
    if (schedule === "Daily") return "Every day";
    if (schedule === "Weekdays") return "Monday through Friday";
    if (schedule === "Monthly") return `Monthly on day ${Number(String(startDate || todayIso()).slice(-2))}`;
    if (days?.length) return `Every ${days.map((day) => weekdayLabels[day]).filter(Boolean).join(", ")}`;
    return schedule || "Repeating";
  }

  function parseVoiceHabit(rawText) {
    const source = String(rawText || "").trim();
    const normalized = normalizeVoiceText(source);
    const startDate = parseVoiceDate(normalized);
    const range = parseVoiceTimeRange(source);
    const start = range.start || "08:00";
    const duration = parseVoiceDuration(source) || 30;
    let end = range.end || timeFromMinutes(minutes(start) + duration);
    if (minutes(end) <= minutes(start)) end = timeFromMinutes(Math.min(minutes(start) + Math.max(duration, 30), 23 * 60 + 59));
    const address = parseVoiceAddress(source);
    const schedule = parseVoiceHabitSchedule(normalized);
    const days = parseVoiceHabitDays(normalized, startDate, schedule);
    const type = parseVoiceHabitType(normalized);
    return {
      source,
      title: extractVoiceHabitTitle(source, address?.raw || ""),
      description: parseVoiceHabitNotes(source),
      type,
      schedule,
      days,
      startDate,
      endDate: parseVoiceHabitEndDate(normalized, startDate),
      start,
      end,
      priority: parseVoicePriority(normalized),
      status: parseVoiceHabitStatus(normalized),
      includeHours: !/\b(do not count|don't count|dont count|not counted|exclude hours|no hours|no time total)\b/.test(normalized),
      targetCount: parseVoiceHabitTargetCount(normalized),
      address,
      color: taskCategoryColor("Habit")
    };
  }

  function applyVoiceCorrectionText(parsed, correction) {
    const source = String(correction || "").trim();
    const text = normalizeVoiceText(source);
    const changes = [];
    const oldStart = parsed.start;
    const oldEnd = parsed.end;
    const oldDuration = voiceTaskDurationMinutes(parsed);

    const status = parseVoiceStatusCorrection(text);
    if (status) {
      parsed.status = status;
      changes.push("status");
    }

    const priority = parseVoicePriorityCorrection(text);
    if (priority) {
      parsed.priority = priority;
      changes.push("priority");
    }

    if (hasVoiceDateCorrection(text)) {
      parsed.date = parseVoiceDate(text);
      changes.push("date");
    }

    const start = parseVoiceTimeCorrection(source, "start");
    const end = parseVoiceTimeCorrection(source, "end");
    const genericTime = !start && !end ? parseVoiceTimeCorrection(source, "generic") : "";
    const duration = parseVoiceDuration(source);
    if (start || genericTime) {
      parsed.start = start || genericTime;
      if (!end) parsed.end = timeFromMinutes(minutes(parsed.start) + (duration || oldDuration || 60));
      changes.push("start time");
    }
    if (end) {
      parsed.end = end;
      changes.push("end time");
    } else if (duration && !start && !genericTime) {
      parsed.end = timeFromMinutes(minutes(parsed.start || oldStart || "09:00") + duration);
      changes.push("end time");
    }
    if ((start || genericTime || end || duration) && parsed.start === oldStart && parsed.end === oldEnd) {
      const range = parseVoiceTimeRange(source);
      if (range.start) parsed.start = range.start;
      if (range.end) parsed.end = range.end;
    }

    const title = parseVoiceTitleCorrection(source);
    if (title) {
      parsed.title = title;
      changes.push("title");
    }

    const category = parseVoiceCategoryCorrection(text);
    if (category) {
      parsed.category = category;
      changes.push("category");
    }

    const repeat = parseVoiceRepeatCorrection(text);
    if (repeat) {
      const recurrence = parseVoiceTaskRecurrence(text, parsed.date || todayIso());
      parsed.repeat = recurrence.repeat || repeat;
      parsed.repeatSchedule = recurrence.schedule;
      parsed.repeatDays = recurrence.days;
      parsed.repeatLabel = recurrence.label;
      parsed.recurring = recurrence.recurring;
      changes.push("repeat");
    }

    const projectId = parseVoiceProjectCorrection(text);
    if (projectId !== undefined) {
      parsed.projectId = projectId;
      changes.push("project");
    }

    const address = parseVoiceAddress(source);
    if (address) {
      parsed.address = address;
      changes.push("address");
    }

    return [...new Set(changes)];
  }

  function voiceTaskDurationMinutes(task) {
    const start = minutes(task?.start || "");
    const end = minutes(task?.end || "");
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 60;
    const duration = end > start ? end - start : end + 24 * 60 - start;
    return duration > 0 ? duration : 60;
  }

  function reconcileVoiceTaskDates(task) {
    task.date = task.date || todayIso();
    task.start = task.start || "09:00";
    task.end = task.end || "10:00";
    task.endDate = minutes(task.end) <= minutes(task.start) ? addDaysIso(task.date, 1) : task.date;
  }

  function parseVoiceStatusCorrection(text) {
    const target = text.match(/\b(?:status|change status|set status|make status|mark(?: it)?(?: as)?)\s*(?:to|as|is)?\s*(not started|pending|in progress|started|complete|completed|done|finished|cancelled|canceled)\b/)
      || text.match(/\bto\s+(not started|pending|in progress|started|complete|completed|done|finished|cancelled|canceled)\b/);
    const statusText = target ? target[1] : text;
    if (/\b(cancelled|canceled|cancel it|cancel this)\b/.test(statusText)) return "Cancelled";
    if (/\b(completed|complete|done|finished|finish it|mark complete|mark done)\b/.test(statusText)) return "Completed";
    if (/\b(not started|pending|not start it|not started yet)\b/.test(statusText)) return "Not Started";
    if (/\b(in progress|started|start it|start this|working on|mark started|make it started)\b/.test(statusText)) return "In Progress";
    return "";
  }

  function parseVoicePriorityCorrection(text) {
    if (!/\b(priority|urgent|high|medium|low)\b/.test(text)) return "";
    return parseVoicePriority(text);
  }

  function hasVoiceDateCorrection(text) {
    return /\b(date|day|today|tomorrow|next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec|\d{1,2}[/-]\d{1,2})\b/.test(text);
  }

  function parseVoiceTimeCorrection(source, kind) {
    const timeToken = "(\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?|am|pm)?)";
    const patterns = {
      start: [
        `\\b(?:start|starts|starting|begin|begins|from)\\s+(?:time\\s+)?(?:at\\s+)?${timeToken}`,
        `\\b(?:change|set|make)\\s+(?:the\\s+)?start\\s+(?:time\\s+)?(?:to|at)\\s+${timeToken}`
      ],
      end: [
        `\\b(?:end|ends|ending|finish|finishes|until|to)\\s+(?:time\\s+)?(?:at\\s+)?${timeToken}`,
        `\\b(?:change|set|make)\\s+(?:the\\s+)?end\\s+(?:time\\s+)?(?:to|at)\\s+${timeToken}`
      ],
      generic: [
        `\\b(?:time|at|around)\\s+${timeToken}`,
        `\\b(?:change|set|make)\\s+(?:the\\s+)?time\\s+(?:to|at)\\s+${timeToken}`
      ]
    }[kind] || [];
    for (const pattern of patterns) {
      const match = source.match(new RegExp(pattern, "i"));
      if (match) return parseSpokenTime(match[1]);
    }
    return "";
  }

  function parseVoiceTitleCorrection(source) {
    const match = String(source || "").match(/\b(?:title|name|rename)(?:\s+it|\s+task)?\s+(?:to|as)?\s*["']?(.+?)["']?$/i);
    return match ? cleanupTaskTitle(match[1]) : "";
  }

  function parseVoiceCategoryCorrection(text) {
    if (!/\bcategory\b/.test(text)) return "";
    return taskCategories.find((category) => new RegExp(`\\b${escapeRegExp(category.toLowerCase())}\\b`).test(text)) || "";
  }

  function parseVoiceRepeatCorrection(text) {
    if (!/\b(repeat|daily|weekly|monthly|every)\b/.test(text)) return "";
    return parseVoiceRepeat(text);
  }

  function parseVoiceProjectCorrection(text) {
    if (/\b(no project|remove project|clear project)\b/.test(text)) return null;
    if (!/\bproject\b/.test(text)) return undefined;
    return parseVoiceProject(text) || undefined;
  }

  function parseVoiceHabitSchedule(text) {
    if (/\b(weekdays|weekday|workdays|monday through friday|mon through fri|mon to fri)\b/.test(text)) return "Weekdays";
    if (/\b(monthly|every month|once a month)\b/.test(text)) return "Monthly";
    if (voiceTextHasSpecificDays(text)) return "Weekly";
    if (/\b(weekly|every week|once a week|on sundays|on mondays|on tuesdays|on wednesdays|on thursdays|on fridays|on saturdays)\b/.test(text)) return "Weekly";
    if (/\b(daily|every day|each day)\b/.test(text)) return "Daily";
    return "Daily";
  }

  function parseVoiceHabitDays(text, startDate, schedule) {
    if (schedule === "Daily") return [0, 1, 2, 3, 4, 5, 6];
    if (schedule === "Weekdays") return [1, 2, 3, 4, 5];
    if (/\b(weekends|saturday and sunday|sunday and saturday)\b/.test(text)) return [0, 6];
    const dayMap = {
      sunday: 0, sundays: 0, sun: 0,
      monday: 1, mondays: 1, mon: 1,
      tuesday: 2, tuesdays: 2, tue: 2, tues: 2,
      wednesday: 3, wednesdays: 3, wed: 3,
      thursday: 4, thursdays: 4, thu: 4, thur: 4, thurs: 4,
      friday: 5, fridays: 5, fri: 5,
      saturday: 6, saturdays: 6, sat: 6
    };
    const days = [];
    text.replace(/\b(sundays?|sun|mondays?|mon|tuesdays?|tues?|wednesdays?|wed|thursdays?|thurs?|thur|thu|fridays?|fri|saturdays?|sat)\b/g, (match) => {
      const day = dayMap[match];
      if (Number.isInteger(day) && !days.includes(day)) days.push(day);
      return match;
    });
    return days.length ? days : [parseLocalDate(startDate || todayIso()).getDay()];
  }

  function parseVoiceHabitType(text) {
    const direct = habitTypeOptions.find((type) => new RegExp(`\\b${escapeRegExp(type.toLowerCase())}\\b`).test(text));
    if (direct) return direct;
    if (/\b(workout|exercise|gym|run|running|lift|lifting|fitness)\b/.test(text)) return "Fitness";
    if (/\b(health|medicine|meditation|sleep|water|walk)\b/.test(text)) return "Health";
    if (/\b(study|learn|learning|class|classes|read|reading|course)\b/.test(text)) return "Learning";
    if (/\b(budget|bill|money|finance|saving|savings)\b/.test(text)) return "Finance";
    if (/\b(work|job|career|business)\b/.test(text)) return "Work";
    if (/\b(home|clean|chores|house)\b/.test(text)) return "Home";
    return "Personal";
  }

  function parseVoiceHabitStatus(text) {
    if (/\b(paused|pause|inactive|archived|archive)\b/.test(text)) return "Paused";
    return "Active";
  }

  function parseVoiceHabitTargetCount(text) {
    const match = text.match(/\b(\d+)\s*(?:times|x|completions?)\s*(?:per|a|each)?\s*(?:day|daily)?\b/);
    const count = match ? Number(match[1]) : 1;
    return Number.isFinite(count) && count > 0 ? Math.min(20, Math.round(count)) : 1;
  }

  function parseVoiceHabitEndDate(text, startDate) {
    const until = text.match(/\b(?:until|ending|ends on|end date)\s+(.+)$/);
    if (!until) return "";
    const parsed = parseVoiceDate(until[1]);
    return parsed && parsed !== startDate ? parsed : "";
  }

  function parseVoiceHabitNotes(source) {
    const match = String(source || "").match(/\b(?:notes?|description|memo)\s*[:\-]?\s*(.+)$/i);
    return match ? cleanupAddressPart(match[1]) : "";
  }

  function normalizeVoiceText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\ba\.?m\.?\b/g, "am")
      .replace(/\bp\.?m\.?\b/g, "pm")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseVoicePriority(text) {
    if (/\burgent\b/.test(text)) return "Urgent";
    if (/\bhigh\b/.test(text)) return "High";
    if (/\blow\b/.test(text)) return "Low";
    if (/\bmedium\b/.test(text)) return "Medium";
    return "Medium";
  }

  function parseVoiceStatus(text) {
    if (/\b(cancelled|canceled|cancel)\b/.test(text)) return "Cancelled";
    if (/\b(completed|complete|done|finished)\b/.test(text)) return "Completed";
    if (/\b(in progress|started|working on)\b/.test(text)) return "In Progress";
    if (/\b(not started|pending)\b/.test(text)) return "Not Started";
    return "Not Started";
  }

  function parseVoiceCategory(text) {
    return taskCategories.find((category) => new RegExp(`\\b${escapeRegExp(category.toLowerCase())}\\b`).test(text)) || "General";
  }

  function parseVoiceRepeat(text) {
    if (/\b(every day|daily)\b/.test(text)) return "Daily";
    if (/\b(weekdays|weekday|workdays|monday through friday|mon through fri|mon to fri)\b/.test(text)) return "Custom";
    if (voiceTextHasSpecificDays(text)) return "Custom";
    if (/\b(bi weekly|bi-weekly|every other week)\b/.test(text)) return "Bi-Weekly";
    if (/\b(weekly|every week)\b/.test(text)) return "Weekly";
    if (/\b(monthly|every month)\b/.test(text)) return "Monthly";
    return "None";
  }

  function parseVoiceProject(text) {
    return (data.projects.find((project) => {
      const name = escapeRegExp(project.name.toLowerCase());
      return new RegExp(`\\bproject\\s+${name}\\b`).test(text) || new RegExp(`\\b${name}\\s+project\\b`).test(text);
    }) || {}).id || null;
  }

  function parseVoiceDate(text) {
    const baseIso = ui.selectedDate || todayIso();
    const base = parseLocalDate(baseIso);
    if (/\btoday\b/.test(text)) return baseIso;
    if (/\btomorrow\b/.test(text)) return addDaysIso(baseIso, 1);
    const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
    if (numeric) {
      const year = normalizeSpokenYear(numeric[3], base.getFullYear());
      return isoDate(new Date(year, Number(numeric[1]) - 1, Number(numeric[2]), 12));
    }
    const monthMatch = text.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/);
    if (monthMatch) {
      const year = normalizeSpokenYear(monthMatch[3], base.getFullYear());
      return isoDate(new Date(year, monthIndex(monthMatch[1]), Number(monthMatch[2]), 12));
    }
    const weekday = text.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (weekday) {
      const target = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(weekday[2]);
      let delta = (target - base.getDay() + 7) % 7;
      if (weekday[1] || delta === 0) delta = delta || 7;
      return addDaysIso(baseIso, delta);
    }
    const ordinal = text.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/);
    if (ordinal) {
      const candidate = new Date(base.getFullYear(), base.getMonth(), Number(ordinal[1]), 12);
      if (candidate < base) candidate.setMonth(candidate.getMonth() + 1);
      return isoDate(candidate);
    }
    return baseIso;
  }

  function normalizeSpokenYear(yearValue, fallback) {
    if (!yearValue) return fallback;
    const year = Number(yearValue);
    if (year < 100) return 2000 + year;
    return year;
  }

  function monthIndex(name) {
    return {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11
    }[name] ?? 0;
  }

  function parseVoiceTimeRange(source) {
    const timeToken = "(\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?|am|pm)?)";
    const range = source.match(new RegExp(`\\b(?:from|between|start(?:ing)?(?: time)?(?: at)?)\\s+${timeToken}\\s+(?:to|until|and|-)\\s+${timeToken}`, "i"));
    if (range) return timesFromMatch(range[1], range[2]);
    const explicitEnd = source.match(new RegExp(`\\b(?:end|ending|end time)\\s+(?:at\\s+)?${timeToken}`, "i"));
    const explicitStart = source.match(new RegExp(`\\b(?:start|starting|start time)\\s+(?:at\\s+)?${timeToken}`, "i"));
    if (explicitStart || explicitEnd) return timesFromMatch(explicitStart?.[1] || "9 AM", explicitEnd?.[1] || "10 AM");
    const timedAt = source.match(new RegExp(`\\b(?:at|around)\\s+${timeToken}`, "i"));
    if (timedAt) {
      const start = parseSpokenTime(timedAt[1]);
      const duration = parseVoiceDuration(source) || 60;
      return { start, end: timeFromMinutes(minutes(start) + duration) };
    }
    return { start: "", end: "" };
  }

  function timesFromMatch(startRaw, endRaw) {
    const endHint = meridiemFromTime(endRaw);
    const startHint = meridiemFromTime(startRaw) || endHint;
    const start = parseSpokenTime(startRaw, startHint);
    const end = parseSpokenTime(endRaw, endHint || startHint);
    return { start, end };
  }

  function parseVoiceDuration(source) {
    const duration = normalizeVoiceText(source).match(/\b(?:for|duration)\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/);
    if (!duration) return 0;
    const amount = Number(duration[1]);
    if (!Number.isFinite(amount)) return 0;
    return duration[2].startsWith("hour") || duration[2].startsWith("hr") ? Math.round(amount * 60) : Math.round(amount);
  }

  function parseSpokenTime(raw, hint = "") {
    const cleaned = String(raw || "").toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
    const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
    if (!match) return "";
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = match[3] || hint || defaultMeridiem(hour);
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return timeFromMinutes(hour * 60 + minute);
  }

  function meridiemFromTime(raw) {
    const match = String(raw || "").toLowerCase().match(/\b(a\.?m\.?|p\.?m\.?|am|pm)\b/);
    if (!match) return "";
    return match[1].startsWith("p") ? "pm" : "am";
  }

  function defaultMeridiem(hour) {
    if (hour === 12) return "pm";
    if (hour >= 1 && hour <= 6) return "pm";
    return "am";
  }

  function parseVoiceAddress(source) {
    const addressStart = source.match(/\b\d{1,6}\s+(?!a\.?m\.?\b|p\.?m\.?\b|am\b|pm\b)[A-Za-z0-9.' -]+?\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|place|pl\.?|way|parkway|pkwy)\b/i);
    if (!addressStart) return null;
    const start = addressStart.index;
    let raw = source.slice(start).trim();
    raw = raw.split(/\b(?:from|between|starting|start time|ending|end time|today|tomorrow|next sunday|next monday|next tuesday|next wednesday|next thursday|next friday|next saturday|low priority|medium priority|high priority|urgent priority|priority|status|project|category|repeat)\b/i)[0];
    raw = raw.replace(/[.;]+$/g, "").replace(/\s+/g, " ").trim();
    const streetMatch = raw.match(/^(\d{1,6}\s+.*?\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|place|pl\.?|way|parkway|pkwy)\b\.?)/i);
    if (!streetMatch) return null;
    const street = cleanupAddressPart(streetMatch[1]);
    let rest = raw.slice(streetMatch[1].length).replace(/^,?\s*/, "");
    const zipMatch = rest.match(/\b\d{5}(?:-\d{4})?\b/);
    const zip = zipMatch ? zipMatch[0] : "";
    if (zip) rest = rest.replace(zip, "");
    const stateMatch = rest.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)\b/i);
    const state = stateMatch ? stateMatch[0].toUpperCase() : "";
    if (state) rest = rest.replace(stateMatch[0], "");
    rest = rest.replace(/\b(usa|united states)\b/i, "").replace(/\bthe\s+/i, "").replace(/[,\s]+$/g, "").replace(/^[,\s]+/g, "");
    return {
      raw,
      label: "Voice Location",
      street,
      city: cleanupAddressPart(rest),
      state,
      zip,
      country: "USA",
      entity: "task"
    };
  }

  function cleanupAddressPart(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/[,\s]+$/g, "").replace(/^[,\s]+/g, "").trim();
  }

  function extractVoiceHabitTitle(source, addressRaw) {
    let text = String(source || "").trim();
    text = text.replace(/^(please\s+)?(add|create|make|schedule|set up)\s+(a\s+|new\s+)?(habit|routine|recurring habit)\s*[:\-]?\s*(called|named|for|to)?\s*/i, "");
    const stopPatterns = [
      /\btoday\b/i,
      /\btomorrow\b/i,
      /\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
      /\bon\s+(\d{1,2}[/-]\d{1,2}|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\b/i,
      /\bfrom\s+\d/i,
      /\bbetween\s+\d/i,
      /\bat\s+\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?|am|pm)?\b/i,
      /\bat\s+\d{1,6}\s+[A-Za-z]/i,
      /\b(address|location)\b/i,
      /\b(daily|every day|weekdays?|workdays?|weekly|monthly|every week|every month)\b/i,
      /\b(low|medium|high|urgent)\s+priority\b/i,
      /\b(status|type|category|schedule|repeat|notes?|description|memo)\b/i
    ];
    if (addressRaw) text = text.replace(addressRaw, "");
    let endIndex = text.length;
    stopPatterns.forEach((pattern) => {
      const match = text.match(pattern);
      if (match && match.index >= 0) endIndex = Math.min(endIndex, match.index);
    });
    let candidate = text.slice(0, endIndex).trim();
    if (!candidate || candidate.length < 2) candidate = stripVoiceHabitFragments(source, addressRaw);
    return cleanupHabitTitle(candidate);
  }

  function stripVoiceHabitFragments(source, addressRaw) {
    return String(source || "")
      .replace(/^(please\s+)?(add|create|make|schedule|set up)\s+(a\s+|new\s+)?(habit|routine|recurring habit)\s*[:\-]?\s*/i, "")
      .replace(addressRaw || "$^", "")
      .replace(/\b(today|tomorrow)\b/ig, "")
      .replace(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/ig, "")
      .replace(/\b(from|between|at|around|to|until|and)\s+\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?|am|pm)?\b/ig, "")
      .replace(/\b(for|duration)\s+\d+(?:\.\d+)?\s*(hours?|hrs?|minutes?|mins?)\b/ig, "")
      .replace(/\b(daily|every day|weekdays?|workdays?|weekly|monthly|every week|every month)\b/ig, "")
      .replace(/\b(low|medium|high|urgent)\s+priority\b/ig, "")
      .replace(/\b(status|type|category|schedule|repeat|notes?|description|memo)\s+.+$/ig, "")
      .trim();
  }

  function cleanupHabitTitle(value) {
    const title = String(value || "").replace(/^[,.:\-\s]+/g, "").replace(/[,.:-]+$/g, "").replace(/\s+/g, " ").trim();
    if (!title) return "Voice Habit";
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  function extractVoiceTaskTitle(source, addressRaw) {
    let text = String(source || "").trim();
    text = text.replace(/^(please\s+)?(add|create|make|schedule|set up)\s+(a\s+|new\s+)?(task|todo|to do|reminder)\s*(called|named|for|to)?\s*/i, "");
    text = text.replace(/^to\s+/i, "");
    const stopPatterns = [
      /\btoday\b/i,
      /\btomorrow\b/i,
      /\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
      /\bon\s+(\d{1,2}[/-]\d{1,2}|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\b/i,
      /\bfrom\s+\d/i,
      /\bbetween\s+\d/i,
      /\bat\s+\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?|am|pm)?\b/i,
      /\bat\s+\d{1,6}\s+[A-Za-z]/i,
      /\bevery\s+(day|weekday|week|month|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i,
      /\b(weekdays?|workdays?|daily|weekly|monthly)\b/i,
      /\b(address|location)\b/i,
      /\b(low|medium|high|urgent)\s+priority\b/i,
      /\b(status|project|category|repeat)\b/i
    ];
    if (addressRaw) text = text.replace(addressRaw, "");
    let endIndex = text.length;
    stopPatterns.forEach((pattern) => {
      const match = text.match(pattern);
      if (match && match.index >= 0) endIndex = Math.min(endIndex, match.index);
    });
    let candidate = text.slice(0, endIndex).trim();
    if (!candidate || candidate.length < 2) candidate = stripVoiceFragments(source, addressRaw);
    return cleanupTaskTitle(candidate);
  }

  function stripVoiceFragments(source, addressRaw) {
    return String(source || "")
      .replace(/^(please\s+)?(add|create|make|schedule|set up)\s+(a\s+|new\s+)?(task|todo|to do|reminder)\s*/i, "")
      .replace(addressRaw || "$^", "")
      .replace(/\b(today|tomorrow)\b/ig, "")
      .replace(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/ig, "")
      .replace(/\b(from|between|at|around|to|until|and)\s+\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?|am|pm)?\b/ig, "")
      .replace(/\b(for|duration)\s+\d+(?:\.\d+)?\s*(hours?|hrs?|minutes?|mins?)\b/ig, "")
      .replace(/\bevery\s+(day|weekday|week|month|sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:\s*,?\s*(and\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday))*\b/ig, "")
      .replace(/\b(weekdays?|workdays?|daily|weekly|monthly)\b/ig, "")
      .replace(/\b(low|medium|high|urgent)\s+priority\b/ig, "")
      .replace(/\b(status|project|category|repeat)\s+\w+\b/ig, "")
      .trim();
  }

  function cleanupTaskTitle(value) {
    const title = String(value || "").replace(/[,.:-]+$/g, "").replace(/\s+/g, " ").trim();
    if (!title) return "Voice Task";
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function payBill(billId) {
    const bill = data.bills.find((item) => item.id === billId);
    if (!bill) return;
    const confirmation = `BM-${Date.now().toString().slice(-8)}`;
    bill.status = "Paid";
    bill.lastPaidDate = todayIso();
    bill.lastConfirmation = confirmation;
    data.payments.unshift({
      id: id("pay"),
      billId: bill.id,
      name: bill.name,
      payee: bill.payee,
      amount: bill.amount,
      method: bill.method,
      status: "Paid",
      date: todayIso(),
      confirmation,
      rail: "Local prototype"
    });
    data.transactions.unshift({
      id: id("tx"),
      type: "expense",
      name: bill.name,
      merchant: bill.payee,
      category: bill.category,
      amount: bill.amount,
      projected: bill.projected,
      date: todayIso(),
      frequency: "Monthly",
      method: bill.method,
      status: "Paid",
      notes: `Logged from bill payment. Confirmation ${confirmation}.`
    });
    saveData();
    render();
    showToast(`Bill marked paid. Confirmation ${confirmation}.`);
  }

  function saveBill(billId) {
    const bill = data.bills.find((item) => item.id === billId);
    const payload = {
      name: value("billName") || "New Bill",
      payee: value("billName") || "New Payee",
      category: value("billCategory") || "Utilities",
      amount: numberValue("billAmount"),
      projected: numberValue("billProjected") || numberValue("billAmount"),
      dueDate: value("billDue") || "2026-05-12",
      status: "Unpaid",
      method: value("billAutopay") === "None" ? "Manual" : value("billAutopay"),
      autopay: value("billAutopay") !== "None",
      addressId: bill ? bill.addressId : null,
      image: imageValue("bill"),
      imageZoom: imageZoomValue("bill"),
      imageX: imagePanValue("bill", "x"),
      imageY: imagePanValue("bill", "y"),
      imageFit: imageFitValue("bill"),
      imageOpacity: imageOpacityValue("bill")
    };
    if (bill) Object.assign(bill, payload);
    else data.bills.unshift({ id: id("bill"), ...payload });
    saveData();
    closeModal();
  }

  function saveTransaction(txId) {
    const tx = data.transactions.find((item) => item.id === txId);
    const category = transactionCategoryFromForm();
    if (!category) {
      showToast("Enter the new transaction category name first.", "danger");
      return;
    }
    const payload = {
      type: value("txType") || "expense",
      name: value("txName") || "Transaction",
      merchant: category || "Merchant",
      category,
      amount: numberValue("txAmount"),
      projected: numberValue("txProjected") || numberValue("txAmount"),
      date: value("txDate") || "2026-05-06",
      frequency: value("txFrequency") || "Monthly",
      method: "Chase Checking",
      status: value("txType") === "income" ? "Received" : "Paid",
      notes: value("txNotes")
    };
    if (tx) Object.assign(tx, payload);
    else data.transactions.unshift({ id: id("tx"), ...payload });
    saveData();
    closeModal();
  }

  function transactionCategoryFromForm() {
    const selected = value("txCategory");
    const typed = normalizeCategoryName(value("txNewCategory"));
    if (typed) return ensureTransactionCategory(typed);
    if (selected === ADD_TRANSACTION_CATEGORY_VALUE) return "";
    return ensureTransactionCategory(selected || "Other");
  }

  function saveSubscriptionAmount(subId, mode) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub) return;
    if (mode === "editSubscriptionProjected") sub.projected = numberValue("subAmount");
    else sub.amount = numberValue("subAmount");
    saveData();
    closeModal();
  }

  function resetProjected(subId) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub) return;
    sub.projected = sub.amount;
    saveData();
    closeModal();
  }

  function paySubscription(subId, accountId) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    const account = data.accounts.find((item) => item.id === accountId);
    if (!sub || !account) return;
    account.balance -= sub.amount;
    data.subscriptionHistory.unshift({ id: id("sth"), subId: sub.id, name: sub.name, date: "2026-05-06", amount: sub.amount, status: "Paid", code: `CONF-${sub.name.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}` });
    data.transactions.unshift({ id: id("tx"), type: "expense", name: sub.name, merchant: sub.name, category: "Subscriptions", amount: sub.amount, projected: sub.projected, date: "2026-05-06", frequency: sub.cycle, method: account.name, status: "Paid", notes: "Subscription payment." });
    saveData();
    closeModal();
  }

  function setSubscriptionStatus(subId, status) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub) return;
    sub.status = status;
    if (status === "Cancelled") {
      sub.autopay = false;
      if (!data.cancellations.some((item) => item.subscriptionId === sub.id && item.status !== "Completed")) {
        data.cancellations.unshift({
          id: id("cancel"),
          subscriptionId: sub.id,
          name: sub.name,
          provider: sub.name,
          status: "Started",
          date: todayIso(),
          notes: "Provider cancellation started in BillMaster. Upload confirmation or mark completed after provider confirms."
        });
      }
    }
    saveData();
    closeModal();
  }

  function saveLoan(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    const previousBorrower = loan ? loan.borrower : "";
    const amount = numberValue("loanAmount");
    const selectedContactId = value("loanContact");
    const contactSearchValue = value("loanContactSearch");
    const wantsNewContact = selectedContactId === ADD_LOAN_CONTACT_VALUE || contactSearchValue === "+ Add new contact";
    let contact = data.contacts.find((item) => item.id === selectedContactId) || findLoanContactFromText(contactSearchValue);
    const borrower = value("loanBorrower") || contact?.name || (wantsNewContact ? "" : contactSearchValue) || "Borrower";
    const loanDate = value("loanDate") || todayIso();
    const dueDate = value("loanDue") || addDaysIso(loanDate, 14);
    if (wantsNewContact) {
      if (!value("loanBorrower")) {
        showToast("Enter a borrower name before adding a new contact.", "danger");
        return;
      }
      const existingContact = data.contacts.find((item) => item.name.toLowerCase() === borrower.toLowerCase());
      contact = existingContact || { id: id("contact"), name: borrower, email: "", phone: "", groupIds: [], addressId: null };
      contact.name = borrower;
      contact.phone = value("loanPhone") || contact.phone || "";
      contact.email = value("loanEmail") || contact.email || "";
      if (!existingContact) data.contacts.unshift(contact);
    }
    const payload = {
      contactId: contact?.id || null,
      borrower,
      borrowerPhone: value("loanPhone") || contact?.phone || "",
      borrowerEmail: value("loanEmail") || contact?.email || "",
      description: value("loanDescription"),
      amount,
      repaid: loan ? numberValue("loanRepaid") : 0,
      forgiven: loan ? numberValue("loanForgiven") : 0,
      date: loanDate,
      dueDate,
      type: "Lent",
      done: loan?.done === true,
      doneAt: loan?.doneAt || "",
      image: imageValue("loan"),
      imageZoom: imageZoomValue("loan"),
      imageX: imagePanValue("loan", "x"),
      imageY: imagePanValue("loan", "y"),
      imageFit: imageFitValue("loan"),
      imageOpacity: imageOpacityValue("loan")
    };
    if (contact) {
      if (value("loanPhone")) contact.phone = value("loanPhone");
      if (value("loanEmail")) contact.email = value("loanEmail");
    }
    if (!loan) {
      const writeKey = `loan:${borrower.toLowerCase()}:${amount}:${dueDate}:${value("loanDescription").toLowerCase()}`;
      if (shouldSkipRecentWrite(writeKey)) {
        showToast("That loan was already saved.", "danger");
        return;
      }
    }
    payload.status = loanStatusFromAmounts(payload);
    if (loan) {
      Object.assign(loan, payload);
      syncLoanTransactionsAfterBorrowerEdit(loan.id, previousBorrower, borrower);
    } else {
      data.loans.unshift({ id: id("loan"), ...payload });
    }
    saveData();
    ui.modal = null;
    showToast(loan ? "Loan updated." : "Loan saved.");
  }

  function loanAlertMessage(loan) {
    return [
      `Loan reminder for ${loan.borrower}`,
      `Original amount: ${money(loanAmount(loan))}`,
      `Repaid: ${money(loanRepaid(loan))}`,
      `Forgiven: ${money(loanForgiven(loan))}`,
      `Outstanding: ${money(loanRemaining(loan))}`,
      `Due date: ${dateLabel(loan.dueDate)}`,
      loan.description ? `Notes: ${loan.description}` : ""
    ].filter(Boolean).join("\n");
  }

  function openLoanAlert(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (!loan) return;
    const contact = data.contacts.find((item) => item.id === loan.contactId);
    const recipient = loan.borrowerEmail || contact?.email || "";
    if (!recipient) {
      showToast("Add an email to this loan/contact first. Phone is stored for SMS provider setup later.", "danger");
      return;
    }
    const subject = `BillMaster loan reminder: ${loan.borrower}`;
    window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(loanAlertMessage(loan))}`;
  }

  function syncLoanTransactionsAfterBorrowerEdit(loanId, previousBorrower, borrower) {
    if (!loanId || previousBorrower === borrower) return;
    data.transactions.forEach((tx) => {
      const exactLoan = tx.loanId === loanId;
      const likelyLoan = !tx.loanId && tx.category === "Lending" && tx.merchant === previousBorrower && String(tx.name || "").startsWith("Repayment from ");
      if (!exactLoan && !likelyLoan) return;
      tx.loanId = loanId;
      tx.name = `Repayment from ${borrower}`;
      tx.merchant = borrower;
    });
  }

  function saveRepayment(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (!loan) return;
    const amount = numberValue("repayAmount");
    if (amount <= 0) {
      showToast("Enter a repayment amount first.", "danger");
      return;
    }
    const repaymentDate = value("repayDate") || "2026-05-06";
    const writeKey = `repayment:${loanId}:${amount}:${repaymentDate}`;
    if (shouldSkipRecentWrite(writeKey)) {
      showToast("That repayment was already saved.", "danger");
      return;
    }
    const applied = Math.min(amount, loanRemaining(loan));
    if (applied <= 0) {
      showToast("This loan is already settled.", "danger");
      return;
    }
    loan.repaid = moneyNumber(loanRepaid(loan) + applied);
    loan.status = loanStatusFromAmounts(loan);
    data.transactions.unshift({ id: id("tx"), loanId: loan.id, type: "income", name: `Repayment from ${loan.borrower}`, merchant: loan.borrower, category: "Lending", amount: applied, projected: applied, date: repaymentDate, frequency: "One time", method: "Chase Checking", status: "Received", notes: "Loan repayment." });
    data.transactions = dedupeLendingTransactions(data.transactions);
    saveData();
    ui.modal = null;
    showToast("Repayment saved and transaction logged.");
  }

  function forgiveLoan(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (!loan) return;
    openModal("forgiveLoan", loan.id);
  }

  function saveForgiveness(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (!loan) return;
    const amount = numberValue("forgiveAmount");
    if (amount <= 0) {
      showToast("Enter a forgiven amount first.", "danger");
      return;
    }
    const applied = Math.min(amount, loanRemaining(loan));
    if (applied <= 0) {
      showToast("This loan is already settled.", "danger");
      return;
    }
    loan.forgiven = moneyNumber(loanForgiven(loan) + applied);
    loan.status = loanStatusFromAmounts(loan);
    const remaining = loanRemaining(loan);
    saveData();
    ui.modal = null;
    showToast(`${money(applied)} forgiven. ${money(remaining)} still outstanding.`);
  }

  function markLoanDone(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (!loan) return;
    loan.done = true;
    loan.doneAt = todayIso();
    loan.status = "Done";
    saveData();
    showToast(`${loan.borrower} moved to Done. Use the Done filter to review it later.`);
  }

  function restoreLoan(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (!loan) return;
    loan.done = false;
    loan.doneAt = "";
    loan.status = loanStatusFromAmounts({ ...loan, done: false, status: "" });
    saveData();
    showToast(`${loan.borrower} restored to active lending.`);
  }

  function deleteLoan(loanId) {
    const loan = data.loans.find((item) => item.id === loanId);
    if (loan && !confirmDelete(`loan for ${loan.borrower}`)) return;
    data.loans = data.loans.filter((item) => item.id !== loanId);
    saveData();
    showToast("Loan deleted.");
  }

  function deleteBill(billId) {
    const bill = data.bills.find((item) => item.id === billId);
    if (!bill || !confirmDelete(bill.name)) return;
    data.bills = data.bills.filter((item) => item.id !== billId);
    data.tasks.forEach((task) => {
      if (task.billId === billId) task.billId = null;
    });
    ui.modal = null;
    saveData();
    showToast("Bill deleted.");
  }

  function deleteTransaction(txId) {
    const tx = data.transactions.find((item) => item.id === txId);
    if (!tx || !confirmDelete(tx.name)) return;
    data.transactions = data.transactions.filter((item) => item.id !== txId);
    ui.modal = null;
    saveData();
    showToast("Transaction deleted.");
  }

  function deleteSubscription(subId) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub || !confirmDelete(sub.name)) return;
    data.subscriptions = data.subscriptions.filter((item) => item.id !== subId);
    data.subscriptionHistory = data.subscriptionHistory.filter((item) => item.subId !== subId);
    ui.modal = null;
    saveData();
    showToast("Subscription deleted.");
  }

  function deleteAddress(addrId) {
    const addr = data.addresses.find((item) => item.id === addrId);
    if (!addr || !confirmDelete(addr.label)) return;
    data.addresses = data.addresses.filter((item) => item.id !== addrId);
    ui.selectedAddresses = ui.selectedAddresses.filter((item) => item !== addrId);
    ["tasks", "bills", "contacts", "habits"].forEach((collection) => {
      data[collection].forEach((item) => {
        if (item.addressId === addrId) item.addressId = null;
      });
    });
    ui.modal = null;
    saveData();
    showToast("Address deleted.");
  }

  function deleteTask(taskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task && isHabitInstanceId(taskId)) return deleteHabit(taskId);
    if (!task) return;
    data.tasks = data.tasks.filter((item) => item.id !== taskId);
    ui.selectedTasks = ui.selectedTasks.filter((item) => item !== taskId);
    ui.modal = null;
    saveData();
    showToast("Task deleted. Undo is available.");
  }

  function deleteNote(noteId) {
    const note = data.notes.find((item) => item.id === noteId);
    if (!note) return;
    data.notes = data.notes.filter((item) => item.id !== noteId);
    ui.selectedNotes = ui.selectedNotes.filter((idValue) => idValue !== noteId);
    ui.modal = null;
    saveData();
    showToast("Note deleted. Undo is available.");
  }

  function updateNoteInline(noteId, field, rawValue) {
    const note = data.notes.find((item) => item.id === noteId);
    if (!note) return;
    const nextValue = String(rawValue || "").trim();
    if (field === "importance") {
      note.importance = ["Low", "Medium", "High", "Critical"].includes(nextValue) ? nextValue : "Low";
    } else if (field === "subject") {
      if (nextValue === ADD_NOTE_SUBJECT_VALUE) {
        const subject = promptForNoteSubject(note.notebookId);
        if (!subject) return render();
        note.subject = ensureNotebookSubject(note.notebookId, subject);
      } else if (nextValue === DELETE_NOTE_SUBJECT_VALUE) {
        if (note.notebookId && note.subject) return deleteNotebookSubject(note.notebookId, note.subject);
        note.subject = "";
      } else {
        note.subject = normalizeNoteSubjectName(nextValue);
        if (note.notebookId && note.subject) ensureNotebookSubject(note.notebookId, note.subject);
      }
    } else if (field === "notebookId") {
      if (nextValue === ADD_NOTEBOOK_VALUE) {
        const title = window.prompt("New notebook name", "");
        const notebook = createNotebookFromTitle(title);
        if (!notebook) return render();
        note.notebookId = notebook.id;
        if (note.subject) ensureNotebookSubject(notebook.id, note.subject);
      } else {
        note.notebookId = data.notebooks.some((item) => item.id === nextValue) ? nextValue : null;
        if (note.notebookId && note.subject) ensureNotebookSubject(note.notebookId, note.subject);
      }
    } else {
      return;
    }
    note.updatedAt = new Date().toISOString();
    saveData();
    render();
    showToast("Note updated.");
  }

  function visibleNotesForCurrentView() {
    const notebookId = ui.notebookId;
    const baseNotes = notebookId ? data.notes.filter((note) => note.notebookId === notebookId) : data.notes;
    return filteredNotesForBase(baseNotes);
  }

  function selectedNoteRecords() {
    return ui.selectedNotes.map((noteId) => data.notes.find((note) => note.id === noteId)).filter(Boolean);
  }

  function selectedNoteDragIds(anchorNoteId = "") {
    const selectedValidIds = ui.selectedNotes.filter((noteId) => data.notes.some((note) => note.id === noteId));
    if (anchorNoteId && selectedValidIds.includes(anchorNoteId)) return selectedValidIds;
    return anchorNoteId && data.notes.some((note) => note.id === anchorNoteId) ? [anchorNoteId] : [];
  }

  function toggleNoteSelect(noteId) {
    if (!noteId) return;
    ui.selectedNotes = ui.selectedNotes.includes(noteId) ? ui.selectedNotes.filter((item) => item !== noteId) : [...ui.selectedNotes, noteId];
    render();
  }

  function selectVisibleNotes() {
    const ids = visibleNotesForCurrentView().map((note) => note.id);
    const allSelected = ids.length && ids.every((noteId) => ui.selectedNotes.includes(noteId));
    ui.selectedNotes = allSelected ? ui.selectedNotes.filter((noteId) => !ids.includes(noteId)) : Array.from(new Set([...ui.selectedNotes, ...ids]));
    render();
  }

  function selectUnassignedNotes() {
    const ids = data.notes.filter((note) => !note.notebookId).map((note) => note.id);
    const allSelected = ids.length && ids.every((noteId) => ui.selectedNotes.includes(noteId));
    ui.selectedNotes = allSelected ? ui.selectedNotes.filter((noteId) => !ids.includes(noteId)) : Array.from(new Set([...ui.selectedNotes, ...ids]));
    render();
  }

  function clearSelectedNotes() {
    ui.selectedNotes = [];
    render();
  }

  function deleteSelectedNotes() {
    const ids = ui.selectedNotes.filter((noteId) => data.notes.some((note) => note.id === noteId));
    if (!ids.length) return showToast("Select at least one note first.", "danger");
    data.notes = data.notes.filter((note) => !ids.includes(note.id));
    ui.selectedNotes = [];
    const saved = saveData();
    if (!saved) return showToast(ui.lastSaveError, "danger");
    showToast(`${ids.length} note${ids.length === 1 ? "" : "s"} deleted. Undo is available.`);
  }

  function duplicateNotes(noteId = "") {
    const sourceIds = (noteId ? [noteId] : ui.selectedNotes).filter((idValue) => data.notes.some((note) => note.id === idValue));
    if (!sourceIds.length) return showToast("Select at least one note to duplicate.", "danger");
    const count = clamp(Math.round(Number(value("duplicateNoteCount") || 1)), 1, 25);
    const created = [];
    sourceIds.forEach((sourceId) => {
      const source = data.notes.find((note) => note.id === sourceId);
      for (let index = 1; index <= count; index += 1) {
        created.push({
          ...structuredClone(source),
          id: id("note"),
          title: `${source.title} Copy${count > 1 ? ` ${index}` : ""}`,
          date: todayIso()
        });
      }
    });
    data.notes.unshift(...created);
    ui.selectedNotes = created.map((note) => note.id);
    const saved = saveData();
    if (!saved) return showToast(ui.lastSaveError, "danger");
    closeModal();
    showToast(`${created.length} note duplicate${created.length === 1 ? "" : "s"} created.`);
  }

  function saveSelectedNoteSubject() {
    const notes = selectedNoteRecords();
    if (!notes.length) return showToast("Select at least one note first.", "danger");
    let subject = String(value("bulkNoteSubject") || "").trim();
    if (subject === ADD_NOTE_SUBJECT_VALUE) {
      subject = promptForNoteSubject(ui.notebookId || notes[0]?.notebookId || "");
      if (!subject) return;
    }
    subject = normalizeNoteSubjectName(subject);
    const now = new Date().toISOString();
    notes.forEach((note) => {
      note.subject = subject;
      note.updatedAt = now;
      if (note.notebookId && subject) ensureNotebookSubject(note.notebookId, subject);
    });
    const saved = saveData();
    if (!saved) return showToast(ui.lastSaveError, "danger");
    closeModal();
    render();
    showToast(`${notes.length} note${notes.length === 1 ? "" : "s"} changed to ${subject || "No subject"}.`);
  }

  function saveSelectedNoteNotebook() {
    const notes = selectedNoteRecords();
    if (!notes.length) return showToast("Select at least one note first.", "danger");
    let notebookId = value("bulkNoteNotebook");
    if (notebookId === ADD_NOTEBOOK_VALUE) {
      const notebook = createNotebookFromTitle(value("bulkNoteNewNotebookTitle"));
      if (!notebook) {
        showToast("Enter a notebook name first.", "danger");
        return;
      }
      notebookId = notebook.id;
    }
    const now = new Date().toISOString();
    if (notebookId) {
      const notebook = data.notebooks.find((item) => item.id === notebookId);
      if (!notebook) return showToast("Choose a notebook first.", "danger");
      notes.forEach((note) => {
        note.notebookId = notebook.id;
        note.updatedAt = now;
        if (note.subject) ensureNotebookSubject(notebook.id, note.subject);
      });
      const saved = saveData();
      if (!saved) return showToast(ui.lastSaveError, "danger");
      closeModal();
      render();
      showToast(`${notes.length} note${notes.length === 1 ? "" : "s"} moved to ${notebook.title}.`);
      return;
    }
    notes.forEach((note) => {
      note.notebookId = null;
      note.updatedAt = now;
    });
    const saved = saveData();
    if (!saved) return showToast(ui.lastSaveError, "danger");
    closeModal();
    render();
    showToast(`${notes.length} note${notes.length === 1 ? "" : "s"} moved to Unassigned.`);
  }

  function visibleNotebooksForCurrentView() {
    const query = ui.notebookQuery.trim().toLowerCase();
    return data.notebooks.filter((nb) => {
      const subjects = notebookSubjects(nb.id).join(" ");
      return !query || [nb.title, nb.description, subjects].some((part) => String(part || "").toLowerCase().includes(query));
    });
  }

  function toggleNotebookSelect(notebookId) {
    if (!notebookId) return;
    ui.selectedNotebooks = ui.selectedNotebooks.includes(notebookId)
      ? ui.selectedNotebooks.filter((item) => item !== notebookId)
      : [...ui.selectedNotebooks, notebookId];
    render();
  }

  function selectVisibleNotebooks() {
    const ids = visibleNotebooksForCurrentView().map((notebook) => notebook.id);
    const allSelected = ids.length && ids.every((notebookId) => ui.selectedNotebooks.includes(notebookId));
    ui.selectedNotebooks = allSelected ? ui.selectedNotebooks.filter((notebookId) => !ids.includes(notebookId)) : Array.from(new Set([...ui.selectedNotebooks, ...ids]));
    render();
  }

  function clearSelectedNotebooks() {
    ui.selectedNotebooks = [];
    render();
  }

  function notebookCopyTitle(sourceTitle, createdIndex = 1) {
    const base = `${sourceTitle || "Notebook"} Copy`;
    if (createdIndex > 1) return `${base} ${createdIndex}`;
    if (!data.notebooks.some((notebook) => notebook.title.toLowerCase() === base.toLowerCase())) return base;
    let suffix = 2;
    while (data.notebooks.some((notebook) => notebook.title.toLowerCase() === `${base} ${suffix}`.toLowerCase())) suffix += 1;
    return `${base} ${suffix}`;
  }

  function duplicateSelectedNotebooks() {
    return duplicateNotebooks(ui.selectedNotebooks);
  }

  function deleteSelectedNotebooks() {
    const sourceIds = Array.from(new Set(ui.selectedNotebooks.filter((idValue) => data.notebooks.some((notebook) => notebook.id === idValue))));
    if (!sourceIds.length) return showToast("Select at least one notebook first.", "danger");
    const selectedNames = data.notebooks
      .filter((notebook) => sourceIds.includes(notebook.id))
      .map((notebook) => notebook.title)
      .join(", ");
    if (!confirmDelete(`${sourceIds.length} selected notebook${sourceIds.length === 1 ? "" : "s"} (${selectedNames})`)) return;
    data.notes.forEach((note) => {
      if (sourceIds.includes(note.notebookId)) {
        note.notebookId = null;
        note.updatedAt = new Date().toISOString();
      }
    });
    data.notebooks = data.notebooks.filter((notebook) => !sourceIds.includes(notebook.id));
    ui.selectedNotebooks = [];
    ui.selectedNotes = ui.selectedNotes.filter((noteId) => data.notes.some((note) => note.id === noteId));
    if (sourceIds.includes(ui.notebookId)) ui.notebookId = null;
    const saved = saveData();
    if (!saved) return showToast(ui.lastSaveError, "danger");
    render();
    showToast(`${sourceIds.length} notebook${sourceIds.length === 1 ? "" : "s"} deleted. Notes are now unassigned. Undo is available.`);
  }

  function duplicateNotebooks(notebookIds) {
    const sourceIds = Array.from(new Set((Array.isArray(notebookIds) ? notebookIds : [notebookIds]).filter((idValue) => data.notebooks.some((notebook) => notebook.id === idValue))));
    if (!sourceIds.length) return showToast("Select at least one notebook to duplicate.", "danger");
    const now = new Date().toISOString();
    const createdNotebooks = [];
    const createdNotes = [];
    sourceIds.forEach((sourceId) => {
      const source = data.notebooks.find((notebook) => notebook.id === sourceId);
      const nextNotebook = {
        ...structuredClone(source),
        id: id("nb"),
        title: notebookCopyTitle(source.title),
        updatedAt: now
      };
      createdNotebooks.push(nextNotebook);
      data.notes
        .filter((note) => note.notebookId === source.id)
        .forEach((note) => {
          createdNotes.push({
            ...structuredClone(note),
            id: id("note"),
            notebookId: nextNotebook.id,
            updatedAt: now
          });
        });
    });
    data.notebooks.unshift(...createdNotebooks);
    data.notes.unshift(...createdNotes);
    ui.selectedNotebooks = createdNotebooks.map((notebook) => notebook.id);
    ui.selectedNotes = createdNotes.map((note) => note.id);
    const saved = saveData();
    if (!saved) return showToast(ui.lastSaveError, "danger");
    render();
    showToast(`${createdNotebooks.length} notebook${createdNotebooks.length === 1 ? "" : "s"} duplicated with ${createdNotes.length} note${createdNotes.length === 1 ? "" : "s"}.`);
  }

  function deleteNotebook(notebookId) {
    const notebook = data.notebooks.find((item) => item.id === notebookId);
    if (!notebook || !confirmDelete(notebook.title)) return;
    data.notes.forEach((note) => {
      if (note.notebookId === notebookId) {
        note.notebookId = null;
        note.updatedAt = new Date().toISOString();
      }
    });
    data.notebooks = data.notebooks.filter((item) => item.id !== notebookId);
    if (ui.notebookId === notebookId) ui.notebookId = null;
    ui.modal = null;
    const saved = saveData();
    if (!saved) return showToast(ui.lastSaveError, "danger");
    showToast("Notebook deleted. Its notes are now unassigned. Undo is available.");
  }

  function deleteGoal(goalId) {
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal || !confirmDelete(goal.name)) return;
    data.goals = data.goals.filter((item) => item.id !== goalId);
    data.tasks.forEach((task) => {
      if (task.goalId === goalId) task.goalId = null;
    });
    ui.modal = null;
    saveData();
    showToast("Goal deleted.");
  }

  function deleteContact(contactId) {
    const contact = data.contacts.find((item) => item.id === contactId);
    if (!contact || !confirmDelete(contact.name)) return;
    data.contacts = data.contacts.filter((item) => item.id !== contactId);
    data.tasks.forEach((task) => {
      if (task.contactId === contactId) task.contactId = null;
      task.notifyContactIds = (task.notifyContactIds || []).filter((idValue) => idValue !== contactId);
    });
    (data.contactGroups || []).forEach((group) => {
      group.contactIds = (group.contactIds || []).filter((idValue) => idValue !== contactId);
    });
    data.loans.forEach((loan) => {
      if (loan.contactId === contactId) loan.contactId = null;
    });
    ui.modal = null;
    saveData();
    showToast("Contact deleted.");
  }

  function deleteProject(projectId) {
    const project = data.projects.find((item) => item.id === projectId);
    if (!project || !confirmDelete(project.name)) return;
    data.projects = data.projects.filter((item) => item.id !== projectId);
    data.tasks.forEach((task) => {
      if (task.projectId === projectId) task.projectId = null;
    });
    data.notebooks.forEach((notebook) => {
      if (notebook.projectId === projectId) notebook.projectId = null;
    });
    ui.modal = null;
    saveData();
    showToast("Project deleted. Linked tasks were unassigned.");
  }

  function saveAddress(addrId) {
    const addr = data.addresses.find((item) => item.id === addrId);
    const previousMapText = addr ? mapsAddressText(addr) : "";
    const payload = {
      label: value("addrLabel") || "Address",
      street: value("addrStreet"),
      unit: value("addrUnit"),
      city: value("addrCity"),
      state: value("addrState"),
      zip: value("addrZip"),
      country: value("addrCountry") || "USA",
      entity: "custom",
      verified: false,
      validationStatus: "unverified",
      validationProvider: "",
      validationUrl: "",
      validationCheckedAt: ""
    };
    normalizeAddressUnit(payload);
    const sameMappableAddress = Boolean(addr && previousMapText && previousMapText === mapsAddressText(payload));
    if (sameMappableAddress) {
      payload.verified = addressVerified(addr);
      payload.validationStatus = addressVerified(addr) ? "verified" : (addressReviewing(addr) ? "reviewing" : "unverified");
      payload.validationProvider = addr.validationProvider || "";
      payload.validationUrl = addr.validationUrl || "";
      payload.validationCheckedAt = addr.validationCheckedAt || "";
    }
    const writeKey = `address:${addressKey(payload)}`;
    if (shouldSkipRecentWrite(writeKey)) {
      showToast("That address was already saved.", "danger");
      return;
    }
    const duplicate = data.addresses.find((item) => item.id !== addrId && addressKey(item) === addressKey(payload));
    if (duplicate) {
      ui.modal = null;
      showToast("Address already exists.");
      return;
    }
    if (addr) Object.assign(addr, payload);
    else data.addresses.unshift({ id: id("addr"), ...payload });
    saveData();
    ui.modal = null;
    showToast(addr ? "Address updated." : "Address saved.");
  }

  function openMaps(addrId) {
    const addr = data.addresses.find((item) => item.id === addrId);
    if (!addr) return;
    openExternalUrl(mapsSearchUrl(addr));
  }

  function verifyAddressOnline(addrId) {
    const addr = data.addresses.find((item) => item.id === addrId);
    if (!addr) return;
    if (!addressHasMappableParts(addr)) {
      showToast("Add a street, city, and state before checking Google Maps.", "danger");
      return;
    }
    const url = mapsSearchUrl(addr);
    addr.verified = false;
    addr.validationStatus = "reviewing";
    addr.validationProvider = "Google Maps";
    addr.validationUrl = url;
    addr.validationCheckedAt = new Date().toISOString();
    saveData();
    openExternalUrl(url);
    render();
    showToast("Google Maps opened. After you confirm it, mark the address verified.");
  }

  function markAddressVerified(addrId) {
    const addr = data.addresses.find((item) => item.id === addrId);
    if (!addr) return;
    if (!addressHasMappableParts(addr)) {
      showToast("Add a street, city, and state before marking this verified.", "danger");
      return;
    }
    addr.verified = true;
    addr.validationStatus = "verified";
    addr.validationProvider = "Google Maps";
    addr.validationUrl = mapsSearchUrl(addr);
    addr.validationCheckedAt = new Date().toISOString();
    saveData();
    render();
    showToast("Address marked verified after online review.");
  }

  function clearAddressVerification(addrId) {
    const addr = data.addresses.find((item) => item.id === addrId);
    if (!addr) return;
    addr.verified = false;
    addr.validationStatus = "unverified";
    addr.validationProvider = "";
    addr.validationUrl = "";
    addr.validationCheckedAt = "";
    saveData();
    render();
    showToast("Address verification cleared.");
  }

  function addressText(addr) {
    const street = displayStreetLine(addr);
    return [street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(", ");
  }

  function addressHasMappableParts(addr) {
    return Boolean(mapsStreetLine(addr) && addr?.city && addr?.state);
  }

  function normalizeAddressUnit(addr) {
    if (!addr || typeof addr !== "object") return addr;
    const split = splitStreetAndUnit(addr.street, addr.unit || addr.street2 || addr.apartment || "");
    addr.street = split.street;
    addr.unit = split.unit;
    delete addr.street2;
    delete addr.apartment;
    return addr;
  }

  function splitStreetAndUnit(streetValue, unitValue = "") {
    const street = String(streetValue || "").trim().replace(/\s+/g, " ");
    const explicitUnit = String(unitValue || "").trim().replace(/\s+/g, " ");
    const embedded = street.match(/^(.*?)(?:,\s*|\s+)((?:apt|apartment|unit|suite|ste|#)\.?\s*[A-Za-z0-9-]+.*)$/i);
    const cleanStreet = embedded ? embedded[1].replace(/[,\s]+$/g, "").trim() : street;
    return { street: cleanStreet, unit: explicitUnit || (embedded ? embedded[2].trim() : "") };
  }

  function addressUnit(addr) {
    return splitStreetAndUnit(addr?.street, addr?.unit || addr?.street2 || addr?.apartment || "").unit;
  }

  function mapsStreetLine(addr) {
    return splitStreetAndUnit(addr?.street, "").street;
  }

  function displayStreetLine(addr) {
    const street = mapsStreetLine(addr);
    const unit = addressUnit(addr);
    return [street, unit].filter(Boolean).join(", ");
  }

  function mapsAddressText(addr) {
    const stateZip = [addr.state, addr.zip].filter(Boolean).join(" ");
    return [mapsStreetLine(addr), addr.city, stateZip, addr.country].filter(Boolean).join(", ");
  }

  function addressVerified(addr) {
    return Boolean(addr?.verified && addr?.validationStatus === "verified" && addr?.validationProvider);
  }

  function addressReviewing(addr) {
    return addr?.validationStatus === "reviewing";
  }

  function addressValidationLabel(addr) {
    if (addressVerified(addr)) return `Verified with ${addr.validationProvider || "online review"}`;
    if (addressReviewing(addr)) return "Online review pending";
    return "Needs online check";
  }

  function mapsSearchUrl(addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddressText(addr))}`;
  }

  function mapsRouteUrl(addresses) {
    if (!addresses.length) return "";
    if (addresses.length === 1) return mapsSearchUrl(addresses[0]);
    return `https://www.google.com/maps/dir/${addresses.map((addr) => mapsRouteSegment(addr)).join("/")}?entry=ttu`;
  }

  function mapsRouteSegment(addr) {
    return encodeURIComponent(mapsRouteAddressText(addr)).replace(/%20/g, "+").replace(/%2C/g, ",");
  }

  function mapsRouteAddressText(addr) {
    return mapsAddressText(addr);
  }

  function toggleAddressSelect(addrId) {
    if (ui.selectedAddresses.includes(addrId)) {
      ui.selectedAddresses = ui.selectedAddresses.filter((idValue) => idValue !== addrId);
    } else {
      ui.selectedAddresses.push(addrId);
    }
    render();
  }

  function clearAddressSelection() {
    ui.selectedAddresses = [];
    showToast("Address selection cleared.");
  }

  async function copyRouteLink() {
    const selected = ui.selectedAddresses
      .map((addressId) => data.addresses.find((addr) => addr.id === addressId))
      .filter(Boolean);
    const routeUrl = mapsRouteUrl(selected);
    if (!routeUrl) {
      showToast("Select at least two addresses first.", "danger");
      return;
    }
    try {
      await copyText(routeUrl, "routeUrl");
      showToast("Route link copied.");
    } catch (error) {
      showToast("Could not copy automatically. The route URL is selected for you.", "danger");
      const fieldEl = document.getElementById("routeUrl");
      if (fieldEl) {
        fieldEl.focus();
        fieldEl.select();
      }
    }
  }

  async function copyText(text, fallbackFieldId = "") {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (error) {
        // Local file pages and embedded browsers often reject Clipboard API writes.
      }
    }
    const fallbackField = fallbackFieldId ? document.getElementById(fallbackFieldId) : null;
    if (fallbackField) {
      fallbackField.focus();
      fallbackField.select();
      const copied = document.execCommand("copy");
      if (!copied) throw new Error("Copy command was rejected.");
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command was rejected.");
  }

  function openExternalUrl(url) {
    if (!url) return;
    try {
      const opened = window.open(url, "_blank", "noopener");
      if (opened) return;
    } catch (error) {
      // Fall back below when popups/new tabs are blocked.
    }
    window.location.href = url;
  }

  function saveTask(taskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    const previousStatus = task?.status || "";
    const selectedAddressId = value("taskAddress");
    const wantsNewAddress = selectedAddressId === ADD_TASK_ADDRESS_VALUE;
    const newAddressId = wantsNewAddress ? createTaskAddressFromForm() : "";
    const category = taskCategoryFromForm();
    const alertOffsets = selectedTaskAlertOffsets();
    if (wantsNewAddress && !newAddressId) {
      showToast("Enter the new address details first.", "danger");
      return;
    }
    if (!category) {
      showToast("Enter the new category name first.", "danger");
      return;
    }
    const payload = {
      title: value("taskTitle") || "Task",
      description: value("taskDescription"),
      date: value("taskDate") || ui.selectedDate,
      endDate: value("taskEndDate") || value("taskDate") || ui.selectedDate,
      start: value("taskStart"),
      end: value("taskEnd"),
      priority: value("taskPriority"),
      status: value("taskStatus"),
      repeat: value("taskRepeat"),
      category,
      bgColor: value("taskBgColor") || defaultTaskBgColor(),
      fontFamily: value("taskFont") || "System",
      includeHours: Boolean(document.getElementById("taskIncludeHours")?.checked),
      image: imageValue("task"),
      imageZoom: imageZoomValue("task"),
      imageX: imagePanValue("task", "x"),
      imageY: imagePanValue("task", "y"),
      imageFit: imageFitValue("task"),
      imageOpacity: imageOpacityValue("task"),
      addressId: newAddressId || (selectedAddressId === ADD_TASK_ADDRESS_VALUE ? null : selectedAddressId || null),
      billId: value("taskBill") || null,
      goalId: value("taskGoal") || null,
      projectId: value("taskProject") || (task ? null : (ui.view === "projects" ? ui.projectId : null)),
      contactId: value("taskContact") || task?.contactId || null,
      notifyContactIds: task?.notifyContactIds || [],
      notifyGroupIds: task?.notifyGroupIds || [],
      notifyExtraRecipient: task?.notifyExtraRecipient || "",
      notifyMessage: task?.notifyMessage || "",
      notifyConfigured: Boolean(task?.notifyConfigured),
      alertOffsets,
      alertDevice: Boolean(document.getElementById("taskAlertDevice")?.checked),
      alertSound: Boolean(document.getElementById("taskAlertSound")?.checked),
      alertEmail: Boolean(document.getElementById("taskAlertEmail")?.checked),
      alertConfigured: alertOffsets.length > 0,
      alertFiredKeys: task?.alertFiredKeys || [],
      tags: task ? task.tags || [] : [],
      subtasks: parseTaskChecklist(value("taskSubtasks"), task?.subtasks),
      updatedAt: new Date().toISOString()
    };
    let savedTask = task;
    if (task) Object.assign(task, payload);
    else {
      savedTask = { id: id("task"), ...payload };
      data.tasks.unshift(savedTask);
    }
    const queuedNotice = task ? queueTaskStatusNotification(savedTask, previousStatus, "task-save") : false;
    saveData();
    closeModal();
    if (newAddressId) showToast("Task saved with new address.");
    else if (queuedNotice) showToast("Task saved and notification queued.");
  }

  function normalizeBlockQuickCreateTarget(dateOrAnchor = null, startMinute = null) {
    if (dateOrAnchor && typeof dateOrAnchor === "object") {
      return {
        date: dateOrAnchor.date || ui.selectedDate,
        startMinute: Number.isFinite(dateOrAnchor.startMinute) ? dateOrAnchor.startMinute : null,
        endMinute: Number.isFinite(dateOrAnchor.endMinute) ? dateOrAnchor.endMinute : null
      };
    }
    if (typeof dateOrAnchor === "string") {
      return {
        date: dateOrAnchor || ui.selectedDate,
        startMinute: Number.isFinite(startMinute) ? startMinute : null,
        endMinute: null
      };
    }
    if (blockLastCreateAnchor?.date && Date.now() - blockLastCreateAnchor.createdAt <= 20 * 60 * 1000) {
      return {
        date: blockLastCreateAnchor.date,
        startMinute: blockLastCreateAnchor.startMinute,
        endMinute: blockLastCreateAnchor.endMinute
      };
    }
    return { date: ui.selectedDate, startMinute: null, endMinute: null };
  }

  function openBlockQuickCreate(dateOrAnchor = null, startMinute = null) {
    const target = normalizeBlockQuickCreateTarget(dateOrAnchor, startMinute);
    const range = blockFocusRange();
    const safeStartMinute = Number.isFinite(target.startMinute)
      ? clamp(target.startMinute, range.start, range.end - 15)
      : clamp(Math.max(range.start, 9 * 60), range.start, range.end - 15);
    const safeEndMinute = Number.isFinite(target.endMinute)
      ? clamp(Math.max(safeStartMinute + 15, target.endMinute), range.start + 15, range.end)
      : Math.min(safeStartMinute + 60, range.end);
    const start = timeFromBlockMinute(safeStartMinute);
    const end = timeFromBlockMinute(safeEndMinute);
    const date = target.date || ui.selectedDate;
    ui.blockQuickCreateDraft = {
      title: "",
      date,
      start,
      end,
      priority: "Medium",
      status: "Not Started",
      category: "General",
      bgColor: defaultTaskBgColor(),
      includeHours: true
    };
    ui.selectedDate = date;
    ui.blockDrawMode = false;
    ui.modal = { type: "blockQuickCreate", id: "" };
    render();
    focusCurrentModal("blockQuickTitle", { repeats: 4, avoidKeyboardOnMobile: true, centerModal: true });
  }

  function saveBlockQuickTask() {
    const title = value("blockQuickTitle") || "New timed task";
    const date = value("blockQuickDate") || ui.selectedDate;
    const start = value("blockQuickStart") || "09:00";
    const end = value("blockQuickEnd") || addMinutesToTime(start, 60);
    const startMinute = minutes(start);
    let endMinute = minutes(end);
    if (endMinute <= startMinute) endMinute += 24 * 60;
    const writeKey = `block-quick:${title.toLowerCase()}:${date}:${start}:${end}`;
    if (shouldSkipRecentWrite(writeKey)) {
      showToast("That block task was already saved.", "danger");
      return;
    }
    const category = ensureTaskCategory(value("blockQuickCategory") || "General");
    data.tasks.unshift({
      id: id("task"),
      title,
      description: "",
      date,
      endDate: blockEndDateFor(date, startMinute, endMinute),
      start,
      end,
      priority: value("blockQuickPriority") || "Medium",
      status: value("blockQuickStatus") || "Not Started",
      repeat: "None",
      category,
      bgColor: value("blockQuickBgColor") || defaultTaskBgColor(),
      fontFamily: "System",
      includeHours: document.getElementById("blockQuickIncludeHours")?.checked !== false,
      projectId: null,
      billId: null,
      goalId: null,
      contactId: null,
      addressId: null,
      alertOffsets: [...TASK_ALERT_DEFAULT_OFFSETS],
      alertDevice: true,
      alertSound: true,
      alertEmail: false,
      alertConfigured: true,
      alertFiredKeys: [],
      tags: category === "Habit" ? ["habit"] : [],
      subtasks: [],
      updatedAt: new Date().toISOString()
    });
    ui.selectedDate = date;
    ui.calendarView = isBlockLikeCalendarView() ? ui.calendarView : "block";
    ui.blockQuickCreateDraft = null;
    ui.blockDrawMode = false;
    closeModal();
    saveData();
    showToast("Block task created. Undo is available.");
  }

  function createTaskAddressFromForm() {
    if (value("taskAddress") !== ADD_TASK_ADDRESS_VALUE) return "";
    return createInlineAddressFromForm("task", value("taskTitle") || "Task Location", "task");
  }

  function taskCategoryFromForm() {
    const typed = normalizeCategoryName(value("taskNewCategory"));
    const selected = value("taskCategory");
    if (typed) return ensureTaskCategory(typed, value("taskNewCategoryColor") || customCategoryColor(typed));
    if (selected === ADD_TASK_CATEGORY_VALUE) return "";
    return ensureTaskCategory(selected || "General");
  }

  function createHabitAddressFromForm() {
    if (value("habitAddress") !== ADD_TASK_ADDRESS_VALUE) return "";
    return createInlineAddressFromForm("habit", value("habitTitle") || "Habit Location", "habit");
  }

  function createContactAddressFromForm(contactName) {
    if (value("contactAddress") !== ADD_TASK_ADDRESS_VALUE) return "";
    return createInlineAddressFromForm("contact", contactName ? `${contactName} Address` : "Contact Address", "contact");
  }

  function createInlineAddressFromForm(prefix, fallbackLabel, entity) {
    const hasAddress = [`${prefix}NewAddrLabel`, `${prefix}NewAddrStreet`, `${prefix}NewAddrUnit`, `${prefix}NewAddrCity`, `${prefix}NewAddrState`, `${prefix}NewAddrZip`]
      .some((fieldId) => value(fieldId).trim());
    if (!hasAddress) return "";
    const payload = {
      label: value(`${prefix}NewAddrLabel`) || fallbackLabel || "Location",
      street: value(`${prefix}NewAddrStreet`),
      unit: value(`${prefix}NewAddrUnit`),
      city: value(`${prefix}NewAddrCity`),
      state: value(`${prefix}NewAddrState`),
      zip: value(`${prefix}NewAddrZip`),
      country: value(`${prefix}NewAddrCountry`) || "USA",
      entity
    };
    normalizeAddressUnit(payload);
    const duplicate = data.addresses.find((item) => addressKey(item) === addressKey(payload));
    if (duplicate) return duplicate.id;
    const newAddress = { id: id("addr"), ...payload };
    data.addresses.unshift(newAddress);
    return newAddress.id;
  }

  function habitPayloadForTemplate(habit) {
    return normalizeHabitTemplatePayload({
      title: habit.title,
      description: habit.description,
      type: habit.type,
      schedule: habit.schedule,
      days: habit.days,
      start: habit.start,
      end: habit.end,
      priority: habit.priority,
      status: "Active",
      includeHours: habit.includeHours,
      targetCount: habit.targetCount,
      addressId: habit.addressId,
      color: habit.color,
      image: habit.image,
      imageZoom: habit.imageZoom,
      imageX: habit.imageX,
      imageY: habit.imageY,
      imageFit: habit.imageFit,
      imageOpacity: habit.imageOpacity
    });
  }

  function habitDraftFromTemplate(template) {
    const payload = normalizeHabitTemplatePayload(template?.payload || {});
    return {
      ...payload,
      startDate: ui.selectedDate || todayIso(),
      endDate: "",
      completions: []
    };
  }

  function filteredHabitsForCurrentView() {
    const today = todayIso();
    return data.habits.filter((habit) => {
      if (ui.habitFilter === "today") return habitTrackableOn(habit, today);
      if (ui.habitFilter === "completed") return habitCompletedOn(habit, today);
      if (ui.habitFilter === "paused") return habit.status !== "Active";
      return true;
    });
  }

  function toggleHabitSelect(habitId) {
    if (!data.habits.some((habit) => habit.id === habitId)) return;
    ui.selectedHabits = ui.selectedHabits.includes(habitId)
      ? ui.selectedHabits.filter((idValue) => idValue !== habitId)
      : [...ui.selectedHabits, habitId];
    render();
  }

  function clearSelectedHabits() {
    ui.selectedHabits = [];
    render();
  }

  function selectVisibleHabits() {
    const visibleIds = filteredHabitsForCurrentView().map((habit) => habit.id);
    if (!visibleIds.length) return;
    const allVisibleSelected = visibleIds.every((habitId) => ui.selectedHabits.includes(habitId));
    ui.selectedHabits = allVisibleSelected
      ? ui.selectedHabits.filter((habitId) => !visibleIds.includes(habitId))
      : Array.from(new Set([...ui.selectedHabits, ...visibleIds]));
    render();
  }

  function duplicateHabitPayload(habit) {
    const copy = clone(habit);
    copy.id = id("habit");
    copy.title = `${habit.title || "Habit"} copy`;
    copy.completions = [];
    copy.skippedDates = [];
    copy.freshStartDate = "";
    return copy;
  }

  function copyHabit(habitId) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    const index = data.habits.findIndex((item) => item.id === habitId);
    data.habits.splice(index + 1, 0, duplicateHabitPayload(habit));
    saveData();
    render();
    showToast("Habit copied.");
  }

  function copySelectedHabits() {
    const selected = data.habits.filter((habit) => ui.selectedHabits.includes(habit.id));
    if (!selected.length) return;
    const copies = selected.map(duplicateHabitPayload);
    data.habits.unshift(...copies);
    ui.selectedHabits = copies.map((habit) => habit.id);
    saveData();
    render();
    showToast(`${copies.length} habit${copies.length === 1 ? "" : "s"} copied.`);
  }

  function deleteSelectedHabits() {
    const selected = data.habits.filter((habit) => ui.selectedHabits.includes(habit.id));
    if (!selected.length || !confirmDelete(`${selected.length} selected habit${selected.length === 1 ? "" : "s"}`)) return;
    const selectedIds = new Set(selected.map((habit) => habit.id));
    data.habits = data.habits.filter((habit) => !selectedIds.has(habit.id));
    ui.selectedHabits = [];
    saveData();
    showToast(`${selected.length} habit${selected.length === 1 ? "" : "s"} deleted.`);
  }

  function swapHabits(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = data.habits.findIndex((habit) => habit.id === sourceId);
    const targetIndex = data.habits.findIndex((habit) => habit.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const source = data.habits[sourceIndex];
    data.habits[sourceIndex] = data.habits[targetIndex];
    data.habits[targetIndex] = source;
    saveData();
    render();
    showToast("Habits swapped.");
  }

  function swapHabitTimes(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const source = data.habits.find((habit) => habit.id === sourceId);
    const target = data.habits.find((habit) => habit.id === targetId);
    if (!source || !target) return;
    const sourceStart = source.start || "08:00";
    const sourceEnd = source.end || "08:30";
    source.start = target.start || "08:00";
    source.end = target.end || "08:30";
    target.start = sourceStart;
    target.end = sourceEnd;
    saveData();
    render();
    showToast("Habit times swapped.");
  }

  function adjustHabitEnd(habitId, deltaMinutes) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit || !deltaMinutes) return;
    const startMinute = minutes(habit.start || "08:00");
    const currentEnd = minutes(habit.end || timeFromMinutes(startMinute + 30));
    const nextEnd = clamp(currentEnd + deltaMinutes, startMinute + 15, 23 * 60 + 59);
    habit.end = timeFromMinutes(nextEnd);
    saveData();
    render();
    showToast(`End time set to ${timeLabel(habit.end)}.`);
  }

  function saveHabitInline(target, options = {}) {
    const shouldRender = options.render !== false;
    const shouldToast = options.toast !== false;
    const habit = data.habits.find((item) => item.id === target.dataset.id);
    const fieldName = target.dataset.field;
    if (!habit || !fieldName) return;
    const nextValue = target.value;
    let changed = false;
    if (fieldName === "title") {
      const value = nextValue.trim() || "Habit";
      changed = habit.title !== value;
      habit.title = value;
    }
    else if (fieldName === "description") {
      const value = nextValue.trim();
      changed = (habit.description || "") !== value;
      habit.description = value;
    }
    else if (fieldName === "type" && habitTypeOptions.includes(nextValue)) {
      changed = habit.type !== nextValue;
      habit.type = nextValue;
    }
    else if (fieldName === "schedule" && habitScheduleOptions.includes(nextValue)) {
      changed = habit.schedule !== nextValue;
      habit.schedule = nextValue;
    }
    else if (fieldName === "status" && ["Active", "Paused"].includes(nextValue)) {
      changed = habit.status !== nextValue;
      habit.status = nextValue;
    }
    else if (fieldName === "start" || fieldName === "end") {
      if (options.requireTimeValue && !nextValue) return;
      const beforeStart = habit.start;
      const beforeEnd = habit.end;
      habit[fieldName] = nextValue || (fieldName === "start" ? "08:00" : "08:30");
      if (minutes(habit.end) <= minutes(habit.start)) habit.end = timeFromMinutes(Math.min(minutes(habit.start) + 30, 23 * 60 + 59));
      changed = beforeStart !== habit.start || beforeEnd !== habit.end;
    }
    if (!changed) return;
    saveData();
    if (shouldRender) render();
    if (shouldToast) showToast("Habit updated.");
  }

  function applyHabitTemplate(slot) {
    const template = data.habitTemplates.find((item) => item.slot === slot);
    if (!template) return;
    ui.habitTemplateDraft = habitDraftFromTemplate(template);
    ui.modal = { type: "editHabit", id: "" };
    render();
    showToast(`${template.name} loaded.`);
  }

  function saveHabitTemplateSlot(habitId, slot) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    const template = data.habitTemplates.find((item) => item.slot === slot);
    const payload = habitPayloadForTemplate(habit);
    const nextTemplate = {
      id: template?.id || `habit_template_${slot}`,
      slot,
      name: habit.title || `Template ${slot}`,
      payload
    };
    if (template) Object.assign(template, nextTemplate);
    else data.habitTemplates.push(nextTemplate);
    data.habitTemplates.sort((a, b) => a.slot - b.slot);
    ui.habitTemplateDraft = null;
    const saved = saveData();
    closeModal();
    showToast(saved ? `Saved to template ${slot}.` : ui.lastSaveError, saved ? "success" : "danger");
  }

  function saveHabit(habitId) {
    const habit = data.habits.find((item) => item.id === habitId);
    const selectedAddressId = value("habitAddress");
    const wantsNewAddress = selectedAddressId === ADD_TASK_ADDRESS_VALUE;
    const newAddressId = wantsNewAddress ? createHabitAddressFromForm() : "";
    if (wantsNewAddress && !newAddressId) {
      showToast("Enter the new habit address details first.", "danger");
      return;
    }
    const start = value("habitStart") || "08:00";
    let end = value("habitEnd") || timeFromMinutes(minutes(start) + 30);
    if (minutes(end) <= minutes(start)) end = timeFromMinutes(Math.min(minutes(start) + 30, 23 * 60 + 59));
    const days = weekdayLabels
      .map((_, index) => document.getElementById(`habitDay${index}`)?.checked ? index : null)
      .filter((day) => day !== null);
    const payload = {
      title: value("habitTitle") || "Habit",
      description: value("habitDescription"),
      type: value("habitType") || "Personal",
      schedule: value("habitSchedule") || "Daily",
      days: days.length ? days : [parseLocalDate(value("habitStartDate") || ui.selectedDate).getDay()],
      startDate: value("habitStartDate") || ui.selectedDate,
      endDate: value("habitEndDate"),
      start,
      end,
      priority: value("habitPriority") || "Medium",
      status: value("habitStatus") || "Active",
      includeHours: Boolean(document.getElementById("habitIncludeHours")?.checked),
      targetCount: Math.max(1, Number(value("habitTargetCount") || 1)),
      addressId: newAddressId || (selectedAddressId === ADD_TASK_ADDRESS_VALUE ? null : selectedAddressId || null),
      color: value("habitColor") || taskCategoryColor("Habit"),
      image: imageValue("habit"),
      imageZoom: imageZoomValue("habit"),
      imageX: imagePanValue("habit", "x"),
      imageY: imagePanValue("habit", "y"),
      imageFit: imageFitValue("habit"),
      imageOpacity: imageOpacityValue("habit"),
      freshStartDate: habit?.freshStartDate || "",
      completions: habit?.completions || [],
      skippedDates: habit?.skippedDates || []
    };
    let savedHabit = habit;
    if (habit) Object.assign(habit, payload);
    else {
      savedHabit = { id: id("habit"), ...payload };
      data.habits.unshift(savedHabit);
    }
    const saved = saveData();
    ui.habitTemplateDraft = null;
    ui.modal = { type: "saveHabitTemplate", id: savedHabit.id };
    render();
    showToast(saved ? (newAddressId ? "Habit saved with new address." : habit ? "Habit updated." : "Habit created.") : ui.lastSaveError, saved ? "success" : "danger");
  }

  function saveHabitFreshStart(habitId) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    const selectedDate = value("habitFreshStartDate") || todayIso();
    if (!isIsoDateString(selectedDate)) {
      showToast("Choose a valid fresh start date.", "danger");
      return;
    }
    habit.startDate = selectedDate;
    habit.freshStartDate = selectedDate;
    const completions = Array.isArray(habit.completions) ? habit.completions : [];
    const hadSelectedDateDone = completions.includes(selectedDate);
    habit.completions = completions.filter((date) => date !== selectedDate);
    habit.skippedDates = (Array.isArray(habit.skippedDates) ? habit.skippedDates : []).filter((date) => date !== selectedDate);
    ui.modal = null;
    saveData();
    render();
    showToast(hadSelectedDateDone ? `Start date moved to ${dateLabel(selectedDate)}. That day was reset.` : `Start date moved to ${dateLabel(selectedDate)}.`);
  }

  function deleteHabit(habitId) {
    const parsed = parseHabitInstanceId(habitId);
    if (parsed) return deleteHabitOccurrence(habitId);
    return deleteHabitSeries(habitId);
  }

  function deleteHabitSeries(habitId) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    data.habits = data.habits.filter((item) => item.id !== habitId);
    ui.selectedTasks = ui.selectedTasks.filter((item) => parseHabitInstanceId(item)?.habitId !== habitId);
    ui.selectedHabits = ui.selectedHabits.filter((item) => item !== habitId);
    ui.modal = null;
    saveData();
    render();
    showToast("Whole habit series deleted. Undo is available.");
  }

  function toggleHabitCompletion(habitId, iso = todayIso()) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    const completed = habitCompletedOn(habit, iso);
    setHabitCompletion(habit.id, iso, !completed);
    saveData();
    render();
    showToast(completed ? "Habit completion removed." : "Habit marked complete.");
  }

  function habitCalendarDate(habit) {
    if (!habit) return ui.selectedDate || todayIso();
    if (habit.status === "Paused" || habit.status === "Archived") return habit.startDate || ui.selectedDate || todayIso();
    const start = (habit.startDate || todayIso()) > todayIso() ? habit.startDate : todayIso();
    for (let offset = 0; offset < 366; offset += 1) {
      const iso = addDaysIso(start, offset);
      if (habitScheduledOn(habit, iso)) return iso;
    }
    return habit.startDate || ui.selectedDate || todayIso();
  }

  function openHabitCalendar(habitId, view = "day") {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    const targetDate = habitCalendarDate(habit);
    ui.selectedDate = targetDate;
    ui.calendarView = isBlockLikeCalendarView(view) ? view : "day";
    ui.selectedTasks = [habitInstanceId(habit.id, targetDate)];
    ui.modal = null;
    if (ui.view !== "calendar") ui.backStack.push(ui.view);
    ui.view = "calendar";
    syncHash("calendar");
    render();
  }

  function jumpCalendarDate() {
    const iso = value("calendarJumpDate") || ui.selectedDate;
    ui.selectedDate = iso;
    ui.selectedTasks = [];
    ui.modal = null;
    render();
  }

  function jumpCalendarMonth() {
    const month = value("calendarJumpMonth") || ui.selectedDate.slice(0, 7);
    ui.selectedDate = `${month}-01`;
    ui.calendarView = "month";
    ui.selectedTasks = [];
    ui.modal = null;
    render();
  }

  function saveTaskDefaults() {
    const color = value("defaultTaskBgColor") || DEFAULT_TASK_BG;
    const categoryColors = { ...defaultCategoryColors, ...(data.settings?.categoryColors || {}) };
    taskCategories.forEach((category) => {
      const nextColor = value(`categoryColor${category}`);
      if (isHexColor(nextColor)) categoryColors[category] = nextColor;
    });
    data.settings = { ...(data.settings || {}), taskDefaultBgColor: color, categoryColors };
    saveData();
    closeModal();
    showToast("Calendar settings saved.");
  }

  function toggleInterfaceMode() {
    const current = data.settings?.interfaceMode === "simple" ? "simple" : "power";
    data.settings = { ...(data.settings || {}), interfaceMode: current === "power" ? "simple" : "power" };
    saveData();
    showToast(`${filterLabel(data.settings.interfaceMode)} mode enabled.`);
  }

  function toggleNavSection(sectionKey) {
    if (!sectionKey) return;
    ui.navCollapsed = { ...(ui.navCollapsed || {}), [sectionKey]: !ui.navCollapsed?.[sectionKey] };
    render();
  }

  function completeTask(taskId) {
    const habitInstance = parseHabitInstanceId(taskId);
    if (habitInstance) {
      setHabitCompletion(habitInstance.habitId, habitInstance.date, true);
      saveData();
      render();
      return;
    }
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const previousStatus = task.status;
    task.status = "Completed";
    task.updatedAt = new Date().toISOString();
    const queuedNotice = queueTaskStatusNotification(task, previousStatus, "complete-task");
    saveData();
    render();
    if (queuedNotice) showToast("Task completed and notification queued.");
  }

  function editHabitInstance(taskId) {
    const task = detachHabitOccurrenceToTask(taskId);
    if (!task) return;
    ui.modal = { type: "editTask", id: task.id };
    saveData();
    render();
    showToast("This occurrence is now its own editable task.");
  }

  function duplicateBlockHorizontal(taskId, count = 1) {
    const task = findCalendarItemById(taskId);
    if (!task) return;
    const copyCount = clamp(Math.round(Number(count) || 1), 1, 24);
    const copies = Array.from({ length: copyCount }, (_, index) => {
      const offset = index + 1;
      return taskCopyFromCalendarItem(task, {
        date: addDaysIso(task.date, offset),
        endDate: addDaysIso(taskEndDate(task), offset)
      });
    });
    data.tasks.unshift(...copies);
    saveData();
    closeModal();
    showToast(`${copies.length} across ${copies.length === 1 ? "copy" : "copies"} created.`);
  }

  function duplicateBlockVertical(taskId, count = 1) {
    const task = findCalendarItemById(taskId);
    if (!task) return;
    const copyCount = clamp(Math.round(Number(count) || 1), 1, 24);
    const start = task.start ? minutes(task.start) : 9 * 60;
    const end = task.end ? minutes(task.end) : start + 60;
    const duration = Math.max(15, end - start || 60);
    const copies = Array.from({ length: copyCount }, (_, index) => {
      const nextStart = clamp(end + duration * index, 0, 24 * 60 - duration);
      return taskCopyFromCalendarItem(task, {
        start: timeFromMinutes(nextStart),
        end: timeFromMinutes(nextStart + duration),
        endDate: task.date
      });
    });
    data.tasks.unshift(...copies);
    saveData();
    closeModal();
    showToast(`${copies.length} down ${copies.length === 1 ? "copy" : "copies"} created.`);
  }

  function toggleTaskPicker(taskId, kind) {
    const next = ui.taskPicker?.taskId === taskId && ui.taskPicker?.kind === kind ? null : { taskId, kind };
    ui.taskPicker = next;
    render();
  }

  function setTaskPriority(taskId, priority) {
    const habitInstance = findCalendarItemById(taskId);
    if (habitInstance?.isHabit && taskPriorityOptions.includes(priority)) {
      const task = detachHabitOccurrenceToTask(habitInstance, { priority });
      if (!task) return;
      ui.taskPicker = null;
      saveData();
      render();
      showToast(`This occurrence priority changed to ${task.priority}.`);
      return;
    }
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task || !taskPriorityOptions.includes(priority)) return;
    task.priority = priority;
    task.updatedAt = new Date().toISOString();
    ui.taskPicker = null;
    saveData();
    render();
    showToast(`Priority changed to ${task.priority}.`);
  }

  function setTaskStatus(taskId, status) {
    const habitInstance = findCalendarItemById(taskId);
    if (habitInstance?.isHabit && taskStatusOptions.includes(status)) {
      if (["Completed", "Not Started"].includes(status)) {
        setHabitCompletion(habitInstance.habitId, habitInstance.date, status === "Completed");
        ui.taskPicker = null;
        if (ui.modal?.type === "blockStatus") ui.modal = null;
        saveData();
        render();
        showToast(status === "Completed" ? "Habit occurrence marked complete." : "Habit occurrence marked not started.");
        return;
      }
      const task = detachHabitOccurrenceToTask(habitInstance, { status });
      if (!task) return;
      ui.taskPicker = null;
      if (ui.modal?.type === "blockStatus") ui.modal = null;
      saveData();
      render();
      showToast(`This occurrence status changed to ${task.status}.`);
      return;
    }
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task || !taskStatusOptions.includes(status)) return;
    const previousStatus = task.status;
    task.status = status;
    task.updatedAt = new Date().toISOString();
    ui.taskPicker = null;
    if (ui.modal?.type === "blockStatus") ui.modal = null;
    const queuedNotice = queueTaskStatusNotification(task, previousStatus, "status-picker");
    saveData();
    render();
    showToast(queuedNotice ? `Status changed to ${task.status}; notification queued.` : `Status changed to ${task.status}.`);
  }

  function toggleSubtask(taskId, subtaskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task.subtasks = normalizeSubtasks(task.subtasks);
    const subtask = task.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) return;
    subtask.done = !subtask.done;
    saveData();
    render();
  }

  function toggleBlockSelectMode() {
    ui.blockSelectMode = !ui.blockSelectMode;
    if (ui.blockSelectMode) ui.blockDrawMode = false;
    if (!ui.blockSelectMode) {
      const visible = new Set(blockWeekTaskIds());
      ui.selectedTasks = ui.selectedTasks.filter((taskId) => !visible.has(taskId));
    }
    render();
  }

  function toggleBlockDrawMode() {
    ui.blockDrawMode = !ui.blockDrawMode;
    if (ui.blockDrawMode) ui.blockSelectMode = false;
    render();
    showToast(ui.blockDrawMode ? "Draw Task is on. Drag white space to create a block task." : "Draw Task is off. You can move and zoom the block calendar.");
  }

  function toggleDaySwapMode() {
    ui.daySwapMode = !ui.daySwapMode;
    render();
    showToast(ui.daySwapMode ? "Swap mode is on. Drag one day task onto another, or select two and tap Swap selected." : "Swap mode is off. Day View will scroll and zoom normally.");
  }

  function swapSelectedDayTasks() {
    const dayIds = new Set(tasksForDay(ui.selectedDate).map((task) => task.id));
    const ids = ui.selectedTasks.filter((taskId) => dayIds.has(taskId));
    if (ids.length !== 2) {
      showToast("Select exactly two tasks on this day to swap.", "danger");
      return;
    }
    swapTaskTimes(ids[0], ids[1]);
  }

  function startBlockMultiSelect(taskId) {
    if (taskId && !ui.selectedTasks.includes(taskId)) ui.selectedTasks.push(taskId);
    ui.blockSelectMode = true;
    ui.modal = null;
    render();
    showToast("Multi-select is on. Tap block tasks, then Delete selected.");
  }

  function blockWeekTaskIds() {
    const dates = weekDates();
    return calendarItemsForRange(dates[0], dates[6])
      .filter((task) => dates.includes(task.date) && task.start && task.end)
      .map((task) => task.id);
  }

  function selectVisibleBlockTasks() {
    const ids = blockWeekTaskIds();
    ui.selectedTasks = Array.from(new Set([...ui.selectedTasks, ...ids]));
    ui.blockSelectMode = true;
    render();
  }

  function selectDayCopyTarget(date) {
    if (!date || date === ui.selectedDate) return;
    if (!ui.selectedTasks.length) {
      showToast("Select one or more tasks first.", "danger");
      return;
    }
    ui.dayCopyTargetDate = date;
    render();
    showToast(`Copy target set to ${shortDate(date)}.`);
  }

  function toggleTaskSelect(taskId) {
    if (ui.selectedTasks.includes(taskId)) ui.selectedTasks = ui.selectedTasks.filter((idValue) => idValue !== taskId);
    else ui.selectedTasks.push(taskId);
    if (!ui.selectedTasks.length) ui.dayCopyTargetDate = null;
    render();
  }

  function selectAllDayTasks() {
    const ids = tasksForDay(ui.selectedDate).map((task) => task.id);
    ui.selectedTasks = Array.from(new Set([...ui.selectedTasks.filter((taskId) => {
      const task = findCalendarItemById(taskId);
      return task && task.date !== ui.selectedDate;
    }), ...ids]));
    render();
  }

  function deselectAllDayTasks() {
    const ids = new Set(tasksForDay(ui.selectedDate).map((task) => task.id));
    ui.selectedTasks = ui.selectedTasks.filter((taskId) => !ids.has(taskId));
    if (!ui.selectedTasks.length) ui.dayCopyTargetDate = null;
    render();
  }

  function openTaskActions() {
    if (!ui.selectedTasks.length) {
      const dayTasks = tasksForDay(ui.selectedDate);
      ui.selectedTasks = dayTasks.map((task) => task.id);
    }
    ui.modal = { type: "taskActions", id: "" };
    render();
  }

  function mapSelectedTasks() {
    return openSelectedTaskRoute();
  }

  function openSelectedTaskRoute() {
    const { selected, addresses, allHaveAddresses } = selectedTaskAddresses();
    if (!selected.length || !allHaveAddresses) {
      showToast("Every selected task needs an address before building a route.", "danger");
      return;
    }
    openExternalUrl(mapsRouteUrl(addresses));
  }

  function openSelectedDayTaskRoute() {
    const { selected, addresses, allHaveAddresses } = selectedDayTaskAddresses();
    if (!selected.length || !allHaveAddresses) {
      showToast("Every selected day task needs an address before building a route.", "danger");
      return;
    }
    openExternalUrl(mapsRouteUrl(addresses));
  }

  async function copySelectedTaskRoute() {
    const { selected, addresses, allHaveAddresses } = selectedTaskAddresses();
    if (!selected.length || !allHaveAddresses) {
      showToast("Every selected task needs an address before copying a route.", "danger");
      return;
    }
    try {
      await copyText(mapsRouteUrl(addresses));
      showToast("Task route URL copied.");
    } catch (error) {
      ui.modal = { type: "taskRoute", id: "" };
      showToast("Could not copy automatically. The route URL is ready to select.", "danger");
    }
  }

  async function copySelectedDayTaskRoute() {
    const { selected, addresses, allHaveAddresses } = selectedDayTaskAddresses();
    if (!selected.length || !allHaveAddresses) {
      showToast("Every selected day task needs an address before copying a route.", "danger");
      return;
    }
    try {
      await copyText(mapsRouteUrl(addresses));
      showToast("Selected day task route URL copied.");
    } catch (error) {
      ui.modal = { type: "taskRoute", id: "" };
      showToast("Could not copy automatically. The route URL is ready to select.", "danger");
    }
  }

  async function copyTaskRouteFromModal() {
    const { selected, addresses, allHaveAddresses } = selectedTaskAddresses();
    if (!selected.length || !allHaveAddresses) {
      showToast("Every selected task needs an address before copying a route.", "danger");
      return;
    }
    try {
      await copyText(mapsRouteUrl(addresses), "taskRouteUrl");
      showToast("Task route URL copied.");
    } catch (error) {
      const fieldEl = document.getElementById("taskRouteUrl");
      if (fieldEl) {
        fieldEl.focus();
        fieldEl.select();
      }
      showToast("The route URL is selected. Use your device copy command.", "danger");
    }
  }

  function taskAlertMessage(task) {
    const addr = taskAddress(task);
    const projectName = taskProjectName(task);
    const pieces = [
      `Task: ${task.title}`,
      `When: ${dateLabel(task.date)} ${timeLabel(task.start)} - ${dateLabel(taskEndDate(task))} ${timeLabel(task.end)}`,
      `Priority: ${task.priority}`,
      `Status: ${task.status}`
    ];
    if (projectName) pieces.push(`Project: ${projectName}`);
    if (addr) pieces.push(`Address: ${addressText(addr)}`);
    if (task.description) pieces.push(`Notes: ${task.description}`);
    return pieces.join("\n");
  }

  function taskNotifyChannels(task) {
    return normalizeNotifyChannels(task?.notifyChannels);
  }

  function taskNotifyTriggerSummary(task) {
    const channels = taskNotifyChannels(task).map((channel) => channel === "emailToText" ? "email-to-text" : "email").join(" + ");
    if (task?.notifyOnAnyStatus !== false) return `Sends on every status change by ${channels}.`;
    const statuses = Array.isArray(task?.notifyOnStatuses) ? task.notifyOnStatuses : [];
    if (statuses.length) return `Sends when status becomes ${statuses.join(", ")} by ${channels}.`;
    return `Alerts are paused until you choose a status trigger.`;
  }

  function taskAlertOffsets(task) {
    return normalizeTaskAlertOffsets(task?.alertOffsets);
  }

  function taskAlertOffsetLabel(offset) {
    if (offset === 0) return "At start";
    if (offset === 1) return "1 min before";
    return `${offset} min before`;
  }

  function taskAlertDeliverySummary(task) {
    const methods = [];
    if (task?.alertDevice !== false) methods.push("device popup");
    if (task?.alertSound !== false) methods.push("sound");
    if (task?.alertEmail) methods.push("email/text queue");
    return methods.length ? methods.join(" + ") : "no delivery method selected";
  }

  function taskAlertSummary(task) {
    const offsets = taskAlertOffsets(task);
    if (!task?.alertConfigured || !offsets.length) return "No time alerts selected yet.";
    return `Reminds ${offsets.map(taskAlertOffsetLabel).join(" and ")} by ${taskAlertDeliverySummary(task)}.`;
  }

  function taskAlertPanel(task) {
    const offsets = new Set(taskAlertOffsets(task));
    const device = task?.alertDevice !== false;
    const sound = task?.alertSound !== false;
    const email = Boolean(task?.alertEmail);
    return `<section class="inline-add-panel task-alert-panel">
      <div class="inline-add-heading">${icon("bell")} Task Alerts</div>
      <p class="subtle">${taskAlertSummary(task)}</p>
      <div class="notify-preset-row task-alert-offsets" aria-label="Task reminder times">
        ${TASK_ALERT_OFFSET_OPTIONS.map((offset) => `<label class="outline-btn ${offsets.has(offset) ? "active" : ""}"><input class="taskAlertOffset" type="checkbox" value="${offset}" ${offsets.has(offset) ? "checked" : ""}> ${esc(taskAlertOffsetLabel(offset))}</label>`).join("")}
      </div>
      <div class="notify-channel-grid">
        <label class="check-row"><input id="taskAlertDevice" type="checkbox" ${device ? "checked" : ""}> Device popup</label>
        <label class="check-row"><input id="taskAlertSound" type="checkbox" ${sound ? "checked" : ""}> Sound</label>
        <label class="check-row"><input id="taskAlertEmail" type="checkbox" ${email ? "checked" : ""}> Queue email/text</label>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="request-task-alert-permission">${icon("bell")} Enable browser alerts</button>
        <button class="outline-btn" data-action="test-task-alert">${icon("playcard")} Test sound</button>
      </div>
      <p class="subtle">Leave BillMaster open on each device for popups and sound. Use Enable browser alerts and Test sound once on each device. Email/text alerts use the Notification Outbox.</p>
    </section>`;
  }

  function selectedTaskAlertOffsets() {
    return normalizeTaskAlertOffsets(Array.from(document.querySelectorAll(".taskAlertOffset:checked")).map((input) => input.value));
  }

  function selectedNotifyChannels() {
    return normalizeNotifyChannels(Array.from(document.querySelectorAll(".taskNotifyChannel:checked")).map((input) => input.value));
  }

  function selectedNotifyStatuses() {
    return Array.from(document.querySelectorAll(".taskNotifyStatus:checked"))
      .map((input) => input.value)
      .filter((status) => taskStatusOptions.includes(status));
  }

  function notifyStatusPresetFromState(notifyEveryStatus, selectedStatuses) {
    if (notifyEveryStatus) return "all";
    const values = Array.from(selectedStatuses || []);
    if (values.length === 1 && values[0] === "Completed") return "completed";
    if (values.length === 2 && values.includes("In Progress") && values.includes("Completed")) return "active";
    return "custom";
  }

  function taskNotificationContacts(task) {
    const contactIds = new Set(task?.notifyContactIds || []);
    (task?.notifyGroupIds || []).forEach((groupId) => {
      const group = (data.contactGroups || []).find((item) => item.id === groupId);
      (group?.contactIds || []).forEach((contactId) => contactIds.add(contactId));
    });
    return Array.from(contactIds)
      .map((contactId) => data.contacts.find((contact) => contact.id === contactId))
      .filter(Boolean);
  }

  function taskNotificationRecipients(task, channels = taskNotifyChannels(task)) {
    const recipients = [];
    taskNotificationContacts(task).forEach((contact) => {
      if (channels.includes("email") && contact.email) recipients.push(contact.email);
      if (channels.includes("emailToText") && contact.textEmail) recipients.push(contact.textEmail);
    });
    if (task?.notifyExtraRecipient) recipients.push(task.notifyExtraRecipient);
    return Array.from(new Set(recipients.map((recipient) => String(recipient || "").trim()).filter(Boolean)));
  }

  function taskShouldNotifyForStatus(task, status) {
    if (!task) return false;
    if (task.notifyOnAnyStatus !== false) return true;
    return Array.isArray(task.notifyOnStatuses) && task.notifyOnStatuses.includes(status);
  }

  function queueTaskStatusNotification(task, previousStatus, trigger = "status") {
    if (!task || previousStatus === task.status) return false;
    if (!taskShouldNotifyForStatus(task, task.status)) return false;
    const channels = taskNotifyChannels(task);
    const recipients = taskNotificationRecipients(task, channels);
    if (!recipients.length) return false;
    const message = [
      task.notifyMessage || taskAlertMessage(task),
      "",
      `Status changed: ${previousStatus || "Unknown"} -> ${task.status}`
    ].join("\n");
    data.notificationLog.unshift({
      id: id("notice"),
      type: "task-status-change",
      taskId: task.id,
      taskTitle: task.title,
      previousStatus: previousStatus || "",
      status: task.status,
      channels,
      recipients,
      message,
      deliveryStatus: "queued",
      trigger,
      createdAt: new Date().toISOString()
    });
    return true;
  }

  function startTaskAlertScheduler() {
    if (taskAlertSchedulerStarted || typeof window === "undefined") return;
    const scheduleInterval = typeof window.setInterval === "function"
      ? window.setInterval.bind(window)
      : (typeof setInterval === "function" ? setInterval : null);
    if (!scheduleInterval) return;
    taskAlertSchedulerStarted = true;
    scheduleInterval(scanTaskAlerts, TASK_ALERT_CHECK_MS);
    if (typeof window.addEventListener === "function") window.addEventListener("focus", scanTaskAlerts);
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scanTaskAlerts();
    });
    scanTaskAlerts();
  }

  function scanTaskAlerts() {
    if (!currentProfileId || !Array.isArray(data?.tasks)) return;
    const now = new Date();
    const nowMs = now.getTime();
    let changed = false;
    data.tasks.forEach((task) => {
      if (!task?.alertConfigured || !task.start || !task.date) return;
      if (task.status === "Completed" || task.status === "Cancelled") return;
      const occurrenceIso = taskAlertOccurrenceIso(task, now);
      if (!occurrenceIso) return;
      const startDate = taskAlertStartDate(task, occurrenceIso);
      if (!startDate) return;
      const firedKeys = new Set(Array.isArray(task.alertFiredKeys) ? task.alertFiredKeys : []);
      taskAlertOffsets(task).forEach((offset) => {
        const dueMs = startDate.getTime() - offset * 60 * 1000;
        if (!taskAlertIsDue(nowMs, startDate.getTime(), dueMs, offset)) return;
        const key = taskAlertFiredKey(occurrenceIso, task.start, offset);
        if (firedKeys.has(key)) return;
        task.alertFiredKeys = [...(task.alertFiredKeys || []), key].slice(-TASK_ALERT_FIRED_LIMIT);
        firedKeys.add(key);
        fireTaskAlert(task, offset, occurrenceIso);
        changed = true;
      });
    });
    if (changed) saveData({ undo: false });
  }

  function taskAlertIsDue(nowMs, startMs, dueMs, offset) {
    if (nowMs < dueMs) return false;
    const lateMs = nowMs - dueMs;
    if (offset === 0) return lateMs <= TASK_ALERT_START_GRACE_MS;
    if (nowMs <= startMs) return lateMs <= Math.max(TASK_ALERT_GRACE_MS, Math.min(TASK_ALERT_CATCHUP_MS, offset * 60 * 1000));
    return lateMs <= TASK_ALERT_GRACE_MS;
  }

  function taskAlertOccurrenceIso(task, nowDate) {
    const today = isoDate(nowDate);
    return taskOccursForAlertOn(task, today) ? today : "";
  }

  function taskOccursForAlertOn(task, iso) {
    if (!task?.date || task.date > iso) return false;
    if (task.date === iso) return true;
    if (task.repeatEndDate && task.repeatEndDate < iso) return false;
    const repeat = String(task.repeat || "None");
    const schedule = String(task.repeatSchedule || repeat || "None");
    const repeatDays = Array.isArray(task.repeatDays) ? task.repeatDays.map(Number).filter((day) => day >= 0 && day <= 6) : [];
    const isRecurring = task.recurring || repeat !== "None" || schedule !== "None" || repeatDays.length > 0;
    if (!isRecurring) return false;
    const date = parseLocalDate(iso);
    const start = parseLocalDate(task.date);
    const elapsedDays = Math.round((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (elapsedDays < 0) return false;
    const weekday = date.getDay();
    if (repeatDays.length) return repeatDays.includes(weekday);
    if (schedule === "Daily" || repeat === "Daily") return true;
    if (schedule === "Weekdays") return weekday >= 1 && weekday <= 5;
    if (schedule === "Monthly" || repeat === "Monthly") return date.getDate() === start.getDate();
    if (schedule === "Bi-Weekly" || repeat === "Bi-Weekly") return elapsedDays % 14 === 0;
    if (schedule === "Weekly" || repeat === "Weekly" || schedule === "Custom" || repeat === "Custom") return weekday === start.getDay();
    return false;
  }

  function taskAlertStartDate(task, occurrenceIso) {
    const match = String(task.start || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const date = parseLocalDate(occurrenceIso);
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  }

  function taskAlertFiredKey(occurrenceIso, start, offset) {
    return `${occurrenceIso}:${start || ""}:${offset}`;
  }

  function fireTaskAlert(task, offset, occurrenceIso) {
    const title = offset ? `${task.title} starts in ${offset} minutes` : `${task.title} starts now`;
    const message = taskAlertReminderMessage(task, offset, occurrenceIso);
    if (task.alertDevice !== false) showBrowserTaskNotification(title, message, `task:${task.id}:${taskAlertFiredKey(occurrenceIso, task.start, offset)}`);
    if (task.alertSound !== false) playTaskAlertSound();
    const queued = task.alertEmail ? queueTaskTimeNotification(task, offset, occurrenceIso) : false;
    if (task.alertEmail && !queued) showToast(`${title}. Add a notification recipient to queue email/text.`, "danger");
    else showToast(queued ? `${title}. Email/text queued.` : title);
  }

  function taskAlertOccurrenceTask(task, occurrenceIso) {
    const endDate = task.end && task.start && minutes(task.end) <= minutes(task.start) ? addDaysIso(occurrenceIso, 1) : occurrenceIso;
    return { ...task, date: occurrenceIso, endDate };
  }

  function taskAlertReminderMessage(task, offset, occurrenceIso) {
    const timing = offset ? `starts in ${offset} minutes` : "starts now";
    return [
      `Reminder: ${task.title} ${timing}.`,
      "",
      taskAlertMessage(taskAlertOccurrenceTask(task, occurrenceIso))
    ].join("\n");
  }

  function queueTaskTimeNotification(task, offset, occurrenceIso) {
    const channels = taskNotifyChannels(task);
    const recipients = taskNotificationRecipients(task, channels);
    if (!recipients.length) return false;
    data.notificationLog.unshift({
      id: id("notice"),
      type: "task-time-alert",
      taskId: task.id,
      taskTitle: task.title,
      previousStatus: "",
      status: offset ? `${offset} minutes before` : "At start",
      channels,
      recipients,
      message: task.notifyMessage || taskAlertReminderMessage(task, offset, occurrenceIso),
      deliveryStatus: "queued",
      trigger: "time-alert",
      createdAt: new Date().toISOString()
    });
    return true;
  }

  function showBrowserTaskNotification(title, body, tag) {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return false;
    try {
      new Notification(title, { body, tag, renotify: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  async function requestTaskAlertPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast("Browser pop-up alerts are not available here.", "danger");
      return false;
    }
    if (Notification.permission === "granted") {
      showToast("Browser task alerts are already enabled.");
      return true;
    }
    if (Notification.permission === "denied") {
      showToast("Browser alerts are blocked. Enable notifications in browser settings.", "danger");
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      showToast(permission === "granted" ? "Browser task alerts enabled." : "Browser task alerts were not enabled.");
      return permission === "granted";
    } catch (error) {
      showToast("Browser alerts could not be enabled.", "danger");
      return false;
    }
  }

  async function testTaskAlert() {
    const sounded = playTaskAlertSound();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      showBrowserTaskNotification("BillMaster test alert", "Task alert sound and popup are ready.", `task:test:${Date.now()}`);
    }
    showToast(sounded ? "Task alert sound tested." : "This browser blocked or does not support alert sound.", sounded ? "success" : "danger");
  }

  function playTaskAlertSound() {
    if (typeof window === "undefined") return false;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return false;
    try {
      if (!taskAlertAudioContext) taskAlertAudioContext = new AudioContextCtor();
      const context = taskAlertAudioContext;
      if (context.state === "suspended") context.resume?.().catch(() => {});
      const startedAt = context.currentTime + 0.03;
      [880, 660, 990].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = startedAt + index * 0.18;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.16);
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  function taskNotifySummary(task) {
    const contactCount = (task.notifyContactIds || []).filter((idValue) => data.contacts.some((contact) => contact.id === idValue)).length;
    const groupCount = (task.notifyGroupIds || []).filter((idValue) => (data.contactGroups || []).some((group) => group.id === idValue)).length;
    const extraCount = task.notifyExtraRecipient ? 1 : 0;
    if (contactCount || groupCount || extraCount) return `${contactCount} contact${contactCount === 1 ? "" : "s"}, ${groupCount} group${groupCount === 1 ? "" : "s"}, and ${extraCount} extra address${extraCount === 1 ? "" : "es"} selected.`;
    if (task.contactId) return "Primary contact is linked. Add more people or groups if needed.";
    return "No notification contacts selected yet.";
  }

  function taskAlertMailto(task, recipient, message) {
    const subject = `BillMaster task alert: ${task.title}`;
    return `mailto:${encodeURIComponent(recipient || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message || taskAlertMessage(task))}`;
  }

  function gmailComposeUrl(recipients, subject, body) {
    const to = Array.isArray(recipients) ? recipients.join(",") : String(recipients || "");
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to,
      su: subject || "BillMaster alert",
      body: body || ""
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  }

  function openGmailCompose(recipients, subject, body) {
    const url = gmailComposeUrl(recipients, subject, body);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = url;
  }

  function notificationStatusLabel(status) {
    if (status === "sent") return "Sent";
    if (status === "opened") return "Opened";
    if (status === "error") return "Needs fix";
    return "Queued";
  }

  function notificationChannelLabel(channels) {
    return normalizeNotifyChannels(channels)
      .map((channel) => channel === "emailToText" ? "email-to-text" : "email")
      .join(" + ");
  }

  function notificationNoticeById(noticeId) {
    return safeArray(data.notificationLog).find((notice) => notice.id === noticeId);
  }

  function notificationSubject(notice) {
    return `BillMaster task alert: ${notice.taskTitle || "Task"}`;
  }

  function notificationQueuedLabel(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${dateLabel(date.toISOString().slice(0, 10))} ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }

  function notificationMailto(notice) {
    return `mailto:${encodeURIComponent(safeArray(notice.recipients).join(","))}?subject=${encodeURIComponent(notificationSubject(notice))}&body=${encodeURIComponent(notice.message || "")}`;
  }

  function notificationCopyText(notice) {
    return [
      `To: ${safeArray(notice.recipients).join(", ") || "No recipients"}`,
      `Subject: ${notificationSubject(notice)}`,
      "",
      notice.message || "",
      "",
      `Queued: ${notice.createdAt || ""}`
    ].join("\n");
  }

  function sendNextNotification(mode = "mail") {
    const nextNotice = safeArray(data.notificationLog).find((notice) => notice.deliveryStatus === "queued");
    if (!nextNotice) {
      showToast("No queued notifications to send.");
      return;
    }
    sendNotificationNotice(nextNotice.id, mode);
  }

  function sendNotificationNotice(noticeId, mode = "mail") {
    const notice = notificationNoticeById(noticeId);
    if (!notice) return;
    if (!safeArray(notice.recipients).length) {
      notice.deliveryStatus = "error";
      notice.error = "No recipients";
      saveData();
      showToast("This notification has no email or email-to-text recipient.", "danger");
      return;
    }
    notice.deliveryStatus = "opened";
    notice.openedAt = new Date().toISOString();
    notice.openedBy = mode === "gmail" ? "gmail" : "device-mail";
    notice.error = "";
    saveData();
    if (mode === "gmail") openGmailCompose(notice.recipients, notificationSubject(notice), notice.message || "");
    else window.location.href = notificationMailto(notice);
    showToast(mode === "gmail" ? "Gmail draft opened. Tap Sent after you send it." : "Email draft opened. Tap Sent after you send it.");
  }

  async function copyNotificationNotice(noticeId) {
    const notice = notificationNoticeById(noticeId);
    if (!notice) return;
    try {
      await copyText(notificationCopyText(notice));
      notice.copiedAt = new Date().toISOString();
      saveData();
      showToast("Notification copied.");
    } catch (error) {
      showToast("Could not copy that notification.", "danger");
    }
  }

  function markNotificationSent(noticeId) {
    const notice = notificationNoticeById(noticeId);
    if (!notice) return;
    notice.deliveryStatus = "sent";
    notice.sentAt = new Date().toISOString();
    notice.error = "";
    saveData();
    showToast("Notification marked sent.");
  }

  async function copyNotificationOutbox() {
    const notices = safeArray(data.notificationLog).slice(0, 20);
    if (!notices.length) {
      showToast("No notifications to copy.");
      return;
    }
    try {
      await copyText(notices.map(notificationCopyText).join("\n\n---\n\n"));
      notices.forEach((notice) => {
        notice.copiedAt = new Date().toISOString();
      });
      saveData();
      showToast("Notification outbox copied.");
    } catch (error) {
      showToast("Could not copy the notification outbox.", "danger");
    }
  }

  function clearSentNotifications() {
    const before = safeArray(data.notificationLog).length;
    data.notificationLog = safeArray(data.notificationLog).filter((notice) => notice.deliveryStatus !== "sent");
    const removed = before - data.notificationLog.length;
    saveData();
    showToast(removed ? `Cleared ${removed} sent notification${removed === 1 ? "" : "s"}.` : "No sent notifications to clear.");
  }

  function notifySearchTextForContact(contactId, row) {
    const contact = data.contacts.find((item) => item.id === contactId);
    const groups = contactGroupsForContact(contactId).map((group) => group.name).join(" ");
    return [
      row?.textContent || "",
      contact?.name || "",
      contact?.email || "",
      contact?.phone || "",
      contact?.textEmail || "",
      contact?.source || "",
      groups
    ].join(" ").toLowerCase();
  }

  function filterNotifyPicker(rawQuery = ui.notifyQuery || "") {
    ui.notifyQuery = rawQuery;
    const query = String(rawQuery || "").trim().toLowerCase();
    let visibleContacts = 0;
    document.querySelectorAll(".notify-contact-row").forEach((row) => {
      const input = row.querySelector("input[id^='notifyContact_']");
      const contactId = input?.value || "";
      const checked = Boolean(input?.checked);
      const matches = !query || notifySearchTextForContact(contactId, row).includes(query);
      row.hidden = !matches && !checked;
      if (!row.hidden) visibleContacts += 1;
    });
    let visibleGroups = 0;
    document.querySelectorAll("[data-notify-search-group]").forEach((button) => {
      const active = button.classList.contains("active");
      const matches = !query || String(button.dataset.notifySearchGroup || button.textContent || "").toLowerCase().includes(query);
      button.hidden = !matches && !active;
      if (!button.hidden) visibleGroups += 1;
    });
    const countEl = document.getElementById("taskNotifySearchCount");
    if (countEl) countEl.textContent = query ? `${visibleContacts} contact${visibleContacts === 1 ? "" : "s"} and ${visibleGroups} group${visibleGroups === 1 ? "" : "s"} visible. Checked items stay visible.` : "";
    updateTaskNotifyPreview();
  }

  function updateTaskNotifyPreview() {
    const task = data.tasks.find((item) => item.id === ui.modal?.id);
    const preview = document.getElementById("taskNotifyRecipientPreview");
    if (!task || !preview) return;
    const stats = taskNotifyPreviewStats(
      task,
      new Set(selectedNotifyContactIds()),
      new Set(selectedNotifyGroupIds()),
      selectedNotifyChannels(),
      value("taskNotifyRecipient")
    );
    preview.innerHTML = taskNotifyPreviewMarkup(stats);
    updateTaskNotifyPresetButtons();
  }

  function updateTaskNotifyPresetButtons() {
    const anyStatus = Boolean(document.getElementById("taskNotifyAnyStatus")?.checked);
    const preset = notifyStatusPresetFromState(anyStatus, new Set(selectedNotifyStatuses()));
    document.querySelectorAll(".notify-preset-row [data-preset]").forEach((button) => {
      button.classList.toggle("active", button.dataset.preset === preset);
    });
  }

  function setNotifyStatusPreset(preset) {
    const anyStatus = document.getElementById("taskNotifyAnyStatus");
    const statuses = Array.from(document.querySelectorAll(".taskNotifyStatus"));
    if (preset === "all") {
      if (anyStatus) anyStatus.checked = true;
      statuses.forEach((input) => {
        input.checked = false;
      });
    } else {
      if (anyStatus) anyStatus.checked = false;
      statuses.forEach((input) => {
        if (preset === "completed") input.checked = input.value === "Completed";
        else if (preset === "active") input.checked = input.value === "In Progress" || input.value === "Completed";
        else if (preset !== "custom") input.checked = false;
      });
    }
    updateTaskNotifyPreview();
  }

  function selectedNotifyContactIds() {
    return Array.from(document.querySelectorAll("[id^='notifyContact_']:checked")).map((input) => input.value);
  }

  function selectedNotifyGroupIds() {
    return Array.from(document.querySelectorAll(".notify-group-row .outline-btn.active")).map((button) => button.dataset.id).filter(Boolean);
  }

  function toggleNotifyGroup(groupId, button) {
    const group = (data.contactGroups || []).find((item) => item.id === groupId);
    if (!group) return;
    const active = !button.classList.contains("active");
    button.classList.toggle("active", active);
    (group.contactIds || []).forEach((contactId) => {
      const checkbox = document.getElementById(`notifyContact_${contactId}`);
      if (checkbox) checkbox.checked = active;
    });
    filterNotifyPicker(ui.notifyQuery || "");
    updateTaskNotifyPreview();
  }

  function saveTaskNotify(taskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task.notifyContactIds = selectedNotifyContactIds();
    task.notifyGroupIds = selectedNotifyGroupIds();
    task.notifyExtraRecipient = value("taskNotifyRecipient");
    task.notifyMessage = value("taskNotifyMessage");
    task.notifyChannels = selectedNotifyChannels();
    task.notifyOnAnyStatus = Boolean(document.getElementById("taskNotifyAnyStatus")?.checked);
    task.notifyOnStatuses = selectedNotifyStatuses();
    task.notifyConfigured = true;
    if (!task.contactId && task.notifyContactIds.length === 1) task.contactId = task.notifyContactIds[0];
    task.updatedAt = new Date().toISOString();
    saveData();
    if (ui.modal?.returnTo === "editTask") ui.modal = { type: "editTask", id: task.id };
    else ui.modal = { type: "taskNotify", id: task.id, returnTo: ui.modal?.returnTo || "" };
    showToast("Task notification contacts saved.");
  }

  function taskAlertRecipientsFromModal(task) {
    const channels = selectedNotifyChannels();
    const contactIds = new Set(selectedNotifyContactIds());
    selectedNotifyGroupIds().forEach((groupId) => {
      const group = (data.contactGroups || []).find((item) => item.id === groupId);
      (group?.contactIds || []).forEach((contactId) => contactIds.add(contactId));
    });
    (task.notifyContactIds || []).forEach((contactId) => contactIds.add(contactId));
    (task.notifyGroupIds || []).forEach((groupId) => {
      const group = (data.contactGroups || []).find((item) => item.id === groupId);
      (group?.contactIds || []).forEach((contactId) => contactIds.add(contactId));
    });
    const recipients = [];
    Array.from(contactIds)
      .map((contactId) => data.contacts.find((contact) => contact.id === contactId))
      .filter(Boolean)
      .forEach((contact) => {
        if (channels.includes("email") && contact.email) recipients.push(contact.email);
        if (channels.includes("emailToText") && contact.textEmail) recipients.push(contact.textEmail);
      });
    const extra = value("taskNotifyRecipient") || task.notifyExtraRecipient;
    if (extra) recipients.push(extra);
    return Array.from(new Set(recipients));
  }

  function openTaskAlert(taskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const recipient = taskAlertRecipientsFromModal(task).join(",");
    if (!recipient) {
      showToast("Select a contact with email/phone or enter an address first.", "danger");
      return;
    }
    const message = value("taskNotifyMessage") || task.notifyMessage || taskAlertMessage(task);
    window.location.href = taskAlertMailto(task, recipient, message);
  }

  function openTaskAlertGmail(taskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const recipients = taskAlertRecipientsFromModal(task);
    if (!recipients.length) {
      showToast("Select a contact with email/phone or enter an address first.", "danger");
      return;
    }
    const message = value("taskNotifyMessage") || task.notifyMessage || taskAlertMessage(task);
    openGmailCompose(recipients, `BillMaster task alert: ${task.title}`, message);
    showToast("Gmail draft opened. Tap Sent after you send it.");
  }

  async function copyTaskAlert(taskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    try {
      await copyText(value("taskNotifyMessage") || task.notifyMessage || taskAlertMessage(task));
      showToast("Task alert copied.");
    } catch (error) {
      showToast("Could not copy the task alert.", "danger");
    }
  }

  function saveProjectName(projectId) {
    const project = data.projects.find((item) => item.id === projectId);
    if (!project) return;
    const nextName = value("projectQuickName");
    if (!nextName) {
      showToast("Enter a project name first.", "danger");
      return;
    }
    project.name = nextName;
    project.level = projectLevelOptions.includes(value("projectLevel")) ? value("projectLevel") : "Medium";
    project.image = imageValue("project");
    project.imageZoom = imageZoomValue("project");
    project.imageX = imagePanValue("project", "x");
    project.imageY = imagePanValue("project", "y");
    project.imageFit = imageFitValue("project");
    project.imageOpacity = imageOpacityValue("project");
    project.lastEditedAt = new Date().toISOString();
    const returnTo = ui.modal?.returnTo;
    const returnId = ui.modal?.returnId;
    saveData();
    if (returnTo === "editTask" && returnId) {
      ui.modal = { type: "editTask", id: returnId };
      showToast("Project updated. Back in task edit.");
      return;
    }
    closeModal();
    showToast("Project updated.");
  }

  function selectedTaskAddresses() {
    const selected = ui.selectedTasks.map((taskId) => findCalendarItemById(taskId)).filter(Boolean);
    const addresses = selected.map((task) => data.addresses.find((addr) => addr.id === task.addressId)).filter(Boolean);
    return { selected, addresses, allHaveAddresses: selected.length > 0 && addresses.length === selected.length };
  }

  function selectedDayTaskAddresses() {
    const selected = tasksForDay(ui.selectedDate).filter((task) => ui.selectedTasks.includes(task.id));
    const addresses = selected.map((task) => taskAddress(task)).filter(Boolean);
    return { selected, addresses, allHaveAddresses: selected.length > 0 && addresses.length === selected.length };
  }

  function completeSelectedTasks() {
    let queuedCount = 0;
    data.tasks.forEach((task) => {
      if (ui.selectedTasks.includes(task.id)) {
        const previousStatus = task.status;
        task.status = "Completed";
        task.updatedAt = new Date().toISOString();
        if (queueTaskStatusNotification(task, previousStatus, "bulk-complete")) queuedCount += 1;
      }
    });
    ui.selectedTasks.forEach((taskId) => {
      const parsed = parseHabitInstanceId(taskId);
      if (parsed) setHabitCompletion(parsed.habitId, parsed.date, true);
    });
    ui.selectedTasks = [];
    saveData();
    closeModal();
    if (queuedCount) showToast(`${queuedCount} notification${queuedCount === 1 ? "" : "s"} queued.`);
  }

  function prioritySelectedTasks(priority) {
    const nextPriority = priority || "High";
    const selectedIds = [...ui.selectedTasks];
    data.tasks.forEach((task) => {
      if (selectedIds.includes(task.id)) task.priority = nextPriority;
    });
    selectedIds.forEach((taskId) => {
      const item = findCalendarItemById(taskId);
      if (item?.isHabit) detachHabitOccurrenceToTask(item, { priority: nextPriority });
    });
    saveData();
    closeModal();
  }

  function duplicateSelectedTasks(count = 1) {
    const copyCount = clamp(Math.round(Number(count) || 1), 1, 25);
    const copies = ui.selectedTasks
      .map((taskId) => findCalendarItemById(taskId))
      .filter(Boolean)
      .flatMap((task) => Array.from({ length: copyCount }, (_, index) => taskCopyFromCalendarItem(task, {
        title: copyCount === 1 ? `${task.title} copy` : `${task.title} copy ${index + 1}`
      })));
    if (!copies.length) {
      showToast("Select at least one task first.", "danger");
      return;
    }
    data.tasks.unshift(...copies);
    ui.selectedTasks = copies.map((task) => task.id);
    saveData();
    closeModal();
    showToast(`${copies.length} task${copies.length === 1 ? "" : "s"} duplicated.`);
  }

  function duplicateCalendarItem(taskId) {
    const task = findCalendarItemById(taskId);
    if (!task) return;
    const start = task.start ? minutes(task.start) : 9 * 60;
    const end = task.end ? minutes(task.end) : start + 60;
    const duration = Math.max(15, end - start || 60);
    const nextStart = clamp(end, 0, 24 * 60 - duration);
    const copy = taskCopyFromCalendarItem(task, {
      title: `${task.title} copy`,
      date: task.date,
      endDate: task.date,
      start: timeFromMinutes(nextStart),
      end: timeFromMinutes(nextStart + duration)
    });
    data.tasks.unshift(copy);
    ui.selectedTasks = [copy.id];
    saveData();
    closeModal();
    showToast(`${task.isHabit ? "Habit event" : "Task"} duplicated.`);
  }

  function saveQuickTime(taskId) {
    const task = findCalendarItemById(taskId);
    if (!task) return;
    const startDate = value("quickTimeDate") || task.date || ui.selectedDate;
    const endDate = value("quickTimeEndDate") || startDate;
    const start = value("quickTimeStart") || task.start || "09:00";
    let end = value("quickTimeEnd") || task.end || "10:00";
    if (endDate === startDate && minutes(end) <= minutes(start)) {
      end = timeFromMinutes(clamp(minutes(start) + 15, 15, 24 * 60 - 1));
    }
    updateCalendarItemSchedule(task, {
      date: startDate,
      endDate,
      start,
      end
    });
    ui.selectedDate = startDate;
    saveData();
    closeModal();
    showToast("Event time updated.");
  }

  function duplicateSelectedHorizontal(count = 1) {
    const selected = ui.selectedTasks.map((taskId) => findCalendarItemById(taskId)).filter(Boolean);
    const copyCount = clamp(Math.round(Number(count) || 1), 1, 24);
    const copies = selected.flatMap((task) => Array.from({ length: copyCount }, (_, index) => {
      const offset = index + 1;
      return taskCopyFromCalendarItem(task, {
        date: addDaysIso(task.date, offset),
        endDate: addDaysIso(taskEndDate(task), offset)
      });
    }));
    if (!copies.length) {
      showToast("Select at least one task first.", "danger");
      return;
    }
    data.tasks.unshift(...copies);
    ui.selectedTasks = copies.map((task) => task.id);
    ui.blockSelectMode = true;
    saveData();
    closeModal();
    showToast(`${copies.length} across ${copies.length === 1 ? "copy" : "copies"} created.`);
  }

  function duplicateSelectedVertical(count = 1) {
    const selected = ui.selectedTasks.map((taskId) => findCalendarItemById(taskId)).filter(Boolean);
    const copyCount = clamp(Math.round(Number(count) || 1), 1, 24);
    const copies = selected.flatMap((task) => {
      const start = task.start ? minutes(task.start) : 9 * 60;
      const end = task.end ? minutes(task.end) : start + 60;
      const duration = Math.max(15, end - start || 60);
      return Array.from({ length: copyCount }, (_, index) => {
        const nextStart = clamp(end + duration * index, 0, 24 * 60 - duration);
        return taskCopyFromCalendarItem(task, {
          start: timeFromMinutes(nextStart),
          end: timeFromMinutes(nextStart + duration),
          endDate: task.date
        });
      });
    });
    if (!copies.length) {
      showToast("Select at least one task first.", "danger");
      return;
    }
    data.tasks.unshift(...copies);
    ui.selectedTasks = copies.map((task) => task.id);
    ui.blockSelectMode = true;
    saveData();
    closeModal();
    showToast(`${copies.length} down ${copies.length === 1 ? "copy" : "copies"} created.`);
  }

  function copySelectedTomorrow() {
    copySelectedTasksToDate(addDaysIso(ui.selectedDate, 1), "tomorrow");
  }

  function copySelectedToDate() {
    copySelectedTasksToDate(value("copyTaskDate") || addDaysIso(ui.selectedDate, 1), "selected date");
  }

  function copySelectedToDayTarget() {
    const targetDate = ui.dayCopyTargetDate || addDaysIso(ui.selectedDate, 1);
    copySelectedTasksToDate(targetDate, shortDate(targetDate));
  }

  function copySelectedTasksToDate(iso, label = "selected date") {
    const targetDate = iso || addDaysIso(ui.selectedDate, 1);
    const copies = ui.selectedTasks
      .map((taskId) => findCalendarItemById(taskId))
      .filter(Boolean)
      .map((task) => {
        const span = Math.max(0, daySpan(task.date, taskEndDate(task)));
        return taskCopyFromCalendarItem(task, { date: targetDate, endDate: addDaysIso(targetDate, span) });
      });
    if (!copies.length) {
      showToast("Select at least one task first.", "danger");
      return;
    }
    data.tasks.unshift(...copies);
    ui.selectedTasks = [];
    ui.dayCopyTargetDate = null;
    saveData();
    closeModal();
    showToast(`${copies.length} task${copies.length === 1 ? "" : "s"} copied to ${label}.`);
  }

  function daySpan(startIso, endIso) {
    const start = parseLocalDate(startIso);
    const end = parseLocalDate(endIso || startIso);
    return Math.round((end - start) / 86400000);
  }

  function clearSelectedTasks() {
    ui.selectedTasks = [];
    ui.dayCopyTargetDate = null;
    closeModal();
  }

  function deleteSelectedTasks() {
    const count = ui.selectedTasks.length;
    if (!count) {
      showToast("Select at least one task first.", "danger");
      return;
    }
    const selectedIds = [...ui.selectedTasks];
    data.tasks = data.tasks.filter((task) => !selectedIds.includes(task.id));
    selectedIds.forEach((taskId) => {
      const parsed = parseHabitInstanceId(taskId);
      if (!parsed) return;
      const habit = data.habits.find((item) => item.id === parsed.habitId);
      skipHabitOccurrence(habit, parsed.date);
    });
    ui.selectedTasks = [];
    ui.dayCopyTargetDate = null;
    ui.blockSelectMode = false;
    saveData();
    closeModal();
    showToast(`${count} task${count === 1 ? "" : "s"} deleted. Undo is available.`);
  }

  function swapTaskTimes(sourceTaskId, targetTaskId) {
    const source = findCalendarItemById(sourceTaskId);
    const target = findCalendarItemById(targetTaskId);
    if (!source || !target || source.date !== target.date) {
      showToast("Tasks need to be on the same day to swap times.", "danger");
      return;
    }
    const sourceTimes = { start: source.start, end: source.end, endDate: source.endDate };
    updateCalendarItemSchedule(source, { start: target.start, end: target.end, endDate: target.endDate || target.date });
    updateCalendarItemSchedule(target, { start: sourceTimes.start, end: sourceTimes.end, endDate: sourceTimes.endDate || source.date });
    saveData();
    render();
    showToast(`Times swapped: ${source.title} and ${target.title}.`);
  }

  function noteSubjectValue() {
    const selected = value("noteSubject");
    return [ADD_NOTE_SUBJECT_VALUE, DELETE_NOTE_SUBJECT_VALUE].includes(selected) ? "" : normalizeNoteSubjectName(selected);
  }

  function noteNotebookIdFromForm() {
    const selected = value("noteNotebook");
    if (!selected) return "";
    if (selected !== ADD_NOTEBOOK_VALUE) return selected;
    const title = value("noteNewNotebookTitle");
    if (!title) return "";
    const notebook = createNotebookFromTitle(title);
    return notebook ? notebook.id : "";
  }

  function saveNote(noteId) {
    const note = data.notes.find((item) => item.id === noteId);
    const notebookId = noteNotebookIdFromForm();
    if (value("noteNotebook") === ADD_NOTEBOOK_VALUE && !notebookId) {
      showToast("Enter a new notebook name first.", "danger");
      return;
    }
    const subject = noteSubjectValue();
    if (notebookId && subject) ensureNotebookSubject(notebookId, subject);
    const projectId = note?.projectId || ui.modal?.projectId || (ui.view === "projects" ? ui.projectId : "") || null;
    const payload = {
      notebookId,
      projectId,
      title: value("noteTitle") || "Note",
      content: value("noteContent"),
      date: value("noteDate") || "2026-05-06",
      subject,
      importance: value("noteImportance") || "Low",
      color: ui.noteColor || note?.color || "#6c63ff",
      icon: "note",
      cover: value("noteCover") || "",
      image: imageValue("note"),
      imageZoom: imageZoomValue("note"),
      imageX: imagePanValue("note", "x"),
      imageY: imagePanValue("note", "y"),
      imageFit: imageFitValue("note"),
      imageOpacity: imageOpacityValue("note")
    };
    if (note) Object.assign(note, payload);
    else data.notes.unshift({ id: id("note"), ...payload });
    saveData();
    closeModal();
  }

  function saveNotebook(notebookId) {
    const notebook = data.notebooks.find((item) => item.id === notebookId);
    const payload = { title: value("nbTitle") || "New Notebook", description: value("nbDescription"), projectId: value("nbProject") || null, color: notebook?.color || "#4388f3", icon: notebook?.icon || "book", subjects: Array.isArray(notebook?.subjects) ? notebook.subjects : [], image: imageValue("nb"), imageZoom: imageZoomValue("nb"), imageX: imagePanValue("nb", "x"), imageY: imagePanValue("nb", "y"), imageFit: imageFitValue("nb"), imageOpacity: imageOpacityValue("nb") };
    if (notebook) Object.assign(notebook, payload);
    else data.notebooks.unshift({ id: id("nb"), ...payload });
    saveData();
    closeModal();
  }

  function saveNotebookPicture(notebookId) {
    const notebook = data.notebooks.find((item) => item.id === notebookId);
    if (!notebook) return;
    notebook.image = imageValue("nbPicture");
    notebook.imageZoom = imageZoomValue("nbPicture");
    notebook.imageX = imagePanValue("nbPicture", "x");
    notebook.imageY = imagePanValue("nbPicture", "y");
    notebook.imageFit = imageFitValue("nbPicture");
    notebook.imageOpacity = imageOpacityValue("nbPicture");
    saveData();
    closeModal();
    showToast("Notebook picture updated.");
  }

  function saveAlphaFeedback() {
    const entry = {
      id: id("feedback"),
      tester: value("feedbackTester") || "Friend tester",
      device: value("feedbackDevice") || "Phone",
      rating: Number(value("feedbackRating") || 0),
      confused: value("feedbackConfused"),
      helped: value("feedbackHelped"),
      moneyDecision: value("feedbackMoneyDecision"),
      nextFeature: value("feedbackNextFeature"),
      createdAt: new Date().toISOString()
    };
    if (!entry.confused && !entry.helped && !entry.moneyDecision && !entry.nextFeature) {
      showToast("Add at least one feedback note first.", "danger");
      return;
    }
    data.alphaFeedback = safeArray(data.alphaFeedback);
    data.alphaFeedback.unshift(entry);
    saveData();
    closeModal();
    showToast("Alpha feedback saved.");
  }

  function saveGoal(goalId) {
    const goal = data.goals.find((item) => item.id === goalId);
    const target = numberValue("goalTarget");
    const current = numberValue("goalCurrent");
    const completed = target > 0 && current >= target;
    const payload = {
      name: value("goalName") || "Goal",
      target,
      current,
      targetDate: value("goalDate") || "2026-12-31",
      color: value("goalColor") || "green",
      contributionSchedule: normalizeGoalSchedule(value("goalContributionSchedule")),
      contributionAmount: numberValue("goalContributionPlanAmount"),
      contributionAccountId: value("goalContributionPlanAccount") || data.accounts[0]?.id || "",
      confirmContributions: true,
      status: completed ? "Completed" : "In Progress",
      completedAt: completed ? (goal?.completedAt || todayIso()) : "",
      createdAt: goal?.createdAt || todayIso(),
      image: imageValue("goal"),
      imageZoom: imageZoomValue("goal"),
      imageX: imagePanValue("goal", "x"),
      imageY: imagePanValue("goal", "y"),
      imageFit: imageFitValue("goal"),
      imageOpacity: imageOpacityValue("goal")
    };
    if (goal) Object.assign(goal, payload);
    else data.goals.unshift({ id: id("goal"), ...payload });
    if (!saveData()) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    closeModal();
  }

  function applyGoalContribution(goal, account, amount, contributionDate, note, source = "manual") {
    const wasCompleted = goal.target > 0 && goal.current >= goal.target;
    account.balance = moneyNumber(account.balance - amount);
    goal.current = moneyNumber(goal.current + amount);
    const completed = goal.target > 0 && goal.current >= goal.target;
    goal.status = completed ? "Completed" : "In Progress";
    if (completed && !wasCompleted) goal.completedAt = contributionDate;
    if (!goal.createdAt) goal.createdAt = contributionDate;
    data.goalContributions = safeArray(data.goalContributions);
    const contribution = {
      id: id("goal_contribution"),
      goalId: goal.id,
      goalName: goal.name,
      accountId: account.id,
      accountName: account.name,
      amount,
      date: contributionDate,
      notes: note,
      source,
      confirmedAt: nowIso()
    };
    data.goalContributions.unshift(contribution);
    data.transactions.unshift({
      id: id("tx"),
      type: "expense",
      name: `${goal.name} Contribution`,
      merchant: "Goal Transfer",
      category: "Savings",
      amount,
      projected: amount,
      date: contributionDate,
      frequency: "One time",
      method: account.name,
      accountId: account.id,
      goalId: goal.id,
      isTransfer: true,
      status: "Paid",
      notes: note
    });
    return contribution;
  }

  function saveGoalContribution(goalId, source = "manual") {
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal) return;
    const amount = numberValue("goalContributionAmount");
    const account = data.accounts.find((item) => item.id === value("goalContributionAccount"));
    if (amount <= 0) {
      showToast("Enter a contribution amount first.", "danger");
      return;
    }
    if (!account) {
      showToast("Choose the account this contribution comes from.", "danger");
      return;
    }
    const remaining = goalRemainingAmount(goal);
    if (goal.status === "Completed" || remaining <= 0) {
      showToast(`${goal.name} is already fully funded. Edit the target before adding more.`, "danger");
      return;
    }
    if (amount > remaining) {
      showToast(`This would overfund ${goal.name}. Add ${money(remaining)} or less, or edit the target.`, "danger");
      return;
    }
    const available = moneyNumber(account.balance);
    if (available < amount) {
      showToast(`${account.name} only has ${money(available)} available for this contribution.`, "danger");
      return;
    }
    const contributionDate = value("goalContributionDate") || todayIso();
    const note = value("goalContributionNote") || `Goal contribution from ${account.name}.`;
    const writeKey = `goal-contribution:${goal.id}:${account.id}:${amount}:${contributionDate}:${source}`;
    if (shouldSkipRecentWrite(writeKey, 5000)) {
      showToast("That goal contribution was already saved.", "danger");
      return;
    }
    applyGoalContribution(goal, account, amount, contributionDate, note, source);
    const saved = saveData();
    if (!saved) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    closeModal();
    showToast(`${money(amount)} moved from ${account.name} to ${goal.name}. Account updated.`);
  }

  function saveContact(contactId) {
    const contact = data.contacts.find((item) => item.id === contactId);
    const checkedGroupNames = Array.from(document.querySelectorAll(".contactGroupChoice:checked"))
      .map((input) => data.contactGroups.find((group) => group.id === input.value)?.name || "")
      .filter(Boolean);
    const typedGroupNames = value("contactNewGroups").split(",").map((name) => name.trim()).filter(Boolean);
    const groupNames = Array.from(new Set([...checkedGroupNames, ...typedGroupNames]));
    const savedId = contact?.id || id("contact");
    const contactName = value("contactName") || "Contact";
    const selectedAddressId = value("contactAddress");
    const wantsNewAddress = selectedAddressId === ADD_TASK_ADDRESS_VALUE;
    const newAddressId = wantsNewAddress ? createContactAddressFromForm(contactName) : "";
    if (wantsNewAddress && !newAddressId) {
      showToast("Enter the new contact address details first.", "danger");
      return;
    }
    const payload = {
      name: contactName,
      email: value("contactEmail"),
      phone: value("contactPhone"),
      textEmail: value("contactTextEmail"),
      addressId: newAddressId || (selectedAddressId === ADD_TASK_ADDRESS_VALUE ? null : selectedAddressId || null),
      groupIds: [],
      photo: "profile"
    };
    if (contact) Object.assign(contact, payload);
    else data.contacts.unshift({ id: savedId, ...payload });
    syncContactGroups(savedId, groupNames);
    saveData();
    closeModal();
    if (newAddressId) showToast("Contact saved with new address.");
  }

  function syncContactGroups(contactId, groupNames) {
    data.contactGroups = safeArray(data.contactGroups);
    data.contactGroups.forEach((group) => {
      group.contactIds = (group.contactIds || []).filter((idValue) => idValue !== contactId);
    });
    groupNames.forEach((name) => {
      let group = data.contactGroups.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (!group) {
        group = { id: id("group"), name, contactIds: [] };
        data.contactGroups.push(group);
      }
      group.contactIds = Array.from(new Set([...(group.contactIds || []), contactId]));
    });
    const contact = data.contacts.find((item) => item.id === contactId);
    if (contact) contact.groupIds = data.contactGroups.filter((group) => group.contactIds.includes(contactId)).map((group) => group.id);
  }

  function saveProfile() {
    const displayName = value("profileDisplayName") || value("profileUsername") || "New User";
    const username = value("profileUsername").toLowerCase().replace(/[^a-z0-9._-]+/g, "") || `user${profiles.length + 1}`;
    const password = value("profilePassword");
    if (!password) {
      showToast("Enter a password for this local profile.", "danger");
      return;
    }
    if (profiles.some((profile) => profile.username.toLowerCase() === username)) {
      showToast("That username already exists on this device.", "danger");
      return;
    }
    if (!saveData({ undo: false })) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    const profile = { id: id("profile"), username, displayName, password };
    const previousProfileId = currentProfileId;
    profiles.push(profile);
    if (!saveProfiles()) {
      profiles = profiles.filter((item) => item.id !== profile.id);
      showToast(ui.lastSaveError, "danger");
      return;
    }
    currentProfileId = profile.id;
    if (!persistActiveProfileId(currentProfileId)) {
      currentProfileId = previousProfileId;
      profiles = profiles.filter((item) => item.id !== profile.id);
      saveProfiles();
      showToast(ui.lastSaveError, "danger");
      return;
    }
    data = document.getElementById("profileSampleData")?.checked === false ? blankWorkspace() : normalizeData(clone(seed));
    resetUndoBaseline();
    if (!saveData({ undo: false })) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    ui.modal = null;
    ui.backStack = [];
    ui.view = "dashboard";
    ui.projectId = null;
    showToast(`Profile created for ${displayName}.`);
  }

  function loginProfile(profileId) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;
    if (profile.password && value("profileLoginPassword") !== profile.password) {
      showToast("That password did not match.", "danger");
      return;
    }
    if (!saveData({ undo: false })) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    if (!persistActiveProfileId(profile.id)) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    currentProfileId = profile.id;
    data = loadData();
    resetUndoBaseline();
    ui.modal = null;
    ui.backStack = [];
    ui.view = "dashboard";
    ui.projectId = null;
    showToast(`Signed in as ${profile.displayName}.`);
  }

  function lockProfile() {
    if (!saveData({ undo: false })) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    if (!persistActiveProfileId("")) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    currentProfileId = "";
    ui.modal = null;
    render();
  }

  function deleteProfile(profileId) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile || profiles.length <= 1 || !confirmDelete(`${profile.displayName}'s local profile`)) return;
    const previousProfiles = profiles;
    profiles = profiles.filter((item) => item.id !== profileId);
    if (!saveProfiles()) {
      profiles = previousProfiles;
      showToast(ui.lastSaveError, "danger");
      return;
    }
    removeStoredProfileWorkspace(profileId);
    if (currentProfileId === profileId) {
      currentProfileId = profiles[0]?.id || "";
      if (!persistActiveProfileId(currentProfileId)) {
        showToast(ui.lastSaveError, "danger");
        return;
      }
      data = loadData();
      resetUndoBaseline();
    }
    ui.modal = null;
    render();
    showToast("Profile deleted.");
  }

  async function saveCloudConfig() {
    const url = value("cloudUrl");
    const anonKey = value("cloudAnonKey");
    if (!url || !anonKey) {
      showToast("Add your Supabase URL and anon key first.", "danger");
      return;
    }
    if (!saveCloudConfigLocal({ url, anonKey })) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    ui.modal = null;
    showToast("Supabase setup saved for this browser.");
  }

  function hostedConfigSnippet(url, anonKey) {
    return `window.BILLMASTER_CLOUD_CONFIG = {\n  url: "${String(url || "").trim()}",\n  anonKey: "${normalizeCloudKey(anonKey)}"\n};\n`;
  }

  async function copyHostedCloudConfig() {
    const url = value("cloudUrl") || cloudConfig.url || hostedCloudConfig.url;
    const anonKey = value("cloudAnonKey") || cloudConfig.anonKey || hostedCloudConfig.anonKey;
    if (!url || !anonKey) {
      showToast("Add the Supabase URL and publishable key first.", "danger");
      return;
    }
    try {
      await copyText(hostedConfigSnippet(url, anonKey));
      showToast("Hosted config copied. Paste it into billmaster-config.js, then commit and push.");
    } catch (error) {
      showToast("Could not copy the hosted config automatically.", "danger");
    }
  }

  async function copyFriendAlphaLink() {
    const text = friendAlphaHostedUrl();
    try {
      await copyText(text);
      showToast("Live BillMaster link copied.");
    } catch (error) {
      ui.modal = {
        type: "copyFallback",
        title: "Live BillMaster Link",
        text,
        helper: "Clipboard access was blocked. Select this link, then copy it manually."
      };
      render();
      showToast("Select and copy the live link.", "danger");
    }
  }

  async function copyFriendAlphaInvite() {
    try {
      await copyText(friendAlphaInviteText());
      showToast("Friend alpha invite copied.");
    } catch (error) {
      showToast("Could not copy the friend invite automatically.", "danger");
    }
  }

  async function copyFriendAlphaScript() {
    try {
      await copyText(friendAlphaTestScriptText());
      showToast("Friend alpha test script copied.");
    } catch (error) {
      showToast("Could not copy the test script automatically.", "danger");
    }
  }

  async function copyFriendFeedbackRequest() {
    const text = friendAlphaFeedbackRequestText();
    try {
      await copyText(text);
      showToast("Friend feedback request copied.");
    } catch (error) {
      ui.modal = {
        type: "copyFallback",
        title: "Friend Feedback Request",
        text,
        helper: "Clipboard access was blocked. Select this text, then copy it manually."
      };
      render();
      showToast("Select and copy the feedback request.", "danger");
    }
  }

  function emailFriendFeedbackRequest() {
    openExternalUrl(`mailto:?subject=${encodeURIComponent("BillMaster alpha feedback")}&body=${encodeURIComponent(friendAlphaFeedbackRequestText())}`);
    showToast("Feedback email draft opened.");
  }

  async function copyFriendSafetyChecklist() {
    try {
      await copyText(friendSafetyChecklistText());
      showToast("Friend safety checklist copied.");
    } catch (error) {
      ui.modal = {
        type: "copyFallback",
        title: "Friend Safety Checklist",
        text: friendSafetyChecklistText(),
        helper: "Clipboard access was blocked. Select this text, then copy it manually."
      };
      render();
      showToast("Select and copy the safety checklist.", "danger");
    }
  }

  async function copyFriendOnboardingQuickStart() {
    try {
      await copyText(friendOnboardingQuickStartText());
      showToast("Friend quick start copied.");
    } catch (error) {
      ui.modal = {
        type: "copyFallback",
        title: "Friend Alpha Quick Start",
        text: friendOnboardingQuickStartText(),
        helper: "Clipboard access was blocked. Select this text, then copy it manually."
      };
      render();
      showToast("Select and copy the friend quick start.", "danger");
    }
  }

  async function copyAlphaFeedback() {
    const text = alphaFeedbackText();
    try {
      await copyText(text);
      showToast("Alpha feedback copied.");
    } catch (error) {
      ui.modal = {
        type: "copyFallback",
        title: "Alpha Feedback",
        text,
        helper: "Clipboard access was blocked. Select this text, then copy it manually."
      };
      render();
      showToast("Select and copy the alpha feedback.", "danger");
    }
  }

  function selectCopyFallback() {
    const fieldEl = document.getElementById("copyFallbackText");
    if (!fieldEl) return;
    fieldEl.focus();
    fieldEl.select();
    try {
      document.execCommand("copy");
      showToast("Text selected and copied if this browser allows it.", "success", { render: false });
    } catch (error) {
      showToast("Text selected. Press Ctrl+C to copy.", "danger", { render: false });
    }
  }

  function googleContactsSetupChecklist() {
    return [
      "BillMaster Google Contacts setup",
      "",
      "1. Open Google Cloud Console and select/create the BillMaster project.",
      "2. Enable the People API.",
      "3. Configure OAuth consent. For testing, add your Google account as a test user.",
      "4. Create Credentials -> OAuth Client ID -> Web application.",
      "5. Add Authorized JavaScript origins:",
      "   - https://marksman2g.github.io",
      "   - http://127.0.0.1:4180",
      "   - http://localhost:4180",
      "6. Copy the Web Client ID ending in .apps.googleusercontent.com.",
      "7. In BillMaster: Sync Center -> Google Contacts -> Setup Google Contacts -> paste Client ID -> Save Client ID.",
      "8. Click Import contacts and approve read-only Google Contacts access.",
      "",
      `Scope requested: ${GOOGLE_CONTACTS_SCOPE}`,
      "Do not paste a client secret into BillMaster. Browser apps only use the public Client ID."
    ].join("\n");
  }

  async function copyGoogleContactsChecklist() {
    try {
      await copyText(googleContactsSetupChecklist());
      showToast("Google Contacts setup steps copied.");
    } catch (error) {
      showToast("Could not copy setup steps automatically.", "danger");
    }
  }

  function saveGoogleContactsConfig() {
    const clientId = value("googleContactsClientId");
    if (!clientId || !/\.apps\.googleusercontent\.com$/i.test(clientId)) {
      showToast("Paste the Web OAuth Client ID that ends with .apps.googleusercontent.com.", "danger");
      return;
    }
    data.settings.googleContactsClientId = clientId.trim();
    data.settings.googleContactsLastStatus = "Client ID saved. Import contacts when you are ready.";
    saveData();
    showToast("Google Contacts Client ID saved.");
  }

  async function importGoogleContacts() {
    const typedClientId = value("googleContactsClientId");
    if (typedClientId) data.settings.googleContactsClientId = typedClientId.trim();
    const clientId = String(data.settings?.googleContactsClientId || "").trim();
    if (!clientId || !/\.apps\.googleusercontent\.com$/i.test(clientId)) {
      showToast("Add the Google Web OAuth Client ID first.", "danger");
      return;
    }
    try {
      await waitForGoogleIdentity();
      const accessToken = await requestGoogleContactsAccessToken(clientId);
      const [people, groups] = await Promise.all([
        fetchGoogleConnections(accessToken),
        fetchGoogleContactGroups(accessToken).catch((error) => {
          console.warn("BillMaster could not import Google contact groups.", error);
          return [];
        })
      ]);
      const result = mergeGoogleContacts(people, groups);
      data.settings.googleContactsLastSyncAt = new Date().toISOString();
      data.settings.googleContactsLastImportCount = result.imported;
      data.settings.googleContactsLastGroupImportCount = result.groups;
      data.settings.googleContactsLastStatus = `${result.created} new, ${result.updated} updated, ${result.addresses} addresses linked.`;
      saveData();
      ui.modal = null;
      render();
      showToast(`Google Contacts imported: ${result.imported} people.`);
    } catch (error) {
      data.settings.googleContactsLastStatus = error.message || "Google Contacts import failed.";
      saveData({ undo: false });
      showToast(`Google Contacts import failed: ${error.message}`, "danger");
    }
  }

  function waitForGoogleIdentity(timeoutMs = 5000) {
    if (typeof window === "undefined") return Promise.reject(new Error("Google sign-in needs a browser window."));
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error("Google Identity script is not ready. Refresh the page and try again."));
        }
      }, 120);
    });
  }

  function requestGoogleContactsAccessToken(clientId) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_CONTACTS_SCOPE,
        callback: (response) => {
          settled = true;
          if (response?.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (!response?.access_token) {
            reject(new Error("Google did not return an access token."));
            return;
          }
          resolve(response.access_token);
        },
        error_callback: (error) => {
          settled = true;
          reject(new Error(error?.message || error?.type || "Google sign-in was cancelled."));
        }
      });
      client.requestAccessToken({ prompt: "consent" });
      setTimeout(() => {
        if (!settled) reject(new Error("Google Contacts permission timed out."));
      }, 60000);
    });
  }

  async function googlePeopleApi(path, accessToken) {
    const response = await fetch(`https://people.googleapis.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.error?.message || body?.error_description || `Google People API status ${response.status}`;
      throw new Error(message);
    }
    return body;
  }

  async function fetchGoogleConnections(accessToken) {
    const people = [];
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        pageSize: "1000",
        personFields: GOOGLE_CONTACTS_FIELDS
      });
      if (pageToken) params.set("pageToken", pageToken);
      const body = await googlePeopleApi(`people/me/connections?${params}`, accessToken);
      people.push(...safeArray(body.connections));
      pageToken = body.nextPageToken || "";
    } while (pageToken);
    return people;
  }

  async function fetchGoogleContactGroups(accessToken) {
    const groups = [];
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        pageSize: "200",
        groupFields: "name,groupType"
      });
      if (pageToken) params.set("pageToken", pageToken);
      const body = await googlePeopleApi(`contactGroups?${params}`, accessToken);
      groups.push(...safeArray(body.contactGroups));
      pageToken = body.nextPageToken || "";
    } while (pageToken);
    return groups;
  }

  function mergeGoogleContacts(people, groups) {
    const groupIdByResource = upsertGoogleContactGroups(groups);
    const result = { imported: 0, created: 0, updated: 0, addresses: 0, groups: groupIdByResource.size };
    people.forEach((person) => {
      const name = googlePersonName(person);
      const email = googlePersonValue(person.emailAddresses, "value");
      const phone = googlePersonValue(person.phoneNumbers, "value");
      if (!name && !email && !phone) return;
      const match = findGoogleContactMatch(person, email, phone, name);
      const addressId = upsertGoogleContactAddress(person, name || email || phone);
      const groupIds = googlePersonGroupIds(person, groupIdByResource);
      const payload = {
        name: name || match?.name || email || phone || "Google Contact",
        email: email || match?.email || "",
        phone: phone || match?.phone || "",
        googleId: person.resourceName || "",
        googleResourceName: person.resourceName || "",
        googleEtag: person.etag || "",
        source: "google",
        addressId: addressId || match?.addressId || null
      };
      let saved = match;
      if (saved) {
        Object.assign(saved, payload, {
          textEmail: saved.textEmail || "",
          photo: saved.photo || "profile",
          groupIds: Array.from(new Set([...(saved.groupIds || []), ...groupIds]))
        });
        result.updated += 1;
      } else {
        saved = { id: id("contact"), ...payload, textEmail: "", photo: "profile", groupIds };
        data.contacts.unshift(saved);
        result.created += 1;
      }
      if (addressId) result.addresses += 1;
      groupIds.forEach((groupId) => {
        const group = data.contactGroups.find((item) => item.id === groupId);
        if (group) group.contactIds = Array.from(new Set([...(group.contactIds || []), saved.id]));
      });
      result.imported += 1;
    });
    data.contactGroups = safeArray(data.contactGroups).filter((group) => group.name && (safeArray(group.contactIds).length || group.source !== "google"));
    syncAllContactGroupIds();
    return result;
  }

  function upsertGoogleContactGroups(groups) {
    const groupIdByResource = new Map();
    safeArray(groups).forEach((group) => {
      if (!group?.resourceName || group.groupType === "SYSTEM_CONTACT_GROUP") return;
      const name = String(group.formattedName || group.name || "").trim();
      if (!name) return;
      let local = data.contactGroups.find((item) => item.googleResourceName === group.resourceName)
        || data.contactGroups.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (!local) {
        local = { id: id("group"), name, contactIds: [], source: "google", googleResourceName: group.resourceName };
        data.contactGroups.push(local);
      }
      local.name = name;
      local.source = "google";
      local.googleResourceName = group.resourceName;
      local.contactIds = safeArray(local.contactIds);
      groupIdByResource.set(group.resourceName, local.id);
    });
    return groupIdByResource;
  }

  function googlePersonGroupIds(person, groupIdByResource) {
    return safeArray(person.memberships)
      .map((membership) => membership?.contactGroupMembership?.contactGroupResourceName || "")
      .map((resourceName) => groupIdByResource.get(resourceName))
      .filter(Boolean);
  }

  function googlePersonName(person) {
    const name = safeArray(person.names).find((item) => item?.metadata?.primary) || safeArray(person.names)[0] || {};
    return String(name.displayName || [name.givenName, name.familyName].filter(Boolean).join(" ") || "").trim();
  }

  function googlePersonValue(items, key) {
    const item = safeArray(items).find((entry) => entry?.metadata?.primary) || safeArray(items)[0] || {};
    return String(item[key] || "").trim();
  }

  function findGoogleContactMatch(person, email, phone, name) {
    const resourceName = String(person.resourceName || "");
    const emailKey = String(email || "").toLowerCase();
    const phoneKey = normalizePhoneKey(phone);
    const nameKey = String(name || "").toLowerCase();
    return data.contacts.find((contact) => contact.googleResourceName === resourceName || contact.googleId === resourceName)
      || (emailKey ? data.contacts.find((contact) => String(contact.email || "").toLowerCase() === emailKey) : null)
      || (phoneKey ? data.contacts.find((contact) => normalizePhoneKey(contact.phone) === phoneKey) : null)
      || (nameKey ? data.contacts.find((contact) => String(contact.name || "").toLowerCase() === nameKey) : null)
      || null;
  }

  function normalizePhoneKey(phone) {
    return String(phone || "").replace(/\D+/g, "");
  }

  function upsertGoogleContactAddress(person, contactName) {
    const address = safeArray(person.addresses).find((item) => item?.metadata?.primary) || safeArray(person.addresses)[0];
    if (!address) return "";
    const parsed = googleAddressPayload(address, contactName);
    if (!parsed.street && !parsed.city && !parsed.state) return "";
    const duplicate = data.addresses.find((item) => addressKey(item) === addressKey(parsed));
    if (duplicate) return duplicate.id;
    const newAddress = { id: id("addr"), ...parsed };
    data.addresses.unshift(newAddress);
    return newAddress.id;
  }

  function googleAddressPayload(address, contactName) {
    const formattedLines = String(address.formattedValue || "").split(/\r?\n|,\s*/).map((part) => part.trim()).filter(Boolean);
    const street = address.streetAddress || formattedLines[0] || "";
    const unit = address.extendedAddress || "";
    const city = address.city || "";
    const state = address.region || "";
    const zip = address.postalCode || "";
    const country = address.country || "USA";
    const payload = {
      label: contactName ? `${contactName} Address` : (address.type || "Google Contact Address"),
      street,
      unit,
      city,
      state,
      zip,
      country,
      entity: "contact",
      source: "google",
      validationStatus: "unverified",
      validationProvider: "",
      validationUrl: "",
      validationCheckedAt: ""
    };
    normalizeAddressUnit(payload);
    return payload;
  }

  function syncAllContactGroupIds() {
    data.contacts.forEach((contact) => {
      const groupIds = data.contactGroups
        .filter((group) => safeArray(group.contactIds).includes(contact.id))
        .map((group) => group.id);
      contact.groupIds = Array.from(new Set([...(contact.groupIds || []), ...groupIds]));
    });
  }

  async function testCloudConfig() {
    const url = value("cloudUrl") || cloudConfig.url;
    const anonKey = value("cloudAnonKey") || cloudConfig.anonKey;
    if (!url || !anonKey) {
      showToast("Add your Supabase URL and anon key first.", "danger");
      return;
    }
    if (!saveCloudConfigLocal({ url, anonKey })) {
      showToast(ui.lastSaveError, "danger");
      return;
    }
    if (!/^https:\/\/.+\.supabase\.co$/i.test(cloudConfig.url)) {
      finishCloudSetupTest(false, "Check the Project URL. It should look like https://your-project.supabase.co");
      return;
    }
    try {
      const authProbe = await cloudProbe("/auth/v1/health");
      const tableProbe = await cloudProbe("/rest/v1/billmaster_workspaces?select=user_id&limit=1");
      const message = [authProbe.message, tableProbe.message].filter(Boolean).join(" ");
      const status = tableProbe.status || authProbe.status || 0;
      if (/invalid api key|no api key|apikey|jwt malformed/i.test(message)) {
        finishCloudSetupTest(false, "The key was rejected. Use the publishable/anon public key, not the service role key.", status);
        return;
      }
      if (/payment required|project.*paused|project.*inactive|billing|egress[_\s-]*quota|spend cap|restricted.*project|upgrade.*plan/i.test(message)) {
        finishCloudSetupTest(false, cloudFriendlyErrorMessage(message, status), status);
        return;
      }
      if (/relation .*billmaster_workspaces.*does not exist|could not find .*billmaster_workspaces/i.test(message)) {
        finishCloudSetupTest(false, "Supabase reached, but the BillMaster SQL table is missing. Run supabase/schema.sql first.", status);
        return;
      }
      if (/permission denied|insufficient privilege|not exposed|schema cache/i.test(message)) {
        finishCloudSetupTest(false, "Supabase reached, but the Data API grants are missing. Run the latest supabase/schema.sql again.", status);
        return;
      }
      if (authProbe.ok && (tableProbe.ok || [401, 403].includes(tableProbe.status))) {
        finishCloudSetupTest(true, tableProbe.ok
          ? "Supabase Auth and the BillMaster workspace table responded. Setup looks ready."
          : "Supabase Auth responded and the workspace table is protected until sign-in. Setup looks ready.", status);
        return;
      }
      finishCloudSetupTest(false, `Supabase test failed: ${message || `status ${status}`}`, status);
    } catch (error) {
      finishCloudSetupTest(false, `Supabase test failed. Check the URL/key and internet connection. ${error.message}`);
    }
  }

  async function cloudSignUp() {
    const email = value("cloudEmail");
    const password = value("cloudPassword");
    const displayName = value("cloudDisplayName") || activeProfile()?.displayName || "";
    const startClean = document.getElementById("cloudStartClean")?.checked === true;
    if (!email || !password) {
      showToast("Enter an email and password for Supabase.", "danger");
      return;
    }
    try {
      const result = await cloudFetch("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, data: { display_name: displayName } })
      }, false);
      if (result?.access_token) {
        const sessionSaved = saveCloudSession(sessionFromAuthResult(result));
        if (startClean) {
          data = blankWorkspace();
          data.settings.cloudAutoSync = true;
          resetUndoBaseline();
          saveData({ undo: false, cloudSync: false, syncStamp: false });
          await pushWorkspaceToCloud("signup");
        }
        ui.modal = null;
        startCloudAutoSync();
        render();
        showToast(sessionSaved
          ? (startClean ? "Cloud account created with a clean workspace. Auto sync is on." : "Cloud account created and signed in. Push local when you are ready.")
          : "Cloud account created for this tab, but BillMaster could not remember the sign-in after reload. Check browser storage before friend testing.",
          sessionSaved ? "success" : "danger");
      } else {
        setPendingCleanSignup(email, startClean);
        showToast(startClean
          ? "Cloud account created. Confirm your email, then sign in here to create your clean private workspace."
          : "Cloud account created. Check email confirmation if Supabase requires it.");
      }
    } catch (error) {
      showToast(`Could not create cloud account: ${error.message}`, "danger");
    }
  }

  async function cloudSignIn() {
    const email = value("cloudEmail");
    const password = value("cloudPassword");
    const startClean = document.getElementById("cloudStartClean")?.checked === true;
    if (!email || !password) {
      showToast("Enter your Supabase email and password.", "danger");
      return;
    }
    try {
      const result = await cloudFetch("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }, false);
      const sessionSaved = saveCloudSession(sessionFromAuthResult(result));
      ui.modal = null;
      try {
        const loaded = await loadCloudWorkspaceIntoLocal({ enableAutoSync: true });
        const shouldCreateCleanWorkspace = !loaded && (startClean || hasPendingCleanSignup(email));
        if (shouldCreateCleanWorkspace) {
          data = blankWorkspace();
          data.settings.cloudAutoSync = true;
          resetUndoBaseline();
          saveData({ undo: false, cloudSync: false, syncStamp: false });
          await pushWorkspaceToCloud("signin-clean");
          setPendingCleanSignup(email, false);
        }
        startCloudAutoSync();
        render();
        showToast(sessionSaved
          ? (loaded
            ? "Signed in and pulled your cloud workspace. Auto sync is on."
            : shouldCreateCleanWorkspace
              ? "Signed in and created your clean private cloud workspace. Auto sync is on."
              : "Signed in. Push local to save this device to the cloud.")
          : "Signed in for this tab, but BillMaster could not remember the cloud session after reload. Check browser storage before friend testing.",
          sessionSaved ? "success" : "danger");
      } catch (pullError) {
        startCloudAutoSync();
        render();
        showToast(`Signed in. Cloud pull needs attention: ${pullError.message}`, "danger");
      }
    } catch (error) {
      showToast(`Cloud sign in failed: ${error.message}`, "danger");
    }
  }

  function sessionFromAuthResult(result, fallbackUser = {}) {
    return {
      accessToken: result.access_token || "",
      refreshToken: result.refresh_token || "",
      expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000,
      user: {
        id: result.user?.id || fallbackUser?.id || "",
        email: result.user?.email || fallbackUser?.email || ""
      }
    };
  }

  async function cloudSignOut() {
    try {
      if (cloudSignedIn()) {
        await cloudFetch("/auth/v1/logout", { method: "POST", body: "{}" }, true);
      }
    } catch (error) {
      // Local sign out should still happen if Supabase is unreachable.
    }
    saveCloudSession(null);
    stopCloudAutoSync({ clearUnsynced: true });
    render();
    showToast("Signed out of cloud sync.");
  }

  function startCloudAutoSync() {
    if (!cloudAutoSyncEnabled()) {
      stopCloudAutoSync();
      return;
    }
    if (!data.settings.cloudSyncState || data.settings.cloudSyncState === "idle") {
      setCloudSyncState("checked", "Auto sync is watching for changes on this device and in the cloud.", { checked: true });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
    }
    if (cloudBrowserOffline()) {
      setCloudSyncState(cloudHasLocalUnsyncedChanges ? "queued" : "checked", cloudOfflineMessage(), { queued: cloudHasLocalUnsyncedChanges, checked: !cloudHasLocalUnsyncedChanges });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      return;
    }
    if (cloudHasLocalUnsyncedChanges || data.settings?.cloudSyncState === "queued") {
      scheduleCloudAutoPush(350);
      return;
    }
    scheduleCloudAutoPull(1500);
  }

  function stopCloudAutoSync(options = {}) {
    clearAppTimer(cloudAutoPushTimer);
    clearAppTimer(cloudAutoPullTimer);
    cloudAutoPushTimer = null;
    cloudAutoPullTimer = null;
    cloudPushQueued = false;
    if (options.clearUnsynced) cloudHasLocalUnsyncedChanges = false;
  }

  function scheduleCloudAutoPush(delay = 1800) {
    if (!cloudAutoSyncEnabled()) return;
    if (data.settings.cloudSyncState !== "queued") {
      setCloudSyncState("queued", "Local change saved. BillMaster will smart-merge it to the cloud in a moment.", { queued: true });
    }
    if (cloudBrowserOffline()) {
      cloudHasLocalUnsyncedChanges = true;
      setCloudSyncState("queued", cloudOfflineMessage(), { queued: true });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      if (ui.view === "sync") render();
      return;
    }
    clearAppTimer(cloudAutoPushTimer);
    cloudAutoPushTimer = setAppTimer(() => {
      cloudAutoPushTimer = null;
      performCloudAutoPush();
    }, delay);
  }

  function scheduleCloudAutoPull(delay = 30000) {
    if (!cloudAutoSyncEnabled()) return;
    if (cloudBrowserOffline()) {
      setCloudSyncState(cloudHasLocalUnsyncedChanges ? "queued" : "checked", cloudOfflineMessage(), { queued: cloudHasLocalUnsyncedChanges, checked: !cloudHasLocalUnsyncedChanges });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      if (ui.view === "sync") render();
      return;
    }
    clearAppTimer(cloudAutoPullTimer);
    cloudAutoPullTimer = setAppTimer(() => {
      cloudAutoPullTimer = null;
      performCloudAutoPull();
    }, delay);
  }

  async function performCloudAutoPush() {
    if (!cloudAutoSyncEnabled()) return;
    if (cloudBrowserOffline()) {
      cloudHasLocalUnsyncedChanges = true;
      setCloudSyncState("queued", cloudOfflineMessage(), { queued: true });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      if (ui.view === "sync") render();
      return;
    }
    if (cloudPushInFlight) {
      cloudPushQueued = true;
      return;
    }
    cloudPushInFlight = true;
    try {
      setCloudSyncState("pushing", "Smart-merging this device with the cloud now.");
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      await pushWorkspaceToCloud("auto");
      cloudHasLocalUnsyncedChanges = false;
      if (ui.view === "sync") render();
      scheduleCloudAutoPull(30000);
    } catch (error) {
      console.warn("BillMaster auto sync failed.", error);
      data.settings.cloudSyncError = error.message || "Auto sync failed.";
      setCloudSyncState(data.settings.cloudSyncConflictAt ? "conflict" : "error", data.settings.cloudSyncError);
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      showToast(data.settings.cloudSyncConflictAt ? "Auto sync paused: both devices changed. Open Sync Center to choose." : "Auto sync paused by an error. Open Sync Center to retry.", "danger");
      if (ui.view === "sync") render();
    } finally {
      cloudPushInFlight = false;
      if (cloudPushQueued) {
        cloudPushQueued = false;
        scheduleCloudAutoPush(600);
      }
    }
  }

  async function performCloudAutoPull() {
    if (!cloudAutoSyncEnabled()) return;
    if (cloudBrowserOffline()) {
      setCloudSyncState(cloudHasLocalUnsyncedChanges ? "queued" : "checked", cloudOfflineMessage(), { queued: cloudHasLocalUnsyncedChanges, checked: !cloudHasLocalUnsyncedChanges });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      if (ui.view === "sync") render();
      return;
    }
    if (cloudPullInFlight) return;
    if (cloudPushInFlight || cloudHasLocalUnsyncedChanges || cloudAutoPushTimer) {
      scheduleCloudAutoPull(2500);
      return;
    }
    cloudPullInFlight = true;
    try {
      setCloudSyncState("checking", "Checking whether another device has newer BillMaster changes.", { checked: true });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      const loaded = await loadCloudWorkspaceIntoLocal({ enableAutoSync: true, onlyIfNewer: true });
      data.settings.cloudLastAutoCheckAt = new Date().toISOString();
      if (!loaded) setCloudSyncState("checked", "Cloud checked. No newer changes found on another device.", { checked: true });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      if (loaded) {
        render();
        showToast("BillMaster pulled fresh cloud changes.");
      } else if (ui.view === "sync") {
        render();
      }
    } catch (error) {
      console.warn("BillMaster auto pull failed.", error);
      data.settings.cloudSyncError = error.message || "Auto pull failed.";
      setCloudSyncState("error", data.settings.cloudSyncError);
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      if (/sign in|expired/i.test(error.message || "")) showToast(error.message, "danger");
      if (ui.view === "sync") render();
    } finally {
      cloudPullInFlight = false;
      scheduleCloudAutoPull(30000);
    }
  }

  function resumeCloudAutoSyncNow(delay = 350) {
    if (!cloudAutoSyncEnabled()) return;
    if (cloudBrowserOffline()) {
      setCloudSyncState(cloudHasLocalUnsyncedChanges ? "queued" : "checked", cloudOfflineMessage(), { queued: cloudHasLocalUnsyncedChanges, checked: !cloudHasLocalUnsyncedChanges });
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      if (ui.view === "sync") render();
      return;
    }
    if (cloudHasLocalUnsyncedChanges || data.settings?.cloudSyncState === "queued") {
      scheduleCloudAutoPush(delay);
      return;
    }
    scheduleCloudAutoPull(delay);
  }

  async function pushWorkspaceToCloud(direction = "push", options = {}) {
    const remoteRow = await fetchCloudWorkspaceRow();
    let payloadSource = normalizeData(clone(data));
    if (remoteRow?.payload && !options.force) {
      payloadSource = mergeWorkspacePayloads(remoteRow.payload, payloadSource, { prefer: "local" });
      data = normalizeData(mergeSeed(clone(seed), payloadSource));
    }
    if (options.force) clearCloudConflict();
    const pushedAt = new Date().toISOString();
    const profile = activeProfile();
    const payload = normalizeData(clone(payloadSource));
    const pushedMessage = direction === "auto"
      ? "Auto sync smart-merged this device with the cloud."
      : direction === "smart-merge"
        ? "Smart merge finished. This device and the cloud now share the same workspace."
        : direction === "force"
          ? "This device was force-pushed to the cloud."
          : "This device was pushed to the cloud.";
    payload.settings = {
      ...(payload.settings || {}),
      cloudLastSyncAt: pushedAt,
      cloudLastDirection: direction,
      cloudRemoteUpdatedAt: pushedAt,
      cloudLastAutoCheckAt: data.settings?.cloudLastAutoCheckAt || "",
      cloudLastQueuedAt: data.settings?.cloudLastQueuedAt || "",
      cloudLastPushedAt: pushedAt,
      cloudLastPulledAt: data.settings?.cloudLastPulledAt || "",
      cloudSyncState: "synced",
      cloudSyncMessage: pushedMessage,
      cloudSyncError: "",
      cloudSyncConflictAt: "",
      cloudSyncConflictRemoteAt: "",
      cloudSyncConflictMessage: ""
    };
    const workspace = {
      user_id: cloudSession.user.id,
      profile_id: currentProfileId,
      profile_name: profile?.displayName || "BillMaster User",
      payload,
      updated_at: pushedAt
    };
    await cloudFetch("/rest/v1/billmaster_workspaces?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(workspace)
    });
    data.settings.cloudLastSyncAt = pushedAt;
    data.settings.cloudLastDirection = direction;
    data.settings.cloudRemoteUpdatedAt = pushedAt;
    data.settings.cloudLastAutoCheckAt = new Date().toISOString();
    data.settings.cloudLastPushedAt = pushedAt;
    setCloudSyncState("synced", pushedMessage, { pushed: true, checked: true, at: pushedAt });
    data.settings.cloudSyncError = "";
    clearCloudConflict();
    cloudHasLocalUnsyncedChanges = false;
    saveData({ undo: false, cloudSync: false, syncStamp: false });
  }

  async function fetchCloudWorkspaceRow() {
    const rows = await cloudFetch(`/rest/v1/billmaster_workspaces?select=payload,updated_at&user_id=eq.${encodeURIComponent(cloudSession.user.id)}&limit=1`, {
      method: "GET"
    });
    return Array.isArray(rows) ? rows[0] : null;
  }

  function cloudTimeValue(value) {
    const time = Date.parse(value || "");
    return Number.isFinite(time) ? time : 0;
  }

  function cloudWorkspaceIsNewer(row) {
    const remoteAt = row?.updated_at || row?.payload?.settings?.cloudRemoteUpdatedAt || row?.payload?.settings?.cloudLastSyncAt || "";
    const localAt = data.settings?.cloudRemoteUpdatedAt || data.settings?.cloudLastSyncAt || "";
    return cloudTimeValue(remoteAt) > cloudTimeValue(localAt) + 1000;
  }

  function cloudRemoteTimestamp(row) {
    return row?.updated_at || row?.payload?.settings?.cloudRemoteUpdatedAt || row?.payload?.settings?.cloudLastSyncAt || "";
  }

  function clearCloudConflict() {
    data.settings.cloudSyncConflictAt = "";
    data.settings.cloudSyncConflictRemoteAt = "";
    data.settings.cloudSyncConflictMessage = "";
  }

  function markCloudConflict(row) {
    const remoteAt = cloudRemoteTimestamp(row);
    const message = "Cloud changed on another device before this device finished syncing. Pull cloud to keep the other device, or force push to keep this device.";
    data.settings.cloudSyncConflictAt = new Date().toISOString();
    data.settings.cloudSyncConflictRemoteAt = remoteAt;
    data.settings.cloudSyncConflictMessage = message;
    data.settings.cloudSyncError = message;
    data.settings.cloudAutoSync = false;
    setCloudSyncState("conflict", message);
    stopCloudAutoSync();
    cloudHasLocalUnsyncedChanges = true;
    saveData({ undo: false, cloudSync: false, syncStamp: false });
  }

  async function loadCloudWorkspaceIntoLocal(options = {}) {
    const row = options.row || await fetchCloudWorkspaceRow();
    if (!row?.payload) return false;
    if (options.onlyIfNewer && !cloudWorkspaceIsNewer(row)) return false;
    const pulledAt = new Date().toISOString();
    const remoteAt = row.updated_at || row.payload?.settings?.cloudRemoteUpdatedAt || row.payload?.settings?.cloudLastSyncAt || pulledAt;
    const remotePayload = normalizeData(mergeSeed(clone(seed), row.payload));
    const nextPayload = options.replace ? remotePayload : mergeWorkspacePayloads(data, remotePayload, { prefer: "incoming" });
    data = normalizeData(mergeSeed(clone(seed), nextPayload));
    data.settings.cloudLastSyncAt = pulledAt;
    data.settings.cloudLastDirection = "pull";
    data.settings.cloudRemoteUpdatedAt = remoteAt;
    data.settings.cloudLastAutoCheckAt = pulledAt;
    data.settings.cloudLastPulledAt = pulledAt;
    if (options.enableAutoSync !== false) data.settings.cloudAutoSync = true;
    setCloudSyncState("pulled", "Cloud changes were merged into this device.", { pulled: true, checked: true, at: pulledAt });
    data.settings.cloudSyncError = "";
    clearCloudConflict();
    cloudHasLocalUnsyncedChanges = false;
    resetUndoBaseline();
    saveData({ undo: false, cloudSync: false, syncStamp: false });
    return true;
  }

  async function cloudPushWorkspace(options = {}) {
    if (!cloudSignedIn()) {
      showToast("Sign in to Supabase before pushing this workspace.", "danger");
      return;
    }
    try {
      await pushWorkspaceToCloud(options.force ? "force" : "push", { force: Boolean(options.force) });
      data.settings.cloudAutoSync = true;
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      startCloudAutoSync();
      if (!options.silent) showToast(options.force ? "This device was force-pushed to the cloud. Auto sync is back on." : "Local workspace pushed to Supabase. Auto sync is now on.");
      if (ui.view === "sync") render();
    } catch (error) {
      if (/cloud has newer changes|Sync paused/i.test(error.message)) {
        showToast("Cloud changed on another device. Pull cloud or use Force push from Sync Center.", "danger");
        if (ui.view === "sync") render();
        return;
      }
      if (/permission denied|insufficient privilege|not exposed|schema cache/i.test(error.message)) {
        showToast("Cloud push failed: run the latest Supabase grants SQL, then try Push local again.", "danger");
        return;
      }
      showToast(`Cloud push failed: ${error.message}`, "danger");
    }
  }

  function toggleCloudAutoSync() {
    if (!cloudSignedIn()) {
      showToast("Sign in before enabling auto sync.", "danger");
      return;
    }
    data.settings.cloudAutoSync = !cloudAutoSyncEnabled();
    setCloudSyncState(data.settings.cloudAutoSync ? "checked" : "idle", data.settings.cloudAutoSync
      ? "Auto sync is on. BillMaster will push saves and pull new cloud changes."
      : "Auto sync is off. Use Smart merge, Push local, or Pull cloud manually.", { checked: data.settings.cloudAutoSync });
    saveData({ undo: false, cloudSync: false, syncStamp: false });
    if (data.settings.cloudAutoSync) {
      showToast("Auto sync is on. BillMaster will push saves and pull new cloud changes.");
      if (cloudHasLocalUnsyncedChanges) scheduleCloudAutoPush(300);
      scheduleCloudAutoPull(900);
    } else {
      stopCloudAutoSync();
      showToast("Auto sync is off. Use Push local or Pull cloud manually.");
    }
    render();
  }

  async function cloudPullWorkspace() {
    if (!cloudSignedIn()) {
      showToast("Sign in to Supabase before pulling cloud data.", "danger");
      return;
    }
    try {
      const loaded = await loadCloudWorkspaceIntoLocal({ enableAutoSync: true });
      if (!loaded) {
        showToast("No cloud workspace found yet. Push local first.", "danger");
        return;
      }
      ui.modal = null;
      startCloudAutoSync();
      render();
      showToast("Cloud workspace pulled into this device. Auto sync is now on.");
    } catch (error) {
      showToast(`Cloud pull failed: ${error.message}`, "danger");
    }
  }

  async function cloudSmartMergeNow() {
    if (!cloudSignedIn()) {
      showToast("Sign in to Supabase before smart merging.", "danger");
      return;
    }
    try {
      const row = await fetchCloudWorkspaceRow();
      if (row?.payload) {
        setCloudSyncState("pulling", "Smart merge is reading the cloud and combining matching records.");
        saveData({ undo: false, cloudSync: false, syncStamp: false });
        const remotePayload = normalizeData(mergeSeed(clone(seed), row.payload));
        data = normalizeData(mergeSeed(clone(seed), mergeWorkspacePayloads(data, remotePayload, { prefer: "incoming" })));
      }
      data.settings.cloudAutoSync = true;
      clearCloudConflict();
      await pushWorkspaceToCloud(row?.payload ? "smart-merge" : "push");
      startCloudAutoSync();
      render();
      showToast(row?.payload
        ? "Smart merge complete. This device and the cloud now share the merged workspace."
        : "No cloud workspace was found, so this device was pushed and auto sync is on.");
    } catch (error) {
      data.settings.cloudSyncError = error.message || "Smart merge failed.";
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      render();
      showToast(`Smart merge failed: ${error.message}`, "danger");
    }
  }

  function simulateBillScan() {
    const name = document.getElementById("billName");
    const amount = document.getElementById("billAmount");
    const projected = document.getElementById("billProjected");
    const due = document.getElementById("billDue");
    if (name) name.value = "Water Utility";
    if (amount) amount.value = "74.25";
    if (projected) projected.value = "70";
    if (due) due.value = "2026-05-18";
  }

  function simulateBillDetect() {
    data.billInbox.unshift({
      id: id("inbox"),
      type: "subscription",
      status: "pending",
      source: "Auto-detect",
      title: "Detected Streaming",
      merchant: "StreamPlus",
      category: "Subscriptions",
      amount: 12.99,
      projected: 10.99,
      dueDate: "2026-05-17",
      confidence: 89,
      notes: "Auto-detect found a likely recurring streaming subscription."
    });
    saveData();
    closeModal();
    navigate("inbox");
    showToast("Detected bill staged in Review Inbox.");
  }

  function simulateImport() {
    const imported = {
      id: id("inbox"),
      type: "subscription",
      status: "pending",
      source: "Imported statement",
      title: "Detected Cloud Storage",
      merchant: "CloudBox",
      category: "Software",
      amount: 2.99,
      projected: 2.99,
      dueDate: "2026-05-19",
      confidence: 91,
      notes: "Statement import found a new recurring software charge. Review it before adding."
    };
    data.billInbox.unshift(imported);
    saveData();
    closeModal();
    navigate("inbox");
    showToast("Statement imported into Review Inbox.");
  }

  function runPlaidSandboxImport() {
    const importedAt = localTimestamp();
    const accounts = [
      { id: "plaid_checking", name: "Plaid Chase Test Checking", type: "Checking", last4: "0000", balance: 8420.55, color: "teal", provider: "Plaid Sandbox", plaidSandbox: true },
      { id: "plaid_credit", name: "Plaid Sapphire Test Card", type: "Credit", last4: "1111", balance: 642.18, color: "coral", provider: "Plaid Sandbox", plaidSandbox: true },
      { id: "plaid_savings", name: "Plaid Goal Savings", type: "Savings", last4: "2222", balance: 15250, color: "green", provider: "Plaid Sandbox", plaidSandbox: true }
    ];
    accounts.forEach((account) => upsertById(data.accounts, account));

    const today = todayIso();
    const transactions = [
      { id: "plaid_tx_payroll", type: "income", name: "Payroll Deposit", merchant: "Employer Direct Deposit", category: "Salary", amount: 3560, projected: 3560, date: addDaysIso(today, -1), frequency: "Bi-weekly", method: "Plaid Chase Test Checking", status: "Received", notes: "Imported from Plaid Sandbox.", source: "Plaid Sandbox", plaidSandbox: true, accountId: "plaid_checking" },
      { id: "plaid_tx_verizon", type: "expense", name: "Verizon Wireless", merchant: "Verizon", category: "Utilities", amount: 85, projected: 80, date: addDaysIso(today, -3), frequency: "Monthly", method: "Plaid Sapphire Test Card", status: "Paid", notes: "Recurring phone bill detected by sandbox sync.", source: "Plaid Sandbox", plaidSandbox: true, accountId: "plaid_credit" },
      { id: "plaid_tx_netflix", type: "expense", name: "Netflix", merchant: "Netflix", category: "Subscriptions", amount: 15.99, projected: 15.99, date: addDaysIso(today, -5), frequency: "Monthly", method: "Plaid Sapphire Test Card", status: "Paid", notes: "Recurring streaming subscription detected by sandbox sync.", source: "Plaid Sandbox", plaidSandbox: true, accountId: "plaid_credit" },
      { id: "plaid_tx_grocery", type: "expense", name: "Grocery Store", merchant: "Whole Foods Market", category: "Food", amount: 87.43, projected: 75, date: addDaysIso(today, -2), frequency: "One time", method: "Plaid Chase Test Checking", status: "Paid", notes: "Imported card transaction.", source: "Plaid Sandbox", plaidSandbox: true, accountId: "plaid_checking" },
      { id: "plaid_tx_electric", type: "expense", name: "Electric Bill", merchant: "City Power & Light", category: "Utilities", amount: 127.5, projected: 130, date: addDaysIso(today, -7), frequency: "Monthly", method: "Plaid Chase Test Checking", status: "Paid", notes: "Recurring utility bill detected by sandbox sync.", source: "Plaid Sandbox", plaidSandbox: true, accountId: "plaid_checking" },
      { id: "plaid_tx_credit_payment", type: "expense", name: "Capital One Payment", merchant: "Capital One", category: "Credit Card", amount: 250, projected: 250, date: addDaysIso(today, -4), frequency: "Monthly", method: "Plaid Chase Test Checking", status: "Paid", notes: "Card payment transfer imported from sandbox sync.", source: "Plaid Sandbox", plaidSandbox: true, accountId: "plaid_checking" }
    ];
    transactions.forEach((tx) => upsertById(data.transactions, tx));

    const inboxItems = [
      { id: "plaid_inbox_verizon", type: "bill", status: "pending", source: "Plaid Sandbox", title: "Verizon Wireless", merchant: "Verizon", category: "Utilities", amount: 85, projected: 80, dueDate: addDaysIso(today, 18), confidence: 94, notes: "Plaid sandbox found this as a recurring phone bill. Review before adding to Bill Management." },
      { id: "plaid_inbox_netflix", type: "subscription", status: "pending", source: "Plaid Sandbox", title: "Netflix", merchant: "Netflix", category: "Entertainment", amount: 15.99, projected: 15.99, dueDate: addDaysIso(today, 25), confidence: 96, notes: "Plaid sandbox found this as a recurring subscription. Review before adding to Subscription." },
      { id: "plaid_inbox_electric", type: "bill", status: "pending", source: "Plaid Sandbox", title: "Electric Bill", merchant: "City Power & Light", category: "Utilities", amount: 127.5, projected: 130, dueDate: addDaysIso(today, 12), confidence: 91, notes: "Plaid sandbox found a repeat utility pattern with amount and next due date." }
    ];
    inboxItems.forEach((item) => upsertById(data.billInbox, item));

    const connection = data.syncConnections.find((item) => item.id === "sync_1");
    if (connection) {
      connection.provider = "Plaid sandbox";
      connection.status = "Connected";
      connection.needsAuth = false;
      connection.lastSync = importedAt;
      connection.coverage = ["Balances", "Transactions", "Recurring charge detection", "Review Inbox staging"];
    }
    data.settings.plaidMode = "sandbox";
    data.settings.plaidSandboxConnected = true;
    data.settings.plaidLastImportAt = importedAt;
    saveData();
    render();
    showToast("Plaid Sandbox imported without duplicates. Review Inbox has bill/subscription candidates.");
  }

  function upsertById(collection, item) {
    const existingIndex = collection.findIndex((candidate) => candidate.id === item.id);
    if (existingIndex >= 0) collection[existingIndex] = { ...collection[existingIndex], ...item };
    else collection.unshift(item);
  }

  function copyPlaidProductionPlan() {
    copyText(`BillMaster Plaid Production Plan

1. Create a Plaid developer account and start in Sandbox.
2. Add a Supabase Edge Function or small backend. Never put Plaid secret keys in the browser.
3. Browser opens Plaid Link and receives a public_token.
4. Backend exchanges public_token for access_token.
5. Store only token metadata and account IDs per BillMaster user.
6. Pull accounts, balances, and transactions on demand or scheduled refresh.
7. Stage recurring bills/subscriptions in Review Inbox before adding them to Bills or Subscription.
8. Add Liabilities next for credit-card statement balances, due dates, minimum payments, and APR.
9. Move to Plaid Development/Production only after privacy, RLS, friend testing, and error handling are stable.`);
    showToast("Plaid production plan copied.");
  }

  function runSmartSync() {
    const count = billInboxItems().filter((item) => item.status === "pending").length;
    navigate("inbox");
    showToast(count ? `${count} bill inbox item${count === 1 ? "" : "s"} need review.` : "Smart sync found no new recurring bills.");
  }

  function syncConnection(connectionId) {
    const connection = data.syncConnections.find((item) => item.id === connectionId);
    if (!connection) return;
    connection.needsAuth = false;
    connection.status = connection.status === "Staged" ? "Connected" : connection.status;
    connection.lastSync = localTimestamp();
    if (connection.type === "Payments") {
      data.billInbox.unshift({
        id: id("inbox"),
        type: "bill",
        status: "pending",
        source: "Biller network",
        title: "Water Utility",
        merchant: "Water Utility",
        category: "Utilities",
        amount: 74.25,
        projected: 70,
        dueDate: "2026-05-18",
        confidence: 86,
        notes: "Biller network sync staged a due bill with amount, due date, and payment capability."
      });
    }
    saveData();
    render();
    showToast(`${connection.name} synced.`);
  }

  function localTimestamp() {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function findBillInboxItem(itemId) {
    return billInboxItems().find((item) => item.id === itemId);
  }

  function addInboxAsBill(itemId) {
    const item = findBillInboxItem(itemId);
    if (!item) return;
    if (data.bills.some((bill) => normalizedName(bill.name) === normalizedName(item.title) || normalizedName(bill.payee) === normalizedName(item.merchant))) {
      markInboxItem(itemId, "approved");
      saveData();
      render();
      showToast("That bill is already being tracked.");
      return;
    }
    data.bills.unshift({
      id: id("bill"),
      name: item.title || "Detected Bill",
      payee: item.merchant || item.title || "Biller",
      category: item.category || "Utilities",
      amount: Number(item.amount || 0),
      projected: Number(item.projected || item.amount || 0),
      dueDate: item.dueDate || ui.selectedDate,
      status: "Unpaid",
      method: "Manual",
      autopay: false,
      addressId: null
    });
    markInboxItem(itemId, "approved");
    saveData();
    render();
    showToast("Bill added from inbox.");
  }

  function addInboxAsSubscription(itemId) {
    const item = findBillInboxItem(itemId);
    if (!item) return;
    if (data.subscriptions.some((sub) => normalizedName(sub.name) === normalizedName(item.title))) {
      markInboxItem(itemId, "approved");
      saveData();
      render();
      showToast("That subscription is already being tracked.");
      return;
    }
    data.subscriptions.unshift({
      id: id("sub"),
      name: item.title || "Detected Subscription",
      plan: item.category || "Detected Plan",
      category: item.category || "Subscriptions",
      amount: Number(item.amount || 0),
      projected: Number(item.projected || item.amount || 0),
      cycle: "monthly",
      nextDate: item.dueDate || ui.selectedDate,
      lastDate: addMonthsIso(item.dueDate || ui.selectedDate, -1),
      status: "Active",
      autopay: true,
      method: "Capital One Credit Card"
    });
    markInboxItem(itemId, "approved");
    saveData();
    render();
    showToast("Subscription added from inbox.");
  }

  function cancelInboxSubscription(itemId) {
    const item = findBillInboxItem(itemId);
    if (!item) return;
    const existing = data.subscriptions.find((sub) => normalizedName(sub.name) === normalizedName(item.title));
    if (existing) {
      markInboxItem(itemId, "approved");
      setSubscriptionStatus(existing.id, "Cancelled");
      showToast("Cancellation workflow started.");
      return;
    }
    data.cancellations.unshift({
      id: id("cancel"),
      subscriptionId: null,
      name: item.title,
      provider: item.merchant,
      status: "Started",
      date: todayIso(),
      notes: "Started from Review Inbox detection before adding as active subscription."
    });
    markInboxItem(itemId, "approved");
    saveData();
    render();
    showToast("Cancellation workflow started.");
  }

  function linkInboxItem(itemId) {
    const item = findBillInboxItem(itemId);
    const match = inboxMatch(item);
    if (!match) {
      showToast("No match found for this inbox item.", "danger");
      return;
    }
    markInboxItem(itemId, "approved");
    saveData();
    render();
    showToast(`Linked to existing ${match.type}.`);
  }

  function dismissInboxItem(itemId) {
    if (!data.dismissedInboxIds.includes(itemId)) data.dismissedInboxIds.push(itemId);
    markInboxItem(itemId, "dismissed", false);
    saveData();
    render();
    showToast("Inbox item dismissed.");
  }

  function markInboxItem(itemId, status, shouldDismissDetected = true) {
    const stored = data.billInbox.find((item) => item.id === itemId);
    if (stored) stored.status = status;
    else if (shouldDismissDetected && !data.dismissedInboxIds.includes(itemId)) data.dismissedInboxIds.push(itemId);
  }

  function saveSubscription() {
    data.subscriptions.unshift({
      id: id("sub"),
      name: value("newSubName") || "Subscription",
      plan: value("newSubPlan") || "Plan",
      category: "Entertainment",
      amount: numberValue("newSubAmount"),
      projected: numberValue("newSubProjected") || numberValue("newSubAmount"),
      cycle: value("newSubCycle") || "monthly",
      nextDate: value("newSubNext") || "2026-05-20",
      lastDate: "2026-04-20",
      status: value("newSubStatus") || "Active",
      autopay: true,
      method: "Capital One Credit Card",
      image: imageValue("newSub"),
      imageZoom: imageZoomValue("newSub"),
      imageX: imagePanValue("newSub", "x"),
      imageY: imagePanValue("newSub", "y"),
      imageFit: imageFitValue("newSub"),
      imageOpacity: imageOpacityValue("newSub")
    });
    saveData();
    closeModal();
  }

  function saveSubscriptionMedia(subId) {
    const sub = data.subscriptions.find((item) => item.id === subId);
    if (!sub) return;
    sub.image = imageValue("subDetail");
    sub.imageZoom = imageZoomValue("subDetail");
    sub.imageX = imagePanValue("subDetail", "x");
    sub.imageY = imagePanValue("subDetail", "y");
    sub.imageFit = imageFitValue("subDetail");
    sub.imageOpacity = imageOpacityValue("subDetail");
    saveData();
    closeModal();
    showToast("Subscription picture saved.");
  }

  function workspaceSummaryCounts(workspace = data) {
    return {
      tasks: safeArray(workspace.tasks).length,
      notes: safeArray(workspace.notes).length,
      loans: safeArray(workspace.loans).length,
      addresses: safeArray(workspace.addresses).length,
      contacts: safeArray(workspace.contacts).length,
      projects: safeArray(workspace.projects).length,
      notebooks: safeArray(workspace.notebooks).length,
      goals: safeArray(workspace.goals).length,
      habits: safeArray(workspace.habits).length
    };
  }

  function backupTimeLabel(value) {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function backupFrequencyLabel(value) {
    return { off: "Off", daily: "Daily", weekly: "Weekly", monthly: "Monthly" }[value] || "Weekly";
  }

  function backupFrequencyCopy(value) {
    if (value === "off") return "No reminders. Manual exports still work.";
    if (value === "daily") return "Best while you are entering live work every day.";
    if (value === "monthly") return "Light reminder for stable data.";
    return "Good default while BillMaster is still growing.";
  }

  function backupReminderDue() {
    const frequency = data.settings?.backupFrequency || "weekly";
    if (frequency === "off") return false;
    const last = data.settings?.backupLastExportAt;
    if (!last) return true;
    const lastMs = new Date(last).getTime();
    if (Number.isNaN(lastMs)) return true;
    const intervals = { daily: 86400000, weekly: 7 * 86400000, monthly: 30 * 86400000 };
    return Date.now() - lastMs > (intervals[frequency] || intervals.weekly);
  }

  function backupFileName(prefix) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${prefix}-${stamp}.json`;
  }

  function workspaceBackupPayload(reason = "manual") {
    const exportedAt = new Date().toISOString();
    const backupData = normalizeData(mergeSeed(clone(seed), clone(data)));
    return {
      app: "BillMaster",
      type: "billmaster-workspace-backup",
      version: 1,
      exportedAt,
      reason,
      profileId: currentProfileId || "",
      accountEmail: cloudSafeEmail(),
      data: backupData
    };
  }

  function triggerJsonDownload(payload, filename) {
    if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof document === "undefined") {
      showToast("This browser cannot download a backup file here.", "danger");
      return false;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  }

  function downloadWorkspaceBackup(reason, prefix, message) {
    const payload = workspaceBackupPayload(reason);
    const filename = backupFileName(prefix);
    if (!triggerJsonDownload(payload, filename)) return;
    data.settings.backupLastExportAt = payload.exportedAt;
    data.settings.backupLastExportName = filename;
    saveData({ undo: false, cloudSync: false });
    render();
    showToast(message);
  }

  function downloadData() {
    return downloadWorkspaceBackup("manual-download", "BillMaster-backup", "Backup downloaded. Keep it somewhere safe.");
  }

  function downloadDriveBackup() {
    return downloadWorkspaceBackup("google-drive-download", "BillMaster-Google-Drive-backup", "Drive-ready backup downloaded. Save it to Google Drive.");
  }

  function normalizeBackupPayload(parsed, fileName) {
    const raw = parsed && parsed.type === "billmaster-workspace-backup" && parsed.data ? parsed.data : parsed;
    if (!raw || typeof raw !== "object") throw new Error("This file does not look like a BillMaster backup.");
    const workspace = normalizeData(mergeSeed(clone(seed), clone(raw)));
    return {
      fileName,
      exportedAt: parsed?.exportedAt || "",
      reason: parsed?.reason || "legacy-import",
      accountEmail: parsed?.accountEmail || "",
      workspace
    };
  }

  function importBackupFile() {
    if (typeof document === "undefined" || typeof FileReader === "undefined") {
      showToast("File restore is not available in this browser.", "danger");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || "{}"));
          ui.backupRestorePreview = normalizeBackupPayload(parsed, file.name);
          ui.modal = { type: "restoreBackup" };
          render();
        } catch (error) {
          showToast(`Backup import failed: ${error.message || "Invalid file"}`, "danger");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function clearBackupPreview() {
    ui.backupRestorePreview = null;
    ui.modal = null;
    render();
  }

  function restoreBackupFromPreview() {
    const preview = ui.backupRestorePreview;
    if (!preview) {
      showToast("Choose a backup file first.", "danger");
      return;
    }
    try {
      localStorage.setItem("billmaster-pre-restore-backup-v1", JSON.stringify(workspaceBackupPayload("pre-restore-safety-copy")));
    } catch (error) {
      console.warn("Could not save pre-restore backup", error);
    }
    data = normalizeData(mergeSeed(clone(seed), clone(preview.workspace)));
    data.settings.backupLastRestoreAt = new Date().toISOString();
    data.settings.cloudAutoSync = false;
    data.settings.cloudSyncState = "idle";
    data.settings.cloudSyncMessage = "Backup restored on this device. Review it, then Smart merge or Push local when ready.";
    ui.backupRestorePreview = null;
    ui.modal = null;
    saveData({ undo: false, cloudSync: false });
    render();
    showToast("Backup restored. Auto sync is off until you review it.");
  }

  function setBackupFrequency(value) {
    const normalized = ["off", "daily", "weekly", "monthly"].includes(value) ? value : "weekly";
    data.settings.backupFrequency = normalized;
    data.settings.backupLastReminderAt = new Date().toISOString();
    saveData({ undo: false, cloudSync: false });
    render();
    showToast(`Backup reminder set to ${backupFrequencyLabel(normalized)}.`);
  }

  function downloadCalendarIcs() {
    if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof document === "undefined") return;
    const tasks = calendarExportItems().filter((task) => task.date && task.start && task.end);
    const events = tasks.map((task) => [
      "BEGIN:VEVENT",
      `UID:${task.id}@billmaster.local`,
      `DTSTAMP:${icsDateTime(new Date())}`,
      `DTSTART:${icsLocalDateTime(task.date, task.start)}`,
      `DTEND:${icsLocalDateTime(task.date, task.end)}`,
      `SUMMARY:${icsText(task.title)}`,
      `DESCRIPTION:${icsText([task.description, taskCategory(task), task.status].filter(Boolean).join(" | "))}`,
      "END:VEVENT"
    ].join("\r\n")).join("\r\n");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BillMaster//Calendar Export//EN", events, "END:VCALENDAR"].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "billmaster-calendar.ics";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Calendar export created.");
  }

  function icsDateTime(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function icsLocalDateTime(date, time) {
    return `${date.replaceAll("-", "")}T${String(time || "00:00").replace(":", "")}00`;
  }

  function icsText(text) {
    return String(text || "").replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
  }

  function aiNorm(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function aiGoalAnswer() {
    const goals = safeArray(data.goals);
    if (!goals.length) return "I do not see any goals saved in BillMaster yet.";
    const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.target || 0), 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + Number(goal.current || 0), 0);
    const totalPct = totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    const lines = goals.map((goal) => {
      const target = Number(goal.target || 0);
      const current = Number(goal.current || 0);
      const pct = target ? Math.round((current / target) * 100) : 0;
      const remaining = Math.max(0, target - current);
      return `${goal.name}: ${pct}% complete (${money(current)} of ${money(target)}), ${money(remaining)} left, target ${dateLabel(goal.targetDate)}.`;
    });
    return `Across your saved goals, you are ${totalPct}% funded (${money(totalCurrent)} of ${money(totalTarget)}). ${lines.join(" ")}`;
  }

  function aiDateInRange(iso, startIso, endIso) {
    const value = parseLocalDate(iso).getTime();
    return value >= parseLocalDate(startIso).getTime() && value <= parseLocalDate(endIso).getTime();
  }

  function aiHabitOccursOn(habit, iso) {
    if (habit.status && habit.status !== "Active") return false;
    if (habit.startDate && parseLocalDate(habit.startDate) > parseLocalDate(iso)) return false;
    if (habit.endDate && parseLocalDate(habit.endDate) < parseLocalDate(iso)) return false;
    const weekday = parseLocalDate(iso).getDay();
    if (Array.isArray(habit.days) && habit.days.length) return habit.days.includes(weekday);
    const schedule = String(habit.schedule || "").toLowerCase();
    if (schedule.includes("weekday")) return weekday > 0 && weekday < 6;
    return schedule.includes("daily") || schedule.includes("weekly") || schedule.includes("monthly");
  }

  function aiCalendarItems(startIso, endIso) {
    const items = [];
    safeArray(data.tasks).forEach((task) => {
      if (task.date && aiDateInRange(task.date, startIso, endIso)) {
        items.push({ type: "Task", title: task.title, date: task.date, time: task.start || "", end: task.end || "", detail: task.description || task.category || task.status || "" });
      }
    });
    safeArray(data.habits).forEach((habit) => {
      for (let iso = startIso; parseLocalDate(iso) <= parseLocalDate(endIso); iso = addDaysIso(iso, 1)) {
        if (aiHabitOccursOn(habit, iso)) items.push({ type: "Habit", title: habit.title, date: iso, time: habit.start || "", end: habit.end || "", detail: habit.type || habit.schedule || "" });
      }
    });
    safeArray(data.bills).forEach((bill) => {
      if (bill.dueDate && aiDateInRange(bill.dueDate, startIso, endIso)) {
        items.push({ type: "Bill", title: bill.name, date: bill.dueDate, time: "", detail: `${money(bill.amount)} ${bill.status || ""}`.trim() });
      }
    });
    safeArray(data.subscriptions).forEach((sub) => {
      if (sub.nextDate && aiDateInRange(sub.nextDate, startIso, endIso)) {
        items.push({ type: "Subscription", title: sub.name, date: sub.nextDate, time: "", detail: `${money(sub.amount)} ${sub.status || ""}`.trim() });
      }
    });
    safeArray(data.projects).forEach((project) => {
      if (project.dueDate && aiDateInRange(project.dueDate, startIso, endIso)) {
        items.push({ type: "Project", title: project.name, date: project.dueDate, time: "", detail: `${project.level || ""} ${project.status || ""}`.trim() });
      }
    });
    return items.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }

  function aiCalendarAnswer(prompt) {
    const lower = aiNorm(prompt);
    const range = aiCalendarRange(lower);
    const startIso = range.startIso;
    const endIso = range.endIso;
    let items = aiCalendarItems(startIso, endIso);
    const timeWindow = aiCalendarTimeWindow(prompt);
    if (timeWindow) items = items.filter((item) => aiCalendarItemMatchesTimeWindow(item, timeWindow));
    const topic = aiCalendarTopic(prompt);
    if (/\bdoctor|dr\b|appointment|appt/.test(lower)) {
      items = items.filter((item) => aiNorm(`${item.title} ${item.detail}`).match(/\bdoctor|dr\b|appointment|appt|medical|dentist|clinic/));
      if (!items.length) return `${aiCalendarRangeIntro(startIso, endIso, timeWindow)}, I don't see a doctor or appointment item.`;
    } else if (topic) {
      items = items.filter((item) => aiCalendarItemMatchesTopic(item, topic));
      if (!items.length) return `${aiCalendarRangeIntro(startIso, endIso, timeWindow)}, I don't see anything matching "${topic}" on your calendar.`;
    }
    if (!items.length) return `${aiCalendarRangeIntro(startIso, endIso, timeWindow)}, I don't see any saved calendar items.`;
    return aiCalendarSummary(items, startIso, endIso, timeWindow);
  }

  function aiCalendarTopic(prompt) {
    const lower = aiNorm(prompt);
    const generic = new Set("what whats everything do i have going on this week events event tasks task todos todo calendar schedule scheduled coming up appointment appointments appt doctor dr any have is are the a an my me to for from with and or of in on at this next week today tomorrow due bills bill after before later than past until till by around between am pm clock o noon midnight morning afternoon evening tonight day days".split(" "));
    const words = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !generic.has(word));
    return words.slice(0, 3).join(" ");
  }

  function aiCalendarTimeWindow(prompt) {
    const text = String(prompt || "").toLowerCase()
      .replace(/\bnoon\b/g, "12:00 pm")
      .replace(/\bmidnight\b/g, "12:00 am");
    const timePart = "(\\d{1,2})(?::(\\d{2}))?\\s*(?:([ap])\\.?\\s*m\\.?)?";
    const betweenMatch = text.match(new RegExp(`\\b(?:between|from)\\s+${timePart}\\s+(?:and|to|-)\\s+${timePart}`, "i"));
    if (betweenMatch) {
      return {
        afterMinute: aiClockMinutes(betweenMatch[1], betweenMatch[2], betweenMatch[3], prompt),
        beforeMinute: aiClockMinutes(betweenMatch[4], betweenMatch[5], betweenMatch[6] || betweenMatch[3], prompt)
      };
    }
    const afterMatch = text.match(new RegExp(`\\b(?:after|later than|past)\\s+${timePart}`, "i"));
    if (afterMatch) return { afterMinute: aiClockMinutes(afterMatch[1], afterMatch[2], afterMatch[3], prompt) };
    const beforeMatch = text.match(new RegExp(`\\b(?:before|until|till|by)\\s+${timePart}`, "i"));
    if (beforeMatch) return { beforeMinute: aiClockMinutes(beforeMatch[1], beforeMatch[2], beforeMatch[3], prompt) };
    const aroundMatch = text.match(new RegExp(`\\b(?:at|around)\\s+${timePart}`, "i"));
    if (aroundMatch) {
      const center = aiClockMinutes(aroundMatch[1], aroundMatch[2], aroundMatch[3], prompt);
      return { afterMinute: Math.max(0, center - 30), beforeMinute: Math.min(24 * 60, center + 30) };
    }
    return null;
  }

  function aiClockMinutes(hourValue, minuteValue, meridian, prompt = "") {
    let hour = Number(hourValue || 0);
    const minute = clamp(Number(minuteValue || 0), 0, 59);
    const marker = String(meridian || "").toLowerCase();
    if (marker === "p" && hour < 12) hour += 12;
    if (marker === "a" && hour === 12) hour = 0;
    if (!marker && hour >= 1 && hour <= 7 && /\b(after|later than|past|evening|tonight|night)\b/i.test(String(prompt || ""))) hour += 12;
    hour = clamp(hour, 0, 23);
    return hour * 60 + minute;
  }

  function aiCalendarItemMatchesTimeWindow(item, timeWindow) {
    if (!timeWindow) return true;
    if (!item.time) return false;
    const start = minutes(item.time);
    let end = item.end ? minutes(item.end) : start;
    if (item.end && end < start) end += 24 * 60;
    if (timeWindow.afterMinute !== undefined && end <= timeWindow.afterMinute) return false;
    if (timeWindow.beforeMinute !== undefined && start >= timeWindow.beforeMinute) return false;
    return true;
  }

  function aiCalendarRange(lower) {
    const base = ui.selectedDate || todayIso();
    if (/\btoday\b/.test(lower) || /\bto do today\b/.test(lower) || /\bhave to do today\b/.test(lower)) {
      const today = todayIso();
      return { startIso: today, endIso: today };
    }
    if (/\btomorrow\b/.test(lower)) {
      const tomorrow = addDaysIso(todayIso(), 1);
      return { startIso: tomorrow, endIso: tomorrow };
    }
    if (lower.includes("this week") || /\bweek\b/.test(lower)) {
      const startIso = startOfWeekIso(base);
      return { startIso, endIso: addDaysIso(startIso, 6) };
    }
    const startIso = todayIso();
    return { startIso, endIso: addDaysIso(startIso, 14) };
  }

  function aiCalendarItemMatchesTopic(item, topic) {
    const haystack = aiNorm(`${item.type} ${item.title} ${item.detail}`);
    return topic.split(/\s+/).every((word) => haystack.includes(word) || haystack.includes(word.replace(/s$/, "")));
  }

  function aiCalendarSummary(items, startIso, endIso, timeWindow = null) {
    const groups = new Map();
    items.forEach((item) => {
      const key = [item.type, aiNorm(item.title), item.time || "", item.end || "", aiNorm(item.detail)].join("|");
      const row = groups.get(key) || { ...item, dates: [] };
      row.dates.push(item.date);
      groups.set(key, row);
    });
    const summaries = Array.from(groups.values())
      .sort((a, b) => `${a.dates[0]} ${a.time}`.localeCompare(`${b.dates[0]} ${b.time}`))
      .map((group) => aiCalendarGroupSummary(group, startIso, endIso));
    const shown = summaries.slice(0, 8);
    const countLabel = aiCountLabel(summaries.length);
    const thingLabel = summaries.length === 1 ? "thing" : "things";
    const extra = summaries.length > shown.length ? ` I also see ${summaries.length - shown.length} more.` : "";
    return `${aiCalendarRangeIntro(startIso, endIso, timeWindow)}, I see ${countLabel} ${thingLabel}: ${aiJoinList(shown)}.${extra}`;
  }

  function aiCalendarGroupSummary(group, startIso, endIso) {
    const sortedDates = Array.from(new Set(group.dates)).sort();
    const when = aiDatePattern(sortedDates, startIso, endIso);
    const time = group.time ? ` from ${timeLabel(group.time)}${group.end ? ` to ${timeLabel(group.end)}` : ""}` : "";
    const detail = group.detail ? ` (${group.detail})` : "";
    const prefix = ["Task", "Habit"].includes(group.type) ? "" : `${group.type}: `;
    return sortedDates.length > 1
      ? `${prefix}${group.title}${time} ${when}${detail}`
      : `${prefix}${group.title}${time}${startIso === endIso ? "" : ` on ${dateLabel(sortedDates[0])}`}${detail}`;
  }

  function aiCalendarRangeIntro(startIso, endIso, timeWindow = null) {
    const today = todayIso();
    const timeText = aiCalendarTimeWindowText(timeWindow);
    if (startIso === endIso) {
      if (startIso === today) return `For today${timeText}`;
      if (startIso === addDaysIso(today, 1)) return `For tomorrow${timeText}`;
      return `For ${dateLabel(startIso)}${timeText}`;
    }
    const weekStart = startOfWeekIso(ui.selectedDate || today);
    if (startIso === weekStart && endIso === addDaysIso(weekStart, 6)) return `For this week${timeText}`;
    return `From ${dateLabel(startIso)} to ${dateLabel(endIso)}${timeText}`;
  }

  function aiCalendarTimeWindowText(timeWindow) {
    if (!timeWindow) return "";
    const after = timeWindow.afterMinute;
    const before = timeWindow.beforeMinute;
    if (after !== undefined && before !== undefined) return ` between ${aiMinuteLabel(after)} and ${aiMinuteLabel(before)}`;
    if (after !== undefined) return ` after ${aiMinuteLabel(after)}`;
    if (before !== undefined) return ` before ${aiMinuteLabel(before)}`;
    return "";
  }

  function aiMinuteLabel(totalMinutes) {
    const normalized = ((Number(totalMinutes || 0) % (24 * 60)) + 24 * 60) % (24 * 60);
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return timeLabel(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }

  function aiCountLabel(count) {
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
    return words[count] || String(count);
  }

  function aiJoinList(items) {
    if (!items.length) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }

  function aiDatePattern(dates, startIso, endIso) {
    const fullRange = dateRangeIso(startIso, endIso);
    if (dates.length === fullRange.length && fullRange.every((iso) => dates.includes(iso))) return "every day";
    const weekdayDates = fullRange.filter((iso) => {
      const day = parseLocalDate(iso).getDay();
      return day >= 1 && day <= 5;
    });
    const weekendDates = fullRange.filter((iso) => {
      const day = parseLocalDate(iso).getDay();
      return day === 0 || day === 6;
    });
    if (weekdayDates.length && weekdayDates.every((iso) => dates.includes(iso)) && weekendDates.every((iso) => !dates.includes(iso))) {
      return "Monday through Friday, with Saturday and Sunday off";
    }
    const weekdays = Array.from(new Set(dates.map((iso) => parseLocalDate(iso).getDay()))).sort((a, b) => a - b);
    if (dates.length > 1 && dates.length <= 7) return `on ${weekdays.map((day) => weekdayLabels[day]).join(", ")}`;
    return `on ${dates.slice(0, 6).map((iso) => dateLabel(iso)).join(", ")}${dates.length > 6 ? ` and ${dates.length - 6} more dates` : ""}`;
  }

  function aiSubjectFromPrompt(prompt) {
    const cleaned = aiNorm(prompt);
    const match = cleaned.match(/\b(?:about|pertaining to|regarding|subject|on)\s+(.+)$/);
    const raw = match ? match[1] : cleaned;
    return raw.replace(/\b(notes?|notebooks?|any|do|i|have|what|does|it|say|created|when|was|inside|app|certain|subject|and|if|so)\b/g, " ").replace(/\s+/g, " ").trim();
  }

  function aiNotesAnswer(prompt) {
    const subject = aiSubjectFromPrompt(prompt);
    const haystack = (item) => aiNorm([item.title, item.content, item.subject, item.description, ...(item.subjects || [])].join(" "));
    const notes = safeArray(data.notes).filter((note) => !subject || haystack(note).includes(subject));
    const notebooks = safeArray(data.notebooks).filter((notebook) => !subject || haystack(notebook).includes(subject));
    if (!notes.length && !notebooks.length) return subject ? `I do not see notes or notebooks about "${subject}" in BillMaster.` : "I do not see matching notes or notebooks in BillMaster.";
    const notebookById = new Map(safeArray(data.notebooks).map((notebook) => [notebook.id, notebook]));
    const noteText = notes.slice(0, 5).map((note) => {
      const notebook = notebookById.get(note.notebookId);
      const snippet = String(note.content || "").slice(0, 140);
      return `${note.title} (${notebook?.title || "No notebook"}, created ${dateLabel(note.date)}): ${snippet || "No note body."}`;
    });
    const notebookText = notebooks.slice(0, 4).map((notebook) => `${notebook.title}${notebook.subjects?.length ? ` subjects: ${notebook.subjects.join(", ")}` : ""}`);
    return `I found ${notes.length} note${notes.length === 1 ? "" : "s"} and ${notebooks.length} notebook${notebooks.length === 1 ? "" : "s"}${subject ? ` about "${subject}"` : ""}. ${[...noteText, ...notebookText].join(" ")}`;
  }

  function aiExpenseAnswer() {
    const totals = new Map();
    safeArray(data.transactions).filter((tx) => tx.type === "expense").forEach((tx) => {
      const category = tx.category || "Uncategorized";
      totals.set(category, (totals.get(category) || 0) + Number(tx.amount || 0));
    });
    const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!ranked.length) return "I don't see saved expense transactions in BillMaster yet.";
    return `Your biggest saved expense categories are ${ranked.map(([category, amount]) => `${category} at ${money(amount)}`).join(", ")}.`;
  }

  function aiSubscriptionAnswer() {
    const subs = safeArray(data.subscriptions).slice().sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    if (!subs.length) return "I don't see subscriptions saved in BillMaster yet.";
    return `Your highest saved subscriptions are ${subs.slice(0, 5).map((sub) => `${sub.name} at ${money(sub.amount)} ${sub.cycle || ""}, next ${dateLabel(sub.nextDate)}`).join("; ")}.`;
  }

  function aiAppDataAnswer(prompt) {
    const lower = aiNorm(prompt);
    if (lower.includes("goal")) return aiGoalAnswer();
    if (/\b(note|notebook|subject)\b/.test(lower)) return aiNotesAnswer(prompt);
    if (/\b(events?|calendar|appointments?|appt|doctor|week|today|tomorrow|coming up|due|tasks?|todos?|to do|schedule|scheduled|have to do|going on)\b/.test(lower)) return aiCalendarAnswer(prompt);
    if (lower.includes("subscription") || lower.includes("cancel")) return aiSubscriptionAnswer();
    if (lower.includes("expense") || lower.includes("biggest") || lower.includes("spending")) return aiExpenseAnswer();
    return "I can help with what is saved in BillMaster: goals, calendar events, doctor appointments, bills, subscriptions, expenses, tasks, projects, notes, and notebooks. Try asking, \"What do I have today?\" or \"How close am I to my goals?\"";
  }

  function resetData() {
    data = clone(seed);
    saveData();
    closeModal();
  }

  function sendAi(text) {
    const prompt = String(text || "").trim();
    if (!prompt) {
      const input = document.getElementById("aiInput");
      if (input) {
        input.placeholder = "Type your question here first, then tap Ask.";
        input.classList.add("needs-question");
        input.focus();
      }
      return;
    }
    data.aiMessages.push({ role: "user", text: prompt });
    const response = aiAppDataAnswer(prompt);
    data.aiMessages.push({ role: "ai", text: response });
    ui.aiDraft = "";
    ui.aiVoiceError = "";
    saveData();
    render();
    speakAiText(response);
  }

  startLocalWorkspaceSync();
  startCloudAutoSync();
  render();
})();
