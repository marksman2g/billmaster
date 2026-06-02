(function () {
  "use strict";

  const STORE_KEY = "billmaster-web-data-v1";
  const PROFILES_KEY = "billmaster-web-profiles-v1";
  const ACTIVE_PROFILE_KEY = "billmaster-web-active-profile-v1";
  const SESSION_FALLBACK_PREFIX = "billmaster-session-fallback:";
  const CLOUD_CONFIG_KEY = "billmaster-cloud-config-v1";
  const CLOUD_SESSION_KEY = "billmaster-cloud-session-v1";
  const SAMPLE_NOW = new Date("2026-05-06T12:00:00");
  const hostedCloudConfig = normalizeCloudConfig(typeof window === "undefined" ? {} : window.BILLMASTER_CLOUD_CONFIG || {});

  const ui = {
    view: "dashboard",
    backStack: [],
    trackingTab: "expenses",
    analyticsTab: "expenses",
    chartType: "pie",
    calendarView: "day",
    selectedDate: todayIso(),
    subscriptionFilter: "all",
    billQuery: "",
    billInboxFilter: "pending",
    taskFilter: "all",
    projectId: null,
    projectSort: "level",
    notesFilter: "all",
    notesSubjectFilter: "all",
    notesView: "stream",
    notesSort: "newest",
    notesQuery: "",
    notebookQuery: "",
    selectedNotes: [],
    contactQuery: "",
    contactGroupFilter: "all",
    taskPicker: null,
    navCollapsed: {},
    goalView: "full",
    habitFilter: "all",
    habitView: "regular",
    taskCategoryFilters: { General: true, Habit: true, Finance: true, Project: true, Personal: true },
    lendingFilter: "all",
    loanQuery: "",
    blockHandleStyle: "interactive",
    blockZoom: "1",
    blockTimeFocus: "full",
    blockSelectMode: false,
    selectedTasks: [],
    selectedAddresses: [],
    notifyQuery: "",
    modal: null,
    aiDraft: "",
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
    lastSaveError: "",
    toast: null
  };

  const validViews = new Set(["dashboard", "tracking", "analytics", "bills", "inbox", "sync", "subscriptions", "calendar", "tasks", "habits", "projects", "goals", "notebooks", "notes", "contacts", "addresses", "lending", "ai"]);
  const ADD_TASK_ADDRESS_VALUE = "__add_task_address__";
  const ADD_TASK_CATEGORY_VALUE = "__add_task_category__";
  const ADD_NOTEBOOK_VALUE = "__add_note_notebook__";
  const ADD_LOAN_CONTACT_VALUE = "__add_loan_contact__";
  const taskPriorityOptions = ["Low", "Medium", "High", "Urgent"];
  const taskStatusOptions = ["Not Started", "In Progress", "Completed", "Cancelled"];
  const projectLevelOptions = ["Low", "Medium", "High", "Critical"];
  const baseTaskCategories = ["General", "Habit", "Finance", "Project", "Personal"];
  const taskCategories = [...baseTaskCategories];
  const habitTypeOptions = ["Health", "Fitness", "Finance", "Learning", "Work", "Home", "Personal", "Custom"];
  const habitScheduleOptions = ["Daily", "Weekdays", "Weekly", "Monthly"];
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const defaultCategoryColors = { General: "#8892b0", Habit: "#6c63ff", Finance: "#00bcd4", Project: "#ff9800", Personal: "#4caf50" };
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
      customTaskCategories: [],
      interfaceMode: "power",
      cloudAutoSync: false,
      cloudRemoteUpdatedAt: "",
      cloudLastAutoCheckAt: "",
      cloudSyncConflictAt: "",
      cloudSyncConflictRemoteAt: "",
      cloudSyncConflictMessage: "",
      googleContactsClientId: "",
      googleContactsLastSyncAt: "",
      googleContactsLastImportCount: 0,
      googleContactsLastGroupImportCount: 0,
      googleContactsLastStatus: "",
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
      { id: "goal_1", name: "Emergency Fund", target: 10000, current: 7000, targetDate: "2026-12-31", color: "green" },
      { id: "goal_2", name: "Vacation Fund", target: 5000, current: 2100, targetDate: "2026-06-30", color: "teal" },
      { id: "goal_3", name: "New Car Down Payment", target: 8000, current: 3200, targetDate: "2027-03-31", color: "purple" }
    ],
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
      { id: "nb_1", title: "General Notes", description: "Default", projectId: null, color: "#4388f3", icon: "book" },
      { id: "nb_2", title: "Eating Healthy", description: "Eating Healthy", projectId: null, color: "#14b8a6", icon: "note", cover: "cherries" },
      { id: "nb_3", title: "Cats", description: "CAT", projectId: null, color: "#6c63ff", icon: "book" },
      { id: "nb_4", title: "Big Project note", description: "Big Project note description", projectId: "proj_3", color: "#ff9800", icon: "book" },
      { id: "nb_5", title: "aaaa", description: "", projectId: "proj_1", color: "#3f83f8", icon: "book" },
      { id: "nb_6", title: "Eating bananas", description: "This is a test for eating bananas.", projectId: null, color: "#ffc107", icon: "note", cover: "bananas" }
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
  const recentWrites = new Map();
  const pendingActions = new Set();
  let blockDragState = null;
  let blockCreateState = null;
  let blockRepeatState = null;
  let dayDragState = null;
  let voiceRecognition = null;
  let voiceStopRequested = false;
  const dayHoldDelay = 520;
  const blockHoldDelay = 950;
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
    "delete-notebook",
    "save-notebook-picture",
    "delete-goal",
    "delete-contact",
    "delete-project",
    "save-address",
    "save-task",
    "save-habit",
    "save-habit-template-slot",
    "toggle-habit-completion",
    "copy-habit",
    "copy-selected-habits",
    "delete-selected-habits",
    "save-task-defaults",
    "jump-calendar-date",
    "jump-calendar-month",
    "save-voice-task",
    "save-voice-habit",
    "complete-task",
    "complete-selected-tasks",
    "priority-selected",
    "set-task-priority",
    "set-task-status",
    "copy-selected-tomorrow",
    "copy-selected-to-date",
    "duplicate-selected-tasks",
    "duplicate-calendar-item",
    "save-quick-time",
    "copy-selected-task-route",
    "copy-task-alert",
    "save-task-notify",
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
    "save-contact",
    "save-profile",
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
    "quick-add-task",
    "send-ai",
    "ai-prompt",
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

  function saveCloudConfigLocal(config) {
    cloudConfig = normalizeCloudConfig(config);
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
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
    if (cloudSession) localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(cloudSession));
    else localStorage.removeItem(CLOUD_SESSION_KEY);
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
      throw new Error(message);
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
    const message = body?.msg || body?.message || body?.error_description || body?.error || text || response.statusText || "";
    return { ok: response.ok, status: response.status, message, body };
  }

  function saveProfiles() {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
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
      interfaceMode: "power",
      cloudAutoSync: false,
      cloudRemoteUpdatedAt: "",
      cloudLastAutoCheckAt: "",
      cloudSyncConflictAt: "",
      cloudSyncConflictRemoteAt: "",
      cloudSyncConflictMessage: "",
      googleContactsClientId: "",
      googleContactsLastSyncAt: "",
      googleContactsLastImportCount: 0,
      googleContactsLastGroupImportCount: 0,
      googleContactsLastStatus: "",
      deletedItems: {},
      ...(nextData.settings || {})
    };
    nextData.settings.categoryColors = { ...defaultCategoryColors, ...(nextData.settings.categoryColors || {}) };
    nextData.settings.deletedItems = normalizeDeletedItemsMap(nextData.settings.deletedItems);
    nextData.settings.customTaskCategories = normalizeCustomTaskCategories(nextData.settings.customTaskCategories);
    nextData.settings.customTaskCategories.forEach((category) => ensureTaskCategory(category, nextData.settings.categoryColors[category], nextData));
    if (!["simple", "power"].includes(nextData.settings.interfaceMode)) nextData.settings.interfaceMode = "power";
    nextData.settings.cloudAutoSync = Boolean(nextData.settings.cloudAutoSync);
    if (!taskBackgrounds.includes(nextData.settings.taskDefaultBgColor)) nextData.settings.taskDefaultBgColor = DEFAULT_TASK_BG;
    taskCategories.forEach((category) => {
      if (!isHexColor(nextData.settings.categoryColors[category])) nextData.settings.categoryColors[category] = defaultCategoryColors[category];
    });
    normalizeAddresses(nextData);
    normalizeLoans(nextData);
    normalizeProjects(nextData);
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
      loan.status = loanStatusFromAmounts(loan);
    });
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
      const status = loanStatusFromAmounts(loan);
      const remaining = loanRemaining(loan);
      summary.outstanding += remaining;
      if (status === "Money Owed") summary.partial += remaining;
      summary.repaid += loanRepaid(loan);
      summary.forgiven += loanForgiven(loan);
      summary.total += 1;
      return summary;
    }, { outstanding: 0, partial: 0, repaid: 0, forgiven: 0, total: 0 });
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
      serialized = JSON.stringify(data);
      if (options.undo !== false && lastSavedSnapshot && serialized !== lastSavedSnapshot) {
        pushUndoSnapshot(lastSavedSnapshot);
      }
      localStorage.setItem(profileDataKey(), serialized);
      clearSessionFallback();
      lastSavedSnapshot = serialized;
      ui.lastSaveError = "";
      if (options.cloudSync !== false && cloudAutoSyncEnabled()) {
        cloudHasLocalUnsyncedChanges = true;
        scheduleCloudAutoPush();
      }
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
    return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function money(value) {
    return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
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

  function dueText(iso) {
    const days = daysBetween(iso);
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days`;
  }

  function statusClass(status) {
    const s = String(status || "").toLowerCase();
    if (["paid", "active", "completed", "received", "closed"].includes(s)) return "success";
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

  function varianceClass(actual, projected, type) {
    const variance = Number(actual) - Number(projected);
    if (type === "income") return variance >= 0 ? "positive" : "negative";
    return variance <= 0 ? "positive" : "negative";
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
      ["bills", "receipt", "Bills"],
      ["subscriptions", "playcard", "Sub Hub"]
    ];
  }

  function activeRoot() {
    if (ui.view === "lending") return "tracking";
    if (ui.view === "inbox") return "bills";
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
      case "subscriptions": return renderSubscriptions();
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
    const income = sum(data.transactions.filter((t) => t.type === "income"));
    const expenses = sum(data.transactions.filter((t) => t.type === "expense"));
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

    return `<section class="screen">
      ${header("BillMaster Today", `<button class="mode-toggle ${mode === "power" ? "active" : ""}" data-action="toggle-interface-mode" title="Switch Simple / Power mode">${mode === "power" ? "Power" : "Simple"}</button><button class="icon-btn" data-action="open-modal" data-modal="dataTools" aria-label="Data tools">${icon("note")}</button><button class="icon-btn" data-action="navigate" data-view="ai" aria-label="AI Assistant">${icon("ai")}</button>`)}
      <div class="dashboard-grid">
        <div class="list">
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

          <section class="section-card">
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

        <div class="list">
          <section class="section-card">
            <div class="section-title"><h2>Accounts</h2><button class="text-btn" data-action="open-modal" data-modal="accountConnections">Manage</button></div>
            <div class="account-strip">
              ${data.accounts.map((acct) => `<article class="account-card" style="border-left-color: var(--${acct.color});">
                <div class="entity-title">${esc(acct.name)}</div>
                <div class="entity-subtitle">${esc(acct.type)} ****${esc(acct.last4)}</div>
                <div class="amount-large money-blue">${money(acct.balance)}</div>
              </article>`).join("")}
            </div>
          </section>

          <section class="section-card">
            <div class="monitor-header">
              <span class="round-icon">${icon("chart")}</span>
              <div><h2 class="panel-title">Monitored Items</h2><div class="subtle">Subscriptions - Loans - Bills - Goals</div></div>
            </div>
            <div class="monitor-list">
              ${data.loans.filter((loan) => loanRemaining(loan) > 0).slice(0, 3).map((loan) => monitorLoanRow(loan)).join("") || `<p class="muted">No open lending items need attention.</p>`}
            </div>
            <div class="filter-row">
              <button data-action="navigate-root" data-view="subscriptions">${icon("playcard")} Subscriptions</button>
              <button data-action="navigate" data-view="lending">${icon("loan")} Loans</button>
              <button data-action="navigate-root" data-view="bills">${icon("receipt")} Bills</button>
              <button data-action="navigate" data-view="goals">${icon("folder")} Goals</button>
            </div>
          </section>

          <section class="section-card">
            <div class="section-title"><h2>Active Goals</h2><button class="text-btn">View All</button></div>
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
    if (cloudSignedIn() && data.settings?.cloudAutoSync) return "";
    const configured = cloudConfigured();
    const title = configured ? "Use BillMaster Anywhere" : "Cloud Setup Almost Ready";
    const copy = configured
      ? "Create or sign into your BillMaster cloud account so this workspace can follow you from desktop to phone to iPad."
      : "The Supabase project URL is built in. Add the public publishable key once, then friends can sign in without touching setup.";
    return `<section class="section-card cloud-start-card">
      <div class="cloud-start-copy">
        <span class="round-icon" style="background:${configured ? "#e9f8ef" : "#fff5d6"};color:${configured ? "var(--green)" : "var(--amber)"}">${icon(configured ? "check" : "alert")}</span>
        <div>
          <h2>${esc(title)}</h2>
          <p>${esc(copy)}</p>
        </div>
      </div>
      <div class="cloud-start-actions">
        <button class="primary-btn" data-action="navigate-root" data-view="sync">${configured ? "Sign in / Sync" : "Finish setup"}</button>
      </div>
    </section>`;
  }

  function productRoadmapCard() {
    return `<section class="section-card roadmap-card">
      <div class="section-title"><h2>Launch Roadmap</h2><span class="status warn">Next</span></div>
      <div class="roadmap-mini">
        <div><strong>1-2 weeks</strong><span>Cloud login beta: Supabase Auth, per-user tables, saved tasks, habits, addresses, calendar.</span></div>
        <div><strong>3-5 weeks</strong><span>Friend-ready beta: notes, projects, lending, subscriptions, backups, storage.</span></div>
        <div><strong>8-12+ weeks</strong><span>Production track: bank/card sync, Google Calendar, notifications, cancellation workflows.</span></div>
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
        ["calendar", "calendar", "Calendar", "blue"],
        ["tasks", "task", "Tasks", "teal"],
        ["habits", "check", "Habits", "purple"]
      ]],
      ["Money", [
        ["tracking", "wallet", "Tracking", "teal"],
        ["bills", "receipt", "Bills", "coral"],
        ["subscriptions", "playcard", "Subscription Hub", "purple"],
        ["goals", "chart", "Goals", "green"],
        ["lending", "loan", "Loans", "teal"]
      ]],
      ["Notes", [
        ["notebooks", "book", "Notebooks", "purple"],
        ["notes", "note", "Notes", "purple"],
        ["projects", "folder", "Projects", "amber"]
      ]],
      ["People & Places", [
        ["contacts", "home", "Contacts", "blue"],
        ["addresses", "map", "Addresses", "green"]
      ]],
      ["Sync & AI", [
        ["inbox", "receipt", "Review Inbox", "blue"],
        ["sync", "settings", "Sync Center", "purple"],
        ["ai", "ai", "AI Assistant", "purple"]
      ]]
    ];
    const visibleGroups = mode === "simple" ? groups.slice(0, 3) : groups;
    return `<div class="action-groups">${visibleGroups.map(([title, actions]) => `<div class="action-group">
      <h3>${esc(title)}</h3>
      <div class="action-grid">${actions.map(([view, iconName, label, color]) => quickAction(view, iconName, label, color)).join("")}</div>
    </div>`).join("")}${mode === "simple" ? `<button class="outline-btn wide" data-action="toggle-interface-mode">${icon("settings")} Show power tools</button>` : ""}</div>`;
  }

  function quickAction(view, iconName, label, color) {
    const actualView = label === "Add Bill" ? "bills" : view;
    return `<button class="action-tile" data-action="navigate" data-view="${actualView}">
      <span class="round-icon" style="color:var(--${color});background:${softColor(color)}">${icon(iconName)}</span>
      <span>${esc(label)}</span>
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
    const expenses = data.transactions.filter((t) => t.type === "expense");
    const income = data.transactions.filter((t) => t.type === "income");
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
    const todaysHabits = data.habits.filter((habit) => habitScheduledOn(habit, today));
    const completedToday = todaysHabits.filter((habit) => habitCompletedOn(habit, today)).length;
    const weekStart = startOfWeekIso(today);
    const weekEnd = addDaysIso(weekStart, 6);
    const weekStats = habitsCompletionSummary(data.habits, weekStart, weekEnd);
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = monthEndIso(today);
    const monthStats = habitsCompletionSummary(data.habits, monthStart, monthEnd);
    const filtered = data.habits.filter((habit) => {
      if (ui.habitFilter === "today") return habitScheduledOn(habit, today);
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
      <div class="metrics-grid habit-stat-grid">
        <div class="metric"><label>Active</label><strong>${activeHabits.length}</strong><span class="subtle">tracked habits</span></div>
        <div class="metric"><label>This Week</label><strong>${weekStats.completed}/${weekStats.scheduled}</strong><span class="subtle">${weekStats.rate}% completion</span></div>
        <div class="metric"><label>This Month</label><strong>${monthStats.completed}/${monthStats.scheduled}</strong><span class="subtle">${monthStats.rate}% completion</span></div>
        <div class="metric"><label>Top Streak</label><strong>${data.habits.reduce((best, habit) => Math.max(best, habitCurrentStreak(habit, today)), 0)}</strong><span class="subtle">days</span></div>
      </div>
      <div class="filter-row">
        ${["all", "today", "completed", "paused"].map((filter) => `<button class="${ui.habitFilter === filter ? "active" : ""}" data-action="set-tab" data-key="habitFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}
      </div>
      <div class="filter-row habit-view-row">
        ${["regular", "compact", "gallery"].map((view) => `<button class="${ui.habitView === view ? "active" : ""}" data-action="set-tab" data-key="habitView" data-value="${view}">${filterLabel(view)}</button>`).join("")}
      </div>
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
            <div class="habit-time-row">
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
        <span>${icon("bell")} ${habit.includeHours ? `${durationLabel(minutes(habit.end) - minutes(habit.start))} counted` : "Not counted in hours"}</span>
      </div>
      <div class="sheet-actions habit-card-actions">
        <button class="${completed ? "outline-btn" : "success-btn"}" data-action="toggle-habit-completion" data-id="${habit.id}" data-date="${today}">${icon("check")} ${completed ? "Undo Today" : "Complete Today"}</button>
        <button class="outline-btn" data-action="copy-habit" data-id="${habit.id}">${icon("note")} Copy</button>
        <button class="outline-btn" data-action="open-modal" data-modal="editHabit" data-id="${habit.id}">${icon("edit")} Edit</button>
        <div class="habit-calendar-jumps">
          <button class="outline-btn" data-action="open-habit-calendar" data-id="${habit.id}" data-view="day">${icon("calendar")} Day</button>
          <button class="outline-btn" data-action="open-habit-calendar" data-id="${habit.id}" data-view="block">${icon("chart")} Block</button>
        </div>
        <button class="danger-btn" data-action="delete-habit" data-id="${habit.id}">${icon("trash")} Delete</button>
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
    const items = data.transactions.filter((tx) => tx.type === type).sort((a, b) => b.date.localeCompare(a.date));
    const title = type === "income" ? "Income" : "Expenses";
    return `<section class="screen">
      ${header("Income & Expense Tracking", `<button class="icon-btn" data-action="navigate" data-view="lending" title="Money Lending Tracker">${icon("loan")}</button>`)}
      <div class="segmented">
        <button class="${ui.trackingTab === "expenses" ? "active" : ""}" data-action="set-tab" data-key="trackingTab" data-value="expenses">Expenses</button>
        <button class="${ui.trackingTab === "income" ? "active" : ""}" data-action="set-tab" data-key="trackingTab" data-value="income">Income</button>
      </div>
      <div class="finance-grid">
        <section class="section-card">
          <div class="section-title"><h2>${title}</h2><span class="status success">Live</span></div>
          ${trackingSummary(type)}
        </section>
        <section class="section-card">
          <div class="section-title"><h2>${type === "income" ? "All Income Sources" : "All Expenses"}</h2><button class="text-btn" data-action="open-modal" data-modal="addTransaction">${icon("plus")} Add</button></div>
          <div class="list">
            ${items.map((tx) => transactionRow(tx)).join("")}
          </div>
        </section>
      </div>
    </section>`;
  }

  function trackingSummary(type) {
    const items = data.transactions.filter((tx) => tx.type === type);
    return [1, 3, 6, 12].map((months) => {
      const actual = monthlyProjection(items, months);
      const projected = monthlyProjection(items, months, "projected");
      const variance = actual - projected;
      return `<div class="metrics-grid">
        <div class="metric"><label>${months === 1 ? "Monthly" : `${months} Months`}<br>Actual</label><strong class="${type === "income" ? "money-income" : "money-expense"}">${money(actual)}</strong></div>
        <div class="metric"><label>Projected</label><strong>${money(projected)}</strong></div>
        <div class="metric"><label>Variance</label><strong class="${varianceClass(actual, projected, type)}">${money(variance)}</strong></div>
      </div>`;
    }).join("");
  }

  function transactionRow(tx) {
    const cls = tx.type === "income" ? "positive" : "negative";
    return `<button class="data-row" style="text-align:left;background:transparent;border:0;width:100%;" data-action="open-modal" data-modal="transactionDetail" data-id="${tx.id}">
      <span class="round-icon" style="color:var(--${tx.type === "income" ? "green" : "coral"});background:${tx.type === "income" ? "#eafaf1" : "#fff0f0"}">${icon(categoryIcon(tx.category))}</span>
      <div><strong>${esc(tx.name)}</strong><div class="subtle">${esc(tx.category)} - ${esc(tx.frequency)}</div></div>
      <span style="text-align:right;"><span>Act: <strong class="${cls}">${money(tx.amount)}</strong></span><br><span class="muted">Proj: ${money(tx.projected)}</span></span>
    </button>`;
  }

  function renderAnalytics() {
    const type = ui.analyticsTab === "income" ? "income" : "expense";
    const items = data.transactions.filter((tx) => tx.type === type);
    const title = type === "income" ? "Income" : "Expenses";
    return `<section class="screen">
      ${header("Budget Analytics")}
      <div class="segmented">
        <button class="${ui.analyticsTab === "expenses" ? "active" : ""}" data-action="set-tab" data-key="analyticsTab" data-value="expenses">Expenses</button>
        <button class="${ui.analyticsTab === "income" ? "active" : ""}" data-action="set-tab" data-key="analyticsTab" data-value="income">Income</button>
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

  function projectionCard(type, months) {
    const items = data.transactions.filter((tx) => tx.type === type);
    const actual = monthlyProjection(items, months);
    const projected = monthlyProjection(items, months, "projected");
    const variance = actual - projected;
    const ok = type === "income" ? variance >= 0 : variance <= 0;
    return `<article style="margin-bottom:24px;">
      <h2 class="panel-title">${type === "income" ? "Income" : "Expenses"} - ${months} Months</h2>
      <div class="projection-row">
        <div class="amount-cell" style="background:${type === "income" ? "#eef9fc" : "#fff0f0"};border:1px solid ${type === "income" ? "#c7edf5" : "#ffd2d2"};border-radius:8px;padding:12px;">
          <label>${icon("wallet")} Actual</label><strong class="${type === "income" ? "money-income" : "money-expense"}">${money(actual)}</strong>
        </div>
        <div class="amount-cell" style="background:#eff8fb;border:1px solid #c7e7f0;border-radius:8px;padding:12px;">
          <label>${icon("chart")} Projected</label><strong class="money-blue">${money(projected)}</strong>
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
    const total = sum(categoryBreakdown(data.transactions.filter((t) => t.type === (ui.analyticsTab === "income" ? "income" : "expense"))), "actual");
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
    const variance = row.actual - row.projected;
    return `<div class="data-row">
      <span class="round-icon" style="color:var(--${type === "income" ? "teal" : "coral"});background:${type === "income" ? "#e8fbfd" : "#fff0f0"}">${icon(categoryIcon(row.name))}</span>
      <div><strong>${esc(row.name)}</strong><div class="subtle">Projected ${money(row.projected)}</div></div>
      <div style="text-align:right;"><strong class="${type === "income" ? "money-income" : "money-expense"}">${money(row.actual)}</strong><br><span class="${varianceClass(row.actual, row.projected, type)}">${money(variance)}</span></div>
    </div>`;
  }

  function renderBills() {
    const q = ui.billQuery.toLowerCase();
    const bills = data.bills.filter((bill) => [bill.name, bill.payee, bill.category].join(" ").toLowerCase().includes(q)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return `<section class="screen">
      ${header("Bill Management", `<button class="icon-btn" data-action="navigate" data-view="inbox" title="Review Inbox">${icon("receipt")}</button><button class="icon-btn" data-action="navigate" data-view="sync" title="Sync Center">${icon("settings")}</button><button class="icon-btn" data-action="navigate" data-view="calendar">${icon("calendar")}</button><button class="icon-btn" data-action="open-modal" data-modal="addBill">${icon("plus")}</button>`)}
      <div class="toolbar">
        <label class="search-field">${icon("search")}<input id="billSearch" value="${esc(ui.billQuery)}" data-action="bill-search" placeholder="Search bills..." /></label>
        <button class="icon-btn primary-btn" data-action="run-smart-sync" title="Run smart sync">${icon("filter")}</button>
        <button class="icon-btn secondary-filter" data-action="navigate" data-view="inbox" title="Detected bills">${icon("chart")}</button>
      </div>
      ${bills.length ? `<div class="bill-grid">${bills.map((bill) => billCard(bill)).join("")}</div>` : emptyState("receipt", "No Bills Found", "Add your first bill to get started with organized payments.", "Add Your First Bill", "addBill")}
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
        <div class="section-title"><h2>Cancellation Center</h2><button class="text-btn" data-action="navigate-root" data-view="subscriptions">Subscriptions</button></div>
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
      <section class="section-card balance-panel sync-hero">
        <div class="card-row">
          <div><div class="balance-label">Connection Health</div><div class="balance-amount">${connected}/${connections.length}</div><div class="small-label">${needsAuth ? `${needsAuth} connection needs setup` : "All prototype connections healthy"}</div></div>
          <span class="pill dark">${icon("settings")} Prism-plus rails</span>
        </div>
        <div class="balance-meta"><span>${icon("wallet")} Bank/Card sync</span><span>${icon("receipt")} Biller sync</span><span>${icon("note")} Import inbox</span></div>
      </section>
      ${cloudWorkspacePanel()}
      ${friendAlphaLaunchPanel()}
      ${mobileCodexAccessPanel()}
      ${mediaStoragePanel()}
      ${googleContactsPanel()}
      ${notificationFoundationPanel()}
      <div class="sync-grid">${connections.map((connection) => syncConnectionCard(connection)).join("")}</div>
      <section class="section-card">
        <div class="section-title"><h2>Production Integration Plan</h2><span class="status info">Staged</span></div>
        <div class="roadmap-grid">
          ${syncRoadmapStep("1", "Transactions", "Connect Plaid/MX/Finicity to pull balances, credit-card transactions, and recurring charge streams.")}
          ${syncRoadmapStep("2", "Liabilities", "Pull credit-card and loan due dates, statement balances, minimum due, and APR where supported.")}
          ${syncRoadmapStep("3", "Bill Pay", "Add a bill-pay rail such as BillGO/Fiserv/Method before moving real money.")}
          ${syncRoadmapStep("4", "Cancellation", "Start with guided workflows, provider links, email templates, and confirmation capture before direct APIs.")}
          ${syncRoadmapStep("5", "Contacts + Groups", "Read Google Contacts first, then later add create/update access after the privacy and consent flow is stable.")}
          ${syncRoadmapStep("6", "Notifications", "Queue task status alerts now. Add Resend/SendGrid email next, then SMS as a premium provider feature.")}
        </div>
      </section>
    </section>`;
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

  function cloudWorkspacePanel() {
    const configured = cloudConfigured();
    const signedIn = cloudSignedIn();
    const hasProject = cloudHasProjectUrl();
    const hasConflict = Boolean(data.settings?.cloudSyncConflictAt);
    const lastSync = data.settings?.cloudLastSyncAt ? `${dateLabel(data.settings.cloudLastSyncAt.slice(0, 10))} ${new Date(data.settings.cloudLastSyncAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Not synced yet";
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
      { label: "BillMaster account", ready: cloudSignedIn(), detail: cloudSignedIn() ? cloudSafeEmail() : "Create or sign in from Sync Center" },
      { label: "First cloud workspace", ready: Boolean(data.settings?.cloudLastSyncAt), detail: data.settings?.cloudLastSyncAt ? `Synced ${dateLabel(data.settings.cloudLastSyncAt.slice(0, 10))}` : "Push local once, then pull on phone/iPad" },
      { label: "Auto sync", ready: cloudAutoSyncEnabled(), detail: cloudAutoSyncEnabled() ? "Merges saved items across devices" : "Turn on after first good push/pull" }
    ];
    const ready = checks.filter((item) => item.ready).length;
    const keyMissing = cloudHasProjectUrl() && !cloudConfig.anonKey;
    const title = ready >= checks.length ? "Ready For Friend Alpha" : "Friend Alpha Launchpad";
    const copy = keyMissing
      ? "The only hard blocker is the Supabase publishable key. Once it is in the hosted config, the sign-in flow can be tested from your phone and iPad."
      : "Use this as the go/no-go board before inviting friends. Every green item means one less thing that can confuse someone testing BillMaster.";
    return `<section class="section-card friend-alpha-panel">
      <div class="friend-alpha-head">
        <div>
          <div class="section-title compact-title"><h2>${esc(title)}</h2><span class="status ${ready >= checks.length ? "success" : keyMissing ? "warn" : "info"}">${ready}/${checks.length} ready</span></div>
          <p class="muted">${esc(copy)}</p>
        </div>
        <div class="friend-alpha-score">${ready}<span>of ${checks.length}</span></div>
      </div>
      <div class="friend-alpha-checks">
        ${checks.map((item) => `<div class="friend-alpha-check ${item.ready ? "is-ready" : ""}">
          <span>${icon(item.ready ? "check" : "alert")}</span>
          <strong>${esc(item.label)}</strong>
          <small>${esc(item.detail)}</small>
        </div>`).join("")}
      </div>
      <div class="sheet-actions friend-alpha-actions">
        <button class="outline-btn" data-action="open-modal" data-modal="cloudSetup">${icon("settings")} Add / test key</button>
        <button class="outline-btn" data-action="copy-hosted-cloud-config" ${cloudConfigured() ? "" : "disabled"}>${icon("note")} Copy config</button>
        <button class="primary-btn" data-action="open-modal" data-modal="cloudAuth" ${cloudConfigured() ? "" : "disabled"}>${icon("home")} Sign in</button>
        <button class="primary-btn" data-action="cloud-smart-merge" ${cloudSignedIn() ? "" : "disabled"}>${icon("cloud")} Smart merge</button>
        <button class="secondary-btn" data-action="cloud-push-workspace" ${cloudSignedIn() ? "" : "disabled"}>${icon("wallet")} Push local</button>
        <button class="outline-btn" data-action="cloud-pull-workspace" ${cloudSignedIn() ? "" : "disabled"}>${icon("note")} Pull cloud</button>
      </div>
    </section>`;
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
    const statusClass = stats.localData ? "warn" : stats.total ? "success" : "info";
    const statusLabel = stats.localData ? `${stats.localData} local upload${stats.localData === 1 ? "" : "s"}` : stats.total ? "Portable" : "No media yet";
    const rows = stats.byCollection
      .filter((item) => item.total)
      .slice(0, 8)
      .map((item) => `<span><strong>${esc(item.label)}</strong><small>${item.total} image${item.total === 1 ? "" : "s"} | ${item.localData} local</small></span>`)
      .join("");
    return `<section class="section-card media-storage-panel">
      <div class="media-storage-copy">
        <span class="round-icon" style="color:${stats.localData ? "var(--amber)" : "var(--green)"};background:${stats.localData ? "#fff5d6" : "#e9f8ef"}">${icon(stats.localData ? "alert" : "camera")}</span>
        <div>
          <div class="section-title compact-title"><h2>Media Storage Readiness</h2><span class="status ${statusClass}">${esc(statusLabel)}</span></div>
          <p class="muted">Pictures already travel with this workspace when they are web or Google Drive links. Local uploads are saved in the workspace for now; the next production move is uploading them to the private <strong>billmaster-media</strong> Supabase bucket.</p>
        </div>
      </div>
      <div class="cloud-facts media-storage-facts">
        <span><strong>Total pictures</strong><small>${stats.total}</small></span>
        <span><strong>Portable links</strong><small>${stats.web + stats.googleDrive}</small></span>
        <span><strong>Local uploads</strong><small>${stats.localData}</small></span>
        <span><strong>Bucket</strong><small>${cloudSignedIn() ? "Ready to test upload step" : "Sign in first"}</small></span>
      </div>
      ${rows ? `<div class="media-collection-list">${rows}</div>` : `<p class="muted">Add pictures to tasks, habits, notes, notebooks, projects, goals, loans, bills, or subscriptions and this panel will track them.</p>`}
      <div class="sheet-actions media-storage-actions">
        <button class="outline-btn" data-action="copy-media-storage-plan">${icon("note")} Copy media plan</button>
        <button class="outline-btn" data-action="navigate" data-view="notebooks">${icon("book")} Notebooks</button>
        <button class="outline-btn" data-action="navigate" data-view="projects">${icon("folder")} Projects</button>
        <button class="secondary-btn" data-action="cloud-push-workspace" ${cloudSignedIn() ? "" : "disabled"}>${icon("wallet")} Sync media data</button>
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
      .sort((a, b) => (b.amount - b.projected) - (a.amount - a.projected))
      .slice(0, 3);
    const rows = expensive.map((sub) => {
      const activeRecord = data.cancellations.find((item) => item.subscriptionId === sub.id && item.status !== "Completed");
      return `<div class="data-row">
        <span class="round-icon" style="color:var(--accent);background:#efedff;">${icon("playcard")}</span>
        <div><strong>${esc(sub.name)}</strong><div class="subtle">${activeRecord ? `Cancellation ${activeRecord.status}` : `${money(sub.amount - sub.projected)} variance - ${esc(sub.status)}`}</div></div>
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
    const filtered = data.subscriptions.filter((sub) => ui.subscriptionFilter === "all" || sub.status.toLowerCase().replaceAll(" ", "-") === ui.subscriptionFilter);
    const monthly = data.subscriptions.reduce((total, sub) => total + monthlySubAmount(sub), 0);
    const projectedMonthly = data.subscriptions.reduce((total, sub) => total + monthlySubProjected(sub), 0);
    const sixMonths = monthly * 6;
    const projectedSixMonths = projectedMonthly * 6;
    const yearly = monthly * 12;
    return `<section class="screen">
      ${header("Subscription Hub", `<button class="icon-btn" data-action="navigate" data-view="inbox" title="Review Inbox">${icon("receipt")}</button><button class="icon-btn" data-action="open-modal" data-modal="subscriptionTransactions">${icon("calendar")}</button><button class="icon-btn" data-action="open-modal" data-modal="importStatement">${icon("note")}</button><button class="icon-btn" data-action="open-modal" data-modal="addSubscription">${icon("plus")}</button>`)}
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
        <div><strong>One subscription home</strong><p>Detected recurring charges, imported statements, cancellation workflows, and manual subscriptions all land here after Review Inbox approval.</p></div>
        <button class="outline-btn" data-action="navigate" data-view="inbox">${icon("receipt")} Review Inbox</button>
      </section>
      <div class="filter-row">
        ${["all", "active", "trial", "expiring-soon", "cancelled"].map((filter) => `<button class="${ui.subscriptionFilter === filter ? "active" : ""}" data-action="set-tab" data-key="subscriptionFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}
      </div>
      <div class="subscription-grid">${filtered.map((sub) => subscriptionCard(sub)).join("")}</div>
    </section>`;
  }

  function filterLabel(filter) {
    if (filter === "partial") return "Money Owed";
    return filter.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
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
        <div class="amount-cell"><label>Projected Amount <button class="text-btn" data-action="open-modal" data-modal="editSubscriptionProjected" data-id="${sub.id}">${icon("edit")}</button></label><strong class="muted">${money(sub.projected)}</strong></div>
        <div class="amount-cell"><label>Variance</label><strong class="${sub.amount - sub.projected > 0 ? "negative" : "positive"}">${money(sub.amount - sub.projected)}</strong></div>
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
    const view = ui.calendarView;
    return `<section class="screen">
      ${header("Financial Calendar", `<button class="icon-btn">${icon("search")}</button>${calendarUndoButton("icon-btn undo-icon")}<button class="icon-btn" data-action="open-modal" data-modal="calendarSync" title="Google Calendar">${icon("calendar")}</button><button class="icon-btn" data-action="open-modal" data-modal="taskDefaults" title="Task defaults">${icon("settings")}</button><button class="icon-btn">${icon("filter")}</button>`)}
      <div class="mini-tabs">
        ${["month", "week", "day", "block"].map((item) => `<button class="${view === item ? "active" : ""}" data-action="set-tab" data-key="calendarView" data-value="${item}">${filterLabel(item)}</button>`).join("")}
      </div>
      ${calendarCategoryBar()}
      <div class="calendar-controls">
        <button class="icon-btn" data-action="calendar-nav" data-direction="-1" aria-label="Previous ${view}">${icon("back")}</button>
        <div class="calendar-title-cluster">
          <button class="today-jump" data-action="go-calendar-today" data-view="${view}" title="Jump to today">${icon("calendar")} Today</button>
          <button class="calendar-title-button" data-action="open-modal" data-modal="${view === "month" ? "calendarMonthPicker" : "calendarDatePicker"}" title="${view === "month" ? "Pick month and year" : "Pick date"}">${calendarTitle(view)}</button>
          ${weatherChip(calendarTitleWeatherDate(view), "title")}
        </div>
        <button class="icon-btn" data-action="calendar-nav" data-direction="1" aria-label="Next ${view}" style="transform:rotate(180deg);">${icon("back")}</button>
      </div>
      ${view === "month" ? calendarMonth() : view === "week" ? calendarWeek() : view === "block" ? calendarBlock() : calendarDay()}
    </section>`;
  }

  function calendarCategoryBar() {
    return `<div class="category-filter-bar">
      ${taskCategories.map((category) => `<button class="${isTaskCategoryEnabled(category) ? "active" : ""}" data-action="toggle-task-category" data-category="${category}" style="--category-color:${taskCategoryColor(category)}">${esc(category)}</button>`).join("")}
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

  function addDaysIso(iso, days) {
    const date = parseLocalDate(iso);
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  function todayIso() {
    return isoDate(new Date());
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
    if (view === "week" || view === "block") {
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
      { condition: "sunny", temp: 74 }
    ];
    return { date: iso, ...patterns[Math.abs(seedValue) % patterns.length] };
  }

  function weatherIconName(weather) {
    const condition = String(weather?.condition || "").toLowerCase();
    if (condition.includes("rain")) return "rain";
    if (condition.includes("cloud")) return "cloud";
    return "sun";
  }

  function weatherConditionLabel(weather) {
    const condition = String(weather?.condition || "sunny").toLowerCase();
    if (condition.includes("rain")) return "Rain";
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

  function habitScheduledOn(habit, iso) {
    if (!habit || habit.status === "Archived") return false;
    if (habit.status === "Paused") return false;
    if (iso < habit.startDate) return false;
    if (habit.endDate && iso > habit.endDate) return false;
    if (Array.isArray(habit.skippedDates) && habit.skippedDates.includes(iso)) return false;
    const weekday = parseLocalDate(iso).getDay();
    if (habit.schedule === "Daily") return true;
    if (habit.schedule === "Weekdays") return weekday >= 1 && weekday <= 5;
    if (habit.schedule === "Weekly") return (habit.days || []).includes(weekday);
    if (habit.schedule === "Monthly") return parseLocalDate(iso).getDate() === parseLocalDate(habit.startDate).getDate();
    return true;
  }

  function habitCompletedOn(habit, iso) {
    return Boolean(habit && Array.isArray(habit.completions) && habit.completions.includes(iso));
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
      ${weekdays.map((d) => `<div class="weekday">${d}</div>`).join("")}
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
    return `<div class="day-cell ${selected ? "is-selected" : ""} ${isToday ? "is-today" : ""}" data-double-date="${iso}" style="${inMonth ? "" : "opacity:.42"}">
      ${dateViewZones(iso)}
      <div class="date-cell-content">
        <strong>${day}</strong>
        ${weatherChip(iso, "mini")}
        <div class="event-dots">${tasks.length ? `<span class="dot blue"></span>` : ""}${bill ? `<span class="dot coral"></span>` : ""}${sub ? `<span class="dot purple"></span>` : ""}</div>
        ${tasks.length ? `<span class="hour-chip">${round1(totalTaskHours(tasks))}h</span>` : ""}
      </div>
    </div>`;
  }

  function calendarWeek() {
    const dates = weekDates();
    const weekTasks = calendarItemsForRange(dates[0], dates[6]);
    return `<div class="week-strip">${dates.map((iso) => weekDayButton(iso)).join("")}</div>
      <div class="empty-state" style="min-height:36vh;"><div><h2>Week Total: ${round1(totalTaskHours(weekTasks))}h</h2><p class="muted">Tasks, bills, income, subscriptions, and goals are combined into this view.</p></div></div>
      <div class="calendar-summary">${icon("bell")} Week Total: <strong>${round1(totalTaskHours(weekTasks))}h</strong></div>`;
  }

  function calendarDay() {
    const dayTasks = tasksForDay(ui.selectedDate);
    const selectedDayTasks = dayTasks.filter((task) => ui.selectedTasks.includes(task.id));
    const selectedDayCount = selectedDayTasks.length;
    const selectedDayAddresses = selectedDayTasks.map((task) => taskAddress(task)).filter(Boolean);
    const selectedDayCanRoute = selectedDayCount > 0 && selectedDayAddresses.length === selectedDayCount;
    return `<div class="week-strip">${weekDates().map((iso) => weekDayButton(iso)).join("")}</div>
      <div class="calendar-summary day-toolbar">${icon("bell")} Today's Task Hours: <strong>${round1(totalTaskHours(dayTasks))}h</strong><span class="muted">${selectedDayCount}/${dayTasks.length} selected</span><button class="outline-btn" data-action="select-all-day-tasks">Select all</button><button class="outline-btn" data-action="deselect-all-day-tasks">Deselect all</button>${selectedDayCount ? `<button class="outline-btn compact-action" data-action="duplicate-selected-tasks">${icon("note")} Duplicate selected</button><button class="outline-btn compact-action" data-action="map-selected-day-tasks" ${selectedDayCanRoute ? "" : "disabled"}>${icon("map")} Open route</button><button class="outline-btn compact-action" data-action="copy-selected-day-task-route" ${selectedDayCanRoute ? "" : "disabled"}>${icon("note")} Copy route URL</button><button class="danger-btn compact-action" data-action="delete-selected-tasks">${icon("trash")} Delete selected</button>` : ""}<button class="outline-btn" data-action="toggle-select-mode">${ui.selectedTasks.length ? "Actions" : "Select"}</button>${calendarUndoButton()}</div>
      ${dayTimeOfDayLegend()}
      <p class="subtle" style="margin-top:-6px;">Tap an event to edit. Press and hold for duplicate/time actions. Drag one event onto another to swap times.</p>
      <div class="list day-task-grid">${dayTasks.map((task) => taskDayCard(task)).join("") || `<div class="empty-state"><div><h2>No tasks for this day</h2><button class="primary-btn" data-action="open-modal" data-modal="editTask">${icon("plus")} Add Task</button></div></div>`}</div>`;
  }

  function dayTimeOfDayLegend() {
    const items = [
      { key: "morning", label: "Morning", iconName: "morning" },
      { key: "afternoon", label: "Afternoon", iconName: "afternoon" },
      { key: "night", label: "Night", iconName: "night" },
      { key: "late-night", label: "Late Night", iconName: "late-night" }
    ];
    return `<div class="time-of-day-legend">${items.map((item) => `<span class="time-period-chip ${item.key}">${icon(item.iconName)} ${item.label}</span>`).join("")}</div>`;
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
    const d = new Date(`${iso}T12:00:00`);
    const tasks = calendarItemsForDay(iso);
    const dayHours = round1(totalTaskHours(tasks));
    const isToday = iso === todayIso();
    return `<div class="week-day ${iso === ui.selectedDate ? "active" : ""} ${isToday ? "is-today" : ""}" data-double-date="${iso}">
      ${dateViewZones(iso)}
      <div class="date-cell-content">
        <div class="subtle">${d.toLocaleDateString("en-US", { weekday: "short" })}</div>
        <strong>${d.getDate()}</strong>
        ${weatherChip(iso, "mini")}
        <div class="event-dots">${tasks.length ? `<span class="dot blue"></span>` : ""}${data.bills.some((b) => b.dueDate === iso) ? `<span class="dot coral"></span>` : ""}</div>
        ${dayHours ? `<span class="hour-chip">${dayHours}h</span>` : ""}
      </div>
    </div>`;
  }

  function dateViewZones(iso) {
    const zones = [
      ["month", "top-left", "Month view"],
      ["week", "top-right", "Week view"],
      ["day", "bottom-left", "Day view"],
      ["block", "bottom-right", "Block view"]
    ];
    return `<div class="date-view-zones">${zones.map(([view, zone, label]) => `<button class="date-zone ${zone}" data-action="set-calendar-date-view" data-date="${iso}" data-view="${view}" aria-label="${label} for ${dateLabel(iso)}" title="${label}"></button>`).join("")}</div>`;
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
    const editModal = task.isHabit ? "editHabit" : "editTask";
    const editId = task.isHabit ? task.habitId : task.id;
    const deleteAction = task.isHabit ? "delete-habit" : "delete-task";
    const habit = task.isHabit ? data.habits.find((item) => item.id === task.habitId) : null;
    const habitDone = Boolean(task.isHabit && habitCompletedOn(habit, task.date));
    const doneButton = task.isHabit
      ? `<button class="${habitDone ? "outline-btn" : "success-btn"}" data-action="toggle-habit-completion" data-id="${task.habitId}" data-date="${task.date}">${icon("check")} ${habitDone ? "Undo Done" : "Mark Done"}</button>`
      : `<button class="primary-btn" data-action="complete-task" data-id="${task.id}">${icon("check")} Done</button>`;
    return `<article class="task-card day-task-card compact-day-task ${taskImage ? "has-task-picture" : ""} ${task.status === "Completed" ? "complete" : ""}" data-task-id="${task.id}" style="${selected ? "background:#eaf4ff;border-color:#8dc8ff;" : ""}">
      ${taskImage ? `<span class="day-task-picture" ${dayTaskPictureStyle(task)}><img src="${esc(taskImage)}" alt=""></span>` : ""}
      ${taskTimeOfDayBadge(task)}
      <div class="card-row">
        <div class="day-task-main">
          <button class="icon-btn" data-action="toggle-task-select" data-id="${task.id}" aria-label="Select task">${selected ? icon("check") : icon("more")}</button>
          <div class="day-task-body">
            <h2 class="entity-title">${esc(task.title)}</h2>
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
            <div class="task-quick-controls"><span class="task-quick-badge-stack">${taskQuickBadge(task, "priority")}${taskQuickBadge(task, "status")}</span><button class="icon-btn danger-text task-delete-inline" data-action="${deleteAction}" data-id="${task.id}" aria-label="Delete ${task.isHabit ? "habit" : "task"}">${icon("trash")}</button></div>
          </div>
        </div>
      </div>
      ${taskAddressRow(task, true)}
      ${taskChecklistPreview(task, 3)}
      <div class="sheet-actions compact-card-actions">
        <button class="outline-btn" data-action="open-modal" data-modal="${editModal}" data-id="${editId}">${icon("edit")} Edit</button>
        ${task.isHabit ? `<button class="outline-btn" data-action="navigate" data-view="habits">${icon("chart")} Stats</button>` : `<button class="outline-btn" data-action="open-modal" data-modal="taskNotify" data-id="${task.id}">${icon("bell")} Notify</button>`}
        ${doneButton}
      </div>
    </article>`;
  }

  function dayTaskPictureStyle(task) {
    const opacity = task?.imageOpacity === undefined ? 0.28 : task.imageOpacity;
    return `style="--media-zoom:${imageZoom(task?.imageZoom || 1)};--media-x:${imagePan(task?.imageX || 0)}%;--media-y:${imagePan(task?.imageY || 0)}%;--media-fit:${imageFit(task?.imageFit || "cover")};--day-picture-opacity:${imageOpacity(opacity)};"`;
  }

  function calendarBlock() {
    const weekdays = weekDates();
    const tasks = calendarItemsForRange(weekdays[0], weekdays[6]).filter((task) => task.start && task.end);
    const countedTasks = tasks.filter((task) => task.includeHours);
    const handleStyle = ui.blockHandleStyle || "interactive";
    const range = blockFocusRange();
    const style = blockRangeStyle(range);
    const selectedCount = tasks.filter((task) => ui.selectedTasks.includes(task.id)).length;
    const heads = `<div class="block-head time-head">AM/PM</div>${weekdays.map((iso) => {
      const dayTasks = calendarItemsForDay(iso);
      const stateClass = `${iso === todayIso() ? "is-today" : ""} ${iso === ui.selectedDate ? "is-selected-day" : ""}`;
      return `<button class="block-head block-head-button ${stateClass}" data-action="open-day" data-date="${iso}" title="Open ${dateFull(iso)} in Day View"><span class="block-head-date">${dayName(iso)} ${Number(iso.slice(-2))}</span><span class="block-head-weather">${weatherChip(iso, "block")}</span><span class="block-head-hours">${round1(totalTaskHours(dayTasks))}h</span></button>`;
    }).join("")}<div class="block-head time-head">24h</div>`;
    const leftLabels = blockHourLabels(range, "left");
    const rightLabels = blockHourLabels(range, "right");
    const cols = weekdays.map((iso) => {
      const dayTasks = tasks.filter((task) => task.date === iso);
      const stateClass = `${iso === todayIso() ? "is-today" : ""} ${iso === ui.selectedDate ? "is-selected-day" : ""}`;
      return `<div class="block-col ${stateClass}" data-date="${iso}">${dayTasks.map((task) => blockEvent(task, dayTasks)).join("")}</div>`;
    }).join("");
    const focusKey = normalizedBlockFocusKey();
    return `<div class="calendar-summary block-toolbar">${icon("bell")} Week total: <strong>${round1(totalTaskHours(countedTasks))}h</strong><span class="muted">${ui.blockSelectMode ? `${selectedCount}/${tasks.length} selected` : "Drag empty space to create tasks. Drag either side of a task to duplicate it across days."}</span><div class="handle-style-picker"><span class="subtle">Zoom</span>${blockZoomOptions().map((option) => `<button class="${String(ui.blockZoom) === option.value ? "active" : ""}" data-action="set-tab" data-key="blockZoom" data-value="${option.value}">${option.label}</button>`).join("")}</div><div class="handle-style-picker focus-picker"><span class="subtle">Focus</span>${blockFocusOptions().map((option) => `<button class="${focusKey === option.value ? "active" : ""}" data-action="set-tab" data-key="blockTimeFocus" data-value="${option.value}" title="${esc(option.title || option.label)}">${option.iconName ? icon(option.iconName) : ""}${option.label}</button>`).join("")}</div><div class="handle-style-picker"><span class="subtle">Handles</span>${["interactive", "light", "solid"].map((styleOption) => `<button class="${handleStyle === styleOption ? "active" : ""}" data-action="set-tab" data-key="blockHandleStyle" data-value="${styleOption}">${filterLabel(styleOption)}</button>`).join("")}</div><button class="outline-btn" data-action="toggle-block-select-mode">${ui.blockSelectMode ? "Done selecting" : "Select tasks"}</button>${ui.blockSelectMode ? `<button class="outline-btn" data-action="select-visible-block-tasks">Select week</button><button class="outline-btn" data-action="clear-selected-tasks">Clear</button>${selectedCount ? `<button class="outline-btn" data-action="open-modal" data-modal="taskActions">${icon("check")} Actions</button><button class="danger-btn compact-action" data-action="delete-selected-tasks">${icon("trash")} Delete selected</button>` : ""}` : ""}${calendarUndoButton()}<button class="outline-btn" style="min-height:32px;margin-left:auto;" data-action="open-modal" data-modal="editTask">${icon("plus")} Timed Task</button></div>
      <div class="block-scroll"><div class="block-calendar handle-${handleStyle} ${ui.blockSelectMode ? "block-select-mode" : ""}" style="${style}">${heads}<div class="time-col">${leftLabels}</div>${cols}<div class="time-col-right">${rightLabels}</div></div></div>`;
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
      { value: "morning", label: "Morning 5-11:59", title: "Morning: 5:00 AM to 11:59 AM", iconName: "morning" },
      { value: "lunch", label: "Lunch 12-5:59", title: "Lunch: 12:00 PM to 5:59 PM", iconName: "noon" },
      { value: "night", label: "Night 6-10", title: "Night: 6:00 PM to 10:59 PM", iconName: "night" },
      { value: "late", label: "Late 11-4:59", title: "Late Night: 11:00 PM to 4:59 AM", iconName: "late-night" }
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
      labels.push(`<div class="time-label ${right ? "right" : ""}">${right ? `${String(hour).padStart(2, "0")}:00` : ampmHourLabel(hour)}</div>`);
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
    if (!project) return "";
    return `<button class="status muted quick-project" data-action="open-modal" data-modal="editProjectName" data-id="${project.id}" title="Edit project name">${icon("folder")} <span>${esc(project.name)}</span>${icon("edit")}</button>`;
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
    return taskCategoryColor(taskCategory(task));
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
    const filtered = data.tasks.filter((task) => {
      if (ui.taskFilter === "today") return task.date === "2026-05-06";
      if (ui.taskFilter === "week") return weekDates().includes(task.date);
      if (ui.taskFilter === "done") return task.status === "Completed";
      return true;
    });
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
      <div class="filter-row">
        ${["all", "today", "week", "done"].map((filter) => `<button class="${ui.taskFilter === filter ? "active" : ""}" data-action="set-tab" data-key="taskFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}
      </div>
      <label class="search-field" style="margin-bottom:12px;">${icon("search")}<input placeholder="Search tasks..." /></label>
      <div class="list">${filtered.map((task) => taskBoardCard(task)).join("")}</div>
    </section>`;
  }

  function taskBoardCard(task) {
    const media = entityImage(task);
    return `<article class="task-card task-board-card ${task.status === "Completed" ? "complete" : ""}" data-action="open-modal" data-modal="editTask" data-id="${task.id}" role="button" tabindex="0" title="Edit ${esc(task.title)}">
      <div class="card-row">
        <div class="task-board-main">
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
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const lastTask = projectLastEditedTask(project);
    return `<button class="project-picture-tile" data-action="open-project" data-id="${project.id}" data-project-drop="${project.id}" title="Open project or drop an unassigned task here">
      <span class="project-tile-cover" ${imageStyleAttr(project)}>
        ${media ? `<img src="${esc(media)}" alt="">` : `<span class="round-icon" style="color:#fff;background:${esc(project.color || "#1a1f36")}">${icon("folder")}</span>`}
      </span>
      <span class="project-tile-title">${esc(project.name)}</span>
      <span class="project-tile-row">${projectLevelBadge(project.level)}</span>
      <span class="project-tile-meta">${tasks.length} tasks - ${completed} done</span>
      <span class="project-tile-last" title="${esc(projectLastTaskText(lastTask))}">${esc(projectLastTaskText(lastTask))}</span>
      <span class="project-drop-hint">${icon("task")} Drop task here</span>
    </button>`;
  }

  function renderProjectDetail(project) {
    const tasks = projectTasks(project);
    const notebooks = data.notebooks.filter((notebook) => notebook.projectId === project.id);
    const media = entityImage(project);
    const done = tasks.filter((task) => task.status === "Completed").length;
    const lastTask = projectLastEditedTask(project);
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
          <div class="task-meta">${projectLevelBadge(project.level)}<span class="status info">${tasks.length} tasks</span><span class="status muted">${notebooks.length} notebooks</span><span class="status warn">Due ${dateLabel(project.dueDate)}</span></div>
          <p class="project-last-edited-line">${esc(projectLastTaskText(lastTask))}</p>
        </div>
      </section>
      <section class="section-card project-task-toolbar">
        <div>
          <h2 class="panel-title">Project Tasks</h2>
          <p class="muted">${done}/${tasks.length} completed. New tasks added here are assigned to ${esc(project.name)} automatically.</p>
        </div>
        <button class="primary-btn" data-action="open-modal" data-modal="editTask">${icon("plus")} Add Task</button>
      </section>
      <div class="list">
        ${tasks.length ? tasks.map((task) => taskBoardCard(task)).join("") : `<section class="section-card"><p class="muted">No tasks are assigned to this project yet.</p></section>`}
      </div>
    </section>`;
  }

  function renderGoals() {
    const compact = ui.goalView === "compact";
    return `<section class="screen">
      ${header("Financial Goals", `<button class="icon-btn" data-action="open-modal" data-modal="editGoal">${icon("plus")}</button>`)}
      <section class="section-card balance-panel" style="margin-bottom:16px;">
        <div class="card-row">
          <div><div class="balance-label">Active Goal Balance</div><div class="balance-amount">${money(sum(data.goals, "current"))}</div></div>
          <span class="pill dark">${data.goals.length} goals</span>
        </div>
        <div class="balance-meta"><span>${icon("chart")} Target ${money(sum(data.goals, "target"))}</span><span>${icon("task")} Linked tasks ${data.tasks.filter((task) => task.goalId).length}</span></div>
      </section>
      <div class="filter-row goal-view-row">
        ${[["full", "Full"], ["compact", "Compact"]].map(([view, label]) => `<button class="${ui.goalView === view ? "active" : ""}" data-action="set-tab" data-key="goalView" data-value="${view}">${label}</button>`).join("")}
      </div>
      <div class="goal-grid ${compact ? "compact-goals" : ""}">${data.goals.map((goal) => goalDetailCard(goal, compact)).join("")}</div>
    </section>`;
  }

  function goalDetailCard(goal, compact = false) {
    const pct = progressPct(goal.current, goal.target);
    const linkedTasks = data.tasks.filter((task) => task.goalId === goal.id);
    const media = entityImage(goal);
    const remaining = Math.max(goal.target - goal.current, 0);
    if (compact) {
      return `<article class="project-card compact-goal-card">
        <div class="compact-goal-head">
          ${media ? `<span class="media-thumb compact-goal-thumb" ${imageStyleAttr(goal)}><img src="${esc(media)}" alt=""></span>` : `<span class="round-icon" style="color:var(--${goal.color});background:${softColor(goal.color)};">${icon("chart")}</span>`}
          <div class="compact-goal-title">
            <h2 class="entity-title">${esc(goal.name)}</h2>
            <div class="entity-subtitle">Target ${dateLabel(goal.targetDate)}</div>
          </div>
          <div class="compact-goal-tools">
            <button class="icon-btn" data-action="open-modal" data-modal="editGoal" data-id="${goal.id}" aria-label="Edit goal">${icon("edit")}</button>
            <button class="icon-btn danger-text" data-action="delete-goal" data-id="${goal.id}" aria-label="Delete goal">${icon("trash")}</button>
          </div>
        </div>
        <div class="compact-goal-amounts">
          <span><strong class="positive">${money(goal.current)}</strong><small>saved</small></span>
          <span><strong>${money(goal.target)}</strong><small>target</small></span>
          <span><strong>${money(remaining)}</strong><small>to go</small></span>
        </div>
        <div class="progress ${goal.color}" style="--value:${pct}%"><span></span></div>
        <div class="compact-goal-meta">
          <span class="${pct >= 50 ? "positive" : "money-blue"}">${pct}% complete</span>
          <span>${linkedTasks.length} linked tasks</span>
        </div>
        <div class="compact-goal-actions">
          <button class="outline-btn" data-action="open-modal" data-modal="goalContribution" data-id="${goal.id}">${icon("plus")} Add</button>
          <button class="outline-btn" data-action="navigate" data-view="calendar">${icon("calendar")} Calendar</button>
        </div>
      </article>`;
    }
    return `<article class="project-card">
      <div class="card-row">
        <div style="display:flex;gap:12px;align-items:center;">
          ${media ? `<span class="media-thumb" ${imageStyleAttr(goal)}><img src="${esc(media)}" alt=""></span>` : `<span class="round-icon" style="color:var(--${goal.color});background:${softColor(goal.color)};">${icon("chart")}</span>`}
          <div><h2 class="entity-title">${esc(goal.name)}</h2><div class="entity-subtitle">Target by ${dateLabel(goal.targetDate)}</div></div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" data-action="open-modal" data-modal="editGoal" data-id="${goal.id}">${icon("edit")}</button>
          <button class="icon-btn danger-text" data-action="delete-goal" data-id="${goal.id}" aria-label="Delete goal">${icon("trash")}</button>
        </div>
      </div>
      <div class="card-row" style="margin:12px 0 8px;">
        <strong class="amount-large positive">${money(goal.current)}</strong>
        <span class="muted">of ${money(goal.target)} - ${money(remaining)} to go</span>
      </div>
      <div class="progress ${goal.color}" style="--value:${pct}%"><span></span></div>
      <div class="card-row" style="margin-top:10px;">
        <strong class="${pct >= 50 ? "positive" : "money-blue"}">${pct}% Complete</strong>
        <span class="status info">${linkedTasks.length} linked tasks</span>
      </div>
      <div class="sheet-actions" style="grid-template-columns:1fr 1fr;">
        <button class="outline-btn" data-action="open-modal" data-modal="goalContribution" data-id="${goal.id}">${icon("plus")} Add Contribution</button>
        <button class="outline-btn" data-action="navigate" data-view="calendar">${icon("calendar")} Milestones</button>
      </div>
    </article>`;
  }

  function projectGroup(project, tasks) {
    const media = entityImage(project);
    const unassigned = !project.id;
    return `<section class="project-card">
      <div class="section-title"><h2>${media ? `<span class="media-thumb project-list-thumb" ${imageStyleAttr(project)}><img src="${esc(media)}" alt=""></span>` : icon("folder")} ${esc(project.name)}</h2><span style="display:flex;align-items:center;gap:8px;">${project.id ? `<button class="icon-btn" data-action="open-project" data-id="${project.id}" aria-label="Open project">${icon("folder")}</button><button class="icon-btn" data-action="open-modal" data-modal="editProjectName" data-id="${project.id}" aria-label="Edit project">${icon("edit")}</button>` : ""}<span class="status muted">${tasks.length}</span>${project.id ? `<button class="icon-btn danger-text" data-action="delete-project" data-id="${project.id}" aria-label="Delete project">${icon("trash")}</button>` : ""}</span></div>
      ${unassigned ? `<p class="subtle project-drag-note">Drag any task card onto a project tile above to assign it.</p>` : ""}
      <div class="${unassigned ? "unassigned-task-grid" : "list"}">${tasks.map((task) => projectTaskCard(task, project, unassigned)).join("") || `<p class="muted">No unassigned tasks.</p>`}</div>
    </section>`;
  }

  function projectTaskCard(task, project, unassigned = false) {
    return `<article class="data-row project-task-mini ${unassigned ? "draggable-task" : ""}" ${unassigned ? `draggable="true" data-project-task-id="${task.id}" title="Drag ${esc(task.title)} onto a project tile"` : ""}>
      <span class="dot" style="background:${priorityColor(task.priority)}"></span>
      <div class="project-task-mini-body">
        <strong>${esc(task.title)}</strong>
        <div class="subtle">${shortDate(task.date)}</div>
        <button class="outline-btn" style="min-height:30px;margin-top:6px;color:${project.color};border-color:${project.color};" data-action="open-modal" data-modal="editTask" data-id="${task.id}">${project.id ? "Edit Task" : "Assign to Project"}</button>
      </div>
      <span class="project-task-mini-badges">${taskQuickBadge(task, "priority")}${taskQuickBadge(task, "status")}</span>
    </article>`;
  }

  function assignTaskToProject(taskId, projectId) {
    const task = data.tasks.find((item) => item.id === taskId);
    const project = data.projects.find((item) => item.id === projectId);
    if (!task || !project) return;
    task.projectId = project.id;
    task.updatedAt = new Date().toISOString();
    saveData();
    render();
    showToast(`${task.title} assigned to ${project.name}.`);
  }

  function assignNoteToNotebook(noteId, notebookId) {
    const note = data.notes.find((item) => item.id === noteId);
    const notebook = data.notebooks.find((item) => item.id === notebookId);
    if (!note || !notebook) return;
    note.notebookId = notebook.id;
    note.updatedAt = new Date().toISOString();
    saveData();
    render();
    showToast(`${note.title} assigned to ${notebook.title}.`);
  }

  function noteNotebookDropStrip() {
    const notebooks = data.notebooks;
    return `<section class="notes-notebook-strip" aria-label="Notebook drop targets">
      <div class="section-title compact-title">
        <h2>${icon("book")} Drag Notes To Notebooks</h2>
        <span class="status info">${notebooks.length}</span>
      </div>
      <p class="subtle project-drag-note">Drag any note card below onto a notebook to file it without opening the note.</p>
      <div class="note-notebook-drop-grid">
        ${notebooks.map((nb) => noteNotebookDropTile(nb)).join("") || `<p class="muted">Create a notebook first, then drag notes here.</p>`}
      </div>
    </section>`;
  }

  function noteNotebookDropTile(nb) {
    const notes = data.notes.filter((note) => note.notebookId === nb.id);
    const media = entityImage(nb);
    return `<article class="note-notebook-drop-tile" data-notebook-drop="${nb.id}" title="Drop notes into ${esc(nb.title)}">
      <button class="note-notebook-cover ${media ? "has-image" : ""}" data-action="navigate-notes" data-id="${nb.id}" ${imageStyleAttr(nb)} aria-label="Open ${esc(nb.title)}">
        ${media ? `<img src="${esc(media)}" alt="">` : `<span>${icon(nb.icon || "book")}</span>`}
      </button>
      <div class="note-notebook-drop-copy">
        <strong>${esc(nb.title)}</strong>
        <span>${notes.length} note${notes.length === 1 ? "" : "s"}</span>
      </div>
      <span class="notebook-drop-hint">${icon("note")} Drop note</span>
    </article>`;
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
      <div class="notebook-grid">${notebooks.length ? notebooks.map((nb) => notebookCard(nb)).join("") : `<section class="section-card notebook-grid-empty"><p class="muted">No notebooks match this search.</p></section>`}</div>
      <section class="section-card unassigned-notes-section">
        <div class="section-title compact-title">
          <h2>${icon("note")} Unassigned Notes</h2>
          <span class="status info">${unassignedNotes.length}</span>
        </div>
        <p class="subtle project-drag-note">Quick notes can live here first. Drag any unassigned note onto a notebook tile above when you are ready.</p>
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
    return `<article class="notebook-tile" style="--notebook-color:${esc(accent)};" data-notebook-drop="${nb.id}" title="Open notebook or drop an unassigned note here">
      <div class="notebook-cover-wrap">
        <button class="notebook-cover ${media ? "has-image" : ""}" data-action="navigate-notes" data-id="${nb.id}" ${imageStyleAttr(nb)}>
          ${media ? `<img src="${esc(media)}" alt="">` : `<span class="notebook-fallback-cover"><span class="round-icon" style="color:#fff;background:rgba(255,255,255,.18);">${icon(nb.icon || "book")}</span></span>`}
        </button>
        <span class="notebook-drop-hint">${icon("note")} Drop note</span>
        <button class="cover-edit-badge notebook-cover-edit" data-action="open-modal" data-modal="notebookPicture" data-id="${nb.id}" aria-label="Update ${esc(nb.title)} picture">${icon("camera")}</button>
      </div>
      <div class="notebook-tile-body">
        <div class="notebook-title-row">
          <button class="link-title notebook-title" data-action="navigate-notes" data-id="${nb.id}">${esc(nb.title)}</button>
          <span class="notebook-actions"><button class="icon-btn" data-action="open-modal" data-modal="editNotebook" data-id="${nb.id}" aria-label="Edit notebook">${icon("edit")}</button><button class="icon-btn danger-text" data-action="delete-notebook" data-id="${nb.id}" aria-label="Delete notebook">${icon("trash")}</button></span>
        </div>
        <div class="notebook-count-row">
          <span><strong>${count}</strong><small>notes</small></span>
          <span><strong>${subjects.length}</strong><small>subjects</small></span>
          <span><strong>${latestNote ? dateLabel(latestNote.date) : "-"}</strong><small>latest</small></span>
        </div>
        ${subjects.length ? `<div class="subject-chip-row">${subjects.slice(0, 3).map((subject) => `<span>${esc(subject)}</span>`).join("")}</div>` : `<div class="subject-chip-row"><span>No subjects yet</span></div>`}
        <p class="notebook-description">${esc(nb.description || "No description yet.")}</p>
        <div class="notebook-footer"><span>${project ? `${icon("folder")} ${esc(project.name)}` : "General library"}</span>${nb.title === "General Notes" ? `<span class="status info">Default</span>` : ""}</div>
      </div>
    </article>`;
  }

  function unassignedNoteCard(note) {
    const importanceColor = noteImportanceColor(note.importance);
    return `<article class="project-task-mini unassigned-note-mini draggable-note" draggable="true" data-notebook-note-id="${note.id}" title="Drag ${esc(note.title)} onto a notebook tile">
      <span class="dot" style="background:${importanceColor}"></span>
      <div class="project-task-mini-body">
        <strong>${esc(note.title)}</strong>
        <div class="subtle">${dateLabel(note.date)} &middot; ${esc(note.subject || "No subject")}</div>
        <button class="outline-btn" style="min-height:30px;margin-top:6px;color:${importanceColor};border-color:${importanceColor};" data-action="open-modal" data-modal="editNote" data-id="${note.id}">Edit Note</button>
      </div>
      <span class="project-task-mini-badges"><span class="status importance-pill" style="--importance-color:${importanceColor}">${esc(note.importance || "Low")}</span></span>
    </article>`;
  }

  function renderNotes() {
    const notebookId = ui.notebookId;
    const baseNotes = notebookId ? data.notes.filter((note) => note.notebookId === notebookId) : data.notes;
    const subjects = noteSubjectsForNotes(baseNotes);
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
      ${nb ? "" : noteNotebookDropStrip()}
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
      <div class="filter-row notes-importance-filters" style="margin-bottom:14px;">
        <button class="${ui.notesFilter === "all" ? "active" : ""}" data-action="set-tab" data-key="notesFilter" data-value="all">All</button>
        <button class="${ui.notesFilter === "unassigned" ? "active" : ""}" data-action="set-tab" data-key="notesFilter" data-value="unassigned" title="No Subject">None <span class="filter-count">${unassignedCount}</span></button>
        ${["Low", "Medium", "High", "Critical"].map((level) => `<button class="${ui.notesFilter === level ? "active" : ""}" style="--importance-color:${noteImportanceColor(level)}" data-action="set-tab" data-key="notesFilter" data-value="${level}" title="${esc(level)}">${esc(noteImportanceShortLabel(level))} <span class="filter-count">${noteCounts[level]}</span></button>`).join("")}
      </div>
      <div class="note-action-bar">
        <span>${selectedNoteCount ? `${selectedNoteCount} selected` : "Select notes to duplicate or delete"}</span>
        <button class="outline-btn" data-action="select-visible-notes">${selectedVisibleNotes === notes.length && notes.length ? "Deselect visible" : "Select visible"}</button>
        ${selectedNoteCount ? `<button class="outline-btn" data-action="open-modal" data-modal="duplicateNotes">${icon("note")} Duplicate</button><button class="danger-btn" data-action="delete-selected-notes">${icon("trash")} Delete selected</button><button class="outline-btn" data-action="clear-selected-notes">Clear</button>` : ""}
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
        <div class="subject-chip-row">${subjects.length ? subjects.slice(0, 5).map((subject) => `<span>${esc(subject)}</span>`).join("") : `<span>No subjects yet</span>`}</div>
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
    const subjectOptions = notebookSubjects(note.notebookId, note.subject);
    return `<article class="note-card note-${String(note.importance || "Low").toLowerCase()} ${selected ? "selected" : ""}" style="--importance-color:${importanceColor};" data-action="open-modal" data-modal="editNote" data-id="${note.id}" draggable="true" data-notebook-note-id="${note.id}" role="button" tabindex="0" aria-label="Open note ${esc(note.title)}">
      <div class="cover-frame ${media ? "has-image" : "empty"}" ${media ? imageStyleAttr(note) : ""}>
        ${media ? `<img class="cover" src="${esc(media)}" alt="">` : `<span class="note-cover-placeholder">${icon("image")} No picture</span>`}
      </div>
      <div class="note-body">
        <div class="card-row"><div style="display:flex;gap:10px;align-items:center;"><button class="note-select-button ${selected ? "active" : ""}" data-action="toggle-note-select" data-id="${note.id}" aria-label="${selected ? "Deselect" : "Select"} note">${selected ? icon("check") : ""}</button><span class="round-icon note-icon" style="color:#fff;background:${importanceColor}">${icon(note.icon || "note")}</span><h2 class="entity-title">${esc(note.title)}</h2></div><div style="display:flex;gap:6px;"><button class="icon-btn" data-action="open-modal" data-modal="duplicateNotes" data-id="${note.id}" aria-label="Duplicate note">${icon("note")}</button><button class="icon-btn" data-action="open-modal" data-modal="editNote" data-id="${note.id}">${icon("edit")}</button><button class="icon-btn danger-text" data-action="delete-note" data-id="${note.id}" aria-label="Delete note">${icon("trash")}</button></div></div>
        <div class="task-meta"><span>${icon("calendar")} ${dateLabel(note.date)}</span></div>
        <div class="note-inline-controls">
          <label><span>Priority</span><select data-action="note-inline" data-field="importance" data-id="${note.id}">
            ${["Low", "Medium", "High", "Critical"].map((level) => `<option value="${level}" ${note.importance === level ? "selected" : ""}>${level}</option>`).join("")}
          </select></label>
          <label><span>Subject</span><input data-action="note-inline" data-field="subject" data-id="${note.id}" list="noteSubjectOptions-${note.id}" value="${esc(note.subject || "")}" placeholder="No subject" autocomplete="off"></label>
          <datalist id="noteSubjectOptions-${note.id}">
            <option value="">No subject</option>
            ${subjectOptions.map((subject) => `<option value="${esc(subject)}">${esc(subject)}</option>`).join("")}
          </datalist>
          <label><span>Notebook</span><select data-action="note-inline" data-field="notebookId" data-id="${note.id}">
            <option value="" ${note.notebookId ? "" : "selected"}>Unassigned</option>
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
      <div class="filter-row">${["all", "outstanding", "partial", "repaid", "forgiven"].map((filter) => `<button class="${ui.lendingFilter === filter ? "active" : ""}" data-action="set-tab" data-key="lendingFilter" data-value="${filter}">${filterLabel(filter)}</button>`).join("")}</div>
      <div class="loan-grid">${filteredLoans.length ? filteredLoans.map((loan) => loanCard(loan)).join("") : `<section class="section-card loan-grid-empty"><p class="muted">No ${esc(filterLabel(ui.lendingFilter).toLowerCase())} loans right now.</p></section>`}</div>
    </section>`;
  }

  function matchesLendingFilter(loan, filter) {
    const status = loanStatusFromAmounts(loan);
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
    return `<article class="loan-card compact-loan-card ${dueOrOverdue ? "overdue" : ""}" style="--repaid-pct:${round1(repaidPct)}%;--forgiven-start-pct:${round1(forgivenStartPct)}%;--forgiven-end-pct:${round1(forgivenEndPct)}%;--loan-base-bg:${baseBg};" data-action="open-modal" data-modal="addLoan" data-id="${loan.id}" title="Click blank space to edit ${esc(loan.borrower)}">
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
        <button class="outline-btn" data-action="open-loan-alert" data-id="${loan.id}">${icon("bell")} Notify</button>
        <button class="danger-btn loan-delete-btn" data-action="delete-loan" data-id="${loan.id}" aria-label="Delete loan">${icon("trash")} Delete</button>
      </div>
    </article>`;
  }

  function renderAi() {
    return `<section class="screen">
      ${header("AI Assistant")}
      <section class="section-card balance-panel" style="margin-bottom:16px;">
        <h2 class="panel-title" style="color:#fff;">Financial Monitor</h2>
        <p style="color:rgba(255,255,255,.82);">Your forecast, bills, subscriptions, tasks, and goals are connected here.</p>
      </section>
      <div class="ai-chat section-card">
        ${data.aiMessages.map((msg) => `<div class="message ${msg.role}">${esc(msg.text)}</div>`).join("")}
        <div class="filter-row">
          <button data-action="ai-prompt" data-prompt="What are my biggest expenses?">Biggest expenses</button>
          <button data-action="ai-prompt" data-prompt="Am I on track for my goals?">Goal check</button>
          <button data-action="ai-prompt" data-prompt="Which subscriptions should I cancel?">Subscriptions</button>
        </div>
        <div class="quick-add">
          <span class="round-icon">${icon("ai")}</span>
          <input id="aiInput" value="${esc(ui.aiDraft)}" placeholder="Ask about your finances..." />
          <button class="icon-btn primary-btn" data-action="send-ai">${icon("check")}</button>
        </div>
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
    if (type === "editHabit") content = modalHabit(modalId);
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
    if (type === "taskActions") content = modalTaskActions();
    if (type === "copyTasksDate") content = modalCopyTasksDate();
    if (type === "taskNotify") content = modalTaskNotify(modalId);
    if (type === "taskRoute") content = modalTaskRoute();
    if (type === "editProjectName") content = modalProjectName(modalId);
    if (type === "editNote") content = modalNote(modalId);
    if (type === "duplicateNotes") content = modalDuplicateNotes(modalId);
    if (type === "editNotebook") content = modalNotebook(modalId);
    if (type === "notebookPicture") content = modalNotebookPicture(modalId);
    if (type === "editGoal") content = modalGoal(modalId);
    if (type === "goalContribution") content = modalGoalContribution(modalId);
    if (type === "editContact") content = modalContact(modalId);
    if (type === "addressRoute") content = modalAddressRoute();
    if (type === "calendarSync") content = modalCalendarSync();
    if (type === "calendarDatePicker") content = modalCalendarDatePicker(modalId);
    if (type === "calendarMonthPicker") content = modalCalendarMonthPicker();
    if (type === "taskDefaults") content = modalTaskDefaults();
    if (type === "profiles") content = modalProfiles();
    if (type === "profileLogin") content = modalProfileLogin(modalId);
    if (type === "cloudSetup") content = modalCloudSetup();
    if (type === "cloudAuth") content = modalCloudAuth();
    if (type === "googleContactsSetup") content = modalGoogleContactsSetup();
    if (type === "importStatement") content = modalImportStatement();
    if (type === "accountConnections") content = modalAccountConnections();
    if (type === "addSubscription") content = modalAddSubscription();
    if (type === "dataTools") content = modalDataTools();
    if (!content) return "";
    return `<div class="sheet-backdrop" data-action="close-modal">
      <section class="sheet" role="dialog" aria-modal="true" data-sheet>
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
    return `${modalHeader(tx.id ? `Edit ${income ? "Income" : "Expense"}` : "Add Transaction")}
      <div class="field-grid">
        ${selectField("txType", "Type", ["expense", "income"], tx.type)}
        ${field("txName", "Name", tx.name || "", income ? "Income source" : "Expense name")}
        ${selectField("txCategory", "Category", income ? ["Salary", "Freelance", "Side Hustle", "App Income", "Rental Income", "Other"] : ["Utilities", "Food", "Housing", "Transportation", "Subscriptions", "Other"], tx.category || (income ? "Salary" : "Utilities"))}
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
    return `<div class="row"><span>${esc(label)}</span><strong class="${type === "income" ? "money-income" : "money-expense"}">${money(actual)}</strong><span>${money(projected)}</span><span class="${varianceClass(actual, projected, type)}">${money(actual - projected)}</span></div>`;
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
    return `${modalHeader(editing ? "Edit Loan Transaction" : "Record Loan", editing ? "Borrower name, amount, repayments, forgiveness, and due date can all be corrected here." : "")}
      <div class="field-grid">
        ${selectField("loanContact", "Borrower From Contacts", ["", ADD_LOAN_CONTACT_VALUE, ...data.contacts.map((contact) => contact.id)], matchedContact?.id || "", (value) => {
          if (value === ADD_LOAN_CONTACT_VALUE) return "+ Add new contact";
          return value ? data.contacts.find((contact) => contact.id === value)?.name || "Contact" : "Manual / not in contacts";
        })}
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
    return `${modalHeader("Go To Date", ui.calendarView === "block" || ui.calendarView === "week" ? "Pick any date to jump to that week." : "Pick any date to open.")}
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
    const task = data.tasks.find((item) => item.id === taskId) || { date: ui.selectedDate, endDate: ui.selectedDate, start: "09:00", end: "10:00", priority: "Medium", status: "Not Started", repeat: "None", includeHours: true, bgColor: defaultTaskBgColor(), projectId: projectDefault };
    return `${modalHeader(task.id ? "Edit Task" : "Add Task")}
      <div class="field-grid">
        ${field("taskTitle", "Task Title", task.title || "", "Task Title")}
        ${textArea("taskDescription", "Description", task.description || "", "Description (optional)")}
        <div class="field-row">${field("taskDate", "Due Date", task.date || ui.selectedDate, "", "date")}${field("taskStart", "Start Time", task.start || "", "", "time")}</div>
        <div class="field-row">${field("taskEndDate", "End Date", taskEndDate(task), "", "date")}${field("taskEnd", "End Time", task.end || "", "", "time")}</div>
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
        <label class="check-row"><input id="cloudStartClean" type="checkbox"> New users: start with a clean cloud workspace after creating account</label>
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
        <span>At 217 Alexander Avenue, Bronx, NY</span>
        <span>High priority</span>
        <span>Project Isaiah</span>
      </div>`;
    return `${modalHeader("Add Task By Voice", speechAvailable ? "Speak the title, time, address, priority, status, project, or category." : "Voice capture may be blocked here. Type or paste the sentence, then parse it.")}
      <section class="voice-panel">
        <div class="voice-status ${ui.voiceListening ? "listening" : ""}">
          <span class="round-icon">${icon(ui.voiceListening ? "ai" : "mic")}</span>
          <div>
            <strong>${ui.voiceListening ? "Listening..." : speechAvailable ? "Ready for voice input" : "Typed fallback ready"}</strong>
            <div class="subtle">${esc(statusHelp)}</div>
          </div>
        </div>
        ${ui.voiceError ? `<div class="voice-message">${esc(ui.voiceError)}</div>` : example}
        <div class="sheet-actions" style="grid-template-columns:1fr 1fr;margin-top:12px;">
          <button class="${listenClass}" data-action="${listenAction}" ${!ui.voiceListening && !speechAvailable ? "disabled" : ""}>${icon(ui.voiceListening ? "close" : "mic")} ${listenLabel}</button>
          <button class="outline-btn" data-action="parse-voice-task">${icon("search")} Parse Details</button>
        </div>
      </section>
      <div class="field" style="margin-top:16px;">
        <label for="voiceTranscript">Task sentence</label>
        <textarea id="voiceTranscript" placeholder="Add task..." autocomplete="off">${esc(transcript)}</textarea>
      </div>
      ${parsed ? voiceTaskPreview(parsed) : ""}
      <div class="sheet-actions"><button class="secondary-btn" data-action="save-voice-task">${icon("check")} Save Voice Task</button></div>`;
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
    const editModal = task.isHabit ? "editHabit" : "editTask";
    const editId = task.isHabit ? task.habitId : task.id;
    const deleteAction = task.isHabit ? "delete-habit" : "delete-task";
    return `${modalHeader("Block Actions", task.title)}
      <div class="list">
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="${editModal}" data-id="${editId}">
          <span class="round-icon">${icon("edit")}</span><span>Edit ${task.isHabit ? "habit" : "task"}</span><span class="muted">Double-click</span>
        </button>
        ${task.isHabit ? `<button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="edit-habit-instance" data-id="${task.id}">
          <span class="round-icon" style="color:#0b7b4b;background:#edf9f2;">${icon("edit")}</span><span>Edit this date only</span><span class="muted">${dateLabel(task.date)}</span>
        </button>` : ""}
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="blockDuplicateHorizontal" data-id="${task.id}">
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${icon("calendar")}</span><span>Duplicate across</span><span class="muted">Choose count</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="blockDuplicateVertical" data-id="${task.id}">
          <span class="round-icon" style="color:#6c63ff;background:#efedff;">${icon("note")}</span><span>Duplicate down</span><span class="muted">Choose count</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="start-block-multi-select" data-id="${task.id}">
          <span class="round-icon" style="color:#1d73d9;background:#eaf4ff;">${icon("check")}</span><span>Multi-select tasks</span><span class="muted">Then delete selected</span>
        </button>
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="${deleteAction}" data-id="${task.id}">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete ${task.isHabit ? "habit" : "task"}</span><span></span>
        </button>
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
    const editModal = task.isHabit ? "editHabit" : "editTask";
    const editId = task.isHabit ? task.habitId : task.id;
    const deleteAction = task.isHabit ? "delete-habit" : "delete-task";
    const selected = ui.selectedTasks.includes(task.id);
    return `${modalHeader("Event Actions", task.title)}
      <div class="list">
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="open-modal" data-modal="${editModal}" data-id="${editId}">
          <span class="round-icon">${icon("edit")}</span><span>Edit ${task.isHabit ? "habit" : "task"}</span><span class="muted">Tap event</span>
        </button>
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
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;color:var(--red);" data-action="${deleteAction}" data-id="${task.id}">
          <span class="round-icon" style="color:var(--red);background:#fff0f0;">${icon("trash")}</span><span>Delete ${task.isHabit ? "habit" : "task"}</span><span></span>
        </button>
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
        <button class="data-row" style="background:transparent;border:0;width:100%;text-align:left;" data-action="duplicate-selected-tasks">
          <span class="round-icon" style="color:#6c63ff;background:#efedff;">${icon("note")}</span><span>Duplicate selected</span><span class="muted">${selected.length}</span>
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

  function modalCopyTasksDate() {
    const tomorrow = addDaysIso(ui.selectedDate, 1);
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
    const note = data.notes.find((item) => item.id === noteId) || { date: "2026-05-06", importance: "Low", notebookId: defaultNotebookId, color: "#6c63ff", icon: "note" };
    const insideNotebook = !note.id && ui.notebookId;
    return `${modalHeader(note.id ? "Edit Note" : "New Note")}
      <div class="field-grid">
        ${field("noteTitle", "Note Title", note.title || "", "Note Title")}
        ${textArea("noteContent", "Content", note.content || "", "Content (optional)")}
        ${field("noteDate", "Note Date", note.date || "2026-05-06", "", "date")}
        ${noteSubjectField(note)}
        ${selectField("noteImportance", "Importance Level", ["Low", "Medium", "High", "Critical"], note.importance || "Low")}
        ${noteNotebookField(note)}
        ${insideNotebook ? `<p class="subtle notebook-auto-note">${icon("book")} This note defaults to ${esc(data.notebooks.find((nb) => nb.id === ui.notebookId)?.title || "this notebook")}, or you can choose + New notebook above.</p>` : ""}
        ${selectField("noteCover", "Stock Image", ["", "cherries", "bananas"], note.cover || "", (value) => value ? filterLabel(value) : "No stock image")}
        ${imageAttachmentField("note", note.image || note.cover || "", "Note Picture / Graphic", note.imageZoom, note.imageX, note.imageY, note.imageFit, note.imageOpacity)}
        <div class="field"><label>Color</label><div class="swatches">${["#4388f3", "#6c63ff", "#10b981", "#ff9800", "#f44336", "#8b5cf6", "#ec4899", "#14b8a6"].map((c) => `<button class="swatch ${note.color === c ? "active" : ""}" style="background:${c}" data-action="pick-note-color" data-color="${c}"></button>`).join("")}</div></div>
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-note" data-id="${note.id || ""}">${note.id ? "Update Note" : "Save Note"}</button></div>`;
  }

  function noteSubjectField(note) {
    const subjects = notebookSubjects(note.notebookId, note.subject);
    const current = String(note.subject || "").trim();
    return `<div class="field">
      <label for="noteSubject">Subject</label>
      <input id="noteSubject" list="noteSubjectOptions" value="${esc(current)}" placeholder="No subject or type a new subject" autocomplete="off">
      <datalist id="noteSubjectOptions">
        <option value="">No subject</option>
        <option value="+ New subject">Type a new subject</option>
        ${subjects.map((subject) => `<option value="${esc(subject)}">${esc(subject)}</option>`).join("")}
      </datalist>
      <span class="field-hint">Pick an existing subject or type a new one here.</span>
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

  function notebookSubjects(notebookId, includeSubject = "") {
    const subjects = data.notes
      .filter((note) => !notebookId || note.notebookId === notebookId)
      .map((note) => String(note.subject || "").trim())
      .filter(Boolean);
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
    return `${modalHeader(goal.id ? "Edit Goal" : "New Goal")}
      <div class="field-grid">
        ${field("goalName", "Goal Name", goal.name || "", "Emergency Fund")}
        ${field("goalTarget", "Target Amount", goal.target || "", "10000", "number")}
        ${field("goalCurrent", "Current Amount", goal.current || "", "4200", "number")}
        ${field("goalDate", "Target Date", goal.targetDate || "2026-12-31", "", "date")}
        ${selectField("goalColor", "Color", ["green", "teal", "purple", "amber"], goal.color || "green", filterLabel)}
        ${imageAttachmentField("goal", goal.image || "", "Goal Picture / Graphic", goal.imageZoom, goal.imageX, goal.imageY, goal.imageFit, goal.imageOpacity)}
      </div>
      <div class="sheet-actions"><button class="primary-btn" data-action="save-goal" data-id="${goal.id || ""}">Save Goal</button></div>`;
  }

  function modalGoalContribution(goalId) {
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal) return "";
    return `${modalHeader("Add Contribution", goal.name)}
      <div class="field-grid">
        ${field("goalContributionAmount", "Contribution Amount", "", "100", "number")}
        ${field("goalContributionDate", "Date", "2026-05-06", "", "date")}
        ${textArea("goalContributionNote", "Note", "", "Optional note")}
      </div>
      <div class="sheet-actions"><button class="success-btn" data-action="save-goal-contribution" data-id="${goal.id}">Add Contribution</button></div>`;
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
    return `${modalHeader("Account Connections")}
      <div class="list">${data.accounts.map((acct) => `<article class="data-row" style="border:1px solid var(--line);border-radius:8px;padding:12px;"><span class="round-icon">${icon("wallet")}</span><div><strong>${esc(acct.name)}</strong><div class="subtle">${esc(acct.type)} ****${esc(acct.last4)}</div></div><span class="status success">Connected</span></article>`).join("")}</div>
      <div class="sheet-actions"><button class="primary-btn">${icon("plus")} Link New Account</button></div>`;
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
      ["subscriptions", "Subscriptions"],
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

  function mediaPortabilityStats() {
    const stats = {
      total: 0,
      web: 0,
      googleDrive: 0,
      localData: 0,
      devicePath: 0,
      stock: 0,
      other: 0,
      byCollection: []
    };
    mediaTrackedCollections().forEach(([collection, label]) => {
      const row = { collection, label, total: 0, localData: 0 };
      safeArray(data[collection]).forEach((item) => {
        const source = item?.image || item?.cover || "";
        const kind = mediaSourceKind(source);
        if (!kind) return;
        stats.total += 1;
        row.total += 1;
        if (stats[kind] !== undefined) stats[kind] += 1;
        else stats.other += 1;
        if (kind === "localData") row.localData += 1;
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
      `Portable web/Google links: ${stats.web + stats.googleDrive}`,
      `Local uploads currently stored in workspace JSON: ${stats.localData}`,
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
        .map((item) => `- ${item.label}: ${item.total} image(s), ${item.localData} local upload(s)`)
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
    attachBlockInteractions();
    attachDayTaskInteractions();
    attachHabitInteractions();
    attachProjectTaskInteractions();
    attachNoteNotebookInteractions();
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
        if (event.target.closest("button,input,select,textarea,a")) {
          event.preventDefault();
          return;
        }
        card.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.dataset.habitId || "");
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("is-dragging");
        document.querySelectorAll(".habit-card.drag-over").forEach((item) => item.classList.remove("drag-over"));
      });
      card.addEventListener("dragover", (event) => {
        event.preventDefault();
        card.classList.add("drag-over");
      });
      card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
      card.addEventListener("drop", (event) => {
        event.preventDefault();
        card.classList.remove("drag-over");
        const sourceId = event.dataTransfer.getData("text/plain");
        const targetId = card.dataset.habitId || "";
        swapHabits(sourceId, targetId);
      });
    });
  }

  function attachProjectTaskInteractions() {
    if (ui.view !== "projects" || ui.projectId) return;
    document.querySelectorAll("[data-project-task-id]").forEach((card) => {
      if (card.dataset.dragBound === "true") return;
      card.dataset.dragBound = "true";
      card.addEventListener("dragstart", (event) => {
        if (event.target.closest("button,input,select,textarea,a")) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.dataset.projectTaskId || "");
        event.dataTransfer.setData("application/x-billmaster-task", card.dataset.projectTaskId || "");
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
        if (!types.includes("application/x-billmaster-task") && !types.includes("text/plain")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        tile.classList.add("project-drop-active");
      });
      tile.addEventListener("dragleave", () => tile.classList.remove("project-drop-active"));
      tile.addEventListener("drop", (event) => {
        const taskId = event.dataTransfer.getData("application/x-billmaster-task") || event.dataTransfer.getData("text/plain");
        if (!taskId) return;
        event.preventDefault();
        tile.classList.remove("project-drop-active");
        assignTaskToProject(taskId, tile.dataset.projectDrop);
      });
    });
  }

  function attachNoteNotebookInteractions() {
    if (!["notebooks", "notes"].includes(ui.view)) return;
    document.querySelectorAll("[data-notebook-note-id]").forEach((card) => {
      if (card.dataset.dragBound === "true") return;
      card.dataset.dragBound = "true";
      card.addEventListener("dragstart", (event) => {
        if (event.target.closest("button,input,select,textarea,a")) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.dataset.notebookNoteId || "");
        event.dataTransfer.setData("application/x-billmaster-note", card.dataset.notebookNoteId || "");
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("is-dragging");
        document.querySelectorAll(".notebook-drop-active").forEach((tile) => tile.classList.remove("notebook-drop-active"));
      });
    });
    document.querySelectorAll("[data-notebook-drop]").forEach((tile) => {
      if (tile.dataset.dropBound === "true") return;
      tile.dataset.dropBound = "true";
      tile.addEventListener("dragover", (event) => {
        const types = Array.from(event.dataTransfer.types || []);
        if (!types.includes("application/x-billmaster-note") && !types.includes("text/plain")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        tile.classList.add("notebook-drop-active");
      });
      tile.addEventListener("dragleave", () => tile.classList.remove("notebook-drop-active"));
      tile.addEventListener("drop", (event) => {
        const noteId = event.dataTransfer.getData("application/x-billmaster-note") || event.dataTransfer.getData("text/plain");
        if (!noteId) return;
        event.preventDefault();
        tile.classList.remove("notebook-drop-active");
        assignNoteToNotebook(noteId, tile.dataset.notebookDrop);
      });
    });
  }

  function startDayTaskDrag(event) {
    if (event.target.closest("button,a,input,select,textarea")) return;
    const card = event.currentTarget;
    const task = findCalendarItemById(card.dataset.taskId);
    if (!task) return;
    card.setPointerCapture?.(event.pointerId);
    dayDragState = {
      taskId: task.id,
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      targetId: "",
      holdOpened: false,
      holdTimer: null
    };
    scheduleDayHoldMenu(dayDragState);
    document.addEventListener("pointermove", moveDayTaskDrag);
    document.addEventListener("pointerup", endDayTaskDrag, { once: true });
    document.addEventListener("pointercancel", cancelDayTaskDrag, { once: true });
  }

  function moveDayTaskDrag(event) {
    if (!dayDragState) return;
    const state = dayDragState;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    state.moved = state.moved || Math.abs(dx) > 6 || Math.abs(dy) > 6;
    if (!state.moved) return;
    clearDayHoldTimer(state);
    state.card.classList.add("is-dragging");
    state.card.style.transform = `translateY(${dy}px)`;
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

  function endDayTaskDrag() {
    document.removeEventListener("pointermove", moveDayTaskDrag);
    if (!dayDragState) return;
    const state = dayDragState;
    clearDayHoldTimer(state);
    state.card.classList.remove("is-dragging");
    state.card.style.transform = "";
    state.card.releasePointerCapture?.(state.pointerId);
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
      dayDragState.card.classList.remove("is-dragging");
      dayDragState.card.style.transform = "";
      dayDragState.card.releasePointerCapture?.(dayDragState.pointerId);
      document.querySelectorAll(".day-task-card.drop-target").forEach((card) => card.classList.remove("drop-target"));
      dayDragState = null;
    }
  }

  function scheduleDayHoldMenu(state) {
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
    openModal(item.isHabit ? "editHabit" : "editTask", item.isHabit ? item.habitId : item.id);
  }

  function attachBlockInteractions() {
    document.querySelectorAll(".block-col").forEach((column) => {
      if (column.dataset.createBound === "true") return;
      column.dataset.createBound = "true";
      column.addEventListener("pointerdown", startBlockCreate);
    });
    document.querySelectorAll(".event-block").forEach((block) => {
      if (block.dataset.bound === "true") return;
      block.dataset.bound = "true";
      block.addEventListener("pointerdown", startBlockDrag);
      block.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearBlockHoldTimer(blockDragState);
        const item = findCalendarItemById(block.dataset.taskId);
        openModal(item?.isHabit ? "editHabit" : "editTask", item?.isHabit ? item.habitId : block.dataset.taskId);
      });
      block.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const item = findCalendarItemById(block.dataset.taskId);
          openModal(item?.isHabit ? "editHabit" : "editTask", item?.isHabit ? item.habitId : block.dataset.taskId);
        }
      });
    });
  }

  function startBlockDrag(event) {
    const block = event.currentTarget;
    const task = findCalendarItemById(block.dataset.taskId);
    const column = block.closest(".block-col");
    if (!task || !column) return;
    if (event.target.closest("[data-action='toggle-task-select']")) return;
    if (ui.blockSelectMode && !event.target.closest("[data-resize],[data-repeat]")) {
      event.preventDefault();
      event.stopPropagation();
      toggleTaskSelect(task.id);
      return;
    }
    const repeat = event.target.closest("[data-repeat]");
    if (repeat) return startBlockRepeatDrag(event, block, task, column);
    const resize = event.target.closest("[data-resize]");
    if (!resize && event.detail && event.detail > 1) {
      event.preventDefault();
      event.stopPropagation();
      openModal(task.isHabit ? "editHabit" : "editTask", task.isHabit ? task.habitId : task.id);
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

  function scheduleBlockHoldMenu(state) {
    clearBlockHoldTimer(state);
    state.holdTimer = setTimeout(() => {
      if (blockDragState !== state || state.moved) return;
      state.holdOpened = true;
      document.removeEventListener("pointermove", moveBlockDrag);
      state.block.classList.remove("is-dragging");
      state.block.style.transform = "";
      state.block.releasePointerCapture?.(state.pointerId);
      blockDragState = null;
      openModal("blockTaskMenu", state.taskId);
    }, blockHoldDelay);
  }

  function clearBlockHoldTimer(state) {
    if (!state?.holdTimer) return;
    clearTimeout(state.holdTimer);
    state.holdTimer = null;
  }

  function startBlockCreate(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest(".event-block")) return;
    const column = event.currentTarget;
    const calendar = column.closest(".block-calendar");
    const columns = Array.from(calendar?.querySelectorAll(".block-col") || []);
    const startColumn = blockColumnFromCrosshair(columns, event.clientX, event.clientY, column);
    const startIndex = columns.indexOf(startColumn);
    if (startIndex < 0) return;
    const rect = startColumn.getBoundingClientRect();
    const startMinute = snapGridMinuteCeil(blockPixelToMinute(event.clientY - rect.top));
    event.preventDefault();
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
      previews: []
    };
    document.addEventListener("pointermove", moveBlockCreate);
    document.addEventListener("pointerup", endBlockCreate, { once: true });
    document.addEventListener("pointercancel", cancelBlockCreate, { once: true });
  }

  function moveBlockCreate(event) {
    if (!blockCreateState) return;
    const state = blockCreateState;
    const selection = blockCreateSelection(event, state);
    state.moved = state.moved || Math.abs(event.clientX - state.startX) > 5 || Math.abs(event.clientY - state.startY) > 5;
    renderBlockCreatePreview(state, selection);
  }

  function endBlockCreate(event) {
    document.removeEventListener("pointermove", moveBlockCreate);
    if (!blockCreateState) return;
    const state = blockCreateState;
    const selection = blockCreateSelection(event, state);
    clearBlockCreatePreview(state);
    state.pointerColumn?.releasePointerCapture?.(state.pointerId);
    blockCreateState = null;
    if (!state.moved) return;
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

  function createTasksFromBlockSelection(selection) {
    if (selection.endIndex > selection.startIndex) {
      const dates = [];
      for (let index = selection.startIndex; index <= selection.endIndex; index += 1) {
        const date = selection.columns[index]?.dataset.date;
        if (date) dates.push(date);
      }
      if (!dates.length) return;
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
        start: timeFromBlockMinute(selection.startMinute),
        end: timeFromBlockMinute(selection.endMinute),
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
      created.push({
        id: id("task"),
        title: selection.endIndex > selection.startIndex ? "New habit block" : "New timed task",
        description: "",
        date,
        endDate: blockEndDateFor(date, selection.startMinute, selection.endMinute),
        start: timeFromBlockMinute(selection.startMinute),
        end: timeFromBlockMinute(selection.endMinute),
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

  function updateCalendarItemSchedule(item, updates) {
    if (!item) return;
    if (item.isHabit) {
      const habit = data.habits.find((entry) => entry.id === item.habitId);
      if (!habit) return;
      if (updates.start !== undefined) habit.start = updates.start;
      if (updates.end !== undefined) habit.end = updates.end;
      if (updates.date !== undefined) {
        habit.startDate = updates.date;
        if (habit.schedule === "Weekly") habit.days = [parseLocalDate(updates.date).getDay()];
      }
      if (updates.endDate !== undefined && updates.endDate && updates.endDate !== updates.date) habit.endDate = updates.endDate;
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
    showToast(task.isHabit ? "Habit time updated." : "Task time updated.");
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
    const rows = categoryBreakdown(data.transactions.filter((tx) => tx.type === type));
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

  document.addEventListener("click", (event) => {
    const sheet = event.target.closest("[data-sheet]");
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      const habitCardEl = event.target.closest(".habit-card[data-habit-id]");
      if (habitCardEl && !event.target.closest("button,input,select,textarea,a")) {
        ui.modal = { type: "editHabit", id: habitCardEl.dataset.habitId };
        render();
        return;
      }
      if (ui.taskPicker) {
        ui.taskPicker = null;
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
    render();
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target && target.id === "noteSubject" && target.value === "+ New subject") {
      target.value = "";
      target.placeholder = "Type the new subject name";
      return;
    }
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
    if (target && target.id === "taskAddress") toggleTaskAddressPanel(target.value === ADD_TASK_ADDRESS_VALUE);
    if (target && target.id === "taskCategory") toggleTaskCategoryPanel(target.value === ADD_TASK_CATEGORY_VALUE);
    if (target && target.id === "habitAddress") toggleHabitAddressPanel(target.value === ADD_TASK_ADDRESS_VALUE);
    if (target && target.id === "contactAddress") toggleContactAddressPanel(target.value === ADD_TASK_ADDRESS_VALUE);
    if (target && target.dataset.action === "habit-inline") saveHabitInline(target);
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

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target && target.id === "noteSubject" && target.value === "+ New subject") {
      target.value = "";
      target.placeholder = "Type the new subject name";
      target.focus();
    }
    if (target && target.id === "noteNotebook") {
      const panel = document.getElementById("noteNotebookNewWrap");
      if (panel) panel.hidden = target.value !== ADD_NOTEBOOK_VALUE;
      if (target.value === ADD_NOTEBOOK_VALUE) document.getElementById("noteNewNotebookTitle")?.focus();
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
    const noteCardEl = event.target.closest?.(".note-card[data-action='open-modal']");
    if (noteCardEl && (event.key === "Enter" || event.key === " ") && !event.target.closest("button,input,select,textarea,a")) {
      event.preventDefault();
      return handleAction(noteCardEl);
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "t") {
      event.preventDefault();
      const input = document.getElementById("quickTaskInput");
      if (input) input.focus();
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
      if (cloudAutoSyncEnabled()) scheduleCloudAutoPull(350);
    });
    window.addEventListener("online", () => {
      if (cloudAutoSyncEnabled()) {
        if (cloudHasLocalUnsyncedChanges) scheduleCloudAutoPush(350);
        scheduleCloudAutoPull(900);
      }
    });
  }

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && cloudAutoSyncEnabled()) scheduleCloudAutoPull(350);
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
    if (action === "set-calendar-date-view") return setCalendarDateView(el.dataset.date, el.dataset.view);
    if (action === "pick-choice") return pickChoice(el);
    if (action === "image-fit") return setImageFit(el);
    if (action === "show-task-category-panel") return showTaskCategoryPanel();
    if (action === "quick-add-task") return quickAddTask();
    if (action === "start-voice-task") return startVoiceTask();
    if (action === "stop-voice-task") return stopVoiceTask();
    if (action === "parse-voice-task") return parseVoiceTaskFromInput();
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
    if (action === "save-repayment") return saveRepayment(el.dataset.id);
    if (action === "save-forgiveness") return saveForgiveness(el.dataset.id);
    if (action === "forgive-loan") return forgiveLoan(el.dataset.id);
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
    if (action === "save-task") return saveTask(el.dataset.id);
    if (action === "save-habit") return saveHabit(el.dataset.id);
    if (action === "edit-habit-instance") return editHabitInstance(el.dataset.id);
    if (action === "delete-habit") return deleteHabit(el.dataset.id);
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
    if (action === "toggle-block-select-mode") return toggleBlockSelectMode();
    if (action === "start-block-multi-select") return startBlockMultiSelect(el.dataset.id);
    if (action === "select-visible-block-tasks") return selectVisibleBlockTasks();
    if (action === "select-all-day-tasks") return selectAllDayTasks();
    if (action === "deselect-all-day-tasks") return deselectAllDayTasks();
    if (action === "select-date") {
      const changed = ui.selectedDate !== el.dataset.date;
      ui.selectedDate = el.dataset.date;
      ui.calendarView = ui.calendarView === "month" ? "day" : ui.calendarView;
      if (changed) ui.selectedTasks = [];
      return render();
    }
    if (action === "toggle-task-select") return toggleTaskSelect(el.dataset.id);
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
    if (action === "copy-selected-tomorrow") return copySelectedTomorrow();
    if (action === "copy-selected-to-date") return copySelectedToDate();
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
    if (action === "set-contact-group-filter") return setContactGroupFilter(el.dataset.id);
    if (action === "open-task-route") return openSelectedTaskRoute();
    if (action === "copy-task-route-from-modal") return copyTaskRouteFromModal();
    if (action === "duplicate-block-horizontal") return duplicateBlockHorizontal(el.dataset.id);
    if (action === "duplicate-block-vertical") return duplicateBlockVertical(el.dataset.id);
    if (action === "save-block-duplicate-horizontal") return duplicateBlockHorizontal(el.dataset.id, integerValue("blockDuplicateCount", 1, 1, 24));
    if (action === "save-block-duplicate-vertical") return duplicateBlockVertical(el.dataset.id, integerValue("blockDuplicateCount", 1, 1, 24));
    if (action === "save-selected-duplicate-horizontal") return duplicateSelectedHorizontal(integerValue("selectedDuplicateCount", 1, 1, 24));
    if (action === "save-selected-duplicate-vertical") return duplicateSelectedVertical(integerValue("selectedDuplicateCount", 1, 1, 24));
    if (action === "save-project-name") return saveProjectName(el.dataset.id);
    if (action === "open-project") {
      ui.projectId = el.dataset.id;
      return render();
    }
    if (action === "close-project") {
      ui.projectId = null;
      return render();
    }
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
    if (action === "clear-selected-notes") return clearSelectedNotes();
    if (action === "delete-selected-notes") return deleteSelectedNotes();
    if (action === "duplicate-notes") return duplicateNotes(el.dataset.id);
    if (action === "pick-note-color") {
      ui.noteColor = el.dataset.color;
      document.querySelectorAll(".swatch").forEach((button) => button.classList.toggle("active", button === el));
      return;
    }
    if (action === "save-notebook") return saveNotebook(el.dataset.id);
    if (action === "save-notebook-picture") return saveNotebookPicture(el.dataset.id);
    if (action === "save-goal") return saveGoal(el.dataset.id);
    if (action === "delete-notebook") return deleteNotebook(el.dataset.id);
    if (action === "delete-goal") return deleteGoal(el.dataset.id);
    if (action === "delete-project") return deleteProject(el.dataset.id);
    if (action === "save-goal-contribution") return saveGoalContribution(el.dataset.id);
    if (action === "save-contact") return saveContact(el.dataset.id);
    if (action === "delete-contact") return deleteContact(el.dataset.id);
    if (action === "save-profile") return saveProfile();
    if (action === "login-profile") return loginProfile(el.dataset.id);
    if (action === "lock-profile") return lockProfile();
    if (action === "delete-profile") return deleteProfile(el.dataset.id);
    if (action === "save-cloud-config") return saveCloudConfig();
    if (action === "test-cloud-config") return testCloudConfig();
    if (action === "copy-hosted-cloud-config") return copyHostedCloudConfig();
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
    if (action === "download-data") return downloadData();
    if (action === "reset-data") return resetData();
    if (action === "ai-prompt") return sendAi(el.dataset.prompt);
    if (action === "send-ai") return sendAi(document.getElementById("aiInput")?.value);
  }

  function navigate(view, root = false) {
    if (!view) return;
    if (!root && ui.view !== view) ui.backStack.push(ui.view);
    if (root) ui.backStack = [];
    ui.view = view;
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
    render();
  }

  function goCalendarToday(view = ui.calendarView) {
    const targetView = ["month", "week", "day", "block"].includes(view) ? view : "day";
    ui.selectedDate = todayIso();
    ui.calendarView = targetView;
    ui.selectedTasks = [];
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
    render();
  }

  function setCalendarDateView(date, view) {
    if (!["month", "week", "day", "block"].includes(view)) return;
    ui.selectedDate = date || ui.selectedDate;
    ui.calendarView = view;
    ui.selectedTasks = [];
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
    render();
  }

  function closeModal() {
    ui.modal = null;
    render();
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
    const parsed = ui.voiceParsedTask?.source === transcript ? ui.voiceParsedTask : parseVoiceTask(transcript);
    const title = parsed.title || "Voice Task";
    const writeKey = `voice-task:${title.toLowerCase()}:${parsed.date}:${parsed.start}:${parsed.end}:${parsed.address ? addressKey(parsed.address) : ""}`;
    if (shouldSkipRecentWrite(writeKey)) {
      showToast("That voice task was already saved.", "danger");
      return;
    }
    const addressId = createAddressFromVoice(parsed.address, title);
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

  function voiceTaskPreview(parsed) {
    const project = data.projects.find((item) => item.id === parsed.projectId);
    const rows = [
      ["Title", parsed.title || "Voice Task"],
      ["Start Date", dateLabel(parsed.date)],
      ["Start Time", timeLabel(parsed.start)],
      ["End Date", dateLabel(parsed.endDate)],
      ["End Time", timeLabel(parsed.end)],
      ["Priority", parsed.priority],
      ["Status", parsed.status],
      ["Category", parsed.category],
      ["Repeat", parsed.repeat],
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
        <p class="subtle">Correct one thing at a time: status, priority, date, start time, end time, title, category, repeat, project, or address.</p>
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
      repeat,
      category,
      projectId: parseVoiceProject(normalized),
      address,
      bgColor: defaultTaskBgColor()
    };
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
      parsed.repeat = repeat;
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
    const payload = {
      type: value("txType") || "expense",
      name: value("txName") || "Transaction",
      merchant: value("txCategory") || "Merchant",
      category: value("txCategory") || "Other",
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
    let contact = data.contacts.find((item) => item.id === selectedContactId);
    const borrower = value("loanBorrower") || contact?.name || "Borrower";
    const loanDate = value("loanDate") || todayIso();
    const dueDate = value("loanDue") || addDaysIso(loanDate, 14);
    if (selectedContactId === ADD_LOAN_CONTACT_VALUE) {
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
    if (!note || !confirmDelete(note.title)) return;
    data.notes = data.notes.filter((item) => item.id !== noteId);
    ui.selectedNotes = ui.selectedNotes.filter((idValue) => idValue !== noteId);
    ui.modal = null;
    saveData();
    showToast("Note deleted.");
  }

  function updateNoteInline(noteId, field, rawValue) {
    const note = data.notes.find((item) => item.id === noteId);
    if (!note) return;
    const nextValue = String(rawValue || "").trim();
    if (field === "importance") {
      note.importance = ["Low", "Medium", "High", "Critical"].includes(nextValue) ? nextValue : "Low";
    } else if (field === "subject") {
      note.subject = nextValue;
    } else if (field === "notebookId") {
      note.notebookId = data.notebooks.some((item) => item.id === nextValue) ? nextValue : null;
    } else {
      return;
    }
    note.updatedAt = new Date().toISOString();
    saveData();
    showToast("Note updated.");
  }

  function visibleNotesForCurrentView() {
    const notebookId = ui.notebookId;
    const baseNotes = notebookId ? data.notes.filter((note) => note.notebookId === notebookId) : data.notes;
    return filteredNotesForBase(baseNotes);
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

  function clearSelectedNotes() {
    ui.selectedNotes = [];
    render();
  }

  function deleteSelectedNotes() {
    const ids = ui.selectedNotes.filter((noteId) => data.notes.some((note) => note.id === noteId));
    if (!ids.length) return showToast("Select at least one note first.", "danger");
    if (!confirmDelete(`${ids.length} selected note${ids.length === 1 ? "" : "s"}`)) return;
    data.notes = data.notes.filter((note) => !ids.includes(note.id));
    ui.selectedNotes = [];
    saveData();
    showToast(`${ids.length} note${ids.length === 1 ? "" : "s"} deleted.`);
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
    saveData();
    closeModal();
    showToast(`${created.length} note duplicate${created.length === 1 ? "" : "s"} created.`);
  }

  function deleteNotebook(notebookId) {
    const notebook = data.notebooks.find((item) => item.id === notebookId);
    if (!notebook || !confirmDelete(notebook.title)) return;
    data.notes.forEach((note) => {
      if (note.notebookId === notebookId) note.notebookId = null;
    });
    data.notebooks = data.notebooks.filter((item) => item.id !== notebookId);
    if (ui.notebookId === notebookId) ui.notebookId = null;
    ui.modal = null;
    saveData();
    showToast("Notebook deleted. Its notes are now unassigned.");
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
      if (ui.habitFilter === "today") return habitScheduledOn(habit, today);
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

  function saveHabitInline(target) {
    const habit = data.habits.find((item) => item.id === target.dataset.id);
    const fieldName = target.dataset.field;
    if (!habit || !fieldName) return;
    const nextValue = target.value;
    if (fieldName === "title") habit.title = nextValue.trim() || "Habit";
    else if (fieldName === "description") habit.description = nextValue.trim();
    else if (fieldName === "type" && habitTypeOptions.includes(nextValue)) habit.type = nextValue;
    else if (fieldName === "schedule" && habitScheduleOptions.includes(nextValue)) habit.schedule = nextValue;
    else if (fieldName === "status" && ["Active", "Paused"].includes(nextValue)) habit.status = nextValue;
    else if (fieldName === "start" || fieldName === "end") {
      habit[fieldName] = nextValue || (fieldName === "start" ? "08:00" : "08:30");
      if (minutes(habit.end) <= minutes(habit.start)) habit.end = timeFromMinutes(Math.min(minutes(habit.start) + 30, 23 * 60 + 59));
    }
    saveData();
    render();
    showToast("Habit updated.");
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

  function deleteHabit(habitId) {
    let idValue = habitId;
    const parsed = parseHabitInstanceId(habitId);
    if (parsed) idValue = parsed.habitId;
    const habit = data.habits.find((item) => item.id === idValue);
    if (!habit) return;
    data.habits = data.habits.filter((item) => item.id !== idValue);
    ui.selectedTasks = ui.selectedTasks.filter((item) => parseHabitInstanceId(item)?.habitId !== idValue);
    ui.selectedHabits = ui.selectedHabits.filter((item) => item !== idValue);
    ui.modal = null;
    saveData();
    showToast("Habit deleted. Undo is available.");
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
    ui.calendarView = view === "block" ? "block" : "day";
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
    const parsed = parseHabitInstanceId(taskId);
    if (!parsed) return;
    const habit = data.habits.find((item) => item.id === parsed.habitId);
    if (!habit) return;
    const instance = habitInstance(habit, parsed.date);
    const task = taskCopyFromCalendarItem(instance, {
      title: instance.title,
      date: parsed.date,
      endDate: parsed.date,
      repeat: "None",
      status: instance.status || "Not Started"
    });
    habit.skippedDates = Array.from(new Set([...(habit.skippedDates || []), parsed.date])).sort();
    habit.completions = Array.isArray(habit.completions) ? habit.completions.filter((date) => date !== parsed.date) : [];
    data.tasks.unshift(task);
    ui.selectedTasks = ui.selectedTasks.filter((idValue) => idValue !== taskId);
    ui.modal = { type: "editTask", id: task.id };
    saveData();
    render();
    showToast("This date is now its own editable task.");
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
    const habit = findHabitFromInstanceId(taskId);
    if (habit && taskPriorityOptions.includes(priority)) {
      habit.priority = priority;
      ui.taskPicker = null;
      saveData();
      showToast(`Habit priority changed to ${habit.priority}.`);
      return;
    }
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task || !taskPriorityOptions.includes(priority)) return;
    task.priority = priority;
    task.updatedAt = new Date().toISOString();
    ui.taskPicker = null;
    saveData();
    showToast(`Priority changed to ${task.priority}.`);
  }

  function setTaskStatus(taskId, status) {
    const habitInstance = parseHabitInstanceId(taskId);
    if (habitInstance && taskStatusOptions.includes(status)) {
      setHabitCompletion(habitInstance.habitId, habitInstance.date, status === "Completed");
      ui.taskPicker = null;
      if (ui.modal?.type === "blockStatus") ui.modal = null;
      saveData();
      showToast(status === "Completed" ? "Habit marked complete." : "Habit completion cleared.");
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
    if (!ui.blockSelectMode) {
      const visible = new Set(blockWeekTaskIds());
      ui.selectedTasks = ui.selectedTasks.filter((taskId) => !visible.has(taskId));
    }
    render();
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

  function toggleTaskSelect(taskId) {
    if (ui.selectedTasks.includes(taskId)) ui.selectedTasks = ui.selectedTasks.filter((idValue) => idValue !== taskId);
    else ui.selectedTasks.push(taskId);
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
    data.tasks.forEach((task) => {
      if (ui.selectedTasks.includes(task.id)) task.priority = priority || "High";
    });
    ui.selectedTasks.forEach((taskId) => {
      const habit = findHabitFromInstanceId(taskId);
      if (habit) habit.priority = priority || "High";
    });
    saveData();
    closeModal();
  }

  function duplicateSelectedTasks() {
    const copies = ui.selectedTasks
      .map((taskId) => findCalendarItemById(taskId))
      .filter(Boolean)
      .map((task) => taskCopyFromCalendarItem(task, { title: `${task.title} copy` }));
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
    closeModal();
  }

  function deleteSelectedTasks() {
    const count = ui.selectedTasks.length;
    if (!count) {
      showToast("Select at least one task first.", "danger");
      return;
    }
    data.tasks = data.tasks.filter((task) => !ui.selectedTasks.includes(task.id));
    const selectedHabitIds = new Set(ui.selectedTasks.map((taskId) => parseHabitInstanceId(taskId)?.habitId).filter(Boolean));
    if (selectedHabitIds.size) data.habits = data.habits.filter((habit) => !selectedHabitIds.has(habit.id));
    ui.selectedTasks = [];
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
    return selected === "+ New subject" ? "" : selected;
  }

  function noteNotebookIdFromForm() {
    const selected = value("noteNotebook");
    if (!selected) return "";
    if (selected !== ADD_NOTEBOOK_VALUE) return selected;
    const title = value("noteNewNotebookTitle");
    if (!title) return "";
    const existing = data.notebooks.find((notebook) => notebook.title.toLowerCase() === title.toLowerCase());
    if (existing) return existing.id;
    const notebook = {
      id: id("nb"),
      title,
      description: "Created while saving a note",
      projectId: null,
      color: "#4388f3",
      icon: "book"
    };
    data.notebooks.unshift(notebook);
    return notebook.id;
  }

  function saveNote(noteId) {
    const note = data.notes.find((item) => item.id === noteId);
    const notebookId = noteNotebookIdFromForm();
    if (value("noteNotebook") === ADD_NOTEBOOK_VALUE && !notebookId) {
      showToast("Enter a new notebook name first.", "danger");
      return;
    }
    const payload = {
      notebookId,
      title: value("noteTitle") || "Note",
      content: value("noteContent"),
      date: value("noteDate") || "2026-05-06",
      subject: noteSubjectValue(),
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
    const payload = { title: value("nbTitle") || "New Notebook", description: value("nbDescription"), projectId: value("nbProject") || null, color: notebook?.color || "#4388f3", icon: notebook?.icon || "book", image: imageValue("nb"), imageZoom: imageZoomValue("nb"), imageX: imagePanValue("nb", "x"), imageY: imagePanValue("nb", "y"), imageFit: imageFitValue("nb"), imageOpacity: imageOpacityValue("nb") };
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

  function saveGoal(goalId) {
    const goal = data.goals.find((item) => item.id === goalId);
    const payload = {
      name: value("goalName") || "Goal",
      target: numberValue("goalTarget"),
      current: numberValue("goalCurrent"),
      targetDate: value("goalDate") || "2026-12-31",
      color: value("goalColor") || "green",
      image: imageValue("goal"),
      imageZoom: imageZoomValue("goal"),
      imageX: imagePanValue("goal", "x"),
      imageY: imagePanValue("goal", "y"),
      imageFit: imageFitValue("goal"),
      imageOpacity: imageOpacityValue("goal")
    };
    if (goal) Object.assign(goal, payload);
    else data.goals.unshift({ id: id("goal"), ...payload });
    saveData();
    closeModal();
  }

  function saveGoalContribution(goalId) {
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal) return;
    const amount = numberValue("goalContributionAmount");
    goal.current += amount;
    data.transactions.unshift({
      id: id("tx"),
      type: "expense",
      name: `${goal.name} Contribution`,
      merchant: "Goal Transfer",
      category: "Savings",
      amount,
      projected: amount,
      date: value("goalContributionDate") || "2026-05-06",
      frequency: "One time",
      method: "Chase Checking",
      status: "Paid",
      notes: value("goalContributionNote") || "Goal contribution."
    });
    saveData();
    closeModal();
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
    saveData({ undo: false });
    const profile = { id: id("profile"), username, displayName, password };
    profiles.push(profile);
    saveProfiles();
    currentProfileId = profile.id;
    localStorage.setItem(ACTIVE_PROFILE_KEY, currentProfileId);
    data = document.getElementById("profileSampleData")?.checked === false ? blankWorkspace() : normalizeData(clone(seed));
    resetUndoBaseline();
    saveData({ undo: false });
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
    saveData({ undo: false });
    currentProfileId = profile.id;
    localStorage.setItem(ACTIVE_PROFILE_KEY, currentProfileId);
    data = loadData();
    resetUndoBaseline();
    ui.modal = null;
    ui.backStack = [];
    ui.view = "dashboard";
    ui.projectId = null;
    showToast(`Signed in as ${profile.displayName}.`);
  }

  function lockProfile() {
    saveData({ undo: false });
    currentProfileId = "";
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    ui.modal = null;
    render();
  }

  function deleteProfile(profileId) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile || profiles.length <= 1 || !confirmDelete(`${profile.displayName}'s local profile`)) return;
    profiles = profiles.filter((item) => item.id !== profileId);
    saveProfiles();
    localStorage.removeItem(profileDataKey(profileId));
    if (currentProfileId === profileId) {
      currentProfileId = profiles[0]?.id || "";
      if (currentProfileId) localStorage.setItem(ACTIVE_PROFILE_KEY, currentProfileId);
      else localStorage.removeItem(ACTIVE_PROFILE_KEY);
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
    saveCloudConfigLocal({ url, anonKey });
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
    saveCloudConfigLocal({ url, anonKey });
    if (!/^https:\/\/.+\.supabase\.co$/i.test(cloudConfig.url)) {
      showToast("Check the Project URL. It should look like https://your-project.supabase.co", "danger");
      return;
    }
    try {
      const authProbe = await cloudProbe("/auth/v1/health");
      if (authProbe.ok) {
        showToast("Supabase Auth responded. Setup looks ready.");
        return;
      }

      const tableProbe = await cloudProbe("/rest/v1/billmaster_workspaces?select=user_id&limit=1");
      const message = String(tableProbe.message || authProbe.message || "");
      if (/invalid api key|no api key|apikey|jwt malformed/i.test(message)) {
        showToast("The key was rejected. Use the publishable/anon public key, not the service role key.", "danger");
        return;
      }
      if (/relation .*billmaster_workspaces.*does not exist|could not find .*billmaster_workspaces/i.test(message)) {
        showToast("Supabase reached, but the BillMaster SQL table is missing. Run supabase/schema.sql first.", "danger");
        return;
      }
      if (/permission denied|insufficient privilege|not exposed|schema cache/i.test(message)) {
        showToast("Supabase reached, but the Data API grants are missing. Run the latest supabase/schema.sql again.", "danger");
        return;
      }
      if (tableProbe.ok || [401, 403].includes(tableProbe.status)) {
        showToast("Supabase reached. If it says protected until sign-in, that is normal.");
        return;
      }
      showToast(`Supabase test failed: ${message || `status ${tableProbe.status || authProbe.status}`}`, "danger");
    } catch (error) {
      showToast(`Supabase test failed. Check the URL/key and internet connection. ${error.message}`, "danger");
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
        saveCloudSession(sessionFromAuthResult(result));
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
        showToast(startClean ? "Cloud account created with a clean workspace. Auto sync is on." : "Cloud account created and signed in. Push local when you are ready.");
      } else {
        showToast("Cloud account created. Check email confirmation if Supabase requires it.");
      }
    } catch (error) {
      showToast(`Could not create cloud account: ${error.message}`, "danger");
    }
  }

  async function cloudSignIn() {
    const email = value("cloudEmail");
    const password = value("cloudPassword");
    if (!email || !password) {
      showToast("Enter your Supabase email and password.", "danger");
      return;
    }
    try {
      const result = await cloudFetch("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }, false);
      saveCloudSession(sessionFromAuthResult(result));
      ui.modal = null;
      try {
        const loaded = await loadCloudWorkspaceIntoLocal({ enableAutoSync: true });
        startCloudAutoSync();
        render();
        showToast(loaded ? "Signed in and pulled your cloud workspace. Auto sync is on." : "Signed in. Push local to save this device to the cloud.");
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
    stopCloudAutoSync();
    render();
    showToast("Signed out of cloud sync.");
  }

  function startCloudAutoSync() {
    if (!cloudAutoSyncEnabled()) {
      stopCloudAutoSync();
      return;
    }
    scheduleCloudAutoPull(1500);
  }

  function stopCloudAutoSync() {
    clearAppTimer(cloudAutoPushTimer);
    clearAppTimer(cloudAutoPullTimer);
    cloudAutoPushTimer = null;
    cloudAutoPullTimer = null;
    cloudPushQueued = false;
    cloudHasLocalUnsyncedChanges = false;
  }

  function scheduleCloudAutoPush(delay = 1800) {
    if (!cloudAutoSyncEnabled()) return;
    clearAppTimer(cloudAutoPushTimer);
    cloudAutoPushTimer = setAppTimer(() => {
      cloudAutoPushTimer = null;
      performCloudAutoPush();
    }, delay);
  }

  function scheduleCloudAutoPull(delay = 30000) {
    if (!cloudAutoSyncEnabled()) return;
    clearAppTimer(cloudAutoPullTimer);
    cloudAutoPullTimer = setAppTimer(() => {
      cloudAutoPullTimer = null;
      performCloudAutoPull();
    }, delay);
  }

  async function performCloudAutoPush() {
    if (!cloudAutoSyncEnabled()) return;
    if (cloudPushInFlight) {
      cloudPushQueued = true;
      return;
    }
    cloudPushInFlight = true;
    try {
      await pushWorkspaceToCloud("auto");
      cloudHasLocalUnsyncedChanges = false;
      if (ui.view === "sync") render();
      scheduleCloudAutoPull(30000);
    } catch (error) {
      console.warn("BillMaster auto sync failed.", error);
      data.settings.cloudSyncError = error.message || "Auto sync failed.";
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
    if (cloudPullInFlight) return;
    if (cloudPushInFlight || cloudHasLocalUnsyncedChanges || cloudAutoPushTimer) {
      scheduleCloudAutoPull(2500);
      return;
    }
    cloudPullInFlight = true;
    try {
      const loaded = await loadCloudWorkspaceIntoLocal({ enableAutoSync: true, onlyIfNewer: true });
      data.settings.cloudLastAutoCheckAt = new Date().toISOString();
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
      saveData({ undo: false, cloudSync: false, syncStamp: false });
      if (/sign in|expired/i.test(error.message || "")) showToast(error.message, "danger");
      if (ui.view === "sync") render();
    } finally {
      cloudPullInFlight = false;
      scheduleCloudAutoPull(30000);
    }
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
    payload.settings = {
      ...(payload.settings || {}),
      cloudLastSyncAt: pushedAt,
      cloudLastDirection: direction,
      cloudRemoteUpdatedAt: pushedAt,
      cloudLastAutoCheckAt: data.settings?.cloudLastAutoCheckAt || "",
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
    if (options.enableAutoSync !== false) data.settings.cloudAutoSync = true;
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

  function downloadData() {
    if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof document === "undefined") return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "billmaster-backup.json";
    link.click();
    URL.revokeObjectURL(url);
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

  function resetData() {
    data = clone(seed);
    saveData();
    closeModal();
  }

  function sendAi(text) {
    const prompt = String(text || "").trim();
    if (!prompt) return;
    data.aiMessages.push({ role: "user", text: prompt });
    const lower = prompt.toLowerCase();
    let response = "I found the strongest action is to review bills due in the next 7 days, then compare actual versus projected spending.";
    if (lower.includes("subscription")) response = "Adobe is the highest variance subscription. Cancel or downgrade it first, then keep Netflix and Spotify unless their projected amounts drift.";
    if (lower.includes("goal")) response = "Emergency Fund is 70% complete and on track. Vacation Fund needs about $725 more per month to hit the June target.";
    if (lower.includes("expense") || lower.includes("biggest")) response = "Housing, utilities, and groceries are your biggest expenses. Groceries are the only category currently above projection.";
    data.aiMessages.push({ role: "ai", text: response });
    ui.aiDraft = "";
    saveData();
    render();
  }

  startCloudAutoSync();
  render();
})();
