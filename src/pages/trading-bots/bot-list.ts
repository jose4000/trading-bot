import accumulatorsDalembert from '@/xml/accumulators_dalembert.xml';
import accumulatorsDalembertOnStatReset from '@/xml/accumulators_dalembert_on_stat_reset.xml';
import accumulatorsMartingale from '@/xml/accumulators_martingale.xml';
import accumulatorsMartingaleOnStatReset from '@/xml/accumulators_martingale_on_stat_reset.xml';
import accumulatorsReverseDalembert from '@/xml/accumulators_reverse_dalembert.xml';
import accumulatorsReverseDalembertOnStatReset from '@/xml/accumulators_reverse_dalembert_on_stat_reset.xml';
import accumulatorsReverseMartingale from '@/xml/accumulators_reverse_martingale.xml';
import accumulatorsReverseMartingaleOnStatReset from '@/xml/accumulators_reverse_martingale_on_stat_reset.xml';
import dalembert from '@/xml/dalembert.xml';
import dalembertMaxStake from '@/xml/dalembert_max-stake.xml';
import martingale from '@/xml/martingale.xml';
import martingaleMaxStake from '@/xml/martingale_max-stake.xml';
import oscarsGrind from '@/xml/oscars_grind.xml';
import oscarsGrindMaxStake from '@/xml/oscars_grind_max-stake.xml';
import reverseDalembert from '@/xml/reverse_dalembert.xml';
import reverseMartingale from '@/xml/reverse_martingale.xml';
import strategy1326 from '@/xml/1_3_2_6.xml';

export type TBotDefinition = {
    id: string;
    name: string;
    description: string;
    category: 'Classic' | 'Accumulators';
    xml: string;
};

export const TRADING_BOTS: TBotDefinition[] = [
    {
        id: 'martingale',
        name: 'Martingale',
        description: 'Doubles stake after each loss, resets on win. Classic recovery strategy.',
        category: 'Classic',
        xml: martingale,
    },
    {
        id: 'martingale-max-stake',
        name: 'Martingale (Max Stake)',
        description: 'Martingale with a capped maximum stake to limit downside risk.',
        category: 'Classic',
        xml: martingaleMaxStake,
    },
    {
        id: 'reverse-martingale',
        name: 'Reverse Martingale',
        description: 'Increases stake after each win instead of each loss.',
        category: 'Classic',
        xml: reverseMartingale,
    },
    {
        id: 'dalembert',
        name: "D'Alembert",
        description: 'Increases stake by a fixed unit after a loss, decreases after a win.',
        category: 'Classic',
        xml: dalembert,
    },
    {
        id: 'dalembert-max-stake',
        name: "D'Alembert (Max Stake)",
        description: "D'Alembert with a capped maximum stake.",
        category: 'Classic',
        xml: dalembertMaxStake,
    },
    {
        id: 'reverse-dalembert',
        name: "Reverse D'Alembert",
        description: 'Increases stake after a win, decreases after a loss.',
        category: 'Classic',
        xml: reverseDalembert,
    },
    {
        id: 'oscars-grind',
        name: "Oscar's Grind",
        description: 'Conservative progression strategy aiming for small, steady gains.',
        category: 'Classic',
        xml: oscarsGrind,
    },
    {
        id: 'oscars-grind-max-stake',
        name: "Oscar's Grind (Max Stake)",
        description: "Oscar's Grind with a capped maximum stake.",
        category: 'Classic',
        xml: oscarsGrindMaxStake,
    },
    {
        id: '1-3-2-6',
        name: '1-3-2-6 System',
        description: 'Positive progression betting system using a fixed 1-3-2-6 stake sequence.',
        category: 'Classic',
        xml: strategy1326,
    },
    {
        id: 'accumulators-martingale',
        name: 'Accumulators Martingale',
        description: 'Martingale strategy adapted for Accumulator contracts.',
        category: 'Accumulators',
        xml: accumulatorsMartingale,
    },
    {
        id: 'accumulators-martingale-stat-reset',
        name: 'Accumulators Martingale (Stat Reset)',
        description: 'Accumulators Martingale that resets tracked stats on trigger.',
        category: 'Accumulators',
        xml: accumulatorsMartingaleOnStatReset,
    },
    {
        id: 'accumulators-reverse-martingale',
        name: 'Accumulators Reverse Martingale',
        description: 'Reverse Martingale strategy adapted for Accumulator contracts.',
        category: 'Accumulators',
        xml: accumulatorsReverseMartingale,
    },
    {
        id: 'accumulators-reverse-martingale-stat-reset',
        name: 'Accumulators Reverse Martingale (Stat Reset)',
        description: 'Accumulators Reverse Martingale that resets tracked stats on trigger.',
        category: 'Accumulators',
        xml: accumulatorsReverseMartingaleOnStatReset,
    },
    {
        id: 'accumulators-dalembert',
        name: "Accumulators D'Alembert",
        description: "D'Alembert strategy adapted for Accumulator contracts.",
        category: 'Accumulators',
        xml: accumulatorsDalembert,
    },
    {
        id: 'accumulators-dalembert-stat-reset',
        name: "Accumulators D'Alembert (Stat Reset)",
        description: "Accumulators D'Alembert that resets tracked stats on trigger.",
        category: 'Accumulators',
        xml: accumulatorsDalembertOnStatReset,
    },
    {
        id: 'accumulators-reverse-dalembert',
        name: "Accumulators Reverse D'Alembert",
        description: "Reverse D'Alembert strategy adapted for Accumulator contracts.",
        category: 'Accumulators',
        xml: accumulatorsReverseDalembert,
    },
    {
        id: 'accumulators-reverse-dalembert-stat-reset',
        name: "Accumulators Reverse D'Alembert (Stat Reset)",
        description: "Accumulators Reverse D'Alembert that resets tracked stats on trigger.",
        category: 'Accumulators',
        xml: accumulatorsReverseDalembertOnStatReset,
    },
];