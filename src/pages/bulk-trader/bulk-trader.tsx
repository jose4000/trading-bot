import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { VOLATILITY_SYMBOLS } from '@/services/scanner/types';
import { bulk_trade_service, TBulkTradeResult, TBulkTradeRow } from '@/services/bulk-trade/bulk-trade-service';
import { TDigitContractType } from '@/services/manual-trade/manual-trade-service';
import { localize } from '@deriv-com/translations';
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

const CONTRACT_TYPE_LABELS: Record<TDigitContractType, string> = {
    DIGITEVEN: 'Even',
    DIGITODD: 'Odd',
    DIGITOVER: 'Over',
    DIGITUNDER: 'Under',
    DIGITMATCH: 'Matches',
    DIGITDIFF: 'Differs',
    CALL: 'Rise',
    PUT: 'Fall',
};

const NEEDS_BARRIER: TDigitContractType[] = ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'];

let row_id_counter = 0;
const makeRow = (): TBulkTradeRow => ({
    id: `row-${++row_id_counter}`,
    symbol: VOLATILITY_SYMBOLS[4],
    contract_type: 'DIGITEVEN',
    stake: 10,
    duration: 5,
    barrier: undefined,
});

const BulkTraderComponent = observer(() => {
    const { client, transactions } = useStore();
    const { isDesktop } = useDevice();

    const [rows, setRows] = React.useState<TBulkTradeRow[]>([makeRow()]);
    const [use_common_stake, setUseCommonStake] = React.useState(false);
    const [common_stake, setCommonStake] = React.useState(10);
    const [results, setResults] = React.useState<Record<string, TBulkTradeResult>>({});
    const [is_guide_open, setIsGuideOpen] = React.useState(true);
    const [is_executing, setIsExecuting] = React.useState(false);
    const [is_confirm_open, setIsConfirmOpen] = React.useState(false);

    const updateRow = (id: string, patch: Partial<TBulkTradeRow>) => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    };

    const addRow = () => setRows(prev => [...prev, makeRow()]);
    const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

    const effective_rows = rows.map(r => ({
        ...r,
        stake: use_common_stake ? common_stake : r.stake,
    }));

    const total_stake = effective_rows.reduce((sum, r) => sum + r.stake, 0);

    const handleExecuteClick = () => {
        if (rows.length === 0) return;
        setResults({});
        setIsConfirmOpen(true);
    };

    const handleConfirmExecute = async () => {
        setIsConfirmOpen(false);
        setIsExecuting(true);
        try {
            await bulk_trade_service.executeAll(effective_rows, client?.currency ?? 'USD', (id, result) => {
                setResults(prev => ({ ...prev, [id]: result }));
            },
            contract => transactions.onBotContractEvent(contract)
        );
        } finally {
            setIsExecuting(false);
        }
    };

    const success_count = Object.values(results).filter(r => r.status === 'success').length;
    const failed_count = Object.values(results).filter(r => r.status === 'failed').length;

    return (
        <div className='tab__bulk-trader'>
            <div className='tab__bulk-trader__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Bulk Trader')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Configure and place multiple trades together')}
                </Text>
            </div>

           <div className='guide-box'>
    <button className='guide-box__toggle' onClick={() => setIsGuideOpen(!is_guide_open)}>
        <span>💡 {localize('How Bulk Trader Works')}</span>
        <span className={classNames('guide-box__chevron', { 'guide-box__chevron--open': is_guide_open })}>▾</span>
    </button>
    {is_guide_open && (
        <ol className='guide-box__steps'>
            <li>
                <strong>{localize('Add trades')}</strong> —{' '}
                {localize('each row below is one trade. Click "+ Add Trade" to queue more.')}
            </li>
            <li>
                <strong>{localize('Set up each row')}</strong> —{' '}
                {localize('pick market, contract type, barrier (if needed), stake, and duration.')}
            </li>
            <li>
                <strong>{localize('Optional: one shared stake')}</strong> —{' '}
                {localize('check the box above to use the same stake for every trade instead.')}
            </li>
            <li>
                <strong>{localize('Execute')}</strong> —{' '}
                {localize('click "Execute All Trades", review the total, then confirm.')}
            </li>
            <li>
                <strong>{localize('Trades run one at a time')}</strong> —{' '}
                {localize('not simultaneously. Watch each row\u2019s status: pending → success or failed.')}
            </li>
        </ol>
    )}
</div> 


<div className='common-stake-toggle'>
                <label>
                    <input
                        type='checkbox'
                        checked={use_common_stake}
                        onChange={e => setUseCommonStake(e.target.checked)}
                    />
                    {localize('Use one stake for all trades')}
                </label>
                {use_common_stake && (
                    <input
                        type='number'
                        min={0.35}
                        step={0.01}
                        value={common_stake}
                        onChange={e => setCommonStake(Number(e.target.value))}
                        className='common-stake-toggle__input'
                    />
                )}
            </div>

            <div className='trade-rows'>
                {rows.map((row, index) => {
                    const result = results[row.id];
                    return (
                        <div className='trade-row' key={row.id}>
                            <div className='trade-row__index'>{index + 1}</div>

                            <select
                                value={row.symbol}
                                onChange={e => updateRow(row.id, { symbol: e.target.value })}
                                disabled={is_executing}
                            >
                                {VOLATILITY_SYMBOLS.map(s => (
                                    <option key={s} value={s}>
                                        {SYMBOL_DISPLAY_NAMES[s] ?? s}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={row.contract_type}
                                onChange={e => {
                                    const ct = e.target.value as TDigitContractType;
                                    updateRow(row.id, {
                                        contract_type: ct,
                                        barrier: NEEDS_BARRIER.includes(ct) ? '5' : undefined,
                                    });
                                }}
                                disabled={is_executing}
                            >
                                {(Object.keys(CONTRACT_TYPE_LABELS) as TDigitContractType[]).map(ct => (
                                    <option key={ct} value={ct}>
                                        {CONTRACT_TYPE_LABELS[ct]}
                                    </option>
                                ))}
                            </select>

                            {NEEDS_BARRIER.includes(row.contract_type) && (
                                <select
                                    value={row.barrier}
                                    onChange={e => updateRow(row.id, { barrier: e.target.value })}
                                    disabled={is_executing}
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {!use_common_stake && (
                                <div className='trade-row__field'>
                                    <span className='trade-row__field-label'>{localize('Stake')}</span>
                                <input
                                    type='number'
                                    min={0.35}
                                    step={0.01}
                                    value={row.stake}
                                    onChange={e => updateRow(row.id, { stake: Number(e.target.value) })}
                                    disabled={is_executing}
                                    className='trade-row__stake'
                                />
                                </div>
                            )}
                        <div className='trade-row__field'>
                          <span className='trade-row__field-label'>{localize('Ticks')}</span>   
                            <input
                                type='number'
                                min={1}
                                max={10}
                                value={row.duration}
                                onChange={e => updateRow(row.id, { duration: Number(e.target.value) })}
                                disabled={is_executing}
                                className='trade-row__duration'
                            />
                            </div>

                            {result ? (
                                <span
                                    className={classNames('trade-row__status', `trade-row__status--${result.status}`)}
                                >
                                    {result.status === 'pending' && localize('Placing...')}
                                    {result.status === 'success' && `${localize('OK')} #${result.contract_id}`}
                                    {result.status === 'failed' && localize('Failed')}
                                </span>
                            ) : (
                                <button
                                    className='trade-row__remove'
                                    onClick={() => removeRow(row.id)}
                                    disabled={is_executing || rows.length === 1}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <Button text={localize('+ Add Trade')} onClick={addRow} disabled={is_executing} secondary />

            <div className='execute-summary'>
               <div className='execute-summary__item'>
        <span className='execute-summary__label'>{localize('TOTAL STAKE')}</span>
        <span className='execute-summary__value'>{total_stake.toFixed(2)} {client?.currency}</span>
              </div>
            
            <div className='execute-summary__item'>
                <span className='execute-summary__label'>{localize('NUMBER OF TRADES')}</span>
                <span className='execute-summary__value'>{rows.length}</span>
            </div>
            </div>

            <Button
                text={is_executing ? localize('Executing...') : localize('Execute All Trades')}
                onClick={handleExecuteClick}
                disabled={is_executing || rows.length === 0}
                primary
                large
                className='execute-button'
            />

            {(success_count > 0 || failed_count > 0) && !is_executing && (
                <div className='results-summary'>
                    {localize('Completed')}: {success_count} {localize('succeeded')}, {failed_count}{' '}
                    {localize('failed')}
                </div>
            )}

            {is_confirm_open && (
                <div className='confirm-modal-overlay' onClick={() => setIsConfirmOpen(false)}>
                    <div className='confirm-modal' onClick={e => e.stopPropagation()}>
                        <Text as='h3' size='s' weight='bold'>
                            {localize('Confirm Bulk Trade')}
                        </Text>
                        <Text size='xs' className='confirm-modal__warning'>
                            {localize('You are about to place')} <strong>{rows.length}</strong>{' '}
                            {localize('trades totalling')} <strong>{total_stake.toFixed(2)} {client?.currency}</strong>.{' '}
                            {localize('Each trade will be placed one after another.')}
                        </Text>
                        <div className='confirm-modal__actions'>
                            <Button text={localize('Cancel')} onClick={() => setIsConfirmOpen(false)} secondary />
                            <Button text={localize('Confirm & Execute')} onClick={handleConfirmExecute} primary />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default BulkTraderComponent;