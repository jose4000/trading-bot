import { TFrequencyResult } from '../types';

export class FrequencyScanner {
    analyze(digits: number[]): TFrequencyResult {
        const counts = new Array(10).fill(0);
        digits.forEach(d => counts[d]++);

        const total = digits.length || 1;
        const percentages = counts.map(c => (c / total) * 100);

        const indexed = percentages.map((pct, digit) => ({ digit, pct }));
        const sorted = [...indexed].sort((a, b) => b.pct - a.pct);

        return {
            percentages,
            highest: sorted[0]?.digit ?? 0,
            second_highest: sorted[1]?.digit ?? 0,
            lowest: sorted[9]?.digit ?? 0,
            second_lowest: sorted[8]?.digit ?? 0,
        };
    }
}