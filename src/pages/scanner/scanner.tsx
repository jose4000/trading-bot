import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/digit-scanner-service';
import './scanner.scss';

const DIGIT_LABELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const EXPECTED_PCT = 10;

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

const ScannerComponent = observer(() => {
    const { scanner } = useStore();
    const { isDesktop } = useDevice();

    React.useEffect(() => {
        scanner.startScanning();
        return () => scanner.stopScanning();
    }, [scanner]);

    return (
        <div className='tab__scanner'>
            <div className='tab__scanner__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Digit Scanner')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Live last-digit distribution across Volatility Indices — window: last 100 ticks')}
                </Text>
            </div>

            <div className='scanner-grid'>
                {scanner.symbol_stats.map(stat => {
                    const percentages = scanner.getPercentages(stat.symbol);
                    const tick_count = stat.digits.length;

                    return (
                        <div className='scanner-card' key={stat.symbol}>
                            <div className='scanner-card__header'>
                                <Text size='xs' weight='bold'>
                                    {SYMBOL_DISPLAY_NAMES[stat.symbol] ?? stat.symbol}
                                </Text>
                                <Text size='xs'>
                                    {localize('Last:')} <strong>{stat.last_digit ?? '—'}</strong>
                                </Text>
                            </div>

                            <div className='scanner-card__digits'>
                                {DIGIT_LABELS.map(digit => {
                                    const pct = percentages[digit] ?? 0;
                                    const diff = pct - EXPECTED_PCT;
                                    const is_hot = diff >= 3;
                                    const is_cold = diff <= -3;

                                    return (
                                        <div
                                            className={classNames('scanner-digit', {
                                                'scanner-digit--hot': is_hot,
                                                'scanner-digit--cold': is_cold,
                                            })}
                                            key={digit}
                                        >
                                            <div className='scanner-digit__bar-track'>
                                                <div
                                                    className='scanner-digit__bar'
                                                    style={{ height: `${Math.min(pct * 3, 100)}%` }}
                                                />
                                            </div>
                                            <Text size='xxxs' weight='bold'>
                                                {digit}
                                            </Text>
                                            <Text size='xxxs' color='less-prominent'>
                                                {pct.toFixed(1)}%
                                            </Text>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className='scanner-card__footer'>
                                <Text size='xxxs' color='less-prominent'>
                                    {tick_count}/100 {localize('ticks')}
                                </Text>
                                {stat.last_price !== null && (
                                    <Text size='xxxs' color='less-prominent'>
                                        {localize('Price:')} {stat.last_price}
                                    </Text>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default ScannerComponent;