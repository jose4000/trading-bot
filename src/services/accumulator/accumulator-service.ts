import { action, makeObservable, observable } from 'mobx';
import { api_base } from '@/external/bot-skeleton';

export type TAccumulatorProposal = {
    id: string;
    ask_price: number;
    spot: number;
    high_barrier?: number;
    low_barrier?: number;
    maximum_payout?: number;
    maximum_ticks?: number;
    has_crossed_barrier?: boolean;
};

export type TOpenAccumulator = {
    contract_id: number;
    symbol: string;
    growth_rate: number;
    buy_price: number;
    current_spot: number | null;
    profit: number;
    is_sold: boolean;
};

class AccumulatorService {
    open_position: TOpenAccumulator | null = null;
    is_loading = false;

    private subscription: { unsubscribe: () => void } | null = null;
    private prev_barriers: { high: string; low: string } | null = null;

    constructor() {
        makeObservable(this, {
            open_position: observable,
            is_loading: observable,
            setOpenPosition: action,
            setLoading: action,
        });
    }

    setOpenPosition = (position: TOpenAccumulator | null) => {
        this.open_position = position;
    };

    setLoading = (loading: boolean) => {
        this.is_loading = loading;
    };

    resetBarrierTracking = () => {
        this.prev_barriers = null;
    };

    async getProposal(params: {
        amount: number;
        currency: string;
        symbol: string;
        growth_rate: number;
        take_profit?: number;
    }): Promise<TAccumulatorProposal> {
        if (!api_base.api) throw new Error('No active API connection');

        const request: Record<string, unknown> = {
            proposal: 1,
            amount: params.amount,
            basis: 'stake',
            contract_type: 'ACCU',
            currency: params.currency,
            underlying_symbol: params.symbol, // ← FIXED: was `symbol`
            growth_rate: params.growth_rate,
        };

        if (params.take_profit !== undefined) {
            request.limit_order = { take_profit: params.take_profit };
        }

        const response = await api_base.api?.send(request);
        if (response?.error) {
            throw new Error(`${response.error.code}: ${response.error.message}` || 'Failed to get proposal');
        }
        if (!response) {
            throw new Error('No response received from server');
        }

        const proposal = response?.proposal;
        if (!proposal) throw new Error('No proposal returned');

        const details = proposal.contract_details ?? {};
        const new_high = details.high_barrier ?? '';
        const new_low = details.low_barrier ?? '';

        // Delayed barrier display, matching Deriv's own reference implementation:
        // show the PREVIOUS tick's barriers, compare current spot against those.
        const displayed_high = this.prev_barriers?.high ?? new_high;
        const displayed_low = this.prev_barriers?.low ?? new_low;
        this.prev_barriers = { high: new_high, low: new_low };

        const spot = Number(proposal.spot);
        const high_num = parseFloat(displayed_high);
        const low_num = parseFloat(displayed_low);
        const has_crossed_barrier =
            !isNaN(spot) && !isNaN(high_num) && !isNaN(low_num) && (spot >= high_num || spot <= low_num);

        return {
            id: proposal.id,
            ask_price: proposal.ask_price,
            spot: proposal.spot,
            high_barrier: displayed_high ? Number(displayed_high) : undefined,
            low_barrier: displayed_low ? Number(displayed_low) : undefined,
            maximum_payout: details.maximum_payout !== undefined ? Number(details.maximum_payout) : undefined,
            maximum_ticks: details.maximum_ticks !== undefined ? Number(details.maximum_ticks) : undefined,
            has_crossed_barrier,
        };
    }

    async buy(proposal_id: string, price: number, symbol: string, growth_rate: number): Promise<number> {
        if (!api_base.api) throw new Error('No active API connection');

        const response = await api_base.api.send({ buy: proposal_id, price });
        if (response?.error) {
            throw new Error(`${response.error.code}: ${response.error.message}` || 'Failed to place trade');
        }

        const buy = response?.buy;
        if (!buy) throw new Error('No buy confirmation returned');

        this.setOpenPosition({
            contract_id: buy.contract_id,
            symbol,
            growth_rate,
            buy_price: buy.buy_price,
            current_spot: null,
            profit: 0,
            is_sold: false,
        });

        this.subscribeToContract(buy.contract_id);
        return buy.contract_id;
    }

    private subscribeToContract(contract_id: number) {
        if (!api_base.api) return;

        this.subscription?.unsubscribe();
        this.subscription = api_base.api.onMessage().subscribe(({ data }: any) => {
            if (data?.msg_type === 'proposal_open_contract' && data?.proposal_open_contract?.contract_id === contract_id) {
                const contract = data.proposal_open_contract;
                if (!this.open_position) return;

                this.setOpenPosition({
                    ...this.open_position,
                    current_spot: Number(contract.current_spot ?? this.open_position.current_spot),
                    profit: Number(contract.profit ?? 0),
                    is_sold: Boolean(contract.is_sold),
                });

                if (contract.is_sold) {
                    this.subscription?.unsubscribe();
                }
            }
        });

        api_base.api.send({ proposal_open_contract: 1, contract_id, subscribe: 1 });
    }

    async sell(): Promise<void> {
        if (!api_base.api || !this.open_position) return;
        this.setLoading(true);
        try {
            const response = await api_base.api.send({ sell: this.open_position.contract_id, price: 0 });
            if (response?.error) throw new Error(response.error.message || 'Failed to sell contract');
        } finally {
            this.setLoading(false);
        }
    }

    clearPosition = () => {
        this.subscription?.unsubscribe();
        this.subscription = null;
        this.resetBarrierTracking();
        this.setOpenPosition(null);
    };
}

export const accumulator_service = new AccumulatorService();