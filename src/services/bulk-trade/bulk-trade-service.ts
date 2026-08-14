import { manual_trade_service, TDigitContractType } from '@/services/manual-trade/manual-trade-service';

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
    async executeAll(
        rows: TBulkTradeRow[],
        currency: string,
        onProgress: (id: string, result: TBulkTradeResult) => void
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