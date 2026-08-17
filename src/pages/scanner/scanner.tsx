import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
import { useStore } from '@/hooks/useStore';
import { rankMarkets } from '@/services/scanner/scanners/RecommendationEngine';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/types';
import { auto_trader_service, TAutoTradeCategory } from '@/services/auto-trader/auto-trader-service';
import { localize } from '@deriv-com/translations';
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
    '1HZ10V': 'V10s',
    '1HZ25V': 'V25s',
    '1HZ50V': 'V50s',
    '1HZ75V': 'V75s',
    '1HZ100V': 'V100s',
};

function getScoreTier(score: number): 'strong' | 'moderate' | 'weak' {
    if (score >= 60) return 'strong';
    if (score >= 30) return 'moderate';
    return 'weak';
}

// ── Collapsible terminal panel wrapper ──────────────────────────────
const TerminalPanel: React.FC<{
    title: string;
    badge?: React.ReactNode;
    is_open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, badge, is_open, onToggle, children }) => (
    <div className={classNames('term-panel', { 'term-panel--open': is_open })}>
        <button className='term-panel__header' onClick={onToggle}>
            <span className='term-panel__bracket'>[</span>
            <span className='term-panel__title'>{title}</span>
            <span className='term-panel__bracket'>]</span>
            {badge && <span className='term-panel__badge'>{badge}</span>}
            <span className='term-panel__chevron'>{is_open ? '▾' : '▸'}</span>
        </button>
        {is_open && <div className='term-panel__body'>{children}</div>}
    </div>
);

const ScannerComponent = observer(() => {
    const { scanner, client } = useStore();

    const [open_panels, setOpenPanels] = React.useState({
        auto: true,
        signal: true,
        markets: true,
        log: true,
    });
    const togglePanel = (key: keyof typeof open_panels) =>
        setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));

    const [selected_symbols, setSelectedSymbols] = React.useState<string[]>([]);
    const [auto_category, setAutoCategory] = React.useState<TAutoTradeCategory>('even_odd');
    const [confidence_threshold, setConfidenceThreshold] = React.useState(60);
    const [auto_stake, setAutoStake] = React.useState(10);
    const [auto_duration, setAutoDuration] = React.useState(5);
    const [max_runs, setMaxRuns] = React.useState(10);
    const [is_confirm_auto_open, setIsConfirmAutoOpen] = React.useState(false);

    React.useEffect(() => {
        scanner.startScanning();
        return () => scanner.stopScanning();
    }, [scanner]);

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
        <div className='term-scanner'>
            <div className='term-scanner__scanlines' aria-hidden='true' />

            <div className='term-header'>
                <div className='term-header__left'>
                    <span className='term-header__dot' />
                    <span className='term-header__title'>TRADEFLUX // MARKET SCANNER</span>
                </div>
                <div className='term-header__right'>
                    <span className='term-header__stat'>MARKETS: {rankings.length}</span>
                    <span className='term-header__stat term-header__stat--live'>● LIVE</span>
                </div>
            </div>

            {/* ── Auto Trader Panel ────────────────────────── */}
            <TerminalPanel
                title='AUTO-TRADER'
                badge={
                    auto_trader_service.is_running ? (
                        <span className='term-badge term-badge--active'>
                            RUN {auto_trader_service.runs_completed}/{auto_trader_service.max_runs}
                        </span>
                    ) : (
                        <span className='term-badge'>IDLE</span>
                    )
                }
                is_open={open_panels.auto}
                onToggle={() => togglePanel('auto')}
            >
                {!auto_trader_service.is_running ? (
                    <>
                        <div className='term-field'>
                            <label>WATCH MARKETS</label>
                            <div className='term-symbol-grid'>
                                {VOLATILITY_SYMBOLS.map(symbol => (
                                    <button
                                        key={symbol}
                                        className={classNames('term-symbol-chip', {
                                            'term-symbol-chip--active': selected_symbols.includes(symbol),
                                        })}
                                        onClick={() => toggleSymbol(symbol)}
                                    >
                                        {SYMBOL_SHORT[symbol] ?? symbol}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className='term-field-row'>
                            <div className='term-field'>
                                <label>CATEGORY</label>
                                <select
                                    value={auto_category}
                                    onChange={e => setAutoCategory(e.target.value as TAutoTradeCategory)}
                                >
                                    <option value='even_odd'>EVEN / ODD</option>
                                    <option value='over_under'>OVER / UNDER (5)</option>
                                    <option value='matches_differs'>MATCHES / DIFFERS</option>
                                </select>
                            </div>
                            <div className='term-field'>
                                <label>CONFIDENCE %</label>
                                <input
                                    type='number'
                                    min={50}
                                    max={95}
                                    value={confidence_threshold}
                                    onChange={e => setConfidenceThreshold(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className='term-field-row'>
                            <div className='term-field'>
                                <label>STAKE ({client?.currency ?? '—'})</label>
                                <input
                                    type='number'
                                    min={0.35}
                                    value={auto_stake}
                                    onChange={e => setAutoStake(Number(e.target.value))}
                                />
                            </div>
                            <div className='term-field'>
                                <label>DURATION (TICKS)</label>
                                <input
                                    type='number'
                                    min={1}
                                    max={10}
                                    value={auto_duration}
                                    onChange={e => setAutoDuration(Number(e.target.value))}
                                />
                            </div>
                            <div className='term-field'>
                                <label>MAX RUNS</label>
                                <input
                                    type='number'
                                    min={1}
                                    max={50}
                                    value={max_runs}
                                    onChange={e => setMaxRuns(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <Button
                            text={localize('▶ START AUTO-TRADING')}
                            onClick={handleStartAutoClick}
                            disabled={selected_symbols.length === 0}
                            primary
                            large
                            className='term-start-btn'
                        />
                    </>
                ) : (
                    <Button
                        text={localize('■ STOP AUTO-TRADING')}
                        onClick={() => auto_trader_service.stop()}
                        primary
                        large
                        className='term-stop-btn'
                    />
                )}
            </TerminalPanel>

            {/* ── Signal Panel ─────────────────────────────── */}
            <TerminalPanel
                title='SIGNAL'
                badge={has_signal ? <span className='term-badge term-badge--active'>ACTIVE</span> : null}
                is_open={open_panels.signal}
                onToggle={() => togglePanel('signal')}
            >
                {has_signal ? (
                    <div className={classNames('signal-readout', `signal-readout--${getScoreTier(top_pick.score)}`)}>
                        <div className='signal-readout__main'>
                            <span className='signal-readout__symbol'>
                                {SYMBOL_DISPLAY_NAMES[top_pick.symbol] ?? top_pick.symbol}
                            </span>
                            <span className='signal-readout__score'>{Math.round(top_pick.score)}%</span>
                        </div>
                        <div className='signal-readout__reason'>{top_pick.reason}</div>
                        <div className='signal-readout__trade'>▸ {top_pick.suggested_trade}</div>
                    </div>
                ) : (
                    <div className='signal-readout signal-readout--empty'>
                        {localize('AWAITING DATA...')}
                    </div>
                )}
            </TerminalPanel>

            {/* ── Markets Panel ────────────────────────────── */}
            <TerminalPanel
                title='ALL MARKETS'
                badge={<span className='term-badge'>{rankings.length}</span>}
                is_open={open_panels.markets}
                onToggle={() => togglePanel('markets')}
            >
                <div className='term-table'>
                    <div className='term-table__header'>
                        <span>#</span>
                        <span>MARKET</span>
                        <span>SIGNAL</span>
                        <span>SCORE</span>
                    </div>
                    {rankings.map((rec, index) => {
                        const tier = getScoreTier(rec.score);
                        return (
                            <div className={classNames('term-table__row', `term-table__row--${tier}`)} key={rec.symbol}>
                                <span className='term-table__rank'>{index + 1}</span>
                                <span className='term-table__symbol'>
                                    {SYMBOL_SHORT[rec.symbol] ?? rec.symbol}
                                </span>
                                <span className='term-table__reason'>{rec.reason}</span>
                                <span className={classNames('term-table__score', `term-table__score--${tier}`)}>
                                    {Math.round(rec.score)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </TerminalPanel>

            {/* ── Trade Log Panel ──────────────────────────── */}
            {auto_trader_service.log.length > 0 && (
                <TerminalPanel
                    title='TRADE LOG'
                    is_open={open_panels.log}
                    onToggle={() => togglePanel('log')}
                >
                    <div className='term-log'>
                        {auto_trader_service.log.map(entry => (
                            <div
                                key={entry.id}
                                className={classNames('term-log__row', `term-log__row--${entry.status}`)}
                            >
                                <span>{SYMBOL_SHORT[entry.symbol] ?? entry.symbol}</span>
                                <span>
                                    {entry.contract_type}
                                    {entry.barrier ? `(${entry.barrier})` : ''}
                                </span>
                                <span>{entry.status === 'success' ? `#${entry.contract_id}` : 'ERR'}</span>
                                {entry.status === 'success' && (
                                    <span
                                        className={classNames('term-outcome', {
                                            'term-outcome--won': entry.outcome === 'won',
                                            'term-outcome--lost': entry.outcome === 'lost',
                                            'term-outcome--pending': entry.outcome === 'pending',
                                        })}
                                    >
                                        {entry.outcome === 'won' && 'WON'}
                                        {entry.outcome === 'lost' && 'LOST'}
                                        {entry.outcome === 'pending' && '···'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </TerminalPanel>
            )}

            {is_confirm_auto_open && (
                <div className='confirm-modal-overlay' onClick={() => setIsConfirmAutoOpen(false)}>
                    <div className='confirm-modal' onClick={e => e.stopPropagation()}>
                        <div className='confirm-modal__title'>[ CONFIRM AUTO-TRADING ]</div>
                        <p className='confirm-modal__warning'>
                            This will place up to <strong>{max_runs}</strong> trades automatically, without
                            confirmation per trade, until the limit is reached or you click STOP.
                        </p>
                        <div className='confirm-modal__actions'>
                            <Button text='CANCEL' onClick={() => setIsConfirmAutoOpen(false)} secondary />
                            <Button text='CONFIRM & START' onClick={handleConfirmStartAuto} primary />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ScannerComponent;