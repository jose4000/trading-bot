import { TFrequencyResult } from '../types';

export type TMarketRecommendation = {
    symbol: string;
    score: number; // 0-100, higher = stronger signal
    reason: string;
    suggested_trade: string;
};

const EXPECTED_PCT = 10;

/**
 * Scores a market's current opportunity based on frequency deviation.
 * Placeholder for now — once StreakScanner, MissingDigitScanner, and
 * PatternScanner exist, their outputs get weighted in here too.
 */
export function scoreMarket(symbol: string, frequency: TFrequencyResult, tick_count: number): TMarketRecommendation {
    // Not enough data yet — no reliable signal
    if (tick_count < 50) {
        return {
            symbol,
            score: 0,
            reason: 'Collecting data...',
            suggested_trade: '—',
        };
    }

    const highest_pct = frequency.percentages[frequency.highest];
    const lowest_pct = frequency.percentages[frequency.lowest];

    const hot_deviation = highest_pct - EXPECTED_PCT;
    const cold_deviation = EXPECTED_PCT - lowest_pct;

    // Whichever deviation is stronger drives the recommendation
    if (hot_deviation >= cold_deviation) {
        const score = Math.min(hot_deviation * 8, 100);
        return {
            symbol,
            score,
            reason: `Digit ${frequency.highest} is running hot at ${highest_pct.toFixed(1)}%`,
            suggested_trade: `Matches ${frequency.highest} / Over ${frequency.highest - 1 >= 0 ? frequency.highest - 1 : 0}`,
        };
    } else {
        const score = Math.min(cold_deviation * 8, 100);
        return {
            symbol,
            score,
            reason: `Digit ${frequency.lowest} is due — only ${lowest_pct.toFixed(1)}%`,
            suggested_trade: `Differs ${frequency.lowest}`,
        };
    }
}

export function rankMarkets(
    analyses: { symbol: string; frequency: TFrequencyResult; tick_count: number }[]
): TMarketRecommendation[] {
    return analyses
        .map(a => scoreMarket(a.symbol, a.frequency, a.tick_count))
        .sort((a, b) => b.score - a.score);
}