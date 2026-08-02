import { action, makeObservable, observable } from 'mobx';
import { api_base } from '@/external/bot-skeleton';

export const VOLATILITY_SYMBOLS = [
    'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
    '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V',
];

const WINDOW_SIZE = 100;

export type TDigitStats = {
    symbol: string;
    digits: number[];
    counts: number[];
    last_digit: number | null;
    last_price: number | null;
};

class DigitScannerService {
    stats: Record<string, TDigitStats> = {};
    is_running = false;
    private message_subscription: { unsubscribe: () => void } | null = null;

    constructor() {
        makeObservable(this, {
            stats: observable,
            is_running: observable,
            updateTick: action,
            start: action,
            stop: action,
        });

        VOLATILITY_SYMBOLS.forEach(symbol => {
            this.stats[symbol] = { symbol, digits: [], counts: new Array(10).fill(0), last_digit: null, last_price: null };
        });
    }

    getPipSize(symbol: string): number {
        const pip_sizes = (api_base.pip_sizes ?? {}) as Record<string, number>;
        return pip_sizes[symbol] ?? 2;
    }

    extractLastDigit(quote: number, symbol: string): number {
        const fixed = quote.toFixed(this.getPipSize(symbol));
        return Number(fixed[fixed.length - 1]);
    }

    updateTick = (symbol: string, quote: number) => {
        const entry = this.stats[symbol];
        if (!entry) return;

        const digit = this.extractLastDigit(quote, symbol);
        entry.digits.push(digit);
        entry.counts[digit] += 1;

        if (entry.digits.length > WINDOW_SIZE) {
            const removed = entry.digits.shift();
            if (removed !== undefined) entry.counts[removed] -= 1;
        }

        entry.last_digit = digit;
        entry.last_price = quote;
    };

    start = () => {
        if (this.is_running || !api_base.api) return;
        this.is_running = true;

        this.message_subscription = api_base.api.onMessage().subscribe(({ data }: any) => {
            if (data?.msg_type === 'tick' && VOLATILITY_SYMBOLS.includes(data?.tick?.symbol)) {
                this.updateTick(data.tick.symbol, Number(data.tick.quote));
            }
        });

        VOLATILITY_SYMBOLS.forEach(symbol => {
            api_base.api?.send({ ticks: symbol, subscribe: 1 });
        });
    };

    stop = () => {
        this.is_running = false;
        this.message_subscription?.unsubscribe();
        this.message_subscription = null;
        api_base.api?.send({ forget_all: 'ticks' });
    };

    getDigitPercentages = (symbol: string): number[] => {
        const entry = this.stats[symbol];
        if (!entry || entry.digits.length === 0) return new Array(10).fill(0);
        return entry.counts.map(c => (c / entry.digits.length) * 100);
    };
}

export const digit_scanner_service = new DigitScannerService();