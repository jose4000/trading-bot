import React from 'react';
import classNames from 'classnames';
import './d-circles.scss';

export type TDCirclesVariant = 'two-tier' | 'four-tier';

type TDCirclesProps = {
    percentages: number[]; // length 10, index = digit
    current_digit?: number | null;
    variant?: TDCirclesVariant;
};

type TRank = 'most' | 'second_most' | 'second_least' | 'least' | 'default';

function getRanks(percentages: number[], variant: TDCirclesVariant): Record<number, TRank> {
    const ranks: Record<number, TRank> = {};
    for (let i = 0; i < 10; i++) ranks[i] = 'default';

    const sorted = percentages.map((pct, digit) => ({ digit, pct })).sort((a, b) => b.pct - a.pct);

    if (sorted[0]) ranks[sorted[0].digit] = 'most';
    if (sorted[9]) ranks[sorted[9].digit] = 'least';

    if (variant === 'four-tier') {
        if (sorted[1]) ranks[sorted[1].digit] = 'second_most';
        if (sorted[8]) ranks[sorted[8].digit] = 'second_least';
    }

    return ranks;
}

const RANK_COLORS: Record<TRank, string> = {
    most: '#00c896',
    second_most: '#1e88e5',
    second_least: '#f57c00',
    least: '#ff5252',
    default: '#3a4a5c',
};

const ROWS = [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
];

const DCircles: React.FC<TDCirclesProps> = ({ percentages, current_digit = null, variant = 'two-tier' }) => {
    const ranks = getRanks(percentages, variant);

    return (
        <div className='d-circles'>
            {ROWS.map((row_digits, row_index) => (
                <div className='d-circles__row-wrapper' key={row_index}>
                    {current_digit !== null && row_digits.includes(current_digit) && (
                        <div
                            className='d-circles__pointer'
                            style={{ left: `${(row_digits.indexOf(current_digit) + 0.5) * (100 / 5)}%` }}
                        />
                    )}
                    <div className='d-circles__row'>
                        {row_digits.map(digit => {
                            const pct = percentages[digit] ?? 0;
                            const rank = ranks[digit];
                            const color = RANK_COLORS[rank];
                            const arc_pct = Math.min(pct * 4, 100);
                            return (
                                <div key={digit} className='d-circles__cell'>
                                    <div
                                        className='d-circles__arc'
                                        style={{
                                            background: `conic-gradient(${color} ${arc_pct}%, transparent ${arc_pct}% 100%)`,
                                        }}
                                    >
                                        <div className={classNames('d-circles__arc-inner', `d-circles__arc-inner--${rank}`)}>
                                            {digit}
                                        </div>
                                    </div>
                                    <span className='d-circles__pct'>{pct.toFixed(1)}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DCircles;