import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import AccumulatorLiveChart from '@/components/accumulator-live-chart/accumulator-live-chart';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/types';
import { accumulator_service, TAccumulatorProposal } from '@/services/accumulator/accumulator-service';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import './accumulators.scss';

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

const AccumulatorsComponent = observer(() => {
    const { client } = useStore();
    const { isDesktop } = useDevice();

    const [symbol, setSymbol] = React.useState(VOLATILITY_SYMBOLS[4]);
    const [accu_growth_rate, setAccuGrowthRate] = React.useState(0.01);
    const [accu_stake, setAccuStake] = React.useState(10);
    const [accu_take_profit, setAccuTakeProfit] = React.useState('');
    const [accu_proposal, setAccuProposal] = React.useState<TAccumulatorProposal | null>(null);
    const [accu_error, setAccuError] = React.useState<string | null>(null);
    const [is_buying_accu, setIsBuyingAccu] = React.useState(false);

    React.useEffect(() => {
        if (!client?.currency || accu_stake <= 0) return;
        let cancelled = false;
        setAccuError(null);

        const timer = setTimeout(async () => {
            try {
                const result = await accumulator_service.getProposal({
                    amount: accu_stake,
                    currency: client.currency,
                    symbol,
                    growth_rate: accu_growth_rate,
                    take_profit: accu_take_profit ? Number(accu_take_profit) : undefined,
                });
                if (!cancelled) setAccuProposal(result);
            } catch (err: any) {
                if (!cancelled) setAccuError(err.message);
            }
        }, 600);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [symbol, accu_stake, accu_growth_rate, accu_take_profit, client?.currency]);

    const handleBuyAccumulator = async () => {
        if (!accu_proposal) return;
        setIsBuyingAccu(true);
        try {
            await accumulator_service.buy(accu_proposal.id, accu_proposal.ask_price, symbol, accu_growth_rate);
        } catch (err: any) {
            setAccuError(err.message);
        } finally {
            setIsBuyingAccu(false);
        }
    };

    const handleSellAccumulator = async () => {
        try {
            await accumulator_service.sell();
        } catch (err: any) {
            setAccuError(err.message);
        }
    };

    return (
        <div className='tab__accumulators'>
            <div className='tab__accumulators__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Accumulators')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Profit compounds while price stays in range — sell anytime to lock it in')}
                </Text>
            </div>

            <div className='trade-form__row'>
                <label>{localize('Market')}</label>
                <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                    {VOLATILITY_SYMBOLS.map(s => (
                        <option key={s} value={s}>
                            {SYMBOL_DISPLAY_NAMES[s] ?? s}
                        </option>
                    ))}
                </select>
            </div>

            <div className='accumulator-panel'>
                {!accumulator_service.open_position ? (
                    <>
                        <AccumulatorLiveChart high_barrier={accu_proposal?.high_barrier} low_barrier={accu_proposal?.low_barrier} />

                        <div className='accu-growth-rate-row'>
                            <Text size='xxxs' color='less-prominent' className='accu-growth-rate-row__title'>
                                {localize('Growth rate')}
                            </Text>
                            <div className='accu-growth-rate-row__pills'>
                                {[0.01, 0.02, 0.03, 0.04, 0.05].map(rate => (
                                    <button
                                        key={rate}
                                        className={classNames('accu-growth-rate-row__pill', {
                                            'accu-growth-rate-row__pill--active': accu_growth_rate === rate,
                                        })}
                                        onClick={() => setAccuGrowthRate(rate)}
                                    >
                                        {(rate * 100).toFixed(0)}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className='accu-stake-stepper'>
                            <button className='accu-stake-stepper__btn' onClick={() => setAccuStake(Math.max(0.35, accu_stake - 1))}>
                                −
                            </button>
                            <div className='accu-stake-stepper__value'>
                                <span>{accu_stake.toFixed(2)}</span>
                                <span className='accu-stake-stepper__currency'>{client?.currency ?? 'USD'}</span>
                            </div>
                            <button className='accu-stake-stepper__btn' onClick={() => setAccuStake(accu_stake + 1)}>
                                +
                            </button>
                            <span className='accu-stake-stepper__label'>{localize('Stake')}</span>
                        </div>

                        <label className='accu-take-profit'>
                            <input
                                type='checkbox'
                                checked={accu_take_profit !== ''}
                                onChange={e => setAccuTakeProfit(e.target.checked ? '5' : '')}
                            />
                            <span>{localize('Take profit')}</span>
                        </label>

                        {accu_take_profit !== '' && (
                            <input
                                type='number'
                                className='accu-take-profit__input'
                                value={accu_take_profit}
                                onChange={e => setAccuTakeProfit(e.target.value)}
                                placeholder={localize('Amount')}
                            />
                        )}

                        <div className='accu-info-row'>
                            <span>{localize('Max. payout')}</span>
                            <strong className='accu-info-row__underlined'>
                                {accu_proposal?.maximum_payout?.toFixed(2) ?? '—'} {client?.currency}
                            </strong>
                        </div>
                        <div className='accu-info-row'>
                            <span>{localize('Max. ticks')}</span>
                            <strong className='accu-info-row__underlined'>
                                {accu_proposal?.maximum_ticks ?? '—'} {localize('ticks')}
                            </strong>
                        </div>

                        {accu_error && (
                            <div className='accu-debug-box'>
                                <div className='accu-debug-box__error'>Error: {accu_error}</div>
                            </div>
                        )}

                        <button className='accu-buy-button' disabled={!accu_proposal || is_buying_accu} onClick={handleBuyAccumulator}>
                            {is_buying_accu ? localize('Placing...') : `⚡ ${localize('Buy')}`}
                        </button>
                    </>
                ) : (
                    <>
                        <div className='accu-live-badge'>
                            <span className='accu-live-badge__dot' />
                            {localize('LIVE — inside range')}
                        </div>

                        <AccumulatorLiveChart high_barrier={accu_proposal?.high_barrier} low_barrier={accu_proposal?.low_barrier} />

                        <div className='accumulator-position'>
                            <div className='accumulator-position__row'>
                                <span>{localize('Growth Rate')}</span>
                                <strong>{(accumulator_service.open_position.growth_rate * 100).toFixed(0)}%</strong>
                            </div>
                            <div className='accumulator-position__row'>
                                <span>{localize('Buy Price')}</span>
                                <strong>{accumulator_service.open_position.buy_price.toFixed(2)}</strong>
                            </div>
                            <div className='accumulator-position__row accumulator-position__row--large'>
                                <span>{localize('Current Profit')}</span>
                                <strong className={accumulator_service.open_position.profit >= 0 ? 'positive' : 'negative'}>
                                    {accumulator_service.open_position.profit >= 0 ? '+' : ''}
                                    {accumulator_service.open_position.profit.toFixed(2)} {client?.currency}
                                </strong>
                            </div>
                        </div>

                        {accumulator_service.open_position.is_sold ? (
                            <>
                                <div className='accumulator-position__closed'>
                                    {accumulator_service.open_position.profit >= 0
                                        ? localize('Sold — profit locked in')
                                        : localize('Contract knocked out')}
                                </div>
                                <button className='accu-buy-button' onClick={() => accumulator_service.clearPosition()}>
                                    {localize('Start New')}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className='accu-debug-box'>
                                    <div>Status: {accumulator_service.is_loading ? 'Selling...' : accu_error ? 'ERROR' : 'Ready'}</div>
                                    {accu_error && <div className='accu-debug-box__error'>Error: {accu_error}</div>}
                                </div>
                                <button
                                    className='accu-buy-button accu-buy-button--sell'
                                    disabled={accumulator_service.is_loading}
                                    onClick={handleSellAccumulator}
                                >
                                    {accumulator_service.is_loading ? localize('Selling...') : localize('Sell Now')}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

export default AccumulatorsComponent;