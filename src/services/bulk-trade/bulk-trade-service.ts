import { manual_trade_service, TDigitContractType } from '@/services/manual-trade/manual-trade-service';
import { api_base } from '@/external/bot-skeleton';

export type TBulkTradeRow = {
    id: string;
    symbol: string;
    contract_type: TDigitContractType;
    barrier?: string;
    stake: number;
    duration: number;
};

export type TBulkTradeResult = {
    id: string;
    status: 'pending' | 'success' | 'failed';
    contract_id?: number;
    buy_price?: number;
    payout?: number;
    error?: string;
};

class BulkTradeService {
    // Executes trades sequentially (not parallel) to avoid hitting Deriv's rate limits
    // and to keep behaviour predictable/debuggable.

    private subscribeToOutcome(contract_id: number, onContractUpdate?: (contract: any) => void) {
    if (!api_base.api || !onContractUpdate) return;

    const subscription = api_base.api.onMessage().subscribe(({ data }: any) => {
        if (
            data?.msg_type === 'proposal_open_contract' &&
            data?.proposal_open_contract?.contract_id === contract_id
        ) {
            const contract = data.proposal_open_contract;
            onContractUpdate(contract);

            if (contract.is_sold) {
                subscription.unsubscribe();
            }
        }
    });

    api_base.api.send({ proposal_open_contract: 1, contract_id, subscribe: 1 });
}
    async executeAll(
        rows: TBulkTradeRow[],
        currency: string,
        onProgress: (id: string, result: TBulkTradeResult) => void,
         onContractUpdate?: (contract: any) => void
    ): Promise<TBulkTradeResult[]> {
        const results: TBulkTradeResult[] = [];

        for (const row of rows) {
            onProgress(row.id, { id: row.id, status: 'pending' });

            try {
                const proposal = await manual_trade_service.getProposal({
                    amount: row.stake,
                    currency,
                    contract_type: row.contract_type,
                    symbol: row.symbol,
                    duration: row.duration,
                    duration_unit: 't',
                    barrier: row.barrier,
                });

                const buy = await manual_trade_service.buyContract(proposal.id, proposal.ask_price);

                this.subscribeToOutcome(buy.contract_id, onContractUpdate);

                const result: TBulkTradeResult = {
                    id: row.id,
                    status: 'success',
                    contract_id: buy.contract_id,
                    buy_price: buy.buy_price,
                    payout: buy.payout,
                };
                results.push(result);
                onProgress(row.id, result);
            } catch (err: any) {
                const result: TBulkTradeResult = {
                    id: row.id,
                    status: 'failed',
                    error: err.message || 'Trade failed',
                };
                results.push(result);
                onProgress(row.id, result);
            }
        }

        return results;
    }
}

export const bulk_trade_service = new BulkTradeService();