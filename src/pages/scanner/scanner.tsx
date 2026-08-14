import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { rankMarkets } from '@/services/scanner/scanners/RecommendationEngine';
import './scanner.scss';

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

const SYMBOL_SHORT: Record<string, string> = {
    R_10: 'V10',
    R_25: 'V25',
    R_50: 'V50',
    R_75: 'V75',
    R_100: 'V100',
    '1HZ10V': 'V10 (1s)',
    '1HZ25V': 'V25 (1s)',
    '1HZ50V': 'V50 (1s)',
    '1HZ75V': 'V75 (1s)',
    '1HZ100V': 'V100 (1s)',
};

function getScoreTier(score: number): 'strong' | 'moderate' | 'weak' {
    if (score >= 60) return 'strong';
    if (score >= 30) return 'moderate';
    return 'weak';
}

const ScannerComponent = observer(() => {
    const { scanner } = useStore();
    const { isDesktop } = useDevice();

    React.useEffect(() => {
        scanner.startScanning();
        return () => scanner.stopScanning();
    }, [scanner]);

    const rankings = rankMarkets(scanner.symbol_stats);
    const top_pick = rankings[0];
    const has_signal = top_pick && top_pick.score > 0;

    return (
        <div className='tab__scanner'>
            <div className='tab__scanner__header'>
                <div className='tab__scanner__title-row'>
                    <div className='radar-icon'>
                            <svg viewBox='0 0 40 40'>
                                <circle cx='20' cy='20' r='18' className='radar-icon__ring radar-icon__ring--1' />
                                <circle cx='20' cy='20' r='18' className='radar-icon__ring radar-icon__ring--2' />
                                <circle cx='20' cy='20' r='18' className='radar-icon__ring radar-icon__ring--3' />
                                <line x1='20' y1='20' x2='20' y2='4' className='radar-icon__sweep' />
                                <circle cx='20' cy='20' r='2.5' className='radar-icon__dot' />
                            </svg>
                     </div>
                    <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                        {localize('Market Scanner')}
                    </Text>
                    <span className='live-indicator'>
                        <span className='live-indicator__dot' />
                        {localize('LIVE')}
                    </span>
                </div>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Scanning Volatility Indices for trading opportunities')}
                </Text>
            </div>

            {has_signal ? (
                <div className={classNames('top-pick', `top-pick--${getScoreTier(top_pick.score)}`)}>
                    <div className='top-pick__glow' />
                    <div className='top-pick__content'>
                        <span className='top-pick__badge'>⚡ {localize('TOP OPPORTUNITY')}</span>
                        <Text as='h3' size='sm' weight='bold' className='top-pick__symbol'>
                            {SYMBOL_DISPLAY_NAMES[top_pick.symbol] ?? top_pick.symbol}
                        </Text>
                        <Text size='xs' className='top-pick__reason'>
                            {top_pick.reason}
                        </Text>
                        <div className='top-pick__footer'>
                            <span className='top-pick__trade'>{top_pick.suggested_trade}</span>
                            <div className='top-pick__confidence'>
                                <svg viewBox='0 0 36 36' className='top-pick__ring'>
                                    <circle cx='18' cy='18' r='15.5' className='top-pick__ring-track' />
                                    <circle
                                        cx='18'
                                        cy='18'
                                        r='15.5'
                                        className='top-pick__ring-fill'
                                        strokeDasharray={2 * Math.PI * 15.5}
                                        strokeDashoffset={2 * Math.PI * 15.5 * (1 - top_pick.score / 100)}
                                        transform='rotate(-90 18 18)'
                                    />
                                </svg>
                                <span className='top-pick__confidence-label'>{Math.round(top_pick.score)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='top-pick top-pick--empty'>
                    <Text size='xs' color='less-prominent'>
                        {localize('Gathering tick data... signals will appear shortly')}
                    </Text>
                </div>
            )}

            <div className='rankings-header'>
                <Text as='h3' size='s' weight='bold'>
                    {localize('All Markets')}
                </Text>
                <Text size='xxxs' color='less-prominent'>
                    {rankings.length} {localize('markets')}
                </Text>
            </div>

            <div className='rankings-list'>
                {rankings.map((rec, index) => {
                    const tier = getScoreTier(rec.score);
                    return (
                        <div className={classNames('ranking-card', `ranking-card--${tier}`)} key={rec.symbol} style={{ animationDelay: `${index * 60}ms` }}>
                            <div className='ranking-card__rank'>{index + 1}</div>

                            <div className='ranking-card__body'>
                                <div className='ranking-card__top-row'>
                                    <Text size='xs' weight='bold'>
                                        {isDesktop
                                            ? SYMBOL_DISPLAY_NAMES[rec.symbol] ?? rec.symbol
                                            : SYMBOL_SHORT[rec.symbol] ?? rec.symbol}
                                    </Text>
                                    <span className={classNames('score-pill', `score-pill--${tier}`)}>
                                        {Math.round(rec.score)}%
                                    </span>
                                </div>
                                <Text size='xxxs' color='less-prominent' className='ranking-card__reason'>
                                    {rec.reason}
                                </Text>
                                <div className='ranking-card__bar-track'>
                                    <div
                                        className={classNames('ranking-card__bar-fill', `ranking-card__bar-fill--${tier}`)}
                                        style={{ width: `${rec.score}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default ScannerComponent;