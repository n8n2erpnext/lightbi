export const homeGuidance = {
  rotatingPrompts: [
    "What would you like to understand today?",
    "Need help visualizing a report?",
    "Upload data and ask questions.",
    "Turn spreadsheets into insights.",
    "Find hidden trends in your business.",
    "Analyze revenue, inventory, or customers."
  ],
  noDataCards: [
    {
      id: "sales-report",
      title: "Analyze a sales report",
      description: "Find revenue trends, top customers, and growth opportunities.",
      intent: "topic"
    },
    {
      id: "understand-inventory",
      title: "Understand inventory",
      description: "Discover stock movement and inventory value.",
      intent: "topic"
    },
    {
      id: "build-dashboard",
      title: "Build a dashboard",
      description: "Create visual reports from spreadsheets.",
      intent: "topic"
    },
    {
      id: "explore-customer-behavior",
      title: "Explore customer behavior",
      description: "See who buys most and what drives sales.",
      intent: "topic"
    }
  ],
  plusMenu: {
    mainMenu: [
      { id: "my-computer", label: "My Computer", icon: "Monitor", hasSubmenu: true, submenuId: "computer" },
      { id: "online-data", label: "Online Data", icon: "Globe", hasSubmenu: true, submenuId: "online" },
      { id: "systems", label: "Systems", icon: "Server", hasSubmenu: true, submenuId: "systems" },
      { id: "sample-data", label: "Sample Data", icon: "Beaker", hasSubmenu: true, submenuId: "sample" }
    ],
    submenus: {
      computer: {
        title: "My Computer",
        items: [
          { id: "excel", label: "Excel File", icon: "FileSpreadsheet", sourceKind: "local_file", sourceType: "excel", requiresInput: true, nextStep: "file_picker" },
          { id: "csv", label: "CSV File", icon: "FileSpreadsheet", sourceKind: "local_file", sourceType: "csv", requiresInput: true, nextStep: "file_picker" },
          { id: "parquet", label: "Parquet File", icon: "FileSpreadsheet", sourceKind: "local_file", sourceType: "parquet", requiresInput: true, nextStep: "file_picker" }
        ]
      },
      online: {
        title: "Online Data",
        items: [
          { id: "google-sheets", label: "Google Sheets", icon: "Table", sourceKind: "online_link", sourceType: "google_sheets", requiresInput: true, nextStep: "url_input" },
          { id: "m365-excel", label: "Microsoft 365 Excel", icon: "FileSpreadsheet", sourceKind: "online_link", sourceType: "m365_excel", requiresInput: true, nextStep: "url_input" },
          { id: "csv-url", label: "CSV URL", icon: "Link", sourceKind: "online_link", sourceType: "csv_url", requiresInput: true, nextStep: "url_input" },
          { id: "excel-url", label: "Excel URL", icon: "Link", sourceKind: "online_link", sourceType: "excel_url", requiresInput: true, nextStep: "url_input" }
        ]
      },
      systems: {
        title: "Systems",
        items: [
          { id: "database", label: "Database", icon: "Database", hasSubmenu: true, submenuId: "database", sourceKind: "system", sourceType: "database", requiresInput: false, nextStep: "drill_down" },
          { id: "api", label: "API", icon: "Code", hasSubmenu: true, submenuId: "api", sourceKind: "system", sourceType: "api", requiresInput: false, nextStep: "drill_down" },
          { id: "data-warehouse", label: "Data Warehouse", icon: "HardDrive", hasSubmenu: true, submenuId: "data-warehouse", sourceKind: "system", sourceType: "data_warehouse", requiresInput: false, nextStep: "drill_down" }
        ]
      },
      sample: {
        title: "Sample Data",
        items: [
          { id: "sales-example", label: "Sales Dataset", icon: "FileText", sourceKind: "sample", sourceType: "sample_sales", requiresInput: false, nextStep: "load_sample" },
          { id: "inventory-example", label: "Inventory Dataset", icon: "FileText", sourceKind: "sample", sourceType: "sample_inventory", requiresInput: false, nextStep: "load_sample" },
          { id: "survey-example", label: "Survey Dataset", icon: "FileText", sourceKind: "sample", sourceType: "sample_survey", requiresInput: false, nextStep: "load_sample" }
        ]
      },
      database: {
        title: "Database",
        items: [
          { id: "postgresql", label: "PostgreSQL", icon: "Database", sourceKind: "system", sourceType: "postgresql", requiresInput: true, nextStep: "connection_form" },
          { id: "mysql", label: "MySQL", icon: "Database", sourceKind: "system", sourceType: "mysql", requiresInput: true, nextStep: "connection_form" },
          { id: "mariadb", label: "MariaDB", icon: "Database", sourceKind: "system", sourceType: "mariadb", requiresInput: true, nextStep: "connection_form" },
          { id: "sql-server", label: "SQL Server", icon: "Database", sourceKind: "system", sourceType: "sqlserver", requiresInput: true, nextStep: "connection_form" },
          { id: "sqlite", label: "SQLite", icon: "Database", sourceKind: "system", sourceType: "sqlite", requiresInput: true, nextStep: "connection_form" }
        ]
      },
      api: {
        title: "API",
        items: [
          { id: "rest-api", label: "REST API", icon: "Code", sourceKind: "system", sourceType: "rest_api", requiresInput: true, nextStep: "connection_form" },
          { id: "graphql-api", label: "GraphQL API", icon: "Code", sourceKind: "system", sourceType: "graphql", requiresInput: true, nextStep: "connection_form" },
          { id: "webhook", label: "Webhook Endpoint", icon: "Code", sourceKind: "system", sourceType: "webhook", requiresInput: true, nextStep: "connection_form" }
        ]
      },
      "data-warehouse": {
        title: "Data Warehouse",
        items: [
          { id: "bigquery", label: "BigQuery", icon: "HardDrive", sourceKind: "system", sourceType: "bigquery", requiresInput: true, nextStep: "connection_form" },
          { id: "snowflake", label: "Snowflake", icon: "HardDrive", sourceKind: "system", sourceType: "snowflake", requiresInput: true, nextStep: "connection_form" },
          { id: "redshift", label: "Redshift", icon: "HardDrive", sourceKind: "system", sourceType: "redshift", requiresInput: true, nextStep: "connection_form" },
          { id: "duckdb", label: "DuckDB", icon: "HardDrive", sourceKind: "system", sourceType: "duckdb", requiresInput: true, nextStep: "connection_form" }
        ]
      }
    }
  },
  missingDataPrompt: {
    title: "To answer this question, I need some data first.",
    actions: {
      uploadCsv: "Upload CSV",
      uploadExcel: "Upload Excel",
      trySample: "Try Sample Data",
      cancel: "Cancel"
    }
  },
  heroSuggestionPools: {
    default: [
      "Analyze sales performance",
      "Compare branch revenue",
      "Combine Excel reports",
      "Build executive summary",
      "Review receivables aging",
      "Analyze student performance",
      "Summarize support tickets",
      "Review employee attendance"
    ],
    retail: [
      "Analyze sales performance",
      "Find top products",
      "Compare branch revenue",
      "Review low-performing stores",
      "Find slow-moving inventory",
      "Analyze customer repeat purchases",
      "Compare store conversion rates",
      "Summarize daily sales"
    ],
    operator: [
      "Combine Excel reports",
      "Clean branch files",
      "Check daily performance",
      "Find missing values",
      "Summarize monthly operations",
      "Compare branch submissions",
      "Review operational exceptions",
      "Prepare weekly operation report"
    ],
    manager: [
      "Build executive summary",
      "Review revenue performance",
      "Find growth opportunities",
      "Compare teams",
      "Prepare monthly report",
      "Summarize business performance",
      "Review key risks",
      "Find underperforming areas"
    ],
    finance: [
      "Review revenue trend",
      "Find abnormal expenses",
      "Compare monthly sales",
      "Check payment delays",
      "Summarize cash flow",
      "Review receivables aging",
      "Review payables status",
      "Compare profit by month"
    ],
    accounting: [
      "Review receivables aging",
      "Check payable status",
      "Find unusual expenses",
      "Compare monthly profit",
      "Summarize cash flow",
      "Review unpaid invoices",
      "Check tax report data",
      "Analyze journal entries"
    ],
    education: [
      "Analyze student performance",
      "Review attendance trends",
      "Find at-risk students",
      "Compare class results",
      "Summarize learning outcomes",
      "Review tuition collection",
      "Analyze course enrollment",
      "Compare teacher workload"
    ],
    it: [
      "Review system incidents",
      "Analyze uptime trends",
      "Find recurring issues",
      "Summarize support tickets",
      "Compare service response time",
      "Review device inventory",
      "Analyze ticket backlog",
      "Find unstable services"
    ],
    hr: [
      "Review employee attendance",
      "Analyze leave trends",
      "Find overtime patterns",
      "Compare department headcount",
      "Summarize HR activity",
      "Review late check-ins",
      "Analyze turnover trends",
      "Compare payroll changes"
    ],
    sales: [
      "Review sales pipeline",
      "Find lost opportunities",
      "Compare sales reps",
      "Analyze conversion rate",
      "Summarize customer growth",
      "Review quotation performance",
      "Find inactive customers",
      "Compare monthly targets"
    ],
    service: [
      "Review service requests",
      "Find overdue tickets",
      "Analyze resolution time",
      "Compare support workload",
      "Summarize customer issues",
      "Find repeated complaints",
      "Review SLA performance",
      "Analyze service quality"
    ],
    inventory: [
      "Find slow-moving inventory",
      "Review stock movement",
      "Compare warehouse value",
      "Find out-of-stock items",
      "Analyze inventory aging",
      "Review reorder needs",
      "Compare stock by branch",
      "Summarize inventory risk"
    ],
    manufacturing: [
      "Review production output",
      "Find material shortages",
      "Analyze production delays",
      "Compare line performance",
      "Summarize defect rates",
      "Review work order status",
      "Analyze machine downtime",
      "Compare production cost"
    ],
    marketing: [
      "Analyze campaign performance",
      "Compare channel results",
      "Find high-value audiences",
      "Review customer acquisition",
      "Summarize lead sources",
      "Analyze conversion funnel",
      "Compare promotion impact",
      "Find weak campaigns"
    ],
    ecommerce: [
      "Analyze online sales",
      "Review abandoned orders",
      "Find best-selling products",
      "Compare marketplace channels",
      "Summarize customer behavior",
      "Analyze return rates",
      "Review discount impact",
      "Find low-performing SKUs"
    ],
    logistics: [
      "Review delivery performance",
      "Find delayed shipments",
      "Analyze route efficiency",
      "Compare carrier performance",
      "Summarize shipping cost",
      "Review failed deliveries",
      "Analyze warehouse dispatch",
      "Compare delivery by region"
    ],
    healthcare: [
      "Review appointment trends",
      "Analyze patient visits",
      "Compare service demand",
      "Summarize clinic performance",
      "Find delayed follow-ups",
      "Review treatment workload",
      "Analyze revenue by service",
      "Compare staff utilization"
    ],
    realEstate: [
      "Analyze property inquiries",
      "Compare listing performance",
      "Review rental income",
      "Find inactive listings",
      "Summarize occupancy trends",
      "Compare property expenses",
      "Analyze lead conversion",
      "Review tenant payments"
    ],
    nonprofit: [
      "Analyze donation trends",
      "Review program spending",
      "Compare campaign results",
      "Summarize donor activity",
      "Find funding gaps",
      "Review volunteer hours",
      "Analyze grant usage",
      "Compare impact metrics"
    ]
  },
  heroSuggestionPoolMetadata: {
    retail: { label: "Retail", matchPriority: 80, signals: ["sales", "branch", "product", "inventory", "customer", "store"] },
    operator: { label: "Operations", matchPriority: 70, signals: ["branch", "performance", "daily", "operation"] },
    manager: { label: "Management", matchPriority: 60, signals: ["executive", "revenue", "team", "risk"] },
    finance: { label: "Finance", matchPriority: 85, signals: ["revenue", "expense", "payment", "cash flow", "profit"] },
    accounting: { label: "Accounting", matchPriority: 90, signals: ["invoice", "receivable", "payable", "journal", "tax"] },
    education: { label: "Education", matchPriority: 80, signals: ["student", "attendance", "class", "tuition", "teacher", "course"] },
    it: { label: "IT Operations", matchPriority: 80, signals: ["incident", "ticket", "uptime", "device", "service", "system"] },
    hr: { label: "Human Resources", matchPriority: 85, signals: ["employee", "leave", "attendance", "payroll", "turnover", "headcount"] },
    sales: { label: "Sales", matchPriority: 80, signals: ["pipeline", "opportunity", "conversion", "quotation", "sales rep"] },
    service: { label: "Customer Service", matchPriority: 80, signals: ["ticket", "resolution", "complaint", "sla", "request"] },
    inventory: { label: "Inventory", matchPriority: 85, signals: ["stock", "warehouse", "reorder", "item"] },
    manufacturing: { label: "Manufacturing", matchPriority: 80, signals: ["production", "material", "defect", "machine", "work order"] },
    marketing: { label: "Marketing", matchPriority: 80, signals: ["campaign", "channel", "conversion", "promotion", "lead"] },
    ecommerce: { label: "E-Commerce", matchPriority: 85, signals: ["online", "order", "abandoned", "sku", "return"] },
    logistics: { label: "Logistics", matchPriority: 80, signals: ["delivery", "shipment", "route", "carrier", "dispatch"] },
    healthcare: { label: "Healthcare", matchPriority: 85, signals: ["patient", "appointment", "clinic", "treatment", "doctor"] },
    realEstate: { label: "Real Estate", matchPriority: 80, signals: ["property", "listing", "rental", "occupancy", "tenant"] },
    nonprofit: { label: "Non-Profit", matchPriority: 80, signals: ["donation", "program", "donor", "volunteer", "grant"] }
  },
  heroChipCategoryStyles: {
    sales: { dot: "bg-blue-500", hover: "hover:bg-blue-50" },
    finance: { dot: "bg-emerald-500", hover: "hover:bg-emerald-50" },
    accounting: { dot: "bg-teal-500", hover: "hover:bg-teal-50" },
    hr: { dot: "bg-violet-500", hover: "hover:bg-violet-50" },
    it: { dot: "bg-orange-500", hover: "hover:bg-orange-50" },
    education: { dot: "bg-indigo-500", hover: "hover:bg-indigo-50" },
    inventory: { dot: "bg-cyan-500", hover: "hover:bg-cyan-50" },
    operations: { dot: "bg-slate-500", hover: "hover:bg-slate-50" },
    service: { dot: "bg-sky-500", hover: "hover:bg-sky-50" },
    manufacturing: { dot: "bg-stone-500", hover: "hover:bg-stone-50" },
    marketing: { dot: "bg-pink-500", hover: "hover:bg-pink-50" },
    ecommerce: { dot: "bg-purple-500", hover: "hover:bg-purple-50" },
    logistics: { dot: "bg-amber-500", hover: "hover:bg-amber-50" },
    healthcare: { dot: "bg-rose-500", hover: "hover:bg-rose-50" },
    realEstate: { dot: "bg-lime-600", hover: "hover:bg-lime-50" },
    nonprofit: { dot: "bg-fuchsia-500", hover: "hover:bg-fuchsia-50" },
    manager: { dot: "bg-slate-600", hover: "hover:bg-slate-50" },
    retail: { dot: "bg-indigo-400", hover: "hover:bg-indigo-50" },
    general: { dot: "bg-zinc-400", hover: "hover:bg-zinc-50" }
  } as Record<string, { dot: string; hover: string }>,
  homeStates: {
    noData: {
      actions: [
        "Upload your first spreadsheet",
        "Try sample sales data",
        "Connect ERPNext later",
        "Learn what LightBI can answer"
      ],
      recentInsightsEmpty: {
        title: "No insights yet",
        message: "Upload data to start exploring and creating insights."
      }
    },
    dataLoaded: {
      recentInsightsEmpty: {
        title: "No insights yet",
        message: "Ask a question or choose a suggested action to create your first insight."
      }
    },
    analysisReady: {
      actions: [
        "Compare by branch",
        "Explain this result",
        "Build a dashboard from this",
        "Export summary"
      ]
    }
  },
  recentInsights: {
    title: "Recent Insights",
    viewHistoryAction: "View insight history",
    items: [
      { id: "1", title: "Revenue increased 12%", description: "Compared to previous month, driven by organic search.", timestamp: "Today" },
      { id: "2", title: "Branch B exceeded target", description: "Reached 115% of Q3 sales target.", timestamp: "Yesterday" },
      { id: "3", title: "Top customers generated 48%", description: "Analysis of customer concentration in top quartile.", timestamp: "Last run" }
    ]
  },
  sections: {
    quickStartEmpty: "Quick Start",
    quickStartLoaded: "Explore more workflows",
    suggestedActions: "Suggested Actions",
    detectedOpportunities: "Detected Opportunities",
    followUpActions: "Next Steps"
  },
  datasetCapabilities: {
    revenueAnalysis: {
      label: "Revenue Analysis",
      description: "Find revenue trends, growth changes, and sales patterns.",
      evidencePrefix: "Detected from"
    },
    customerAnalysis: {
      label: "Customer Analysis",
      description: "Understand customer behavior, retention, and segments.",
      evidencePrefix: "Detected from"
    },
    productPerformance: {
      label: "Product Performance",
      description: "Identify top-selling products and slow-moving items.",
      evidencePrefix: "Detected from"
    },
    branchComparison: {
      label: "Branch Comparison",
      description: "Compare performance across different locations or branches.",
      evidencePrefix: "Detected from"
    },
    salesTrend: {
      label: "Sales Trends",
      description: "Analyze how metrics change over time.",
      evidencePrefix: "Detected from"
    },
    inventoryAnalysis: {
      label: "Inventory Analysis",
      description: "Review stock levels, movement, and warehouse status.",
      evidencePrefix: "Detected from"
    },
    workforceAnalysis: {
      label: "Workforce Analysis",
      description: "Understand employee performance and HR metrics.",
      evidencePrefix: "Detected from"
    },
    financialAnalysis: {
      label: "Financial Analysis",
      description: "Review cash flow, expenses, and financial health.",
      evidencePrefix: "Detected from"
    }
  } as Record<string, { label: string; description: string; evidencePrefix: string }>,
  capabilitySuggestedActions: {
    revenueAnalysis: { id: "analyzeRevenueGrowth", label: "Analyze revenue growth" },
    customerAnalysis: { id: "findTopCustomers", label: "Find top customers" },
    productPerformance: { id: "analyzeProductPerformance", label: "Analyze product performance" },
    branchComparison: { id: "compareBranchPerformance", label: "Compare branch performance" },
    salesTrend: { id: "reviewSalesTrends", label: "Review sales trends" },
    inventoryAnalysis: { id: "reviewInventoryMovement", label: "Review inventory movement" },
    workforceAnalysis: { id: "analyzeWorkforceMetrics", label: "Analyze workforce metrics" },
    financialAnalysis: { id: "reviewFinancialHealth", label: "Review financial health" }
  } as Record<string, { id: string; label: string }>,
  actionPreviews: {
    analyzeRevenueGrowth: {
      question: "How is revenue growing over time?",
      using: ["Revenue", "Date"],
      expectedOutput: "Trend line and growth percentage",
      primaryAction: "Run analysis"
    },
    findTopCustomers: {
      question: "Who are the top customers by revenue?",
      using: ["Customer", "Revenue"],
      expectedOutput: "Ranked list of top customers",
      primaryAction: "Run analysis"
    },
    analyzeProductPerformance: {
      question: "Which products perform best?",
      using: ["Product", "Revenue", "Quantity"],
      expectedOutput: "Comparison of top products",
      primaryAction: "Run analysis"
    },
    compareBranchPerformance: {
      question: "Which branch performs best by revenue?",
      using: ["Revenue", "Branch", "Date"],
      expectedOutput: "Ranked comparison and trend summary",
      primaryAction: "Run analysis"
    },
    reviewSalesTrends: {
      question: "What are the sales trends over time?",
      using: ["Sales", "Date"],
      expectedOutput: "Trend visualization and seasonality",
      primaryAction: "Run analysis"
    },
    reviewInventoryMovement: {
      question: "How is inventory moving?",
      using: ["Stock", "Date", "Product"],
      expectedOutput: "Stock movement timeline",
      primaryAction: "Run analysis"
    },
    analyzeWorkforceMetrics: {
      question: "What are the key workforce metrics?",
      using: ["Employee", "Department"],
      expectedOutput: "Headcount and departmental breakdown",
      primaryAction: "Run analysis"
    },
    reviewFinancialHealth: {
      question: "What is the financial health?",
      using: ["Revenue", "Expense", "Date"],
      expectedOutput: "Cash flow summary",
      primaryAction: "Run analysis"
    },
    generic: {
      question: "LightBI will prepare an analysis from your selected data.",
      using: ["Detected dataset fields"],
      expectedOutput: "Summary, patterns, and suggested next steps",
      primaryAction: "Run analysis"
    }
  } as Record<string, { question: string; using: string[]; expectedOutput: string; primaryAction: string }>,
  suggestions: {
    revenue: ["Find revenue opportunities", "Build executive summary", "Identify declining products", "Review revenue trends"],
    inventory: ["Discover stock movement", "Find slow moving items", "Analyze inventory value", "Review warehouse performance"],
    survey: ["Summarize responses", "Analyze satisfaction trends", "Find key feedback themes"],
    generic: ["Find {measure} opportunities", "Identify top {measure} performers", "Review {measure} performance", "Analyze {measure} breakdown"],
    pending: ["Inspect source", "Preview schema", "Suggest questions after import"]
  },
  postAnalysis: [
    "Compare by Customer",
    "Compare by Product",
    "Compare by Category",
    "Compare by Month",
    "Build Dashboard",
    "Export Results"
  ],
  connectionPanel: {
    google_sheets: {
      title: "Connect Google Sheets",
      description: "Paste a Google Sheets URL",
      inputType: "url",
      example: "https://docs.google.com/spreadsheets/...",
      buttonText: "Continue"
    },
    m365_excel: {
      title: "Connect Microsoft 365",
      description: "Paste an Excel sharing link",
      inputType: "url",
      buttonText: "Continue"
    },
    csv_url: {
      title: "Import CSV from URL",
      inputType: "url",
      buttonText: "Continue"
    },
    excel_url: {
      title: "Import Excel from URL",
      inputType: "url",
      buttonText: "Continue"
    },
    database: {
      title: "Connect Database",
      description: "Choose database type",
      inputType: "options",
      options: [
        { id: "postgresql", label: "PostgreSQL" },
        { id: "mysql", label: "MySQL" },
        { id: "mariadb", label: "MariaDB" },
        { id: "sqlserver", label: "SQL Server" },
        { id: "sqlite", label: "SQLite" }
      ],
      buttonText: "Continue"
    },
    api: {
      title: "Connect API",
      inputType: "options",
      options: [
        { id: "rest_api", label: "REST API" },
        { id: "graphql", label: "GraphQL" },
        { id: "webhook", label: "Webhook" }
      ],
      buttonText: "Continue"
    },
    data_warehouse: {
      title: "Connect Data Warehouse",
      inputType: "options",
      options: [
        { id: "bigquery", label: "BigQuery" },
        { id: "snowflake", label: "Snowflake" },
        { id: "redshift", label: "Redshift" },
        { id: "duckdb", label: "DuckDB" }
      ],
      buttonText: "Continue"
    }
  },
  datasetSummary: {
    title: "Dataset Ready",
    startExploring: "Start Exploring",
    viewDataset: "View Dataset",
    opportunitiesTitle: "Detected Opportunities",
    measuresTitle: "Detected Measures",
    dimensionsTitle: "Detected Dimensions"
  },
  inlineLinkIntake: {
    attached: "{label} attached",
    pendingInspection: "This source will be inspected during import.",
    importAndAnalyzeAction: "Import and analyze",
    importOnlyAction: "Import only",
    cancelAction: "Cancel",
    askAsQuestionAction: "Ask as question",
    unsupportedMessage: "This link type is not supported yet.",
    useDataToPrefix: "Use this data to:",
    noIntentReadyQuestion: "What would you like to understand from this data?",
    noIntentPlaceholder: "Ask a question about this spreadsheet...",
    exploreDataAction: "Explore data",
    suggestQuestionsAction: "Suggest questions",
    placeholders: {
      google_sheets: "Paste a Google Sheets URL...",
      m365_excel: "Paste a Microsoft 365 Excel URL...",
      csv_url: "Paste a CSV file URL...",
      excel_url: "Paste an Excel file URL..."
    }
  }
};
