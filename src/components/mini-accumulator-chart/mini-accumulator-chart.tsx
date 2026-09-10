import React from 'react';
import './mini-accumulator-chart.scss';

type TProps = {
    prices: number[];
    high_barrier: number;
    low_barrier: number;
};

const MiniAccumulatorChart: React.FC<TProps> = ({ prices, high_barrier, low_barrier }) => {
    if (prices.length < 2) {
        return <div className='mini-accu-chart mini-accu-chart--empty'>Waiting for price data...</div>;
    }

    const width = 300;
    const height = 140;
    const padding = 10;

    const all_values = [...prices, high_barrier, low_barrier];
    const min = Math.min(...all_values);
    const max = Math.max(...all_values);
    const range = max - min || 1;

    const toX = (i: number) => padding + (i / (prices.length - 1)) * (width - padding * 2);
    const toY = (v: number) => height - padding - ((v - min) / range) * (height - padding * 2);

    const path = prices.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p)}`).join(' ');
    const last_price = prices[prices.length - 1];
    const is_inside_range = last_price <= high_barrier && last_price >= low_barrier;

    return (
        <div className='mini-accu-chart'>
            <svg viewBox={`0 0 ${width} ${height}`} className='mini-accu-chart__svg'>
                {/* Shaded band between barriers */}
                <rect
                    x={0}
                    y={toY(high_barrier)}
                    width={width}
                    height={toY(low_barrier) - toY(high_barrier)}
                    className='mini-accu-chart__band'
                />
                {/* High barrier line */}
                <line x1={0} y1={toY(high_barrier)} x2={width} y2={toY(high_barrier)} className='mini-accu-chart__line mini-accu-chart__line--high' />
                {/* Low barrier line */}
                <line x1={0} y1={toY(low_barrier)} x2={width} y2={toY(low_barrier)} className='mini-accu-chart__line mini-accu-chart__line--low' />
                {/* Price path */}
                <path d={path} className='mini-accu-chart__path' fill='none' />
                {/* Current price dot */}
                <circle cx={toX(prices.length - 1)} cy={toY(last_price)} r={4} className={`mini-accu-chart__dot ${is_inside_range ? 'mini-accu-chart__dot--safe' : 'mini-accu-chart__dot--danger'}`} />
            </svg>
            <div className='mini-accu-chart__labels'>
                <span className='mini-accu-chart__label mini-accu-chart__label--high'>{high_barrier.toFixed(3)}</span>
                <span className='mini-accu-chart__label mini-accu-chart__label--low'>{low_barrier.toFixed(3)}</span>
            </div>
        </div>
    );
};

export default MiniAccumulatorChart;