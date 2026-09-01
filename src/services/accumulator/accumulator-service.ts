import { action, makeObservable, observable } from 'mobx';
import { api_base } from '@/external/bot-skeleton';
import { doUntilDone } from '@/external/bot-skeleton/services/tradeEngine/utils/helpers';

export type TAccumulatorProposal = {
    id: string;
    ask_price: number;
    spot: number;
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
            symbol: params.symbol,
            growth_rate: params.growth_rate,
        };

        if (params.take_profit !== undefined) {
            request.limit_order = { take_profit: params.take_profit };
        }

        const response = await doUntilDone(() => api_base.api?.send(request), [], api_base);
        if (response?.error) throw new Error(response.error.message || 'Failed to get proposal');

        const proposal = response?.proposal;
        if (!proposal) throw new Error('No proposal returned');

        return { id: proposal.id, ask_price: proposal.ask_price, spot: proposal.spot };
    }

    async buy(proposal_id: string, price: number, symbol: string, growth_rate: number): Promise<number> {
        if (!api_base.api) throw new Error('No active API connection');

        const response = await doUntilDone(() => api_base.api?.send({ buy: proposal_id, price }), [], api_base);
        if (response?.error) throw new Error(response.error.message || 'Failed to place trade');

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
            const response = await doUntilDone(
                () => api_base.api?.send({ sell: this.open_position!.contract_id, price: 0 }),
                [],
                api_base
            );
            if (response?.error) throw new Error(response.error.message || 'Failed to sell contract');
        } finally {
            this.setLoading(false);
        }
    }

    clearPosition = () => {
        this.subscription?.unsubscribe();
        this.subscription = null;
        this.setOpenPosition(null);
    };
}

export const accumulator_service = new AccumulatorService();