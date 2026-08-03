import { TTick } from './types';

/**
 * Stores the last N ticks per symbol. Every scanner reads from this
 * single source of truth instead of maintaining its own history.
 */
export class TickCollector {
    private history: Record<string, TTick[]> = {};
    private window_size: number;

    constructor(window_size = 1000) {
        this.window_size = window_size;
    }

    setWindowSize(size: number) {
        this.window_size = size;
        // Trim existing histories down if the window shrank
        Object.keys(this.history).forEach(symbol => {
            const arr = this.history[symbol];
            if (arr.length > size) {
                this.history[symbol] = arr.slice(arr.length - size);
            }
        });
    }

    getWindowSize() {
        return this.window_size;
    }

    push(tick: TTick) {
        if (!this.history[tick.symbol]) this.history[tick.symbol] = [];
        const arr = this.history[tick.symbol];
        arr.push(tick);
        if (arr.length > this.window_size) arr.shift();
    }

    getTicks(symbol: string): TTick[] {
        return this.history[symbol] ?? [];
    }

    getDigits(symbol: string): number[] {
        return this.getTicks(symbol).map(t => t.digit);
    }

    getLastTick(symbol: string): TTick | null {
        const arr = this.history[symbol];
        return arr && arr.length > 0 ? arr[arr.length - 1] : null;
    }

    clear(symbol?: string) {
        if (symbol) {
            this.history[symbol] = [];
        } else {
            this.history = {};
        }
    }
}