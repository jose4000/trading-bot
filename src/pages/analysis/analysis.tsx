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

const SIGNAL_THRESHOLD = 12; // %
const RIVAL_GAP_THRESHOLD = 0.4; // %

type TSignal = { label: string; type: 'even' | 'odd' | 'over' | 'under' };

// Determine active strategy signals for a symbol based on digit percentages
function getSignals(percentages: number[]): TSignal[] {
    const signals: TSignal[] = [];

    // Even market: digit 4 >= 12%
    if (percentages[4] >= SIGNAL_THRESHOLD) {
        signals.push({ label: localize('Even'), type: 'even' });
    }

    // Odd market: digit 5 >= 12%
    if (percentages[5] >= SIGNAL_THRESHOLD) {
        signals.push({ label: localize('Odd'), type: 'odd' });
    }

    // Over 3: any even digit >= 12%, digit 6 is the primary trigger
    const even_digits = [0, 2, 4, 6, 8];
    if (even_digits.some(d => percentages[d] >= SIGNAL_THRESHOLD)) {
        signals.push({ label: localize('Over 3'), type: 'over' });
    }

    // Under 7: any odd digit >= 12%
    const odd_digits = [1, 3, 5, 7];
    if (odd_digits.some(d => percentages[d] >= SIGNAL_THRESHOLD)) {
        signals.push({ label: localize('Under 7'), type: 'under' });
    }

    return signals;
}

// Top digit and its rival (2nd highest), plus whether the gap between them is meaningful
function getTopAndRival(percentages: number[]) {
    const indexed = percentages.map((pct, digit) => ({ digit, pct }));
    indexed.sort((a, b) => b.pct - a.pct);
    const top = indexed[0];
    const rival = indexed[1];
    const gap = top.pct - rival.pct;
    return { top, rival, is_valid_gap: gap >= RIVAL_GAP_THRESHOLD };
}

const DigitCircle: React.FC<{ digit: number; pct: number; is_top: boolean; is_rival: boolean }> = ({
    digit,
    pct,
    is_top,
    is_rival,
}) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    // Scale percentage visually: 0-20% maps to 0-100% of the ring for readability
    const fill_ratio = Math.min(pct / 20, 1);
    const offset = circumference * (1 - fill_ratio);

    return (
        <div
            className={classNames('digit-circle', {
                'digit-circle--top': is_top,
                'digit-circle--rival': is_rival,
            })}
        >
            <svg viewBox='0 0 56 56' width='56' height='56'>
                <circle cx='28' cy='28' r={radius} className='digit-circle__track' />
                <circle
                    cx='28'
                    cy='28'
                    r={radius}
                    className='digit-circle__fill'
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform='rotate(-90 28 28)'
                />
                <text x='28' y='32' textAnchor='middle' className='digit-circle__number'>
                    {digit}
                </text>
            </svg>
            <Text size='xxxs' color='less-prominent'>
                {pct.toFixed(1)}%
            </Text>
        </div>
    );
};

const AnalysisComponent = observer(() => {
    const { scanner } = useStore();
    const { isDesktop } = useDevice();

    React.useEffect(() => {
        scanner.startScanning();
        return () => scanner.stopScanning();
    }, [scanner]);

    return (
        <div className='tab__analysis'>
            <div className='tab__analysis__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('D-Circles Analysis')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize(
                        'Digit circle analysis for Over/Under and Even/Odd strategies — signals trigger at 12%+ concentration'
                    )}
                </Text>
            </div>

            <div className='analysis-grid'>
                {VOLATILITY_SYMBOLS.map(symbol => {
                    const percentages = scanner.getPercentages(symbol);
                    const stat = scanner.symbol_stats.find(s => s.symbol === symbol);
                    const tick_count = stat?.digits.length ?? 0;
                    const signals = getSignals(percentages);
                    const { top, rival, is_valid_gap } = getTopAndRival(percentages);

                    return (
                        <div className='analysis-card' key={symbol}>
                            <div className='analysis-card__header'>
                                <Text size='xs' weight='bold'>
                                    {SYMBOL_DISPLAY_NAMES[symbol] ?? symbol}
                                </Text>
                                <Text size='xxxs' color='less-prominent'>
                                    {tick_count}/100 {localize('ticks')}
                                </Text>
                            </div>

                            <div className='analysis-card__circles'>
                                {percentages.map((pct, digit) => (
                                    <DigitCircle
                                        key={digit}
                                        digit={digit}
                                        pct={pct}
                                        is_top={digit === top.digit}
                                        is_rival={digit === rival.digit}
                                    />
                                ))}
                            </div>

                            <div className='analysis-card__rival'>
                                <Text size='xxxs' color='less-prominent'>
                                    {localize('Top:')} <strong>{top.digit}</strong> ({top.pct.toFixed(1)}%) —{' '}
                                    {localize('Rival:')} <strong>{rival.digit}</strong> ({rival.pct.toFixed(1)}%)
                                    {is_valid_gap && ` · ${localize('valid gap')}`}
                                </Text>
                            </div>

                            <div className='analysis-card__signals'>
                                {signals.length === 0 && (
                                    <span className='signal-badge signal-badge--none'>{localize('No signal')}</span>
                                )}
                                {signals.map(signal => (
                                    <span
                                        key={signal.type}
                                        className={classNames('signal-badge', `signal-badge--${signal.type}`)}
                                    >
                                        {signal.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default AnalysisComponent;