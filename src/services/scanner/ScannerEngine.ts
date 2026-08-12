import { action, makeObservable, observable } from 'mobx';
import { api_base } from '@/external/bot-skeleton';
import { TickCollector } from './TickCollector';
import { FrequencyScanner } from './scanners/FrequencyScanner';
import { TSymbolAnalysis, TTick, VOLATILITY_SYMBOLS } from './types';
import { PatternScanner } from './scanners/PatternScanner';

/**
 * Orchestrator: receives every incoming tick, feeds it to TickCollector,
 * and delegates analysis to each specialized scanner.
 * More scanners (Streak, Pattern, Transition, Pressure, Signal) plug in here later
 * without touching tick-subscription logic.
 */
class ScannerEngine {
    is_running = false;
    analysis: Record<string, TSymbolAnalysis> = {};

    private tick_collector: TickCollector;
    private pattern_scanner: PatternScanner;
    private frequency_scanner: FrequencyScanner;
    private message_subscription: { unsubscribe: () => void } | null = null;

    constructor() {
        makeObservable(this, {
            is_running: observable,
            analysis: observable,
            start: action,
            stop: action,
            setWindowSize: action,
            private_updateAnalysis: action,
        } as any);

        this.tick_collector = new TickCollector(1000);
        this.pattern_scanner = new PatternScanner();
        this.frequency_scanner = new FrequencyScanner();

        VOLATILITY_SYMBOLS.forEach(symbol => {
            this.analysis[symbol] = this.buildEmptyAnalysis(symbol);
        });
    }

    private buildEmptyAnalysis(symbol: string): TSymbolAnalysis {
        return {
            symbol,
            tick_count: 0,
            frequency: {
                percentages: new Array(10).fill(0),
                highest: 0,
                second_highest: 0,
                lowest: 0,
                second_lowest: 0,
            },
            patterns: {
                current_pattern: '',
                occurrences: 0,
                best_outcome: null,
                is_significant: false,
            },
            streaks: {
                current_digit: null,
                digit_streak: 0,
                current_odd_streak: 0,
                current_even_streak: 0,
                current_over_streak: 0,
                current_under_streak: 0,
            },
            missing_digits: [],
            pressure: { odd_pressure: 0, even_pressure: 0, high_pressure: 0, low_pressure: 0 },
            signals: [],
        };
    }

    getPipSize(symbol: string): number {
        const pip_sizes = (api_base.pip_sizes ?? {}) as Record<string, number>;
        return pip_sizes[symbol] ?? 2;
    }

    extractDigit(quote: number, symbol: string): number {
        const fixed = quote.toFixed(this.getPipSize(symbol));
        return Number(fixed[fixed.length - 1]);
    }

    setWindowSize = (size: number) => {
        this.tick_collector.setWindowSize(size);
        VOLATILITY_SYMBOLS.forEach(symbol => this.private_updateAnalysis(symbol));
    };

    getWindowSize = () => this.tick_collector.getWindowSize();

    private handleTick = (symbol: string, quote: number, epoch: number) => {
        const digit = this.extractDigit(quote, symbol);
        const tick: TTick = { symbol, quote, digit, epoch };
        this.tick_collector.push(tick);
        this.private_updateAnalysis(symbol);
    };

    // Runs every registered scanner against current tick history and updates `analysis`
    private_updateAnalysis = (symbol: string) => {
        const digits = this.tick_collector.getDigits(symbol);
        const last_tick = this.tick_collector.getLastTick(symbol);

        const frequency = this.frequency_scanner.analyze(digits);
        const patterns = this.pattern_scanner.analyze(digits);

        // Streak/Missing/Pressure/Pattern/Transition/Signal scanners plug in here
        // as they're built — for now, only frequency + tick_count + last digit are live.
        this.analysis[symbol] = {
            ...this.analysis[symbol],
            tick_count: digits.length,
            frequency,
            patterns,
            streaks: {
                ...this.analysis[symbol].streaks,
                current_digit: last_tick?.digit ?? null,
            },
        };
    };

    private async fetchHistoricalTicks(symbol: string): Promise<void> {
        if (!api_base.api) return;

        try {
            const response = await api_base.api.send({
                ticks_history: symbol,
                count: this.tick_collector.getWindowSize(),
                end: 'latest',
                style: 'ticks'
            });

            if (response?.error || !response?.history) return;

            const { prices, times } = response.history;
            if (!Array.isArray(prices) || !Array.isArray(times)) return;

            const ticks: TTick[] = prices.map((price: number, index: number) => {
                const quote = Number(price);
                return {
                    symbol,
                    quote,
                    digit: this.extractDigit(quote, symbol),
                    epoch: times[index],
                };
            });

            this.tick_collector.seed(symbol, ticks);
            this.private_updateAnalysis(symbol);
        } catch {
            // Silently skip - lice ticks will still populate data going forward
        }
    }

    start = () => {
        if (this.is_running || !api_base.api) return;
        this.is_running = true;

        this.message_subscription = api_base.api.onMessage().subscribe(({ data }: any) => {
            if (data?.msg_type === 'tick' && (VOLATILITY_SYMBOLS as readonly string[]).includes(data?.tick?.symbol)) {
                this.handleTick(data.tick.symbol, Number(data.tick.quote), data.tick.epoch);
            }
        });

        VOLATILITY_SYMBOLS.forEach(symbol => {
            this.fetchHistoricalTicks(symbol)
            api_base.api?.send({ ticks: symbol, subscribe: 1 });
        });
    };

    stop = () => {
        this.is_running = false;
        this.message_subscription?.unsubscribe();
        this.message_subscription = null;
        api_base.api?.send({ forget_all: 'ticks' });
    };

    getAnalysis = (symbol: string): TSymbolAnalysis => this.analysis[symbol] ?? this.buildEmptyAnalysis(symbol);


    getDigitHistory = (symbol: string, count = 20): number[] => {
        const digits = this.tick_collector.getDigits(symbol);
        return digits.slice(-count);
    }
}

export const scanner_engine = new ScannerEngine();