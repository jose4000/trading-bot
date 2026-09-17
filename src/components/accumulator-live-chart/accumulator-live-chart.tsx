import { observer } from 'mobx-react-lite';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useSmartChartAdaptor } from '@/hooks/useSmartChartAdaptor';
import { useStore } from '@/hooks/useStore';
import { SmartChart, TGranularity } from '@deriv-com/smartcharts-champion';
import { useDevice } from '@deriv-com/ui';
import ChunkLoader from '@/components/loader/chunk-loader';
import '@deriv-com/smartcharts-champion/dist/smartcharts.css';

type TBarrier = {
    shade: 'NONE_SINGLE' | 'ABOVE' | 'BELOW' | 'BETWEEN';
    color: string;
    high: string;
    low: string;
};

type TProps = {
    high_barrier?: number;
    low_barrier?: number;
};

const AccumulatorLiveChart = observer(({ high_barrier, low_barrier }: TProps) => {
    const { common, ui, chart_store } = useStore();
    const { symbol, granularity, getMarketsOrder, updateSymbol } = chart_store;
    const { chartData, getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartAdaptor();
    const { isDesktop, isMobile } = useDevice();

    const barriers: TBarrier[] =
        high_barrier !== undefined && low_barrier !== undefined
            ? [
                  {
                      shade: 'BETWEEN',
                      color: '#1e88e5',
                      high: String(high_barrier),
                      low: String(low_barrier),
                  },
              ]
            : [];

    const settings = {
        assetInformation: false,
        countdown: true,
        isHighestLowestMarkerEnabled: false,
        language: common.current_language.toLowerCase(),
        position: 'bottom',
        theme: ui.is_dark_mode_on ? 'dark' : 'light',
    };

    if (!symbol || chartData.activeSymbols.length === 0) {
        return <ChunkLoader message='' />;
    }

    return (
        <div className='accumulator-live-chart'>
            <div className='accumulator-live-chart_inner'>
            <SmartChart
                id={`accu-chart-${symbol}`}
                key={`accu-chart-${symbol}`}
                barriers={barriers}
                showLastDigitStats={false}
                chartControlsWidgets={null}
                enabledChartFooter={false}
                enabledNavigationWidget={false}
                chartType='line'
                isMobile={isMobile}
                granularity={0 as TGranularity}
                getQuotes={getQuotes}
                subscribeQuotes={subscribeQuotes}
                unsubscribeQuotes={unsubscribeQuotes}
                chartData={{ activeSymbols: chartData.activeSymbols, tradingTimes: chartData.tradingTimes }}
                settings={settings}
                symbol={symbol}
                isConnectionOpened={!!chart_api?.api}
                getMarketsOrder={getMarketsOrder}
                isLive
                leftMargin={40}
            />
        </div>
        </div>
    );
});

export default AccumulatorLiveChart;