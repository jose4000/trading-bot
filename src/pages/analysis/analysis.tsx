import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/digit-scanner-service';
import './analysis.scss';

const SYMBOL_DISPLAY_NAMES: Record<string, string> = {
    R_10: 'Volatility 10 Index',
    R_25: 'Volatility 25 Index',
    R_50: 'Volatility 50 Index',
    R_75: 'Volatility 75 Index',
    R_100: 'Volatility 100 Index',
    '1HZ10V': 'Volatility 10 (1s) Index',
    '1HZ25V': 'Volatility 25 (1s) Index',
    '1HZ50V': 'Volatility 50 (1s) Index',
    '1HZ75V': 'Volatility 75 (1s) Index',
    '1HZ100V': 'Volatility 100 (1s) Index',
};

const MIN_WINDOW = 50;
const MAX_WINDOW = 5000;
const DEFAULT_WINDOW = 1000;

type TDigitRank = 'most' | 'second_most' | 'second_least' | 'least' | 'default';

// Rank every digit 0-9 by frequency, tag the 4 extremes
function getDigitRanks(percentages: number[]): Record<number, TDigitRank> {
    const ranks: Record<number, TDigitRank> = {};
    for (let i = 0; i < 10; i++) ranks[i] = 'default';

    const sorted = percentages
        .map((pct, digit) => ({ digit, pct }))
        .sort((a, b) => b.pct - a.pct);

    if (sorted[0]) ranks[sorted[0].digit] = 'most';
    if (sorted[1]) ranks[sorted[1].digit] = 'second_most';
    if (sorted[8]) ranks[sorted[8].digit] = 'second_least';
    if (sorted[9]) ranks[sorted[9].digit] = 'least';

    return ranks;
}

function getEvenOddPct(percentages: number[]) {
    const even = [0, 2, 4, 6, 8].reduce((sum, d) => sum + percentages[d], 0);
    const odd = [1, 3, 5, 7, 9].reduce((sum, d) => sum + percentages[d], 0);
    return { even, odd };
}

const AnalysisComponent = observer(() => {
    const { scanner } = useStore();
    const { isDesktop } = useDevice();
    const [active_symbol, setActiveSymbol] = React.useState(VOLATILITY_SYMBOLS[4]); // default R_100
    const [window_size, setWindowSize] = React.useState(DEFAULT_WINDOW);

    React.useEffect(() => {
        scanner.startScanning();
        return () => scanner.stopScanning();
    }, [scanner]);

    const percentages = scanner.getPercentages(active_symbol);
    const stat = scanner.symbol_stats.find(s => s.symbol === active_symbol);
    const tick_count = stat?.digits.length ?? 0;
    const last_digit = stat?.last_digit ?? null;
    const ranks = getDigitRanks(percentages);
    const { even, odd } = getEvenOddPct(percentages);

    return (
        <div className='tab__analysis'>
            <div className='tab__analysis__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Analysis Tool')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Digit distribution analysis for Volatility Indices')}
                </Text>
            </div>

            <div className='analysis-controls'>
                <select
                    className='analysis-controls__symbol'
                    value={active_symbol}
                    onChange={e => setActiveSymbol(e.target.value)}
                >
                    {VOLATILITY_SYMBOLS.map(symbol => (
                        <option key={symbol} value={symbol}>
                            {SYMBOL_DISPLAY_NAMES[symbol] ?? symbol}
                        </option>
                    ))}
                </select>

                <div className='analysis-controls__window'>
                    <input
                        type='number'
                        min={MIN_WINDOW}
                        max={MAX_WINDOW}
                        value={window_size}
                        onChange={e => {
                            const val = Number(e.target.value);
                            if (val >= MIN_WINDOW && val <= MAX_WINDOW) setWindowSize(val);
                        }}
                    />
                    <Text size='xxxs' color='less-prominent'>
                        ({MIN_WINDOW}–{MAX_WINDOW})
                    </Text>
                </div>

                <Text size='xxxs' color='less-prominent'>
                    {tick_count}/{window_size} {localize('ticks captured')}
                </Text>
            </div>

            <Text as='h3' size='s' weight='bold' className='distribution-title'>
                {localize('Distribution')}
            </Text>

            <div className='digit-row-wrapper'>
                {/* single pointer, absolutely positioned, animates between digit slots */}
                {last_digit !== null && (
                    <div
                        className='digit-pointer'
                        style={{ left: `${(last_digit + 0.5) * (100 / 10)}%` }}
                    />
                )}

                <div className='digit-row'>
                    {percentages.map((pct, digit) => (
                        <div className='digit-cell' key={digit}>
                            <div className={classNames('digit-circle', `digit-circle--${ranks[digit]}`)}>
                                <span className='digit-circle__number'>{digit}</span>
                                <span className='digit-circle__pct'>{pct.toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className='digit-legend'>
                <span className='digit-legend__item'>
                    <span className='digit-legend__dot digit-legend__dot--most' /> {localize('Most frequent')}
                </span>
                <span className='digit-legend__item'>
                    <span className='digit-legend__dot digit-legend__dot--second_most' /> {localize('2nd most')}
                </span>
                <span className='digit-legend__item'>
                    <span className='digit-legend__dot digit-legend__dot--second_least' /> {localize('2nd least')}
                </span>
                <span className='digit-legend__item'>
                    <span className='digit-legend__dot digit-legend__dot--least' /> {localize('Least frequent')}
                </span>
            </div>

            <div className='even-odd-panels'>
                <div className={classNames('even-odd-panel', { 'even-odd-panel--active': even >= 50 })}>
                    <Text size='s' weight='bold'>
                        {localize('Even')}
                    </Text>
                    <Text size='xs' color='less-prominent'>
                        {even.toFixed(1)}%
                    </Text>
                </div>
                <div className={classNames('even-odd-panel', { 'even-odd-panel--active': odd >= 50 })}>
                    <Text size='s' weight='bold'>
                        {localize('Odd')}
                    </Text>
                    <Text size='xs' color='less-prominent'>
                        {odd.toFixed(1)}%
                    </Text>
                </div>
            </div>
        </div>
    );
});

export default AnalysisComponent;