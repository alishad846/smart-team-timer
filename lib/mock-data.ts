export const dashboardOverview = {
  totalTrackedHours: 1284,
  focusPercentage: 78,
  activeIdleRatio: 0.81,
  productivityScore: 86,
  mostProductiveEmployees: [
    { name: "Aarav Singh", score: 96, role: "Intern" },
    { name: "Maya Patel", score: 94, role: "Employee" },
    { name: "Jordan Lee", score: 91, role: "Employee" }
  ],
  dailyActivity: [
    { day: "Mon", productive: 7.2, idle: 1.4 },
    { day: "Tue", productive: 8.1, idle: 1.1 },
    { day: "Wed", productive: 7.6, idle: 1.3 },
    { day: "Thu", productive: 8.4, idle: 0.9 },
    { day: "Fri", productive: 6.8, idle: 1.6 },
    { day: "Sat", productive: 3.2, idle: 0.8 },
    { day: "Sun", productive: 2.9, idle: 0.7 }
  ],
  weeklyTrend: [
    { week: "W1", productivity: 82 },
    { week: "W2", productivity: 84 },
    { week: "W3", productivity: 85 },
    { week: "W4", productivity: 88 }
  ],
  appUsage: [
    { app: "VS Code", minutes: 412, percent: 34 },
    { app: "Chrome", minutes: 286, percent: 24 },
    { app: "Figma", minutes: 181, percent: 15 },
    { app: "Slack", minutes: 124, percent: 10 }
  ],
  websiteUsage: [
    { site: "figma.com", visits: 34 },
    { site: "github.com", visits: 29 },
    { site: "docs.google.com", visits: 22 },
    { site: "notion.so", visits: 19 }
  ],
  heatmap: [
    { day: "Mon", hour: "09", value: 7 },
    { day: "Mon", hour: "10", value: 9 },
    { day: "Mon", hour: "11", value: 6 },
    { day: "Tue", hour: "09", value: 8 },
    { day: "Tue", hour: "10", value: 10 },
    { day: "Tue", hour: "11", value: 8 }
  ],
  aiSummary:
    "The team maintained strong focus across the week, with a productivity dip on Friday afternoon that aligns with a spike in idle time. Consider smaller task batches and scheduled focus blocks for better consistency."
};

export const teams = [
  {
    name: "Design",
    members: 8,
    productivity: 91,
    projects: 3
  },
  {
    name: "Engineering",
    members: 12,
    productivity: 87,
    projects: 5
  },
  {
    name: "Intern Cohort",
    members: 14,
    productivity: 78,
    projects: 4
  }
];

export const projects = [
  {
    name: "Client Portal Revamp",
    progress: 72,
    due: "May 30",
    owner: "Maya Patel"
  },
  {
    name: "Onboarding Dashboard",
    progress: 54,
    due: "Jun 07",
    owner: "Jordan Lee"
  },
  {
    name: "Intern Product Sprint",
    progress: 83,
    due: "Jun 12",
    owner: "Aarav Singh"
  }
];

export const tasks = [
  {
    title: "Finish analytics card layout",
    status: "In Progress",
    priority: "High",
    assignee: "Maya Patel"
  },
  {
    title: "Upload daily screenshots",
    status: "Review",
    priority: "Medium",
    assignee: "Jordan Lee"
  },
  {
    title: "Validate idle detection",
    status: "Todo",
    priority: "High",
    assignee: "Aarav Singh"
  }
];
