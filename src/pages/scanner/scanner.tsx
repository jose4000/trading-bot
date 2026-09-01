import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/types';
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

const EXPECTED_PCT = 10;
const OVER_UNDER_BARRIER = 5;

type TStrategyType = 'frequency' | 'over_under' | 'matches_differs' | 'even_streak' | 'over_streak';

type TStrategySignal = {
    symbol: string;
    type: TStrategyType;
    label: string;
    score: number;
    reason: string;
    suggested_trade: string;
};

function generateSignalsForSymbol(scanner: any, symbol: string): TStrategySignal[] {
    const analysis = scanner.getAnalysis(symbol);
    if (analysis.tick_count < 30) return [];

    const signals: TStrategySignal[] = [];
    const pct = analysis.frequency.percentages;

    // 1. Frequency (hot/cold digit)
    const indexed = pct.map((p: number, digit: number) => ({ digit, pct: p }));
    const sorted = [...indexed].sort((a, b) => b.pct - a.pct);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    const hot_dev = highest.pct - EXPECTED_PCT;
    const cold_dev = EXPECTED_PCT - lowest.pct;

    if (hot_dev >= cold_dev && hot_dev > 0) {
        signals.push({
            symbol,
            type: 'frequency',
            label: 'Digit Frequency',
            score: Math.min(hot_dev * 8, 100),
            reason: `Digit ${highest.digit} running hot at ${highest.pct.toFixed(1)}%`,
            suggested_trade: `Matches ${highest.digit}`,
        });
    } else if (cold_dev > 0) {
        signals.push({
            symbol,
            type: 'frequency',
            label: 'Digit Frequency',
            score: Math.min(cold_dev * 8, 100),
            reason: `Digit ${lowest.digit} is due — only ${lowest.pct.toFixed(1)}%`,
            suggested_trade: `Differs ${lowest.digit}`,
        });
    }

    // 2. Over/Under bias (barrier 5)
    let over = 0;
    let under = 0;
    pct.forEach((p: number, d: number) => {
        if (d > OVER_UNDER_BARRIER) over += p;
        else if (d < OVER_UNDER_BARRIER) under += p;
    });
    const ou_dev = Math.max(over, under) - 45; // ~45% expected split each side (digit 5 excluded)
    if (ou_dev > 0) {
        const is_over = over > under;
        signals.push({
            symbol,
            type: 'over_under',
            label: 'Over/Under',
            score: Math.min(ou_dev * 5, 100),
            reason: `${is_over ? 'Over' : 'Under'} 5 at ${(is_over ? over : under).toFixed(1)}%`,
            suggested_trade: is_over ? 'Over 5' : 'Under 5',
        });
    }

    // 3. Matches/Differs (most frequent digit as Matches target)
    const matches_dev = highest.pct - EXPECTED_PCT;
    if (matches_dev > 1) {
        signals.push({
            symbol,
            type: 'matches_differs',
            label: 'Matches/Differs',
            score: Math.min(matches_dev * 7, 100),
            reason: `Digit ${highest.digit} matched ${highest.pct.toFixed(1)}% of the time`,
            suggested_trade: `Matches ${highest.digit}`,
        });
    }

    // 4. Streak detection (Even/Odd and Over/Under runs)
    const digits: number[] = scanner.getDigitHistory(symbol, 20);
    if (digits.length >= 4) {
        const categories = digits.map(d => ({ even: d % 2 === 0, over: d > OVER_UNDER_BARRIER }));

        let even_streak = 1;
        for (let i = categories.length - 1; i > 0; i--) {
            if (categories[i].even === categories[i - 1].even) even_streak++;
            else break;
        }
        let over_streak = 1;
        for (let i = categories.length - 1; i > 0; i--) {
            if (categories[i].over === categories[i - 1].over) over_streak++;
            else break;
        }

        const last = categories[categories.length - 1];

        if (even_streak >= 4) {
            signals.push({
                symbol,
                type: 'even_streak',
                label: 'Even/Odd Streak',
                score: Math.min(even_streak * 12, 100),
                reason: `${even_streak}x ${last.even ? 'Even' : 'Odd'} in a row`,
                suggested_trade: last.even ? 'Odd' : 'Even',
            });
        }
        if (over_streak >= 4) {
            signals.push({
                symbol,
                type: 'over_streak',
                label: 'Over/Under Streak',
                score: Math.min(over_streak * 12, 100),
                reason: `${over_streak}x ${last.over ? 'Over' : 'Under'} in a row`,
                suggested_trade: last.over ? 'Under 5' : 'Over 5',
            });
        }
    }

    return signals;
}

function getScoreTier(score: number): 'strong' | 'moderate' | 'weak' {
    if (score >= 60) return 'strong';
    if (score >= 30) return 'moderate';
    return 'weak';
}

const ScannerComponent = observer(() => {
    const { scanner } = useStore();
    const [selected_symbols, setSelectedSymbols] = React.useState<string[]>([...VOLATILITY_SYMBOLS]);
    const [scan_pulse, setScanPulse] = React.useState(0);

    React.useEffect(() => {
        scanner.startScanning();
        const pulse = setInterval(() => setScanPulse(p => (p + 1) % 100), 60);
        return () => clearInterval(pulse);
    }, [scanner]);

    const toggleSymbol = (symbol: string) => {
        setSelectedSymbols(prev => (prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]));
    };

    const all_signals: TStrategySignal[] = selected_symbols
        .flatMap(symbol => generateSignalsForSymbol(scanner, symbol))
        .sort((a, b) => b.score - a.score);

    const top_signal = all_signals[0];
    const has_signal = top_signal && top_signal.score > 0;

    // Group remaining signals by market for the "all strategies" table
    const by_market: Record<string, TStrategySignal[]> = {};
    all_signals.forEach(sig => {
        if (!by_market[sig.symbol]) by_market[sig.symbol] = [];
        by_market[sig.symbol].push(sig);
    });

    return (
        <div className='term-scanner'>
            <div className='term-header'>
                <div className='term-header__left'>
                    <span className='term-header__dot' />
                    <span className='term-header__title'>TRADEFLUX // SCANNER</span>
                </div>
                <div className='term-header__right'>
                    <span className='term-header__stat'>WATCHING: {selected_symbols.length}</span>
                    <span className='term-header__stat'>SIGNALS: {all_signals.length}</span>
                </div>
            </div>

            <div className='term-panel term-panel--open'>
                <div className='term-panel__body term-panel__body--static'>
                    <div className='term-field'>
                        <label>SELECT MARKETS TO SCAN</label>
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

                    <div className='scan-visual'>
                        <div className='scan-visual__bar-track'>
                            <div className='scan-visual__bar' style={{ left: `${scan_pulse}%` }} />
                        </div>
                        <span className='scan-visual__label'>
                            SCANNING {selected_symbols.length} MARKET{selected_symbols.length !== 1 ? 'S' : ''}...
                        </span>
                    </div>
                </div>
            </div>

            {has_signal ? (
                <div className={classNames('signal-readout', `signal-readout--${getScoreTier(top_signal.score)}`)}>
                    <div className='signal-readout__main'>
                        <span className='signal-readout__symbol'>{SYMBOL_DISPLAY_NAMES[top_signal.symbol] ?? top_signal.symbol}</span>
                        <span className='signal-readout__score'>{Math.round(top_signal.score)}%</span>
                    </div>
                    <div className='signal-readout__label-tag'>{top_signal.label}</div>
                    <div className='signal-readout__reason'>{top_signal.reason}</div>
                    <div className='signal-readout__trade'>▸ {top_signal.suggested_trade}</div>
                </div>
            ) : (
                <div className='signal-readout signal-readout--empty'>AWAITING DATA...</div>
            )}

            <div className='term-panel term-panel--open'>
                <div className='term-panel__header-static'>ALL STRATEGIES BY MARKET</div>
                <div className='strategy-groups'>
                    {Object.entries(by_market).map(([symbol, signals]) => (
                        <div className='strategy-group' key={symbol}>
                            <div className='strategy-group__title'>{SYMBOL_SHORT[symbol] ?? symbol}</div>
                            {signals.map((sig, i) => {
                                const tier = getScoreTier(sig.score);
                                return (
                                    <div key={i} className={classNames('strategy-row', `strategy-row--${tier}`)}>
                                        <span className='strategy-row__type'>{sig.label}</span>
                                        <span className='strategy-row__reason'>{sig.reason}</span>
                                        <span className='strategy-row__trade'>{sig.suggested_trade}</span>
                                        <span className={classNames('strategy-row__score', `strategy-row__score--${tier}`)}>
                                            {Math.round(sig.score)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    {Object.keys(by_market).length === 0 && (
                        <div className='strategy-group__empty'>No strategy signals yet — collecting data...</div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ScannerComponent;