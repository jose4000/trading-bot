import { api_base } from '@/external/bot-skeleton';

export type TMarketOption = {
    symbol: string;
    display_name: string;
    market_display_name: string;
};

class MarketListService {
    getAllMarkets(): TMarketOption[] {
        const symbols = api_base.active_symbols ?? [];
        return symbols
            .filter((s: any) => s.exchange_is_open !== false) // only currently tradable
            .map((s: any) => ({
                symbol: s.symbol,
                display_name: s.display_name ?? s.symbol,
                market_display_name: s.market_display_name ?? s.market,
            }))
            .sort((a: TMarketOption, b: TMarketOption) =>
                a.market_display_name.localeCompare(b.market_display_name)
            );
    }

    getGroupedMarkets(): Record<string, TMarketOption[]> {
        const all = this.getAllMarkets();
        return all.reduce((groups: Record<string, TMarketOption[]>, m) => {
            if (!groups[m.market_display_name]) groups[m.market_display_name] = [];
            groups[m.market_display_name].push(m);
            return groups;
        }, {});
    }
}

export const market_list_service = new MarketListService();