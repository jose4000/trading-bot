import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
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

type TCategory =
    | 'even_odd'
    | 'over_under'
    | 'matches_differs'
    | 'rise_fall'
    | 'touch_no_touch'
    | 'higher_lower'
    | 'ends_between_outside';

type TDigitRank = 'most' | 'least' | 'default';

type TSide = {
    key: string;
    label: string;
    contract_type: TDigitContractType;
    barrier?: string;
    barrier2?: string;
    color: 'teal' | 'red';
};

function getDigitRanks(percentages: number[]): Record<number, TDigitRank> {
    const ranks: Record<number, TDigitRank> = {};
    for (let i = 0; i < 10; i++) ranks[i] = 'default';

    const sorted = percentages.map((pct, digit) => ({ digit, pct })).sort((a, b) => b.pct - a.pct);
    if (sorted[0]) ranks[sorted[0].digit] = 'most';
    if (sorted[9]) ranks[sorted[9].digit] = 'least';

    return ranks;
}

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

const ManualTraderComponent = observer(() => {
    const { client, scanner, transactions } = useStore();
    const { isDesktop } = useDevice();

    const [digit_history, setDigitHistory] = React.useState<number[]>([]);
    const [tick_lookahead, setTickLookahead] = React.useState(5);

    const [category, setCategory] = React.useState<TCategory>('even_odd');
    const [symbol, setSymbol] = React.useState(VOLATILITY_SYMBOLS[4]);
    const [stake, setStake] = React.useState(10);
    const [duration, setDuration] = React.useState(5);
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
    const digit_ranks = getDigitRanks(percentages);
    const current_stat = scanner.symbol_stats.find(s => s.symbol === symbol);
    const current_digit = current_stat?.streaks.current_digit ?? null;

    const most_frequent_digit = Object.entries(digit_ranks).find(([, rank]) => rank === 'most')?.[0];
    const least_frequent_digit = Object.entries(digit_ranks).find(([, rank]) => rank === 'least')?.[0];
    const most_frequent_pct = most_frequent_digit !== undefined ? percentages[Number(most_frequent_digit)] : 0;
    const least_frequent_pct = least_frequent_digit !== undefined ? percentages[Number(least_frequent_digit)] : 0;

    const even_count = digit_history.filter(d => d % 2 === 0).length;
    const odd_count = digit_history.length - even_count;
    const even_pct = digit_history.length > 0 ? (even_count / digit_history.length) * 100 : 0;
    const odd_pct = 100 - even_pct;

    // Fetch proposals for BOTH sides whenever trade parameters change
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
    ]);

    React.useEffect(() => {
        scanner.startScanning();
        const interval = setInterval(() => {
            setDigitHistory(scanner.getDigitHistory(symbol, tick_lookahead));
        }, 500);
        return () => clearInterval(interval);
    }, [scanner, symbol, tick_lookahead]);

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

                <div className='digit-trend'>
                    <label>{localize('Recent Digit Trend')}</label>
                    <div className='digit-trend__strip'>
                        {digit_history.length === 0 && (
                            <span className='digit-trend__empty'>{localize('Collecting data...')}</span>
                        )}
                        {digit_history.map((digit, index) => {
                            const is_even = digit % 2 === 0;
                            return (
                                <span
                                    key={index}
                                    className={classNames('digit-trend__item', {
                                        'digit-trend__item--even': is_even,
                                        'digit-trend__item--odd': !is_even,
                                    })}
                                >
                                    {is_even ? localize('Even') : localize('Odd')}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <div className='digit-distribution'>
                    <label>{localize('Digit Distribution')}</label>
                    <div className='digit-distribution__wrapper'>
                        {current_digit !== null && (
                            <div
                                className='digit-distribution__pointer'
                                style={{ left: `${(current_digit + 0.5) * (100 / 10)}%` }}
                            />
                        )}
                        <div className='digit-distribution__row'>
                            {percentages.map((pct, digit) => {
                                const rank = digit_ranks[digit];
                                const arc_color = rank === 'most' ? '#00c896' : rank === 'least' ? '#ff5252' : '#444';
                                const arc_pct = Math.min(pct * 4, 100); // visually exaggerate for readability
                                return (
                                    <div key={digit} className='digit-distribution__cell'>
                                        <div
                                            className='digit-distribution__arc'
                                            style={{
                                                background: `conic-gradient(${arc_color} ${arc_pct}%, transparent ${arc_pct}% 100%)`,
                                            }}
                                        >
                                            <div className='digit-distribution__arc-inner'>{digit}</div>
                                        </div>
                                        <span className='digit-distribution__pct'>{pct.toFixed(1)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className='session-stat-panel'>
                    <div className='session-stat-panel__title'>{localize('Session Stats')}</div>
                    <div className='session-stat-panel__row'>
                        <div className='session-stat'>
                            <span className='session-stat__label'>{localize('Most Frequent Digit')}</span>
                            <div className='session-stat__value'>
                                <span className='session-stat__digit session-stat__digit--most'>{most_frequent_digit ?? '—'}</span>
                                <span className='session-stat__pct'>{most_frequent_pct.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className='session-stat'>
                            <span className='session-stat__label'>{localize('Least Frequent Digit')}</span>
                            <div className='session-stat__value'>
                                <span className='session-stat__digit session-stat__digit--least'>{least_frequent_digit ?? '—'}</span>
                                <span className='session-stat__pct'>{least_frequent_pct.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                    <Text size='xxxs' color='less-prominent' className='session-stat-panel__disclaimer'>
                        {localize(
                            'This shows which digit has appeared most/least in the current session — it is historical data, not a forecast.'
                        )}
                    </Text>
                </div>

                <div className='bias-context'>
                    <div className='bias-context_header'>
                        <label>{localize('Session Even/Odd Bias')}</label>
                        <select value={tick_lookahead} onChange={e => setTickLookahead(Number(e.target.value))}>
                            {[5, 10, 20].map(n => (
                                <option key={n} value={n}>
                                    {localize('Last')} {n} {localize('ticks')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className='bias-context_bars'>
                        <div className='bias-context_bar'>
                            <span className='bias-context_label bias-context_label--even'>{localize('Even')}</span>
                            <div className='bias-context_track'>
                                <div className='bias-context_fill bias-context_fill--even' style={{ width: `${even_pct}%` }} />
                            </div>
                            <span className='bias-context_pct'>{even_pct.toFixed(0)}%</span>
                        </div>
                        <div className='bias-context_bar'>
                            <span className='bias-context_label bias-context_label--odd'>{localize('Odd')}</span>
                            <div className='bias-context_track'>
                                <div className='bias-context_fill bias-context_fill--odd' style={{ width: `${odd_pct}%` }} />
                            </div>
                            <span className='bias-content_pct'>{odd_pct.toFixed(0)}%</span>
                        </div>
                    </div>
                    <Text size='xxxs' color='less-prominent' className='bias-context_disclaimer'>
                        {localize('This reflects what already happened — each tick is independent, not a prediction.')}
                    </Text>
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

                {/* ── Direct-buy action buttons, one per side ── */}
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