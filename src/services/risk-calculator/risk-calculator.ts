export type TPositionSizingParams = {
    balance: number;
    risk_pct: number; // e.g. 2 = 2%
};

export type TPositionSizingResult = {
    stake: number;
    risk_amount: number;
};

export function calculatePositionSize({ balance, risk_pct }: TPositionSizingParams): TPositionSizingResult {
    const risk_amount = balance * (risk_pct / 100);
    return {
        stake: Math.max(0, Number(risk_amount.toFixed(2))),
        risk_amount: Number(risk_amount.toFixed(2)),
    };
}

export type TMartingaleParams = {
    initial_stake: number;
    multiplier: number; // e.g. 2 for classic Martingale
    balance: number;
    payout_pct: number; // e.g. 95 = 95% payout on win
};

export type TMartingaleStep = {
    step: number;
    stake: number;
    cumulative_loss: number;
    payout_if_win: number;
    exceeds_balance: boolean;
};

export type TMartingaleResult = {
    steps: TMartingaleStep[];
    max_safe_losses: number; // how many consecutive losses before stake exceeds balance
};

export function calculateMartingaleSequence({
    initial_stake,
    multiplier,
    balance,
    payout_pct,
}: TMartingaleParams): TMartingaleResult {
    const steps: TMartingaleStep[] = [];
    let cumulative_loss = 0;
    let stake = initial_stake;
    let max_safe_losses = 0;
    const MAX_STEPS = 15; // sane upper bound to avoid runaway calculation

    for (let step = 1; step <= MAX_STEPS; step++) {
        const exceeds_balance = stake > balance - cumulative_loss;
        const payout_if_win = stake * (payout_pct / 100);

        steps.push({
            step,
            stake: Number(stake.toFixed(2)),
            cumulative_loss: Number(cumulative_loss.toFixed(2)),
            payout_if_win: Number(payout_if_win.toFixed(2)),
            exceeds_balance,
        });

        if (!exceeds_balance) {
            max_safe_losses = step;
        } else {
            break;
        }

        cumulative_loss += stake;
        stake *= multiplier;
    }

    return { steps, max_safe_losses };
}

export type TBreakevenParams = {
    payout_pct: number; // e.g. 95 = 95% payout
};

export type TBreakevenResult = {
    breakeven_win_rate: number; // % win rate needed to break even
};

export function calculateBreakevenWinRate({ payout_pct }: TBreakevenParams): TBreakevenResult {
    // For a binary win/lose contract: stake risked to win (payout_pct/100 * stake)
    // Breakeven win rate w satisfies: w * payout = (1-w) * stake
    // => w * (payout + stake) = stake => w = stake / (payout + stake)
    // Using pct terms: w = 1 / (1 + payout_pct/100)
    const breakeven_win_rate = 100 / (1 + payout_pct / 100);
    return { breakeven_win_rate: Number(breakeven_win_rate.toFixed(2)) };
}