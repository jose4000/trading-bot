import { api_base } from '@/external/bot-skeleton';
import { doUntilDone } from '@/external/bot-skeleton/services/tradeEngine/utils/helpers';

export type TCopyStartParams = {
    trader_token: string;
    assets?: string[];
    trade_types?: string[];
    max_trade_stake?: number;
    min_trade_stake?: number;
};

export type TTraderStats = {
    active_since?: number;
    avg_duration?: number;
    avg_profit?: number;
    copiers?: number;
    monthly_profitable_trades?: number;
    performance_probability?: number;
    total_trades?: number;
    trades_breakdown?: Record<string, number>;
    yearly_profitable_trades?: number;
};

class CopyTradingService {
    async startCopying(params: TCopyStartParams): Promise<boolean> {
        if (!api_base.api) throw new Error('No active API connection');

        const request: Record<string, unknown> = {
            copy_start: params.trader_token,
        };

        if (params.assets?.length) request.assets = params.assets;
        if (params.trade_types?.length) request.trade_types = params.trade_types;
        if (params.max_trade_stake !== undefined) request.max_trade_stake = params.max_trade_stake;
        if (params.min_trade_stake !== undefined) request.min_trade_stake = params.min_trade_stake;

        const response = await doUntilDone(() => api_base.api?.send(request), [], api_base);

        if (response?.error) {
            throw new Error(response.error.message || 'Failed to start copying');
        }
        return true;
    }

    async stopCopying(trader_token: string): Promise<boolean> {
        if (!api_base.api) throw new Error('No active API connection');

        const response = await doUntilDone(
            () => api_base.api?.send({ copy_stop: trader_token }),
            [],
            api_base
        );

        if (response?.error) {
            throw new Error(response.error.message || 'Failed to stop copying');
        }
        return true;
    }

    async getCopyTradingList(): Promise<any> {
        if (!api_base.api) throw new Error('No active API connection');

        const response = await doUntilDone(
            () => api_base.api?.send({ copytrading_list: 1 }),
            [],
            api_base
        );

        if (response?.error) {
            throw new Error(response.error.message || 'Failed to fetch copy trading list');
        }
        return response?.copytrading_list;
    }

    async getTraderStatistics(trader_loginid: string): Promise<TTraderStats> {
        if (!api_base.api) throw new Error('No active API connection');

        const response = await doUntilDone(
            () => api_base.api?.send({ copytrading_statistics: 1, trader_id: trader_loginid }),
            [],
            api_base
        );

        if (response?.error) {
            throw new Error(response.error.message || 'Failed to fetch trader statistics');
        }
        return response?.copytrading_statistics ?? {};
    }

    async setAllowCopiers(allow: boolean): Promise<boolean> {
        if (!api_base.api) throw new Error('No active API connection');

        const response = await doUntilDone(
            () => api_base.api?.send({ set_settings: 1, allow_copiers: allow ? 1 : 0 }),
            [],
            api_base
        );

        if (response?.error) {
            throw new Error(response.error.message || 'Failed to update copier settings');
        }
        return true;
    }
}

export const copy_trading_service = new CopyTradingService();