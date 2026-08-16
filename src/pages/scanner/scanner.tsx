import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { auto_trader_service, TAutoTradeCategory } from '@/services/auto-trader/auto-trader-service';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/types';
import { rankMarkets } from '@/services/scanner/scanners/RecommendationEngine';
import './scanner.scss';
import Button from '@/components/shared_ui/button';

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
    const { client } = useStore();

    React.useEffect(() => {
        scanner.startScanning();
        return () => scanner.stopScanning();
    }, [scanner]);

    const [selected_symbols, setSelectedSymbols] = React.useState<string[]>([]);
const [auto_category, setAutoCategory] = React.useState<TAutoTradeCategory>('even_odd');
const [confidence_threshold, setConfidenceThreshold] = React.useState(60);
const [auto_stake, setAutoStake] = React.useState(10);
const [auto_duration, setAutoDuration] = React.useState(5);
const [max_runs, setMaxRuns] = React.useState(10);
const [is_confirm_auto_open, setIsConfirmAutoOpen] = React.useState(false);

const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev => (prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]));
};

const handleStartAutoClick = () => {
    if (selected_symbols.length === 0) return;
    setIsConfirmAutoOpen(true);
};

const handleConfirmStartAuto = () => {
    auto_trader_service.start({
        symbols: selected_symbols,
        category: auto_category,
        confidence_threshold,
        stake: auto_stake,
        duration: auto_duration,
        currency: client?.currency ?? 'USD',
        max_runs,
        cooldown_ms: 5000,
    });
    setIsConfirmAutoOpen(false);
};


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
            
            <div className='auto-trader-panel'>
    <div className='auto-trader-panel__header'>
        <Text as='h3' size='s' weight='bold'>
            🤖 {localize('Auto Trader')}
        </Text>
        {auto_trader_service.is_running && (
            <span className='auto-trader-panel__running-badge'>
                {localize('Running')} — {auto_trader_service.runs_completed}/{auto_trader_service.max_runs}
            </span>
        )}
    </div>

    {!auto_trader_service.is_running ? (
        <>
            <div className='auto-trader-panel__row'>
                <label>{localize('Watch these markets')}</label>
                <div className='symbol-checkboxes'>
                    {VOLATILITY_SYMBOLS.map(symbol => (
                        <label key={symbol} className='symbol-checkboxes__item'>
                            <input
                                type='checkbox'
                                checked={selected_symbols.includes(symbol)}
                                onChange={() => toggleSymbol(symbol)}
                            />
                            {SYMBOL_DISPLAY_NAMES[symbol] ?? symbol}
                        </label>
                    ))}
                </div>
            </div>

            <div className='auto-trader-panel__row'>
                <label>{localize('Contract Category')}</label>
                <select value={auto_category} onChange={e => setAutoCategory(e.target.value as TAutoTradeCategory)}>
                    <option value='even_odd'>{localize('Even/Odd')}</option>
                    <option value='over_under'>{localize('Over/Under (barrier 5)')}</option>
                    <option value='matches_differs'>{localize('Matches/Differs')}</option>
                </select>
            </div>

            <div className='auto-trader-panel__row auto-trader-panel__row--split'>
                <div>
                    <label>{localize('Confidence Threshold (%)')}</label>
                    <input
                        type='number'
                        min={50}
                        max={95}
                        value={confidence_threshold}
                        onChange={e => setConfidenceThreshold(Number(e.target.value))}
                    />
                </div>
                <div>
                    <label>{localize('Number of Runs')}</label>
                    <input
                        type='number'
                        min={1}
                        max={50}
                        value={max_runs}
                        onChange={e => setMaxRuns(Number(e.target.value))}
                    />
                </div>
            </div>

            <div className='auto-trader-panel__row auto-trader-panel__row--split'>
                <div>
                    <label>{localize('Stake')} ({client?.currency ?? '—'})</label>
                    <input type='number' min={0.35} value={auto_stake} onChange={e => setAutoStake(Number(e.target.value))} />
                </div>
                <div>
                    <label>{localize('Duration (ticks)')}</label>
                    <input
                        type='number'
                        min={1}
                        max={10}
                        value={auto_duration}
                        onChange={e => setAutoDuration(Number(e.target.value))}
                    />
                </div>
            </div>

            <Button
                text={localize('Start Auto Trading')}
                onClick={handleStartAutoClick}
                disabled={selected_symbols.length === 0}
                primary
                large
            />
        </>
    ) : (
        <Button text={localize('Stop Auto Trading')} onClick={() => auto_trader_service.stop()} primary large className='auto-trader-panel__stop' />
    )}

    {auto_trader_service.log.length > 0 && (
        <div className='auto-trade-log'>
            <Text size='xxxs' weight='bold' color='less-prominent'>
                {localize('Recent Trades')}
            </Text>
            

            {auto_trader_service.log.map(entry => (
    <div
        key={entry.id}
        className={classNames('auto-trade-log__row', `auto-trade-log__row--${entry.status}`)}
    >
        <span>{SYMBOL_DISPLAY_NAMES[entry.symbol] ?? entry.symbol}</span>
        <span>{entry.contract_type}{entry.barrier ? ` (${entry.barrier})` : ''}</span>
        <span>{entry.status === 'success' ? `#${entry.contract_id}` : entry.error}</span>
        {entry.status === 'success' && (
            <span
                className={classNames('outcome-badge', {
                    'outcome-badge--won': entry.outcome === 'won',
                    'outcome-badge--lost': entry.outcome === 'lost',
                    'outcome-badge--pending': entry.outcome === 'pending',
                })}
            >
                {entry.outcome === 'won' && `✓ ${localize('Won')}`}
                {entry.outcome === 'lost' && `✗ ${localize('Lost')}`}
                {entry.outcome === 'pending' && localize('Pending')}
            </span>
        )}
    </div>
))}
        </div>
    )}
</div>

{is_confirm_auto_open && (
    <div className='confirm-modal-overlay' onClick={() => setIsConfirmAutoOpen(false)}>
        <div className='confirm-modal' onClick={e => e.stopPropagation()}>
            <Text as='h3' size='s' weight='bold'>
                {localize('Confirm Auto Trading')}
            </Text>
            <Text size='xs' className='confirm-modal__warning'>
                {localize('This will place up to')} <strong>{max_runs}</strong>{' '}
                {localize('trades automatically, without asking you to confirm each one, until the limit is reached or you click Stop.')}
            </Text>
            <div className='confirm-modal__actions'>
                <Button text={localize('Cancel')} onClick={() => setIsConfirmAutoOpen(false)} secondary />
                <Button text={localize('I Understand, Start')} onClick={handleConfirmStartAuto} primary />
            </div>
        </div>
    </div>
)}



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