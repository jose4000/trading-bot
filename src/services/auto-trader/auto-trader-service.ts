import { action, makeObservable, observable } from 'mobx';
import { scanner_engine } from '@/services/scanner/ScannerEngine';
import { manual_trade_service, TDigitContractType } from '@/services/manual-trade/manual-trade-service';
import { api_base } from '@/external/bot-skeleton';

export type TAutoTradeCategory = 'even_odd' | 'over_under' | 'matches_differs';

export type TAutoTradeConfig = {
    symbols: string[];
    category: TAutoTradeCategory;
    confidence_threshold: number; // % — minimum bias needed to trigger a trade
    stake: number;
    duration: number;
    currency: string;
    max_runs: number;
    cooldown_ms: number;
};

export type TAutoTradeLogEntry = {
    id: string;
    timestamp: number;
    symbol: string;
    contract_type: TDigitContractType;
    barrier?: string;
    status: 'success' | 'failed';
    contract_id?: number;
    error?: string;
    outcome?: 'won' | 'lost' | 'pending'; // only set for successfully placed trades
    profit?: number;
};

type TDecision = { symbol: string; contract_type: TDigitContractType; barrier?: string; confidence: number } | null;

const OVER_UNDER_BARRIER = 5;
const POLL_INTERVAL_MS = 2000;
const MAX_ALLOWED_RUNS = 50; // hard ceiling regardless of what's configured

class AutoTraderService {
    is_running = false;
    runs_completed = 0;
    max_runs = 0;
    log: TAutoTradeLogEntry[] = [];

    private config: TAutoTradeConfig | null = null;
    private loop_timeout: ReturnType<typeof setTimeout> | null = null;
    private is_placing_trade = false;

    constructor() {
        makeObservable(this, {
            is_running: observable,
            runs_completed: observable,
            max_runs: observable,
            log: observable,
            start: action,
            stop: action,
            addLogEntry: action,
        });
    }

    private decide(symbols: string[], category: TAutoTradeCategory, threshold: number): TDecision {
        for (const symbol of symbols) {
            const analysis = scanner_engine.getAnalysis(symbol);
            if (analysis.tick_count < 50) continue; // not enough data yet for this symbol

            const pct = analysis.frequency.percentages;

            if (category === 'even_odd') {
                const even_pct = [0, 2, 4, 6, 8].reduce((s, d) => s + pct[d], 0);
                const odd_pct = 100 - even_pct;
                if (even_pct >= threshold) return { symbol, contract_type: 'DIGITEVEN', confidence: even_pct };
                if (odd_pct >= threshold) return { symbol, contract_type: 'DIGITODD', confidence: odd_pct };
            }

            if (category === 'over_under') {
                let over = 0;
                let under = 0;
                pct.forEach((p, d) => {
                    if (d > OVER_UNDER_BARRIER) over += p;
                    else if (d < OVER_UNDER_BARRIER) under += p;
                });
                if (over >= threshold)
                    return {
                        symbol,
                        contract_type: 'DIGITOVER',
                        barrier: String(OVER_UNDER_BARRIER),
                        confidence: over,
                    };
                if (under >= threshold)
                    return {
                        symbol,
                        contract_type: 'DIGITUNDER',
                        barrier: String(OVER_UNDER_BARRIER),
                        confidence: under,
                    };
            }

            if (category === 'matches_differs') {
                const highest = analysis.frequency.highest;
                const lowest = analysis.frequency.lowest;
                if (pct[highest] >= threshold)
                    return {
                        symbol,
                        contract_type: 'DIGITMATCH',
                        barrier: String(highest),
                        confidence: pct[highest],
                    };
                // Differs naturally sits near 90%, so its threshold check is inverted —
                // only trigger when the target digit is unusually rare (well below expected 10%).
                if (100 - pct[lowest] >= threshold)
                    return {
                        symbol,
                        contract_type: 'DIGITDIFF',
                        barrier: String(lowest),
                        confidence: 100 - pct[lowest],
                    };
            }
        }
        return null;
    }

    addLogEntry = (entry: TAutoTradeLogEntry) => {
        this.log = [entry, ...this.log].slice(0, 50);
    };

    private subscribeToOutcome(contract_id: number, log_id: string) {
    if (!api_base.api) return;

    const subscription = api_base.api.onMessage().subscribe(({ data }: any) => {
        if (
            data?.msg_type === 'proposal_open_contract' &&
            data?.proposal_open_contract?.contract_id === contract_id
        ) {
            const contract = data.proposal_open_contract;

            if (contract.is_sold) {
                const profit = Number(contract.profit ?? 0);
                this.log = this.log.map(entry =>
                    entry.id === log_id
                        ? { ...entry, outcome: profit > 0 ? 'won' : 'lost', profit }
                        : entry
                );
                subscription.unsubscribe();
            }
        }
    });

    api_base.api.send({ proposal_open_contract: 1, contract_id, subscribe: 1 });
}

    private async loop() {
        if (!this.is_running || !this.config) return;

        if (this.runs_completed >= this.max_runs) {
            this.stop();
            return;
        }

        if (!this.is_placing_trade) {
            const decision = this.decide(this.config.symbols, this.config.category, this.config.confidence_threshold);

            if (decision) {
                this.is_placing_trade = true;
                try {
                    const proposal = await manual_trade_service.getProposal({
                        amount: this.config.stake,
                        currency: this.config.currency,
                        contract_type: decision.contract_type,
                        symbol: decision.symbol,
                        duration: this.config.duration,
                        duration_unit: 't',
                        barrier: decision.barrier,
                    });
                    const buy = await manual_trade_service.buyContract(proposal.id, proposal.ask_price);

                    this.runs_completed += 1;
                    const log_id = `auto-${Date.now()}`;
                    this.addLogEntry({
                        id: log_id,
                        timestamp: Date.now(),
                        symbol: decision.symbol,
                        contract_type: decision.contract_type,
                        barrier: decision.barrier,
                        status: 'success',
                        contract_id: buy.contract_id,
                        outcome: 'pending'
                    });

                    this.subscribeToOutcome(buy.contract_id, log_id);
                    
                } catch (err: any) {
                    this.runs_completed += 1;
                    this.addLogEntry({
                        id: `auto-${Date.now()}`,
                        timestamp: Date.now(),
                        symbol: decision.symbol,
                        contract_type: decision.contract_type,
                        barrier: decision.barrier,
                        status: 'failed',
                        error: err.message || 'Trade failed',
                    });
                } finally {
                    this.is_placing_trade = false;
                }
            }
        }

        if (this.is_running) {
            const delay = this.is_placing_trade ? POLL_INTERVAL_MS : this.config.cooldown_ms;
            this.loop_timeout = setTimeout(() => this.loop(), delay);
        }
    }

    start = (config: TAutoTradeConfig) => {
        if (this.is_running) return;

        this.config = {
            ...config,
            max_runs: Math.min(config.max_runs, MAX_ALLOWED_RUNS),
        };
        this.max_runs = this.config.max_runs;
        this.runs_completed = 0;
        this.is_running = true;

        scanner_engine.start(); // ensure tick data is flowing for selected symbols

        this.loop();
    };

    stop = () => {
        this.is_running = false;
        if (this.loop_timeout) clearTimeout(this.loop_timeout);
        this.loop_timeout = null;
        this.config = null;
    };
}

export const auto_trader_service = new AutoTraderService();