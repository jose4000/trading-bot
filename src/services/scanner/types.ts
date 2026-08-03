export const VOLATILITY_SYMBOLS = [
    'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
    '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V',
] as const;

export type TVolatilitySymbol = (typeof VOLATILITY_SYMBOLS)[number];

export type TTick = {
    symbol: string;
    quote: number;
    digit: number;
    epoch: number;
};

export type TFrequencyResult = {
    percentages: number[]; // index 0-9
    highest: number; // digit
    second_highest: number;
    lowest: number;
    second_lowest: number;
};

export type TStreakResult = {
    current_digit: number | null;
    digit_streak: number; // consecutive same-digit count
    current_odd_streak: number;
    current_even_streak: number;
    current_over_streak: number; // digits 5-9
    current_under_streak: number; // digits 0-4
};

export type TMissingDigitEntry = {
    digit: number;
    missing_for: number; // ticks since last seen
};

export type TTransitionResult = {
    after_digit: number;
    probabilities: { digit: number; count: number; pct: number }[];
};

export type TPatternMatch = {
    pattern: string; // e.g. 'EEE', '777'
    occurrences: number;
    next_outcome: string; // e.g. 'Odd', 'Not 7'
    next_count: number;
    next_pct: number;
};

export type TPressureResult = {
    odd_pressure: number;
    even_pressure: number;
    high_pressure: number; // digits 5-9
    low_pressure: number; // digits 0-4
};

export type TSignal = {
    label: string;
    reason: string;
    confidence: number; // 0-100
};

export type TSymbolAnalysis = {
    symbol: string;
    tick_count: number;
    frequency: TFrequencyResult;
    streaks: TStreakResult;
    missing_digits: TMissingDigitEntry[];
    pressure: TPressureResult;
    signals: TSignal[];
};