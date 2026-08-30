import { action, makeObservable, observable } from 'mobx';
import { manual_trade_service, TDigitContractType } from '@/services/manual-trade/manual-trade-service';
import { api_base } from '@/external/bot-skeleton';

export type TMartingaleConfig = {
    symbol: string;
    contract_type: TDigitContractType; // e.g. DIGITEVEN or DIGITODD
    base_stake: number;
    multiplier: number;
    duration: number;
    currency: string;
    take_profit: number;
    stop_loss: number;
    barrier?: string;
};

export type TMartingaleLogEntry = {
    id: string;
    timestamp: number;
    stake: number;
    status: 'pending' | 'won' | 'lost' | 'error';
    contract_id?: number;
    profit?: number;
    error?: string;
};

const MAX_STAKE_MULTIPLE = 100; // hard ceiling: stake can never exceed base_stake * 100, regardless of config

class MartingaleBotService {
    is_running = false;
    current_stake = 0;
    total_profit = 0;
    log: TMartingaleLogEntry[] = [];

    private config: TMartingaleConfig | null = null;
    private is_trade_in_flight = false;

    constructor() {
        makeObservable(this, {
            is_running: observable,
            current_stake: observable,
            total_profit: observable,
            log: observable,
            start: action,
            stop: action,
            addLogEntry: action,
            updateTotalProfit: action,
        });
    }

    addLogEntry = (entry: TMartingaleLogEntry) => {
        this.log = [entry, ...this.log].slice(0, 50);
    };

    updateTotalProfit = (delta: number) => {
        this.total_profit += delta;
    };

    private subscribeAndWait(contract_id: number): Promise<number> {
        return new Promise(resolve => {
            if (!api_base.api) {
                resolve(0);
                return;
            }
            const subscription = api_base.api.onMessage().subscribe(({ data }: any) => {
                if (data?.msg_type === 'proposal_open_contract' && data?.proposal_open_contract?.contract_id === contract_id) {
                    const contract = data.proposal_open_contract;
                    if (contract.is_sold) {
                        subscription.unsubscribe();
                        resolve(Number(contract.profit ?? 0));
                    }
                }
            });
            api_base.api.send({ proposal_open_contract: 1, contract_id, subscribe: 1 });
        });
    }

    private async placeTrade() {
        if (!this.config || this.is_trade_in_flight) return;
        this.is_trade_in_flight = true;

        const log_id = `mg-${Date.now()}`;
        this.addLogEntry({ id: log_id, timestamp: Date.now(), stake: this.current_stake, status: 'pending' });

        try {
            const proposal = await manual_trade_service.getProposal({
                amount: this.current_stake,
                currency: this.config.currency,
                contract_type: this.config.contract_type,
                symbol: this.config.symbol,
                duration: this.config.duration,
                duration_unit: 't',
                barrier: this.config.barrier,
            });
            const buy = await manual_trade_service.buyContract(proposal.id, proposal.ask_price);

            this.log = this.log.map(e => (e.id === log_id ? { ...e, contract_id: buy.contract_id } : e));

            const profit = await this.subscribeAndWait(buy.contract_id);
            this.updateTotalProfit(profit);

            const won = profit > 0;
            this.log = this.log.map(e => (e.id === log_id ? { ...e, status: won ? 'won' : 'lost', profit } : e));

            // Martingale progression: double on loss, reset on win. Hard-capped.
            if (!this.config) return; // stopped mid-flight
            if (won) {
                this.current_stake = this.config.base_stake;
            } else {
                const next_stake = this.current_stake * (this.config.multiplier);
                this.current_stake = Math.min(next_stake, this.config.base_stake * MAX_STAKE_MULTIPLE);
            }
        } catch (err: any) {
            this.log = this.log.map(e => (e.id === log_id ? { ...e, status: 'error', error: err.message } : e));
        } finally {
            this.is_trade_in_flight = false;
        }
    }

    private async loop() {
        if (!this.is_running || !this.config) return;

        if (this.total_profit >= this.config.take_profit) {
            this.stop();
            return;
        }
        if (this.total_profit <= -Math.abs(this.config.stop_loss)) {
            this.stop();
            return;
        }

        await this.placeTrade();

        if (this.is_running) {
            setTimeout(() => this.loop(), 1500);
        }
    }

    start = (config: TMartingaleConfig) => {
        if (this.is_running) return;
        this.config = config;
        this.current_stake = config.base_stake;
        this.total_profit = 0;
        this.is_running = true;
        this.loop();
    };

    stop = () => {
        this.is_running = false;
        this.config = null;
    };
}

export const martingale_bot_service = new MartingaleBotService();