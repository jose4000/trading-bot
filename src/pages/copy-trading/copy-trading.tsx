import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { copy_trading_service, TTraderStats } from '@/services/copy-trading/copy-trading-service';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import './copy-trading.scss';

const CopyTradingComponent = observer(() => {
    const { client } = useStore();
    const { isDesktop } = useDevice();

    const [trader_token, setTraderToken] = React.useState('');
    const [max_stake, setMaxStake] = React.useState('');
    const [min_stake, setMinStake] = React.useState('');
    const [is_copying, setIsCopying] = React.useState(false);
    const [is_loading, setIsLoading] = React.useState(false);
    const [status_message, setStatusMessage] = React.useState<{ success: boolean; text: string } | null>(null);
    const [trader_stats, setTraderStats] = React.useState<TTraderStats | null>(null);
    const [is_confirm_open, setIsConfirmOpen] = React.useState(false);

    const [allow_copiers, setAllowCopiers] = React.useState(false);
    const [is_toggling_allow, setIsTogglingAllow] = React.useState(false);

    const handleCheckStats = async () => {
        if (!trader_token.trim()) return;
        setStatusMessage(null);
        setTraderStats(null);
        setIsLoading(true);
        try {
            // Deriv's copytrading_statistics expects the trader's loginid, not the token itself,
            // in most integrations copiers use the trader's account ID shared alongside the token.
            const stats = await copy_trading_service.getTraderStatistics(trader_token.trim());
            setTraderStats(stats);
        } catch (err: any) {
            setStatusMessage({ success: false, text: err.message || localize('Failed to fetch trader stats') });
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartClick = () => {
        if (!trader_token.trim()) return;
        setIsConfirmOpen(true);
    };

    const handleConfirmStart = async () => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
            await copy_trading_service.startCopying({
                trader_token: trader_token.trim(),
                max_trade_stake: max_stake ? Number(max_stake) : undefined,
                min_trade_stake: min_stake ? Number(min_stake) : undefined,
            });
            setIsCopying(true);
            setStatusMessage({ success: true, text: localize('Now copying this trader') });
        } catch (err: any) {
            setStatusMessage({ success: false, text: err.message || localize('Failed to start copying') });
        } finally {
            setIsLoading(false);
            setIsConfirmOpen(false);
        }
    };

    const handleStop = async () => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
            await copy_trading_service.stopCopying(trader_token.trim());
            setIsCopying(false);
            setStatusMessage({ success: true, text: localize('Stopped copying') });
        } catch (err: any) {
            setStatusMessage({ success: false, text: err.message || localize('Failed to stop copying') });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAllowCopiers = async () => {
        setIsTogglingAllow(true);
        try {
            const next = !allow_copiers;
            await copy_trading_service.setAllowCopiers(next);
            setAllowCopiers(next);
        } catch (err: any) {
            setStatusMessage({ success: false, text: err.message || localize('Failed to update setting') });
        } finally {
            setIsTogglingAllow(false);
        }
    };

    return (
        <div className='tab__copy-trading'>
            <div className='tab__copy-trading__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Copy Trading')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Automatically replicate another trader\'s trades in your account')}
                </Text>
            </div>

            <div className='risk-notice'>
                <Text as='h3' size='xs' weight='bold'>
                    {localize('How Copy Trading Works')}
                </Text>
                <Text size='xxxs' className='risk-notice__text'>
                    {localize(
                        'You allocate an amount to copy a trader. When they trade, a proportional trade is placed in your account automatically. If they sell or close, your position closes too.'
                    )}
                </Text>
                <Text as='h3' size='xs' weight='bold' className='risk-notice__title'>
                    {localize('Risks')}
                </Text>
                <ul className='risk-notice__list'>
                    <li>{localize('No guarantee of profit — if the trader loses, you lose too')}</li>
                    <li>{localize('Past performance does not guarantee future results')}</li>
                    <li>{localize("Some traders take risks that may not match your own tolerance")}</li>
                </ul>
            </div>

            <div className='copy-section'>
                <Text as='h3' size='s' weight='bold'>
                    {localize('Copy a Trader')}
                </Text>

                <div className='trade-form__row'>
                    <label>{localize("Trader's Read-Only API Token")}</label>
                    <input
                        type='text'
                        value={trader_token}
                        onChange={e => setTraderToken(e.target.value)}
                        placeholder={localize('Paste token shared by the trader')}
                        disabled={is_copying}
                    />
                </div>

                <Button
                    text={localize('Check Trader Stats')}
                    onClick={handleCheckStats}
                    disabled={!trader_token.trim() || is_loading}
                    secondary
                />

                {trader_stats && (
                    <div className='trader-stats'>
                        <div>
                            {localize('Total Trades')}: <strong>{trader_stats.total_trades ?? '—'}</strong>
                        </div>
                        <div>
                            {localize('Copiers')}: <strong>{trader_stats.copiers ?? '—'}</strong>
                        </div>
                        <div>
                            {localize('Avg Profit')}: <strong>{trader_stats.avg_profit ?? '—'}</strong>
                        </div>
                    </div>
                )}

                <div className='trade-form__row trade-form__row--split'>
                    <div>
                        <label>{localize('Max Stake per Trade')} ({client?.currency ?? '—'})</label>
                        <input
                            type='number'
                            value={max_stake}
                            onChange={e => setMaxStake(e.target.value)}
                            placeholder={localize('Optional')}
                            disabled={is_copying}
                        />
                    </div>
                    <div>
                        <label>{localize('Min Stake per Trade')}</label>
                        <input
                            type='number'
                            value={min_stake}
                            onChange={e => setMinStake(e.target.value)}
                            placeholder={localize('Optional')}
                            disabled={is_copying}
                        />
                    </div>
                </div>

                {!is_copying ? (
                    <Button
                        text={localize('Start Copying')}
                        onClick={handleStartClick}
                        disabled={!trader_token.trim() || is_loading}
                        primary
                        large
                    />
                ) : (
                    <Button
                        text={is_loading ? localize('Stopping...') : localize('Stop Copying')}
                        onClick={handleStop}
                        disabled={is_loading}
                        primary
                        large
                        className='copy-section__stop-button'
                    />
                )}

                {status_message && (
                    <div className={classNames('status-message', { 'status-message--error': !status_message.success })}>
                        {status_message.text}
                    </div>
                )}
            </div>

            <div className='trader-section'>
                <Text as='h3' size='s' weight='bold'>
                    {localize('Become a Trader')}
                </Text>
                <Text size='xxxs' color='less-prominent'>
                    {localize('Let others copy your trades. Generate a read-only API token in your account settings and share it — never share a trade-enabled token.')}
                </Text>
                <Button
                    text={
                        is_toggling_allow
                            ? localize('Updating...')
                            : allow_copiers
                              ? localize('Disable Copiers')
                              : localize('Allow Copiers')
                    }
                    onClick={handleToggleAllowCopiers}
                    disabled={is_toggling_allow}
                    secondary
                />
            </div>

            {is_confirm_open && (
                <div className='confirm-modal-overlay' onClick={() => setIsConfirmOpen(false)}>
                    <div className='confirm-modal' onClick={e => e.stopPropagation()}>
                        <Text as='h3' size='s' weight='bold'>
                            {localize('Confirm Copy Trading')}
                        </Text>
                        <Text size='xs' className='confirm-modal__warning'>
                            {localize(
                                'Trades will be placed in your account automatically from this point on, without individual confirmation, until you stop copying.'
                            )}
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

export default CopyTradingComponent;