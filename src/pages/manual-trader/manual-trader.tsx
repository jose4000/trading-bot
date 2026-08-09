import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
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

type TCategory = 'even_odd' | 'over_under' | 'matches_differs';

const ManualTraderComponent = observer(() => {
    const { client } = useStore();
    const { isDesktop } = useDevice();

    const [category, setCategory] = React.useState<TCategory>('even_odd');
    const [symbol, setSymbol] = React.useState(VOLATILITY_SYMBOLS[4]);
    const [stake, setStake] = React.useState(10);
    const [duration, setDuration] = React.useState(5);
    const [direction, setDirection] = React.useState<'even' | 'odd' | 'over' | 'under' | 'matches' | 'differs'>(
        'even'
    );
    const [barrier_digit, setBarrierDigit] = React.useState(5);

    const [proposal, setProposal] = React.useState<TProposalResult | null>(null);
    const [proposal_error, setProposalError] = React.useState<string | null>(null);
    const [is_fetching_proposal, setIsFetchingProposal] = React.useState(false);
    const [is_confirm_open, setIsConfirmOpen] = React.useState(false);
    const [is_buying, setIsBuying] = React.useState(false);
    const [buy_result, setBuyResult] = React.useState<{ success: boolean; message: string } | null>(null);

    const getContractType = (): TDigitContractType => {
        if (category === 'even_odd') return direction === 'even' ? 'DIGITEVEN' : 'DIGITODD';
        if (category === 'over_under') return direction === 'over' ? 'DIGITOVER' : 'DIGITUNDER';
        return direction === 'matches' ? 'DIGITMATCH' : 'DIGITDIFF';
    };

    const needsBarrier = category === 'over_under' || category === 'matches_differs';

    // Fetch a fresh proposal whenever trade parameters change
    React.useEffect(() => {
        let cancelled = false;
        setProposal(null);
        setProposalError(null);

        if (!client?.currency || stake <= 0 || duration <= 0) return;

        setIsFetchingProposal(true);
        const timer = setTimeout(async () => {
            try {
                const result = await manual_trade_service.getProposal({
                    amount: stake,
                    currency: client.currency,
                    contract_type: getContractType(),
                    symbol,
                    duration,
                    duration_unit: 't',
                    barrier: needsBarrier ? String(barrier_digit) : undefined,
                });
                if (!cancelled) setProposal(result);
            } catch (err: any) {
                if (!cancelled) setProposalError(err.message || 'Failed to fetch proposal');
            } finally {
                if (!cancelled) setIsFetchingProposal(false);
            }
        }, 600);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, symbol, stake, duration, direction, barrier_digit, client?.currency]);

    const handleBuyClick = () => {
        if (!proposal) return;
        setBuyResult(null);
        setIsConfirmOpen(true);
    };

    const handleConfirmBuy = async () => {
        if (!proposal) return;
        setIsBuying(true);
        try {
            const result = await manual_trade_service.buyContract(proposal.id, proposal.ask_price);
            setBuyResult({
                success: true,
                message: `${localize('Trade placed')} — ${localize('Contract ID')}: ${result.contract_id}`,
            });
        } catch (err: any) {
            setBuyResult({ success: false, message: err.message || localize('Trade failed') });
        } finally {
            setIsBuying(false);
            setIsConfirmOpen(false);
        }
    };

    return (
        <div className='tab__manual-trader'>
            <div className='tab__manual-trader__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Manual Trader')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Place trades directly — every trade requires your confirmation')}
                </Text>
            </div>

            <div className='trade-form'>
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

                <div className='trade-form__row'>
                    <label>{localize('Contract Category')}</label>
                    <div className='category-tabs'>
                        {(['even_odd', 'over_under', 'matches_differs'] as TCategory[]).map(cat => (
                            <button
                                key={cat}
                                className={classNames('category-tabs__item', { active: category === cat })}
                                onClick={() => {
                                    setCategory(cat);
                                    setDirection(
                                        cat === 'even_odd' ? 'even' : cat === 'over_under' ? 'over' : 'matches'
                                    );
                                }}
                            >
                                {cat === 'even_odd' && localize('Even/Odd')}
                                {cat === 'over_under' && localize('Over/Under')}
                                {cat === 'matches_differs' && localize('Matches/Differs')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className='trade-form__row'>
                    <label>{localize('Direction')}</label>
                    <div className='direction-toggle'>
                        {category === 'even_odd' && (
                            <>
                                <button
                                    className={classNames({ active: direction === 'even' })}
                                    onClick={() => setDirection('even')}
                                >
                                    {localize('Even')}
                                </button>
                                <button
                                    className={classNames({ active: direction === 'odd' })}
                                    onClick={() => setDirection('odd')}
                                >
                                    {localize('Odd')}
                                </button>
                            </>
                        )}
                        {category === 'over_under' && (
                            <>
                                <button
                                    className={classNames({ active: direction === 'over' })}
                                    onClick={() => setDirection('over')}
                                >
                                    {localize('Over')}
                                </button>
                                <button
                                    className={classNames({ active: direction === 'under' })}
                                    onClick={() => setDirection('under')}
                                >
                                    {localize('Under')}
                                </button>
                            </>
                        )}
                        {category === 'matches_differs' && (
                            <>
                                <button
                                    className={classNames({ active: direction === 'matches' })}
                                    onClick={() => setDirection('matches')}
                                >
                                    {localize('Matches')}
                                </button>
                                <button
                                    className={classNames({ active: direction === 'differs' })}
                                    onClick={() => setDirection('differs')}
                                >
                                    {localize('Differs')}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {needsBarrier && (
                    <div className='trade-form__row'>
                        <label>{localize('Barrier Digit')}</label>
                        <select value={barrier_digit} onChange={e => setBarrierDigit(Number(e.target.value))}>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className='trade-form__row trade-form__row--split'>
                    <div>
                        <label>{localize('Stake')} ({client?.currency ?? '—'})</label>
                        <input
                            type='number'
                            min={0.35}
                            step={0.01}
                            value={stake}
                            onChange={e => setStake(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label>{localize('Duration (ticks)')}</label>
                        <input
                            type='number'
                            min={1}
                            max={10}
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className='proposal-preview'>
                    {is_fetching_proposal && (
                        <Text size='xs' color='less-prominent'>
                            {localize('Fetching price...')}
                        </Text>
                    )}
                    {proposal_error && (
                        <Text size='xs' className='proposal-preview__error'>
                            {proposal_error}
                        </Text>
                    )}
                    {proposal && !is_fetching_proposal && (
                        <div className='proposal-preview__details'>
                            <span>
                                {localize('Payout')}: <strong>{proposal.payout.toFixed(2)}</strong>
                            </span>
                            <span>
                                {localize('Stake')}: <strong>{proposal.ask_price.toFixed(2)}</strong>
                            </span>
                        </div>
                    )}
                </div>

                <Button
                    text={localize('Buy')}
                    onClick={handleBuyClick}
                    disabled={!proposal || is_fetching_proposal}
                    primary
                    large
                    className='trade-form__buy-button'
                />

                {buy_result && (
                    <div className={classNames('buy-result', { 'buy-result--error': !buy_result.success })}>
                        {buy_result.message}
                    </div>
                )}
            </div>

            {is_confirm_open && proposal && (
                <div className='confirm-modal-overlay' onClick={() => setIsConfirmOpen(false)}>
                    <div className='confirm-modal' onClick={e => e.stopPropagation()}>
                        <Text as='h3' size='s' weight='bold'>
                            {localize('Confirm Trade')}
                        </Text>
                        <div className='confirm-modal__details'>
                            <div>
                                {localize('Market')}: <strong>{SYMBOL_DISPLAY_NAMES[symbol] ?? symbol}</strong>
                            </div>
                            <div>
                                {localize('Contract')}: <strong>{getContractType()}</strong>
                                {needsBarrier && ` (${barrier_digit})`}
                            </div>
                            <div>
                                {localize('Stake')}: <strong>{proposal.ask_price.toFixed(2)} {client?.currency}</strong>
                            </div>
                            <div>
                                {localize('Potential Payout')}: <strong>{proposal.payout.toFixed(2)} {client?.currency}</strong>
                            </div>
                        </div>
                        <div className='confirm-modal__actions'>
                            <Button
                                text={localize('Cancel')}
                                onClick={() => setIsConfirmOpen(false)}
                                secondary
                                disabled={is_buying}
                            />
                            <Button
                                text={is_buying ? localize('Placing...') : localize('Confirm & Buy')}
                                onClick={handleConfirmBuy}
                                primary
                                disabled={is_buying}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ManualTraderComponent;