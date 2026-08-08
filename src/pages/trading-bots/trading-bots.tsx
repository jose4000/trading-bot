import React from 'react';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
import Text from '@/components/shared_ui/text';
import { save_types } from '@/external/bot-skeleton';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { TBotDefinition, TRADING_BOTS } from './bot-list';
import './trading-bots.scss';

const TradingBotsComponent = observer(() => {
    const { load_modal, dashboard } = useStore();
    const { isDesktop } = useDevice();
    const [loading_id, setLoadingId] = React.useState<string | null>(null);

    const handleLoadBot = async (bot: TBotDefinition) => {
        setLoadingId(bot.id);
        try {
            await load_modal.loadStrategyToBuilder(
                {
                    id: bot.id,
                    xml: bot.xml,
                    name: bot.name,
                    save_type: save_types.UNSAVED,
                } as any,
                true
            );
            dashboard.setActiveTab(DBOT_TABS.BOT_BUILDER);
        } finally {
            setLoadingId(null);
        }
    };

    const categories = Array.from(new Set(TRADING_BOTS.map(b => b.category)));

    return (
        <div className='tab__trading-bots'>
            <div className='tab__trading-bots__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    {localize('Trading Bots')}
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'} className='subtitle'>
                    {localize('Load a ready-made strategy directly into Bot Builder')}
                </Text>
            </div>

            {categories.map(category => (
                <div key={category} className='bot-category'>
                    <Text as='h3' size='s' weight='bold' className='bot-category__title'>
                        {category}
                    </Text>
                    <div className='bot-grid'>
                        {TRADING_BOTS.filter(b => b.category === category).map(bot => (
                            <div className='bot-card' key={bot.id}>
                                <Text size='xs' weight='bold' className='bot-card__name'>
                                    {bot.name}
                                </Text>
                                <Text size='xxxs' color='less-prominent' className='bot-card__description'>
                                    {bot.description}
                                </Text>
                                <Button
                                    text={loading_id === bot.id ? localize('Loading...') : localize('Load Bot')}
                                    onClick={() => handleLoadBot(bot)}
                                    disabled={loading_id !== null}
                                    primary
                                    small
                                    className='bot-card__button'
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
});

export default TradingBotsComponent;