import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/types';
import { martingale_bot_service } from '@/services/strategy-bot/martingale-bot-service';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import './strategy-bot.scss';

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

const StrategyBotComponent = observer(() => {
    const { client } = useStore();
    const { isDesktop } = useDevice();

    const [symbol, setSymbol] = React.useState(VOLATILITY_SYMBOLS[4]);
    const [direction, setDirection] = React.useState<'even' | 'odd'>('even');
    const [base_stake, setBaseStake] = React.useState(1);
    const [multiplier, setMultiplier] = React.useState(2);
    const [duration, setDuration] = React.useState(1);
    const [take_profit, setTakeProfit] = React.useState(10);
    const [stop_loss, setStopLoss] = React.useState(20);
    const [is_confirm_open, setIsConfirmOpen] = React.useState(false);

    const handleStartClick = () => setIsConfirmOpen(true);

    const handleConfirmStart = () => {
        martingale_bot_service.start({
            symbol,
            contract_type: direction === 'even' ? 'DIGITEVEN' : 'DIGITODD',
            base_stake,
            multiplier,
            duration,
            currency: client?.currency ?? 'USD',
            take_profit,
            stop_loss,
        });
        setIsConfirmOpen(false);
    };

    const is_running = martingale_bot_service.is_running;
    const profit_class = martingale_bot_service.total_profit >= 0 ? 'positive' : 'negative';

    return (
        <div className='tab__strategy-bot'>
            <div className='tab__strategy-bot__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Martingale Bot')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Runs Martingale progression automatically until your target or limit is hit')}
                </Text>
            </div>

            {is_running && (
                <div className='bot-status'>
                    <div className='bot-status__row'>
                        <span>{localize('Status')}</span>
                        <strong className='bot-status__running'>{localize('RUNNING')}</strong>
                    </div>
                    <div className='bot-status__row'>
                        <span>{localize('Current Stake')}</span>
                        <strong>{martingale_bot_service.current_stake.toFixed(2)} {client?.currency}</strong>
                    </div>
                    <div className='bot-status__row'>
                        <span>{localize('Total Profit')}</span>
                        <strong className={`bot-status__profit--${profit_class}`}>
                            {martingale_bot_service.total_profit.toFixed(2)} {client?.currency}
                        </strong>
                    </div>
                </div>
            )}

            {!is_running ? (
                <div className='bot-form'>
                    <div className='bot-form__row'>
                        <label>{localize('Market')}</label>
                        <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                            {VOLATILITY_SYMBOLS.map(s => (
                                <option key={s} value={s}>
                                    {SYMBOL_DISPLAY_NAMES[s] ?? s}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='bot-form__row'>
                        <label>{localize('Direction')}</label>
                        <div className='direction-toggle'>
                            <button className={classNames({ active: direction === 'even' })} onClick={() => setDirection('even')}>
                                {localize('Even')}
                            </button>
                            <button className={classNames({ active: direction === 'odd' })} onClick={() => setDirection('odd')}>
                                {localize('Odd')}
                            </button>
                        </div>
                    </div>

                    <div className='bot-form__row bot-form__row--split'>
                        <div>
                            <label>{localize('Base Stake')} ({client?.currency ?? '—'})</label>
                            <input type='number' min={0.35} step={0.01} value={base_stake} onChange={e => setBaseStake(Number(e.target.value))} />
                        </div>
                        <div>
                            <label>{localize('Multiplier')}</label>
                            <input type='number' min={1.1} step={0.1} value={multiplier} onChange={e => setMultiplier(Number(e.target.value))} />
                        </div>
                    </div>

                    <div className='bot-form__row bot-form__row--split'>
                        <div>
                            <label>{localize('Duration (ticks)')}</label>
                            <input type='number' min={1} max={10} value={duration} onChange={e => setDuration(Number(e.target.value))} />
                        </div>
                    </div>

                    <div className='bot-form__row bot-form__row--split'>
                        <div>
                            <label>{localize('Take Profit')} ({client?.currency ?? '—'})</label>
                            <input type='number' min={1} value={take_profit} onChange={e => setTakeProfit(Number(e.target.value))} />
                        </div>
                        <div>
                            <label>{localize('Stop Loss')} ({client?.currency ?? '—'})</label>
                            <input type='number' min={1} value={stop_loss} onChange={e => setStopLoss(Number(e.target.value))} />
                        </div>
                    </div>

                    <Button text={localize('Start Bot')} onClick={handleStartClick} primary large className='bot-form__start-button' />
                </div>
            ) : (
                <Button
                    text={localize('Stop Bot')}
                    onClick={() => martingale_bot_service.stop()}
                    primary
                    large
                    className='bot-form__stop-button'
                />
            )}

            {martingale_bot_service.log.length > 0 && (
                <div className='bot-log'>
                    <Text size='xxxs' weight='bold' color='less-prominent'>
                        {localize('Trade Log')}
                    </Text>
                    {martingale_bot_service.log.map(entry => (
                        <div key={entry.id} className={classNames('bot-log__row', `bot-log__row--${entry.status}`)}>
                            <span>{entry.stake.toFixed(2)}</span>
                            <span>{entry.status === 'pending' ? localize('Pending...') : entry.status.toUpperCase()}</span>
                            <span>{entry.profit !== undefined ? entry.profit.toFixed(2) : entry.error ?? ''}</span>
                        </div>
                    ))}
                </div>
            )}

            {is_confirm_open && (
                <div className='confirm-modal-overlay' onClick={() => setIsConfirmOpen(false)}>
                    <div className='confirm-modal' onClick={e => e.stopPropagation()}>
                        <Text as='h3' size='s' weight='bold'>
                            {localize('Confirm Martingale Bot')}
                        </Text>
                        <Text size='xs' className='confirm-modal__warning'>
                            {localize(
                                'This will trade automatically without confirming each trade. Stakes will double after every loss. It stops automatically at'
                            )}{' '}
                            <strong>+{take_profit} {client?.currency}</strong> {localize('profit or')}{' '}
                            <strong>-{stop_loss} {client?.currency}</strong> {localize('loss, whichever comes first.')}
                        </Text>
                        <div className='confirm-modal__actions'>
                            <Button text={localize('Cancel')} onClick={() => setIsConfirmOpen(false)} secondary />
                            <Button text={localize('I Understand, Start')} onClick={handleConfirmStart} primary />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default StrategyBotComponent;