import { TPatternOutcome, TPatternResult } from '../types';

const MIN_OCCURRENCES = 15; // minimum times a pattern must have appeared to trust it
const MIN_CONFIDENCE = 60; // % lean required to call it "significant"
const OVER_UNDER_BARRIER = 5;

function computeOutcomeCategories(outcomes: number[]): TPatternOutcome[] {
    const total = outcomes.length || 1;

    const even_count = outcomes.filter(d => d % 2 === 0).length;
    const odd_count = outcomes.length - even_count;
    const over_count = outcomes.filter(d => d > OVER_UNDER_BARRIER).length;
    const under_count = outcomes.filter(d => d < OVER_UNDER_BARRIER).length;

    // Most common single next-digit
    const digit_counts = new Array(10).fill(0);
    outcomes.forEach(d => digit_counts[d]++);
    const top_digit = digit_counts.indexOf(Math.max(...digit_counts));

    return [
        { category: 'even', label: 'Even', count: even_count, pct: (even_count / total) * 100 },
        { category: 'odd', label: 'Odd', count: odd_count, pct: (odd_count / total) * 100 },
        { category: 'over', label: `Over ${OVER_UNDER_BARRIER}`, count: over_count, pct: (over_count / total) * 100 },
        { category: 'under', label: `Under ${OVER_UNDER_BARRIER}`, count: under_count, pct: (under_count / total) * 100 },
        {
            category: 'digit',
            label: `Digit ${top_digit}`,
            count: digit_counts[top_digit],
            pct: (digit_counts[top_digit] / total) * 100,
        },
    ];
}

export class PatternScanner {
    analyze(digits: number[]): TPatternResult {
        if (digits.length < 4) {
            return { current_pattern: '', occurrences: 0, best_outcome: null, is_significant: false };
        }

        // Build a map of every 3-digit pattern seen so far -> what digit came right after each time
        const pattern_map: Record<string, number[]> = {};
        for (let i = 0; i <= digits.length - 4; i++) {
            const pattern = digits.slice(i, i + 3).join('-');
            const next = digits[i + 3];
            if (!pattern_map[pattern]) pattern_map[pattern] = [];
            pattern_map[pattern].push(next);
        }

        const current_pattern = digits.slice(-3).join('-');
        const outcomes = pattern_map[current_pattern] ?? [];

        if (outcomes.length < MIN_OCCURRENCES) {
            return {
                current_pattern,
                occurrences: outcomes.length,
                best_outcome: null,
                is_significant: false,
            };
        }

        const categories = computeOutcomeCategories(outcomes);
        const best = categories.sort((a, b) => b.pct - a.pct)[0];

        return {
            current_pattern,
            occurrences: outcomes.length,
            best_outcome: best,
            is_significant: best.pct >= MIN_CONFIDENCE,
        };
    }
}