import { api_base } from '@/external/bot-skeleton';
import { doUntilDone } from '@/external/bot-skeleton/services/tradeEngine/utils/helpers';

export type TDigitContractType = 'DIGITEVEN' | 'DIGITODD' | 'DIGITOVER' | 'DIGITUNDER' | 'DIGITMATCH' | 'DIGITDIFF' | 'CALL' | 'PUT';

export type TProposalParams = {
    amount: number;
    currency: string;
    contract_type: TDigitContractType;
    symbol: string;
    duration: number;
    duration_unit: 't';
    barrier?: string;
};

export type TProposalResult = {
    id: string;
    ask_price: number;
    payout: number;
    spot: number;
    display_value: string;
};

export type TBuyResult = {
    contract_id: number;
    transaction_id: number;
    buy_price: number;
    payout: number;
    longcode: string;
};

class ManualTradeService {
    async getProposal(params: TProposalParams): Promise<TProposalResult> {
        if (!api_base.api) throw new Error('No active API connection');

        const request: Record<string, unknown> = {
            proposal: 1,
            amount: params.amount,
            basis: 'stake',
            contract_type: params.contract_type,
            currency: params.currency,
            duration: params.duration,
            duration_unit: params.duration_unit,
            underlying_symbol: params.symbol, // ← fixed field name
        };

        if (params.barrier !== undefined) {
            request.barrier = params.barrier;
        }

        const response = await doUntilDone(() => api_base.api?.send(request), [], api_base);

        if (response?.error) {
            throw new Error(response.error.message || 'Failed to get proposal');
        }

        const proposal = response?.proposal;
        if (!proposal) throw new Error('No proposal returned');

        return {
            id: proposal.id,
            ask_price: proposal.ask_price,
            payout: proposal.payout,
            spot: proposal.spot,
            display_value: proposal.display_value,
        };
    }

    async buyContract(proposal_id: string, price: number): Promise<TBuyResult> {
        if (!api_base.api) throw new Error('No active API connection');

        const response = await doUntilDone(
            () => api_base.api?.send({ buy: proposal_id, price }),
            [],
            api_base
        );

        if (response?.error) {
            throw new Error(response.error.message || 'Failed to place trade');
        }

        const buy = response?.buy;
        if (!buy) throw new Error('No buy confirmation returned');

        return {
            contract_id: buy.contract_id,
            transaction_id: buy.transaction_id,
            buy_price: buy.buy_price,
            payout: buy.payout,
            longcode: buy.longcode,
        };
    }
}

export const manual_trade_service = new ManualTradeService();