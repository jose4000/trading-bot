import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import DCircles from '@/components/d-circles/d-circles';
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

const ScannerComponent = observer(() => {
    const { scanner } = useStore();
    const [symbol, setSymbol] = React.useState(VOLATILITY_SYMBOLS[4]);
    const [scan_pulse, setScanPulse] = React.useState(0);

    React.useEffect(() => {
        scanner.startScanning();
        const pulse = setInterval(() => setScanPulse(p => (p + 1) % 100), 80);
        return () => clearInterval(pulse);
    }, [scanner]);

    const analysis = scanner.getAnalysis(symbol);
    const percentages = analysis.frequency.percentages;
    const current_digit = analysis.streaks.current_digit;
    const pattern = analysis.patterns;

    return (
        <div className='term-scanner'>
            <div className='term-header'>
                <div className='term-header__left'>
                    <span className='term-header__dot' />
                    <span className='term-header__title'>TRADEFLUX // SCANNER</span>
                </div>
            </div>

            <div className='term-panel term-panel--open'>
                <div className='term-panel__body term-panel__body--static'>
                    <div className='term-field'>
                        <label>SELECT MARKET</label>
                        <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                            {VOLATILITY_SYMBOLS.map(s => (
                                <option key={s} value={s}>
                                    {SYMBOL_DISPLAY_NAMES[s] ?? s}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ── Live scanning visual ───────────────── */}
                    <div className='scan-visual'>
                        <div className='scan-visual__bar-track'>
                            <div className='scan-visual__bar' style={{ left: `${scan_pulse}%` }} />
                        </div>
                        <span className='scan-visual__label'>SCANNING {SYMBOL_DISPLAY_NAMES[symbol]}...</span>
                    </div>

                    <DCircles percentages={percentages} current_digit={current_digit} variant='four-tier' />

                    {/* ── Strategy signal ──────────────────────── */}
                    <div className='strategy-signal'>
                        <div className='strategy-signal__header'>STRATEGY SIGNAL</div>
                        {pattern.occurrences < 15 ? (
                            <div className='strategy-signal__waiting'>
                                WATCHING SEQUENCE: <strong>{pattern.current_pattern || '···'}</strong>
                                <br />
                                Seen {pattern.occurrences}x — need 15+ to signal
                            </div>
                        ) : pattern.is_significant && pattern.best_outcome ? (
                            <div className='strategy-signal__active'>
                                After <strong>{pattern.current_pattern}</strong>, historically:{' '}
                                <strong className='strategy-signal__trade'>{pattern.best_outcome.label}</strong>{' '}
                                ({pattern.best_outcome.pct.toFixed(0)}% of {pattern.occurrences} times)
                            </div>
                        ) : (
                            <div className='strategy-signal__waiting'>
                                Pattern <strong>{pattern.current_pattern}</strong> seen {pattern.occurrences}x — no strong lean yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ScannerComponent;