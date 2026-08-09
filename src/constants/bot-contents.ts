type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    CHART: 2,
    TUTORIAL: 3,
    SCANNER: 4,
    ANALYSIS: 5,
    TRADING_BOTS: 6,
    PATTERN_WATCH: 7,
    MANUAL_TRADER: 8,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = ['id-dbot-dashboard', 'id-bot-builder', 'id-charts', 'id-tutorials', 'id-scanner', 'id-analysis', 'id-trading-bots', 'id-pattern-watch', 'id-manual-trader'];

export const DEBOUNCE_INTERVAL_TIME = 500;
