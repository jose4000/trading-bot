import React from 'react';
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import {
    calculateBreakevenWinRate,
    calculateMartingaleSequence,
    calculatePositionSize,
} from '@/services/risk-calculator/risk-calculator';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import './risk-calculator.scss';

type TCalcTab = 'position' | 'martingale' | 'breakeven';

const RiskCalculatorComponent = observer(() => {
    const { client } = useStore();
    const { isDesktop } = useDevice();
    const [active_calc, setActiveCalc] = React.useState<TCalcTab>('position');

    // Position sizing
    const [balance, setBalance] = React.useState(1000);
    const [risk_pct, setRiskPct] = React.useState(2);

    // Martingale
    const [m_initial_stake, setMInitialStake] = React.useState(10);
    const [m_multiplier, setMMultiplier] = React.useState(2);
    const [m_balance, setMBalance] = React.useState(1000);
    const [m_payout_pct, setMPayoutPct] = React.useState(95);

    // Breakeven
    const [b_payout_pct, setBPayoutPct] = React.useState(95);

    const position_result = calculatePositionSize({ balance, risk_pct });
    const martingale_result = calculateMartingaleSequence({
        initial_stake: m_initial_stake,
        multiplier: m_multiplier,
        balance: m_balance,
        payout_pct: m_payout_pct,
    });
    const breakeven_result = calculateBreakevenWinRate({ payout_pct: b_payout_pct });

    return (
        <div className='tab__risk-calculator'>
            <div className='tab__risk-calculator__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Risk Calculator')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Plan your stake sizing and understand risk before you trade')}
                </Text>
            </div>

            <div className='calc-tabs'>
                {(['position', 'martingale', 'breakeven'] as TCalcTab[]).map(tab => (
                    <button
                        key={tab}
                        className={classNames('calc-tabs__item', { active: active_calc === tab })}
                        onClick={() => setActiveCalc(tab)}
                    >
                        {tab === 'position' && localize('Position Sizing')}
                        {tab === 'martingale' && localize('Martingale')}
                        {tab === 'breakeven' && localize('Breakeven Win Rate')}
                    </button>
                ))}
            </div>

            {active_calc === 'position' && (
                <div className='calc-panel'>
                    <div className='calc-panel__row'>
                        <label>{localize('Account Balance')} ({client?.currency ?? '—'})</label>
                        <input type='number' value={balance} onChange={e => setBalance(Number(e.target.value))} />
                    </div>
                    <div className='calc-panel__row'>
                        <label>{localize('Risk Per Trade (%)')}</label>
                        <input
                            type='number'
                            min={0.1}
                            max={100}
                            step={0.1}
                            value={risk_pct}
                            onChange={e => setRiskPct(Number(e.target.value))}
                        />
                    </div>

                    <div className='calc-result'>
                        <div className='calc-result__item'>
                            <span>{localize('Recommended Stake')}</span>
                            <strong>{position_result.stake.toFixed(2)}</strong>
                        </div>
                        <Text size='xxxs' color='less-prominent' className='calc-result__note'>
                            {localize(
                                'A common rule of thumb is risking 1-3% of your balance per trade to avoid rapid drawdown.'
                            )}
                        </Text>
                    </div>
                </div>
            )}

            {active_calc === 'martingale' && (
                <div className='calc-panel'>
                    <div className='calc-panel__row calc-panel__row--split'>
                        <div>
                            <label>{localize('Initial Stake')}</label>
                            <input
                                type='number'
                                value={m_initial_stake}
                                onChange={e => setMInitialStake(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label>{localize('Multiplier')}</label>
                            <input
                                type='number'
                                step={0.1}
                                value={m_multiplier}
                                onChange={e => setMMultiplier(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className='calc-panel__row calc-panel__row--split'>
                        <div>
                            <label>{localize('Account Balance')}</label>
                            <input
                                type='number'
                                value={m_balance}
                                onChange={e => setMBalance(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label>{localize('Payout (%)')}</label>
                            <input
                                type='number'
                                value={m_payout_pct}
                                onChange={e => setMPayoutPct(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='calc-result'>
                        <div className='calc-result__item'>
                            <span>{localize('Max Consecutive Losses You Can Survive')}</span>
                            <strong>{martingale_result.max_safe_losses}</strong>
                        </div>
                    </div>

                    <div className='martingale-table'>
                        <div className='martingale-table__header'>
                            <span>{localize('Loss #')}</span>
                            <span>{localize('Stake')}</span>
                            <span>{localize('Cumulative Loss')}</span>
                            <span>{localize('Status')}</span>
                        </div>
                        {martingale_result.steps.map(step => (
                            <div
                                key={step.step}
                                className={classNames('martingale-table__row', {
                                    'martingale-table__row--danger': step.exceeds_balance,
                                })}
                            >
                                <span>{step.step}</span>
                                <span>{step.stake.toFixed(2)}</span>
                                <span>{step.cumulative_loss.toFixed(2)}</span>
                                <span>
                                    {step.exceeds_balance ? localize('Exceeds balance') : localize('Safe')}
                                </span>
                            </div>
                        ))}
                    </div>

                    <Text size='xxxs' color='less-prominent' className='calc-result__note'>
                        {localize(
                            'Martingale requires exponentially larger stakes after each loss. A losing streak beyond your safe threshold can wipe out your balance quickly.'
                        )}
                    </Text>
                </div>
            )}

            {active_calc === 'breakeven' && (
                <div className='calc-panel'>
                    <div className='calc-panel__row'>
                        <label>{localize('Payout (%)')}</label>
                        <input
                            type='number'
                            value={b_payout_pct}
                            onChange={e => setBPayoutPct(Number(e.target.value))}
                        />
                    </div>

                    <div className='calc-result'>
                        <div className='calc-result__item'>
                            <span>{localize('Win Rate Needed to Break Even')}</span>
                            <strong>{breakeven_result.breakeven_win_rate}%</strong>
                        </div>
                        <Text size='xxxs' color='less-prominent' className='calc-result__note'>
                            {localize(
                                'At this payout, you need to win at least this percentage of trades just to avoid losing money over time — before accounting for any edge.'
                            )}
                        </Text>
                    </div>
                </div>
            )}
        </div>
    );
});

export default RiskCalculatorComponent;