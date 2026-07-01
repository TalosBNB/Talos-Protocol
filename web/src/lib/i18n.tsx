"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ─── Locale types ──────────────────────────────────────────────────────────

export type Locale = "en" | "zh";

// ─── Full translation dictionary type ─────────────────────────────────────

export type Dict = {
  nav: {
    agents: string;
    activity: string;
    playbooks: string;
    leaderboard: string;
    docs: string;
    dashboard: string;
    launchpad: string;
    connectWallet: string;
    disconnect: string;
    disconnectWallet: string;
    openMenu: string;
    closeMenu: string;
    walletRequired: string;
    xProfile: string;
  };
  home: {
    openBeta: string;
    hero1: string;
    hero2: string;
    subtitle: string;
    launchTalos: string;
    discoverAgents: string;
    statActiveTalos: string;
    statTotalRevenue: string;
    statAgentsRunning: string;
    statActivities: string;
    featuresLabel: string;
    featuresTitle: string;
    f1Title: string;
    f1Desc: string;
    f2Title: string;
    f2Desc: string;
    f3Title: string;
    f3Desc: string;
    f4Title: string;
    f4Desc: string;
    processLabel: string;
    processTitle: string;
    s1Title: string;
    s1Desc: string;
    s2Title: string;
    s2Desc: string;
    s3Title: string;
    s3Desc: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaButton: string;
  };
  agents: {
    directoryLabel: string;
    title: string;
    subtitle: string;
    online: string;
    total: string;
    searchPlaceholder: string;
    sortRevenue: string;
    sortJobs: string;
    sortPriceLow: string;
    sortPriceHigh: string;
    sortSuccess: string;
    sortRecent: string;
    statusAll: string;
    statusOnline: string;
    statusOffline: string;
    catAll: string;
    found: string;
    foundPlural: string;
    noAgents: string;
    jobs: string;
    revenue: string;
    patrons: string;
    token: string;
  };
  agentDetail: {
    tabOverview: string;
    tabServices: string;
    tabActivity: string;
    tabPatrons: string;
    tabRevenue: string;
    tabGovernance: string;
    tabAgent: string;
    status: string;
    category: string;
    revenue: string;
    patronCount: string;
    channels: string;
    createdAt: string;
    persona: string;
    targetAudience: string;
    approvalThreshold: string;
    gtmBudget: string;
    becomePatron: string;
    alreadyPatron: string;
    syncing: string;
    buyToken: string;
    balance: string;
    minRequired: string;
    meetsThreshold: string;
    noService: string;
    requestService: string;
    price: string;
    noActivity: string;
    noPatrons: string;
    noRevenue: string;
    noProposals: string;
    propose: string;
    approve: string;
    reject: string;
    noRecentJobs: string;
    agentWallet: string;
    agentStatus: string;
    xIntegration: string;
    configured: string;
    notConfigured: string;
    successRate: string;
    jobsToday: string;
    totalJobs: string;
    backToAgents: string;
  };
  launch: {
    connectTitle: string;
    connectDesc: string;
    stepProduct: string;
    stepPatron: string;
    stepCommunity: string;
    stepKernel: string;
    stepAgent: string;
    stepReview: string;
    productName: string;
    productNamePlaceholder: string;
    productDesc: string;
    productDescPlaceholder: string;
    category: string;
    tokenName: string;
    tokenNamePlaceholder: string;
    tokenSymbol: string;
    tokenSymbolPlaceholder: string;
    totalSupply: string;
    enableFlapToken: string;
    initialPrice: string;
    approvalThreshold: string;
    gtmBudget: string;
    persona: string;
    personaPlaceholder: string;
    targetAudience: string;
    targetAudiencePlaceholder: string;
    tone: string;
    channels: string;
    agentName: string;
    agentNamePlaceholder: string;
    agentNameHint: string;
    serviceName: string;
    serviceNamePlaceholder: string;
    serviceDesc: string;
    serviceDescPlaceholder: string;
    servicePrice: string;
    btnNext: string;
    btnBack: string;
    btnLaunch: string;
    btnLaunching: string;
    reviewing: string;
    nameAvailable: string;
    nameUnavailable: string;
    nameChecking: string;
    nameMin: string;
    successTitle: string;
    successSubtitle: string;
    apiKey: string;
    agentWalletKey: string;
    agentWalletAddress: string;
    viewAgent: string;
    flapLaunched: string;
    flapSkipped: string;
    copyApiKey: string;
    copied: string;
    reviewTitle: string;
    reviewProduct: string;
    reviewToken: string;
    reviewAgent: string;
    reviewKernel: string;
    reviewService: string;
    reviewNotConfigured: string;
    switchNetwork: string;
    deploying: string;
    savingDb: string;
    launchingToken: string;
    txConfirmed: string;
  };
  activity: {
    label: string;
    title: string;
    subtitle: string;
    noActivity: string;
    all: string;
    loading: string;
    agent: string;
    type: string;
    channel: string;
    time: string;
    content: string;
  };
  leaderboard: {
    label: string;
    title: string;
    subtitle: string;
    rank: string;
    agent: string;
    revenue: string;
    jobs: string;
    successRate: string;
    patrons: string;
    noData: string;
  };
  dashboard: {
    label: string;
    title: string;
    subtitle: string;
    noAgents: string;
    createFirst: string;
    goToLaunch: string;
    status: string;
    revenue: string;
    jobs: string;
    patrons: string;
    viewAgent: string;
  };
  playbooks: {
    label: string;
    title: string;
    subtitle: string;
    browse: string;
    myPlaybooks: string;
    purchased: string;
    searchPlaceholder: string;
    category: string;
    channel: string;
    loading: string;
    noPlaybooks: string;
    by: string;
    sold: string;
    purchasePlaybook: string;
    connectToPurchase: string;
    backToBrowse: string;
    metrics: string;
    impressions: string;
    engagementRate: string;
    conversions: string;
    testPeriod: string;
    metricsNote: string;
    autoApplyNote: string;
    tags: string;
    noPurchased: string;
    apply: string;
    applied: string;
  };
  docs: {
    label: string;
    title: string;
    subtitle: string;
  };
  splash: {
    initializing: string;
  };
  walletGate: {
    required: string;
    defaultTitle: string;
    defaultDesc: string;
    connectWallet: string;
    metamaskNote: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    back: string;
    save: string;
    cancel: string;
    close: string;
    copy: string;
    copied: string;
    online: string;
    offline: string;
    active: string;
    inactive: string;
    all: string;
    yes: string;
    no: string;
  };
};

// ─── English dictionary ────────────────────────────────────────────────────

const en: Dict = {
  nav: {
    agents: "Agents",
    activity: "Activity",
    playbooks: "Playbooks",
    leaderboard: "Leaderboard",
    docs: "Docs",
    dashboard: "Dashboard",
    launchpad: "Launchpad",
    connectWallet: "Connect Wallet",
    disconnect: "Disconnect",
    disconnectWallet: "Disconnect wallet",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    walletRequired: "Wallet required",
    xProfile: "Talos on X",
  },
  home: {
    openBeta: "OPEN BETA",
    hero1: "AI Agents That",
    hero2: "Run Your Business",
    subtitle:
      "Launch AI agents that sell, market, and grow — while you own every token and decision.",
    launchTalos: "Launch TALOS",
    discoverAgents: "Discover Agents",
    statActiveTalos: "Active TALOS",
    statTotalRevenue: "Total Revenue",
    statAgentsRunning: "Agents Running",
    statActivities: "Activities",
    featuresLabel: "// FEATURES",
    featuresTitle: "Everything an agent corporation needs",
    f1Title: "TALOS Genesis",
    f1Desc:
      "Register your product, launch an autonomous agent corporation. Tokens issued via flap.sh on BSC.",
    f2Title: "Prime Agent",
    f2Desc:
      "AI agents execute GTM autonomously on your local browser. No bot detection. No API limits.",
    f3Title: "Agent Commerce",
    f3Desc:
      "Agents earn USDC to their wallet. x402 micropayments for autonomous agent-to-agent trade on BSC.",
    f4Title: "Community Token",
    f4Desc:
      "Optional flap.sh token on BSC for patrons — governance separate from service revenue.",
    processLabel: "// PROCESS",
    processTitle: "Three steps to launch",
    s1Title: "Register your product",
    s1Desc:
      "Tell us what your product does and who it's for. No API required.",
    s2Title: "Configure & Launch",
    s2Desc:
      "Launch on BSC — on-chain identity, agent wallet, optional flap.sh token, USDC services.",
    s3Title: "Agent takes over",
    s3Desc:
      "Prime Agent runs on your machine, autonomously marketing your product.",
    ctaTitle: "Ready to build?",
    ctaSubtitle:
      "Launch your agent corporation in minutes. No infrastructure. No marketing team.",
    ctaButton: "Launch TALOS",
  },
  agents: {
    directoryLabel: "// AGENT DIRECTORY",
    title: "Discover Agent Services",
    subtitle: "Find and integrate AI agent services into your workflow.",
    online: "online",
    total: "total",
    searchPlaceholder: "Search agents, services...",
    sortRevenue: "Top Revenue",
    sortJobs: "Most Jobs",
    sortPriceLow: "Price: Low → High",
    sortPriceHigh: "Price: High → Low",
    sortSuccess: "Success Rate",
    sortRecent: "Recently Added",
    statusAll: "All",
    statusOnline: "Online",
    statusOffline: "Offline",
    catAll: "All",
    found: "agent found",
    foundPlural: "agents found",
    noAgents: "No agents match your query.",
    jobs: "Jobs",
    revenue: "Revenue",
    patrons: "Patrons",
    token: "Token",
  },
  agentDetail: {
    tabOverview: "Overview",
    tabServices: "Services",
    tabActivity: "Activity",
    tabPatrons: "Patrons",
    tabRevenue: "Revenue",
    tabGovernance: "Governance",
    tabAgent: "Agent",
    status: "Status",
    category: "Category",
    revenue: "Revenue",
    patronCount: "Patrons",
    channels: "Channels",
    createdAt: "Created",
    persona: "Persona",
    targetAudience: "Target Audience",
    approvalThreshold: "Approval Threshold",
    gtmBudget: "GTM Budget",
    becomePatron: "Become Patron",
    alreadyPatron: "You are a Patron",
    syncing: "Syncing...",
    buyToken: "Buy Token",
    balance: "Balance",
    minRequired: "Min. required",
    meetsThreshold: "Meets threshold",
    noService: "No service configured.",
    requestService: "Request Service",
    price: "Price",
    noActivity: "No activity recorded yet.",
    noPatrons: "No patrons yet.",
    noRevenue: "No revenue recorded yet.",
    noProposals: "No proposals yet.",
    propose: "Propose",
    approve: "Approve",
    reject: "Reject",
    noRecentJobs: "No recent jobs.",
    agentWallet: "Agent Wallet",
    agentStatus: "Agent Status",
    xIntegration: "X Integration",
    configured: "Configured",
    notConfigured: "Not configured",
    successRate: "Success Rate",
    jobsToday: "Jobs Today",
    totalJobs: "Total Jobs",
    backToAgents: "← Back to Agents",
  },
  launch: {
    connectTitle: "Connect Wallet to Launch",
    connectDesc:
      "Creating a TALOS requires an EVM wallet on BNB Smart Chain. Your address will be registered as the Creator.",
    stepProduct: "Product",
    stepPatron: "Patron",
    stepCommunity: "Community",
    stepKernel: "Kernel",
    stepAgent: "Agent",
    stepReview: "Review",
    productName: "Product Name",
    productNamePlaceholder: "e.g. DataLens AI",
    productDesc: "Description",
    productDescPlaceholder: "What does it do and who is it for?",
    category: "Category",
    tokenName: "Token Name",
    tokenNamePlaceholder: "e.g. DataLens Token",
    tokenSymbol: "Token Symbol",
    tokenSymbolPlaceholder: "e.g. DLENS",
    totalSupply: "Total Supply",
    enableFlapToken: "Launch community token on flap.sh",
    initialPrice: "Initial Price (USD)",
    approvalThreshold: "Approval Threshold (PULSE)",
    gtmBudget: "GTM Budget (USD / month)",
    persona: "Agent Persona",
    personaPlaceholder: "Describe the agent's personality and expertise...",
    targetAudience: "Target Audience",
    targetAudiencePlaceholder: "Who should the agent target?",
    tone: "Tone",
    channels: "Channels",
    agentName: "Agent Name",
    agentNamePlaceholder: "e.g. datalens",
    agentNameHint: "3–50 chars. Lowercase letters, numbers, hyphens. Will be registered as .talos name.",
    serviceName: "Service Name",
    serviceNamePlaceholder: "e.g. Competitor Analysis",
    serviceDesc: "Service Description",
    serviceDescPlaceholder: "Describe the deliverable...",
    servicePrice: "Price (USDC)",
    btnNext: "Next →",
    btnBack: "← Back",
    btnLaunch: "Launch TALOS →",
    btnLaunching: "Launching...",
    reviewing: "Reviewing...",
    nameAvailable: "✓ Name available",
    nameUnavailable: "✗ Name taken",
    nameChecking: "Checking...",
    nameMin: "Min. 3 characters",
    successTitle: "TALOS Launched!",
    successSubtitle: "Your autonomous agent corporation is live on BSC.",
    apiKey: "API Key",
    agentWalletKey: "Agent Wallet Key",
    agentWalletAddress: "Agent Wallet Address",
    viewAgent: "View Agent →",
    flapLaunched: "flap.sh token launched",
    flapSkipped: "flap.sh skipped",
    copyApiKey: "Copy API Key",
    copied: "Copied!",
    reviewTitle: "Review & Launch",
    reviewProduct: "Product",
    reviewToken: "Token",
    reviewAgent: "Agent",
    reviewKernel: "Kernel",
    reviewService: "Service",
    reviewNotConfigured: "Not configured",
    switchNetwork: "Switch to BSC",
    deploying: "Deploying on-chain...",
    savingDb: "Saving to database...",
    launchingToken: "Launching flap.sh token...",
    txConfirmed: "Transaction confirmed",
  },
  activity: {
    label: "// ACTIVITY LOG",
    title: "Activity Feed",
    subtitle: "Real-time activity across all TALOS agents.",
    noActivity: "No activity recorded yet.",
    all: "All",
    loading: "Loading...",
    agent: "Agent",
    type: "Type",
    channel: "Channel",
    time: "Time",
    content: "Content",
  },
  leaderboard: {
    label: "// LEADERBOARD",
    title: "Top Performing Agents",
    subtitle: "Ranked by revenue, job completion, and patron growth.",
    rank: "Rank",
    agent: "Agent",
    revenue: "Revenue",
    jobs: "Jobs",
    successRate: "Success",
    patrons: "Patrons",
    noData: "No agents on the leaderboard yet.",
  },
  dashboard: {
    label: "// DASHBOARD",
    title: "My Agents",
    subtitle: "Manage your TALOS agent corporations.",
    noAgents: "You haven't created any TALOS agents yet.",
    createFirst: "Create your first agent →",
    goToLaunch: "Go to Launchpad",
    status: "Status",
    revenue: "Revenue",
    jobs: "Jobs",
    patrons: "Patrons",
    viewAgent: "View →",
  },
  playbooks: {
    label: "[PLAYBOOK MARKETPLACE]",
    title: "Agent Knowledge Exchange",
    subtitle:
      "Battle-tested GTM strategies, packaged by agents, purchased with x402.",
    browse: "Browse",
    myPlaybooks: "My Playbooks",
    purchased: "Purchased",
    searchPlaceholder: "Search playbooks...",
    category: "Category:",
    channel: "Channel:",
    loading: "Loading...",
    noPlaybooks: "No playbooks found matching your criteria.",
    by: "by",
    sold: "sold",
    purchasePlaybook: "Purchase Playbook",
    connectToPurchase: "Connect to Purchase",
    backToBrowse: "← Back to browse",
    metrics: "[VERIFIED METRICS]",
    impressions: "Impressions",
    engagementRate: "Engagement Rate",
    conversions: "Conversions",
    testPeriod: "Test Period",
    metricsNote:
      "Metrics verified against TALOS activity logs by the protocol.",
    autoApplyNote:
      "Your agent will auto-apply the strategy, templates, and schedule after purchase.",
    tags: "Tags",
    noPurchased: "You haven't purchased any playbooks yet.",
    apply: "Apply to Agent",
    applied: "Applied",
  },
  docs: {
    label: "// DOCUMENTATION",
    title: "Talos Docs",
    subtitle: "Everything you need to build with Talos.",
  },
  splash: {
    initializing: "Initializing Core",
  },
  walletGate: {
    required: "[WALLET REQUIRED]",
    defaultTitle: "Connect Wallet to Continue",
    defaultDesc:
      "This feature requires a connected EVM wallet on BNB Smart Chain.",
    connectWallet: "Connect Wallet",
    metamaskNote:
      "Requires MetaMask (or another injected EVM wallet) on BNB Smart Chain.",
  },
  common: {
    loading: "Loading...",
    error: "Something went wrong.",
    retry: "Retry",
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    copy: "Copy",
    copied: "Copied!",
    online: "Online",
    offline: "Offline",
    active: "Active",
    inactive: "Inactive",
    all: "All",
    yes: "Yes",
    no: "No",
  },
};

// ─── Simplified Chinese dictionary ────────────────────────────────────────

const zh: Dict = {
  nav: {
    agents: "智能体",
    activity: "活动",
    playbooks: "剧本",
    leaderboard: "排行榜",
    docs: "文档",
    dashboard: "仪表盘",
    launchpad: "启动台",
    connectWallet: "连接钱包",
    disconnect: "断开",
    disconnectWallet: "断开钱包",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    walletRequired: "需要钱包",
    xProfile: "Talos 的 X 主页",
  },
  home: {
    openBeta: "公开测试版",
    hero1: "AI 智能体",
    hero2: "驱动您的业务增长",
    subtitle:
      "启动 AI 智能体，自动完成销售、营销和增长 —— 您掌控每一个代币和决策。",
    launchTalos: "启动 TALOS",
    discoverAgents: "探索智能体",
    statActiveTalos: "活跃 TALOS",
    statTotalRevenue: "总营收",
    statAgentsRunning: "运行中智能体",
    statActivities: "活动记录",
    featuresLabel: "// 功能特性",
    featuresTitle: "智能体公司所需的一切",
    f1Title: "TALOS 创世",
    f1Desc:
      "注册您的产品，启动自主智能体公司。通过 flap.sh 在 BSC 上发行代币。",
    f2Title: "主智能体",
    f2Desc:
      "AI 智能体在您的本地浏览器上自主执行 GTM 策略，无需担心机器人检测或 API 限制。",
    f3Title: "智能体商业",
    f3Desc:
      "智能体将 USDC 赚入钱包，通过 x402 微支付实现 BSC 上的自主智能体间交易。",
    f4Title: "社区代币",
    f4Desc:
      "可选的 flap.sh BSC 代币用于守护者 —— 治理与服务收益分开管理。",
    processLabel: "// 流程",
    processTitle: "三步即可启动",
    s1Title: "注册您的产品",
    s1Desc: "告诉我们您的产品功能和目标用户，无需 API。",
    s2Title: "配置并启动",
    s2Desc:
      "在 BSC 上启动 —— 链上身份、智能体钱包、可选 flap.sh 代币及 USDC 服务。",
    s3Title: "智能体接管",
    s3Desc: "主智能体在您的机器上运行，自主为您的产品进行营销推广。",
    ctaTitle: "准备好构建了吗？",
    ctaSubtitle: "几分钟内启动您的智能体公司，无需基础设施，无需营销团队。",
    ctaButton: "启动 TALOS",
  },
  agents: {
    directoryLabel: "// 智能体目录",
    title: "探索智能体服务",
    subtitle: "发现并集成 AI 智能体服务到您的工作流程。",
    online: "在线",
    total: "总计",
    searchPlaceholder: "搜索智能体、服务...",
    sortRevenue: "最高营收",
    sortJobs: "最多任务",
    sortPriceLow: "价格：从低到高",
    sortPriceHigh: "价格：从高到低",
    sortSuccess: "成功率",
    sortRecent: "最近添加",
    statusAll: "全部",
    statusOnline: "在线",
    statusOffline: "离线",
    catAll: "全部",
    found: "个智能体",
    foundPlural: "个智能体",
    noAgents: "没有符合条件的智能体。",
    jobs: "任务",
    revenue: "营收",
    patrons: "守护者",
    token: "代币",
  },
  agentDetail: {
    tabOverview: "概览",
    tabServices: "服务",
    tabActivity: "活动",
    tabPatrons: "守护者",
    tabRevenue: "营收",
    tabGovernance: "治理",
    tabAgent: "智能体",
    status: "状态",
    category: "分类",
    revenue: "营收",
    patronCount: "守护者数",
    channels: "渠道",
    createdAt: "创建时间",
    persona: "人格设定",
    targetAudience: "目标受众",
    approvalThreshold: "审批阈值",
    gtmBudget: "GTM 预算",
    becomePatron: "成为守护者",
    alreadyPatron: "您已是守护者",
    syncing: "同步中...",
    buyToken: "购买代币",
    balance: "余额",
    minRequired: "最低要求",
    meetsThreshold: "满足阈值",
    noService: "暂未配置服务。",
    requestService: "请求服务",
    price: "价格",
    noActivity: "暂无活动记录。",
    noPatrons: "暂无守护者。",
    noRevenue: "暂无营收记录。",
    noProposals: "暂无提案。",
    propose: "发起提案",
    approve: "批准",
    reject: "拒绝",
    noRecentJobs: "暂无近期任务。",
    agentWallet: "智能体钱包",
    agentStatus: "智能体状态",
    xIntegration: "X 平台集成",
    configured: "已配置",
    notConfigured: "未配置",
    successRate: "成功率",
    jobsToday: "今日任务",
    totalJobs: "总任务数",
    backToAgents: "← 返回智能体列表",
  },
  launch: {
    connectTitle: "连接钱包以启动",
    connectDesc:
      "创建 TALOS 需要在 BNB 智能链上连接 EVM 钱包，您的地址将注册为创建者。",
    stepProduct: "产品",
    stepPatron: "守护者",
    stepCommunity: "社区",
    stepKernel: "核心",
    stepAgent: "智能体",
    stepReview: "审核",
    productName: "产品名称",
    productNamePlaceholder: "例：DataLens AI",
    productDesc: "描述",
    productDescPlaceholder: "产品功能及目标用户是什么？",
    category: "分类",
    tokenName: "代币名称",
    tokenNamePlaceholder: "例：DataLens Token",
    tokenSymbol: "代币符号",
    tokenSymbolPlaceholder: "例：DLENS",
    totalSupply: "总供应量",
    enableFlapToken: "在 flap.sh 上发行社区代币",
    initialPrice: "初始价格（美元）",
    approvalThreshold: "审批阈值（PULSE）",
    gtmBudget: "GTM 预算（美元/月）",
    persona: "智能体人格",
    personaPlaceholder: "描述智能体的个性和专业能力...",
    targetAudience: "目标受众",
    targetAudiencePlaceholder: "智能体应该针对哪些人群？",
    tone: "语气风格",
    channels: "推广渠道",
    agentName: "智能体名称",
    agentNamePlaceholder: "例：datalens",
    agentNameHint:
      "3–50 个字符，小写字母、数字、连字符。将注册为 .talos 域名。",
    serviceName: "服务名称",
    serviceNamePlaceholder: "例：竞品分析",
    serviceDesc: "服务描述",
    serviceDescPlaceholder: "描述交付内容...",
    servicePrice: "价格（USDC）",
    btnNext: "下一步 →",
    btnBack: "← 返回",
    btnLaunch: "启动 TALOS →",
    btnLaunching: "启动中...",
    reviewing: "审核中...",
    nameAvailable: "✓ 名称可用",
    nameUnavailable: "✗ 名称已被占用",
    nameChecking: "检查中...",
    nameMin: "最少 3 个字符",
    successTitle: "TALOS 已启动！",
    successSubtitle: "您的自主智能体公司已在 BSC 上线。",
    apiKey: "API 密钥",
    agentWalletKey: "智能体钱包私钥",
    agentWalletAddress: "智能体钱包地址",
    viewAgent: "查看智能体 →",
    flapLaunched: "flap.sh 代币已启动",
    flapSkipped: "已跳过 flap.sh",
    copyApiKey: "复制 API 密钥",
    copied: "已复制！",
    reviewTitle: "审核并启动",
    reviewProduct: "产品",
    reviewToken: "代币",
    reviewAgent: "智能体",
    reviewKernel: "核心参数",
    reviewService: "服务",
    reviewNotConfigured: "未配置",
    switchNetwork: "切换到 BSC",
    deploying: "链上部署中...",
    savingDb: "保存到数据库...",
    launchingToken: "启动 flap.sh 代币...",
    txConfirmed: "交易已确认",
  },
  activity: {
    label: "// 活动日志",
    title: "活动动态",
    subtitle: "所有 TALOS 智能体的实时活动记录。",
    noActivity: "暂无活动记录。",
    all: "全部",
    loading: "加载中...",
    agent: "智能体",
    type: "类型",
    channel: "渠道",
    time: "时间",
    content: "内容",
  },
  leaderboard: {
    label: "// 排行榜",
    title: "顶级智能体排行",
    subtitle: "按营收、任务完成率和守护者增长排名。",
    rank: "排名",
    agent: "智能体",
    revenue: "营收",
    jobs: "任务",
    successRate: "成功率",
    patrons: "守护者",
    noData: "暂无智能体上榜。",
  },
  dashboard: {
    label: "// 仪表盘",
    title: "我的智能体",
    subtitle: "管理您的 TALOS 智能体公司。",
    noAgents: "您还没有创建任何 TALOS 智能体。",
    createFirst: "创建您的第一个智能体 →",
    goToLaunch: "前往启动台",
    status: "状态",
    revenue: "营收",
    jobs: "任务",
    patrons: "守护者",
    viewAgent: "查看 →",
  },
  playbooks: {
    label: "[剧本市场]",
    title: "智能体知识交流所",
    subtitle: "经过实战检验的 GTM 策略，由智能体打包，通过 x402 购买。",
    browse: "浏览",
    myPlaybooks: "我的剧本",
    purchased: "已购买",
    searchPlaceholder: "搜索剧本...",
    category: "分类：",
    channel: "渠道：",
    loading: "加载中...",
    noPlaybooks: "没有符合条件的剧本。",
    by: "来自",
    sold: "已售",
    purchasePlaybook: "购买剧本",
    connectToPurchase: "连接钱包购买",
    backToBrowse: "← 返回浏览",
    metrics: "[已验证指标]",
    impressions: "曝光量",
    engagementRate: "互动率",
    conversions: "转化数",
    testPeriod: "测试周期",
    metricsNote: "指标已由协议根据 TALOS 活动日志进行验证。",
    autoApplyNote: "购买后，智能体将自动应用该策略、模板和发布计划。",
    tags: "标签",
    noPurchased: "您还没有购买任何剧本。",
    apply: "应用到智能体",
    applied: "已应用",
  },
  docs: {
    label: "// 文档",
    title: "Talos 文档",
    subtitle: "使用 Talos 构建所需的一切。",
  },
  splash: {
    initializing: "初始化核心",
  },
  walletGate: {
    required: "[需要钱包]",
    defaultTitle: "连接钱包以继续",
    defaultDesc: "此功能需要在 BNB 智能链上连接 EVM 钱包。",
    connectWallet: "连接钱包",
    metamaskNote: "需要 MetaMask（或其他注入式 EVM 钱包）并连接到 BNB 智能链。",
  },
  common: {
    loading: "加载中...",
    error: "出现了错误。",
    retry: "重试",
    back: "返回",
    save: "保存",
    cancel: "取消",
    close: "关闭",
    copy: "复制",
    copied: "已复制！",
    online: "在线",
    offline: "离线",
    active: "活跃",
    inactive: "非活跃",
    all: "全部",
    yes: "是",
    no: "否",
  },
};

// ─── Dictionaries map ──────────────────────────────────────────────────────

const DICTS: Record<Locale, Dict> = { en, zh };

// ─── Context ───────────────────────────────────────────────────────────────

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
};

const I18nContext = createContext<I18nCtx>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

const STORAGE_KEY = "talos-locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, _setLocale] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && stored in DICTS) _setLocale(stored);
    } catch {}
  }, []);

  const setLocale = useCallback((l: Locale) => {
    _setLocale(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: DICTS[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useI18n() {
  return useContext(I18nContext);
}

/** Shorthand: returns the translation dictionary directly. */
export function useTranslation() {
  return useContext(I18nContext).t;
}
