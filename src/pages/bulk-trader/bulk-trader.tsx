import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import DCircles from '@/components/d-circles/d-circles';
import { useStore } from '@/hooks/useStore';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/types';
import { manual_trade_service, TDigitContractType } from '@/services/manual-trade/manual-trade-service';
import { localize } from '@deriv-com/translations';
import { api_base } from '@/external/bot-skeleton';
import { useDevice } from '@deriv-com/ui';
import './bulk-trader.scss';

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
type TSide = { key: string; label: string; contract_type: TDigitContractType; barrier?: string; color: 'teal' | 'red' };
type TRowResult = { index: number; status: 'pending' | 'success' | 'failed'; contract_id?: number; error?: string };

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

const BulkTraderComponent = observer(() => {
    const { client, scanner, transactions } = useStore();
    const { isDesktop } = useDevice();

    const [symbol, setSymbol] = React.useState(VOLATILITY_SYMBOLS[4]);
    const [category, setCategory] = React.useState<TCategory>('even_odd');
    const [barrier_digit, setBarrierDigit] = React.useState(5);
    const [stake, setStake] = React.useState(0.5);
    const [duration, setDuration] = React.useState(1);
    const [num_trades, setNumTrades] = React.useState(1);

    const [results, setResults] = React.useState<TRowResult[]>([]);
    const [is_executing, setIsExecuting] = React.useState(false);
    const [executing_key, setExecutingKey] = React.useState<string | null>(null);

    React.useEffect(() => {
        scanner.startScanning();
    }, [scanner]);

    const percentages = scanner.getPercentages(symbol);
    const current_digit = scanner.symbol_stats.find(s => s.symbol === symbol)?.streaks.current_digit ?? null;

    const getSides = (): TSide[] => {
        if (category === 'even_odd') {
            return [
                { key: 'even', label: localize('Even'), contract_type: 'DIGITEVEN', color: 'teal' },
                { key: 'odd', label: localize('Odd'), contract_type: 'DIGITODD', color: 'red' },
            ];
        }
        if (category === 'over_under') {
            return [
                { key: 'over', label: localize('Over'), contract_type: 'DIGITOVER', barrier: String(barrier_digit), color: 'teal' },
                { key: 'under', label: localize('Under'), contract_type: 'DIGITUNDER', barrier: String(barrier_digit), color: 'red' },
            ];
        }
        return [
            { key: 'matches', label: localize('Matches'), contract_type: 'DIGITMATCH', barrier: String(barrier_digit), color: 'teal' },
            { key: 'differs', label: localize('Differs'), contract_type: 'DIGITDIFF', barrier: String(barrier_digit), color: 'red' },
        ];
    };

    const handleFire = async (side: TSide) => {
        setExecutingKey(side.key);
        setIsExecuting(true);
        const new_results: TRowResult[] = Array.from({ length: num_trades }, (_, i) => ({ index: i, status: 'pending' }));
        setResults(new_results);

        for (let i = 0; i < num_trades; i++) {
            try {
                const proposal = await manual_trade_service.getProposal({
                    amount: stake,
                    currency: client?.currency ?? 'USD',
                    contract_type: side.contract_type,
                    symbol,
                    duration,
                    duration_unit: 't',
                    barrier: side.barrier,
                });
                const buy = await manual_trade_service.buyContract(proposal.id, proposal.ask_price);
setResults(prev => prev.map(r => (r.index === i ? { ...r, status: 'success', contract_id: buy.contract_id } : r)));
subscribeToContractOutcome(buy.contract_id, contract => {
    transactions.onBotContractEvent(contract);
});
            } catch (err: any) {
                setResults(prev => prev.map(r => (r.index === i ? { ...r, status: 'failed', error: err.message } : r)));
            }
        }

        setIsExecuting(false);
        setExecutingKey(null);
    };

    const sides = getSides();
    const success_count = results.filter(r => r.status === 'success').length;
    const failed_count = results.filter(r => r.status === 'failed').length;

    return (
        <div className='tab__bulk-trader'>
            <div className='tab__bulk-trader__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Bulk Trader')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Fire multiple trades of the same type at once')}
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

            <div className='digit-distribution'>
                <label>{localize('Digit Distribution')}</label>
                <DCircles percentages={percentages} current_digit={current_digit} variant='four-tier' />
            </div>

            <div className='trade-form__row'>
                <label>{localize('Contract Category')}</label>
                <div className='category-tabs'>
                    {(['even_odd', 'over_under', 'matches_differs'] as TCategory[]).map(cat => (
                        <button
                            key={cat}
                            className={classNames('category-tabs__item', { active: category === cat })}
                            onClick={() => setCategory(cat)}
                        >
                            {cat === 'even_odd' && localize('Even/Odd')}
                            {cat === 'over_under' && localize('Over/Under')}
                            {cat === 'matches_differs' && localize('Matches/Differs')}
                        </button>
                    ))}
                </div>
            </div>

            {category !== 'even_odd' && (
                <div className='trade-form__row'>
                    <label>{localize('Target Digit')}</label>
                    <div className='mini-digit-picker'>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                            <button
                                key={d}
                                className={classNames('mini-digit-picker__item', { 'mini-digit-picker__item--active': barrier_digit === d })}
                                onClick={() => setBarrierDigit(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className='trade-form__row trade-form__row--split'>
                <div>
                    <label>{localize('Stake')} ({client?.currency ?? '—'})</label>
                    <input type='number' min={0.35} step={0.01} value={stake} onChange={e => setStake(Number(e.target.value))} />
                </div>
                <div>
                    <label>{localize('Ticks')}</label>
                    <input type='number' min={1} max={10} value={duration} onChange={e => setDuration(Number(e.target.value))} />
                </div>
                <div>
                    <label>{localize('Number of Trades')}</label>
                    <input type='number' min={1} max={50} value={num_trades} onChange={e => setNumTrades(Number(e.target.value))} />
                </div>
            </div>

            <div className='action-buttons'>
                {sides.map(side => (
                    <button
                        key={side.key}
                        className={classNames('action-button', `action-button--${side.color}`)}
                        disabled={is_executing}
                        onClick={() => handleFire(side)}
                    >
                        <span className='action-button__label'>{side.label}</span>
                        <span className='action-button__status'>
                            {executing_key === side.key ? localize('Executing...') : `${num_trades} ${localize('trades')}`}
                        </span>
                    </button>
                ))}
            </div>

            {results.length > 0 && (
                <div className='bulk-results'>
                    {!is_executing && (
                        <div className='bulk-results__summary'>
                            {success_count} {localize('succeeded')}, {failed_count} {localize('failed')}
                        </div>
                    )}
                    <div className='bulk-results__grid'>
                        {results.map(r => (
                            <span key={r.index} className={classNames('bulk-results__chip', `bulk-results__chip--${r.status}`)}>
                                {r.status === 'pending' && '…'}
                                {r.status === 'success' && `#${r.contract_id}`}
                                {r.status === 'failed' && '✕'}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default BulkTraderComponent;