import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import './pattern-watch.scss';

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

const PatternWatchComponent = observer(() => {
    const { scanner } = useStore();
    const { isDesktop } = useDevice();

    React.useEffect(() => {
        scanner.startScanning();
        return () => scanner.stopScanning();
    }, [scanner]);

    const stats = scanner.symbol_stats;
    const significant = stats.filter(s => s.patterns.is_significant);
    const watching = stats.filter(s => !s.patterns.is_significant && s.patterns.occurrences > 0);

    return (
        <div className='tab__pattern-watch'>
            <div className='tab__pattern-watch__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Pattern Watch')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Waiting for 3-digit sequences that historically predict a strong next move')}
                </Text>
            </div>

            <Text as='h3' size='s' weight='bold' className='section-title'>
                {localize('Active Signals')} ({significant.length})
            </Text>

            {significant.length === 0 ? (
                <div className='empty-state'>
                    <Text size='xs' color='less-prominent'>
                        {localize('No strong pattern signals right now — waiting for a known sequence to repeat')}
                    </Text>
                </div>
            ) : (
                <div className='pattern-grid'>
                    {significant.map(stat => (
                        <div className='pattern-card pattern-card--active' key={stat.symbol}>
                            <Text size='xs' weight='bold' className='pattern-card__symbol'>
                                {SYMBOL_DISPLAY_NAMES[stat.symbol] ?? stat.symbol}
                            </Text>
                            <div className='pattern-card__sequence'>{stat.patterns.current_pattern}</div>
                            <Text size='xxxs' color='less-prominent'>
                                {localize('Seen')} {stat.patterns.occurrences} {localize('times before')}
                            </Text>
                            <div className='pattern-card__signal'>
                                <span className='pattern-card__trade'>{stat.patterns.best_outcome?.label}</span>
                                <span className='pattern-card__confidence'>
                                    {stat.patterns.best_outcome?.pct.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Text as='h3' size='s' weight='bold' className='section-title'>
                {localize('Currently Forming')}
            </Text>

            <div className='pattern-grid'>
                {watching.map(stat => (
                    <div className='pattern-card' key={stat.symbol}>
                        <Text size='xs' weight='bold' className='pattern-card__symbol'>
                            {SYMBOL_DISPLAY_NAMES[stat.symbol] ?? stat.symbol}
                        </Text>
                        <div className='pattern-card__sequence pattern-card__sequence--muted'>
                            {stat.patterns.current_pattern || '—'}
                        </div>
                        <Text size='xxxs' color='less-prominent'>
                            {localize('Seen')} {stat.patterns.occurrences} {localize('times')} —{' '}
                            {localize('not enough data yet')}
                        </Text>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default PatternWatchComponent;