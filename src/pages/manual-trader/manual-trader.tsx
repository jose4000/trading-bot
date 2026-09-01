import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import DCircles from '@/components/d-circles/d-circles';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/types';
import {
    manual_trade_service,
    TDigitContractType,
    TProposalResult,
} from '@/services/manual-trade/manual-trade-service';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { api_base } from '@/external/bot-skeleton';
import { market_list_service } from '@/services/markets/market-list-service';
import './manual-trader.scss';
import { accumulator_service } from '@/services/accumulator/accumulator-service';

type TCategory =
    | 'even_odd'
    | 'over_under'
    | 'matches_differs'
    | 'rise_fall'
    | 'touch_no_touch'
    | 'higher_lower'
    | 'ends_between_outside';

type TSide = {
    key: string;
    label: string;
    contract_type: TDigitContractType;
    barrier?: string;
    barrier2?: string;
    color: 'teal' | 'red';
};

function subscribeToContractOutcome(contract_id: number, onUpdate: (contract: any) => void) {
    if (!api_base.api) return;

    const subscription = api_base.api.onMessage().subscribe(({ data }: any) => {
        if (data?.msg_type === 'proposal_open_contract' && data?.proposal_open_contract?.contract_id === contract_id) {
            const contract = data.proposal_open_contract;
            onUpdate(contract);
            if (contract.is_sold) {
                subscription.unsubscribe();
            }
        }
    });

    api_base.api.send({ proposal_open_contract: 1, contract_id, subscribe: 1 });
}

function getPipDisplayDigits(symbol: string): number {
    return 2; // simple default; adjust per-symbol later if needed
}



const ManualTraderComponent = observer(() => {
    const { client, scanner, transactions } = useStore();
    const { isDesktop } = useDevice();

    const [category, setCategory] = React.useState<TCategory>('even_odd');
    const [symbol, setSymbol] = React.useState(VOLATILITY_SYMBOLS[4]);
    const [stake, setStake] = React.useState(10);
    const [window_size, setWindowSize] = React.useState(1000);
    const [duration, setDuration] = React.useState(5);
    const [refresh_key, setRefreshKey] = React.useState(0);
    const [duration_unit, setDurationUnit] = React.useState<'t' | 'm'>('t');
    const [barrier_digit, setBarrierDigit] = React.useState(5);
    const [touch_barrier, setTouchBarrier] = React.useState('+10');
    const [higher_lower_barrier, setHigherLowerBarrier] = React.useState('+0.1');
    const [range_barrier_low, setRangeBarrierLow] = React.useState('-0.5');
    const [range_barrier_high, setRangeBarrierHigh] = React.useState('+0.5');

    const [side_proposals, setSideProposals] = React.useState<Record<string, TProposalResult | null>>({});
    const [side_errors, setSideErrors] = React.useState<Record<string, string | null>>({});
    const [is_fetching, setIsFetching] = React.useState(false);
    const [buying_key, setBuyingKey] = React.useState<string | null>(null);
    const [buy_result, setBuyResult] = React.useState<{ success: boolean; message: string } | null>(null);

    // accumulators 
    const [show_accumulators, setShowAccumulators] = React.useState(false);
const [accu_growth_rate, setAccuGrowthRate] = React.useState(0.01);
const [accu_stake, setAccuStake] = React.useState(10);
const [accu_take_profit, setAccuTakeProfit] = React.useState('');
const [accu_proposal, setAccuProposal] = React.useState<{ id: string; ask_price: number } | null>(null);
const [accu_error, setAccuError] = React.useState<string | null>(null);
const [is_buying_accu, setIsBuyingAccu] = React.useState(false);


    const needsBarrier =
        category === 'over_under' ||
        category === 'matches_differs' ||
        category === 'touch_no_touch' ||
        category === 'higher_lower' ||
        category === 'ends_between_outside';

    const getSides = (): TSide[] => {
        switch (category) {
            case 'even_odd':
                return [
                    { key: 'even', label: localize('Even'), contract_type: 'DIGITEVEN', color: 'teal' },
                    { key: 'odd', label: localize('Odd'), contract_type: 'DIGITODD', color: 'red' },
                ];
            case 'over_under':
                return [
                    { key: 'over', label: localize('Over'), contract_type: 'DIGITOVER', barrier: String(barrier_digit), color: 'teal' },
                    { key: 'under', label: localize('Under'), contract_type: 'DIGITUNDER', barrier: String(barrier_digit), color: 'red' },
                ];
            case 'matches_differs':
                return [
                    { key: 'matches', label: localize('Matches'), contract_type: 'DIGITMATCH', barrier: String(barrier_digit), color: 'teal' },
                    { key: 'differs', label: localize('Differs'), contract_type: 'DIGITDIFF', barrier: String(barrier_digit), color: 'red' },
                ];
            case 'rise_fall':
                return [
                    { key: 'rise', label: localize('Rise'), contract_type: 'CALL', color: 'teal' },
                    { key: 'fall', label: localize('Fall'), contract_type: 'PUT', color: 'red' },
                ];
            case 'touch_no_touch':
                return [
                    { key: 'touch', label: localize('Touch'), contract_type: 'ONETOUCH', barrier: touch_barrier, color: 'teal' },
                    { key: 'no_touch', label: localize('No Touch'), contract_type: 'NOTOUCH', barrier: touch_barrier, color: 'red' },
                ];
            case 'higher_lower':
                return [
                    { key: 'higher', label: localize('Higher'), contract_type: 'CALLE', barrier: higher_lower_barrier, color: 'teal' },
                    { key: 'lower', label: localize('Lower'), contract_type: 'PUTE', barrier: higher_lower_barrier, color: 'red' },
                ];
            case 'ends_between_outside':
                return [
                    {
                        key: 'ends_between',
                        label: localize('Ends Between'),
                        contract_type: 'EXPIRYRANGE',
                        barrier: range_barrier_low,
                        barrier2: range_barrier_high,
                        color: 'teal',
                    },
                    {
                        key: 'ends_outside',
                        label: localize('Ends Outside'),
                        contract_type: 'EXPIRYMISS',
                        barrier: range_barrier_low,
                        barrier2: range_barrier_high,
                        color: 'red',
                    },
                ];
            default:
                return [];
        }
    };

    const percentages = scanner.getPercentages(symbol);
    const current_stat = scanner.symbol_stats.find(s => s.symbol === symbol);
    const current_digit = current_stat?.streaks.current_digit ?? null;
    const current_price = scanner.getLastQuote(symbol);

    React.useEffect(() => {
        let cancelled = false;
        setSideProposals({});
        setSideErrors({});

        if (!client?.currency || stake <= 0 || duration <= 0) return;

        const sides = getSides();
        setIsFetching(true);

        const timer = setTimeout(async () => {
            await Promise.all(
                sides.map(async side => {
                    try {
                        const result = await manual_trade_service.getProposal({
                            amount: stake,
                            currency: client.currency,
                            contract_type: side.contract_type,
                            symbol,
                            duration,
                            duration_unit,
                            barrier: side.barrier,
                            barrier2: side.barrier2,
                        });
                        if (!cancelled) {
                            setSideProposals(prev => ({ ...prev, [side.key]: result }));
                        }
                    } catch (err: any) {
                        if (!cancelled) {
                            setSideErrors(prev => ({ ...prev, [side.key]: err.message || 'Failed to fetch proposal' }));
                        }
                    }
                })
            );
            if (!cancelled) setIsFetching(false);
        }, 600);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        category,
        symbol,
        stake,
        duration,
        duration_unit,
        barrier_digit,
        touch_barrier,
        higher_lower_barrier,
        range_barrier_low,
        range_barrier_high,
        client?.currency,
        refresh_key,
    ]);

    React.useEffect(() => {
        scanner.startScanning();
    }, [scanner]);

    React.useEffect(() => {
    scanner.setWindowSize(window_size);
}, [scanner, window_size]);

// proposal-fetching effect for accumulators
     React.useEffect(() => {
    if (!show_accumulators || !client?.currency || accu_stake <= 0) return;
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
}, [show_accumulators, symbol, accu_stake, accu_growth_rate, accu_take_profit, client?.currency]);

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
    await accumulator_service.sell();
};

    const handleBuy = async (side: TSide) => {
        const proposal = side_proposals[side.key];
        if (!proposal) return;

        setBuyingKey(side.key);
        setBuyResult(null);
        try {
            const result = await manual_trade_service.buyContract(proposal.id, proposal.ask_price);
            setBuyResult({
                success: true,
                message: `${side.label} — ${localize('Trade placed')} — ${localize('Contract ID')}: ${result.contract_id}`,
            });
            subscribeToContractOutcome(result.contract_id, contract => {
                transactions.onBotContractEvent(contract);
            });
        } catch (err: any) {
            setBuyResult({ success: false, message: err.message || localize('Trade failed') });
        } finally {
            setBuyingKey(null);
            setRefreshKey(k => k + 1);
        }
    };

    const sides = getSides();

    return (
        <div className='tab__manual-trader'>
            <div className='tab__manual-trader__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Manual Trader')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Tap a side below to place a trade instantly')}
                </Text>
            </div>

            <div className='trade-form'>
                <div className='trade-form__row'>
                    <label>{localize('Market')}</label>
                    <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                        {Object.entries(market_list_service.getGroupedMarkets()).map(([market_name, options]) => (
                            <optgroup key={market_name} label={market_name}>
                                {options.map(opt => (
                                    <option key={opt.symbol} value={opt.symbol}>
                                        {opt.display_name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>


                <div className='trade-form__row'>
    <label>{localize('Trade Mode')}</label>
    <select value={show_accumulators ? 'accumulators' : 'standard'} onChange={e => setShowAccumulators(e.target.value === 'accumulators')}>
        <option value='standard'>{localize('Standard Contracts')}</option>
        <option value='accumulators'>{localize('Accumulators')}</option>
    </select>
</div>

{show_accumulators && (
    <div className='accumulator-panel'>
        {!accumulator_service.open_position ? (
            <>
                <div className='trade-form__row'>
                    <label>{localize('Growth Rate')}</label>
                    <select value={accu_growth_rate} onChange={e => setAccuGrowthRate(Number(e.target.value))}>
                        {[0.01, 0.02, 0.03, 0.04, 0.05].map(rate => (
                            <option key={rate} value={rate}>
                                {(rate * 100).toFixed(0)}%
                            </option>
                        ))}
                    </select>
                </div>

                <div className='trade-form__row trade-form__row--split'>
                    <div>
                        <label>{localize('Stake')} ({client?.currency ?? '—'})</label>
                        <input type='number' min={0.35} step={0.01} value={accu_stake} onChange={e => setAccuStake(Number(e.target.value))} />
                    </div>
                    <div>
                        <label>{localize('Take Profit (optional)')}</label>
                        <input
                            type='number'
                            value={accu_take_profit}
                            onChange={e => setAccuTakeProfit(e.target.value)}
                            placeholder={localize('None')}
                        />
                    </div>
                </div>

                {accu_error && <div className='proposal-preview__error'>{accu_error}</div>}
                {accu_proposal && !accu_error && (
                    <div className='proposal-preview__details'>
                        <span>{localize('Stake')}: <strong>{accu_proposal.ask_price.toFixed(2)}</strong></span>
                    </div>
                )}

                <button
                    className='action-button action-button--teal'
                    disabled={!accu_proposal || is_buying_accu}
                    onClick={handleBuyAccumulator}
                >
                    <span className='action-button__label'>
                        {is_buying_accu ? localize('Placing...') : localize('Buy Accumulator')}
                    </span>
                </button>
            </>
        ) : (
            <div className='accumulator-position'>
                <div className='accumulator-position__row'>
                    <span>{localize('Growth Rate')}</span>
                    <strong>{(accumulator_service.open_position.growth_rate * 100).toFixed(0)}%</strong>
                </div>
                <div className='accumulator-position__row'>
                    <span>{localize('Buy Price')}</span>
                    <strong>{accumulator_service.open_position.buy_price.toFixed(2)}</strong>
                </div>
                <div className='accumulator-position__row'>
                    <span>{localize('Current Profit')}</span>
                    <strong className={accumulator_service.open_position.profit >= 0 ? 'positive' : 'negative'}>
                        {accumulator_service.open_position.profit.toFixed(2)}
                    </strong>
                </div>
                {accumulator_service.open_position.is_sold ? (
                    <>
                        <div className='accumulator-position__closed'>{localize('Contract closed')}</div>
                        <button className='action-button action-button--teal' onClick={() => accumulator_service.clearPosition()}>
                            <span className='action-button__label'>{localize('Start New')}</span>
                        </button>
                    </>
                ) : (
                    <button
                        className='action-button action-button--red'
                        disabled={accumulator_service.is_loading}
                        onClick={handleSellAccumulator}
                    >
                        <span className='action-button__label'>
                            {accumulator_service.is_loading ? localize('Selling...') : localize('Sell Now')}
                        </span>
                    </button>
                )}
            </div>
        )}
    </div>
)}

                <div className='trade-form__row trade-form__row--split'>
                    <div>
                        <label>{localize('Number of Ticks')}</label>
                        <input
                            type='number'
                            min={50}
                            max={5000}
                            value={window_size}
                            onChange={e => setWindowSize(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label>{localize('Current Price')}</label>
                        <div className='current-price-display'>
                            {current_price !== null ? current_price.toFixed(getPipDisplayDigits(symbol)) : '—'}
                        </div>
                    </div>
                </div>

                <div className='digit-distribution'>
                    <label>{localize('Digit Distribution')}</label>
                    <DCircles percentages={percentages} current_digit={current_digit} variant='two-tier' />
                </div>

                <div className='trade-form__row'>
                    <label>{localize('Contract Type')}</label>
                    <div className='category-tabs'>
                        {(
                            [
                                'even_odd',
                                'over_under',
                                'matches_differs',
                                'rise_fall',
                                'touch_no_touch',
                                'higher_lower',
                                'ends_between_outside',
                            ] as TCategory[]
                        ).map(cat => (
                            <button
                                key={cat}
                                className={classNames('category-tabs__item', { active: category === cat })}
                                onClick={() => setCategory(cat)}
                            >
                                {cat === 'even_odd' && localize('Even/Odd')}
                                {cat === 'over_under' && localize('Over/Under')}
                                {cat === 'matches_differs' && localize('Matches/Differs')}
                                {cat === 'rise_fall' && localize('Rise/Fall')}
                                {cat === 'touch_no_touch' && localize('Touch/No Touch')}
                                {cat === 'higher_lower' && localize('Higher/Lower')}
                                {cat === 'ends_between_outside' && localize('Ends Between/Outside')}
                            </button>
                        ))}
                    </div>
                </div>

                {needsBarrier && category !== 'touch_no_touch' && category !== 'higher_lower' && category !== 'ends_between_outside' && (
                    <div className='trade-form__row'>
                        <label>{localize('Target Digit')}</label>
                        <div className='digit-picker'>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                <button
                                    key={d}
                                    className={classNames('digit-picker__item', { 'digit-picker__item--active': barrier_digit === d })}
                                    onClick={() => setBarrierDigit(d)}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {category === 'touch_no_touch' && (
                    <div className='trade-form__row'>
                        <label>{localize('Barrier Offset (e.g. +10 or -10)')}</label>
                        <input type='text' value={touch_barrier} onChange={e => setTouchBarrier(e.target.value)} placeholder='+10' />
                    </div>
                )}

                {category === 'higher_lower' && (
                    <div className='trade-form__row'>
                        <label>{localize('Barrier Offset')}</label>
                        <input
                            type='text'
                            value={higher_lower_barrier}
                            onChange={e => setHigherLowerBarrier(e.target.value)}
                            placeholder='+0.1'
                        />
                    </div>
                )}

                {category === 'ends_between_outside' && (
                    <div className='trade-form__row trade-form__row--split'>
                        <div>
                            <label>{localize('Lower Barrier')}</label>
                            <input type='text' value={range_barrier_low} onChange={e => setRangeBarrierLow(e.target.value)} placeholder='-0.5' />
                        </div>
                        <div>
                            <label>{localize('Upper Barrier')}</label>
                            <input type='text' value={range_barrier_high} onChange={e => setRangeBarrierHigh(e.target.value)} placeholder='+0.5' />
                        </div>
                    </div>
                )}

                <div className='trade-form__row'>
                    <label>{localize('Duration Unit')}</label>
                    <div className='direction-toggle'>
                        <button className={classNames({ active: duration_unit === 't' })} onClick={() => setDurationUnit('t')}>
                            {localize('Ticks')}
                        </button>
                        <button className={classNames({ active: duration_unit === 'm' })} onClick={() => setDurationUnit('m')}>
                            {localize('Minutes')}
                        </button>
                    </div>
                </div>

                <div className='trade-form__row trade-form__row--split'>
                    <div>
                        <label>{localize('Stake')} ({client?.currency ?? '—'})</label>
                        <input type='number' min={0.35} step={0.01} value={stake} onChange={e => setStake(Number(e.target.value))} />
                    </div>
                    <div>
                        <label>{localize('Duration')} ({duration_unit === 't' ? localize('ticks') : localize('min')})</label>
                        <input type='number' min={1} max={10} value={duration} onChange={e => setDuration(Number(e.target.value))} />
                    </div>
                </div>

                <div className='action-buttons'>
                    {sides.map(side => {
                        const proposal = side_proposals[side.key];
                        const error = side_errors[side.key];
                        const is_buying_this = buying_key === side.key;

                        return (
                            <button
                                key={side.key}
                                className={classNames('action-button', `action-button--${side.color}`)}
                                disabled={!proposal || is_fetching || buying_key !== null}
                                onClick={() => handleBuy(side)}
                            >
                                <span className='action-button__label'>{side.label}</span>
                                {is_buying_this ? (
                                    <span className='action-button__status'>{localize('Placing...')}</span>
                                ) : error ? (
                                    <span className='action-button__status action-button__status--error'>{localize('Unavailable')}</span>
                                ) : proposal ? (
                                    <span className='action-button__payout'>
                                        {localize('Payout')} {proposal.payout.toFixed(2)}
                                    </span>
                                ) : (
                                    <span className='action-button__status'>{localize('Loading...')}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {buy_result && (
                    <div className={classNames('buy-result', { 'buy-result--error': !buy_result.success })}>
                        {buy_result.message}
                    </div>
                )}
            </div>
        </div>
    );
});

export default ManualTraderComponent;