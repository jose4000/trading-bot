import React from 'react';
import { useNavigate } from 'react-router-dom';
import { generateOAuthURL } from '@/components/shared';
import { useApiBase } from '@/hooks/useApiBase';
import { localize } from '@deriv-com/translations';
import './landing.scss';

// ── Icons (inline SVG, single stroke weight, no emoji) ────────────────────
const Icon = {
    scan: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <circle cx='11' cy='11' r='7' />
            <path d='m20 20-3.5-3.5' />
            <path d='M11 8v6M8 11h6' />
        </svg>
    ),
    digits: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M4 15h2a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v9Z' />
            <path d='M10 15h2a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v9Z' />
            <path d='M16 12v3h2a3 3 0 0 0 3-3' />
        </svg>
    ),
    pattern: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M3 17 9 11l4 4 8-8' />
            <path d='M15 7h6v6' />
        </svg>
    ),
    bot: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <rect x='5' y='7' width='14' height='12' rx='2' />
            <path d='M12 3v4M9 13h.01M15 13h.01M9 17h6' />
        </svg>
    ),
    hand: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M6 11V6a2 2 0 0 1 4 0v5' />
            <path d='M10 11V4a2 2 0 0 1 4 0v7' />
            <path d='M14 11V6a2 2 0 0 1 4 0v8a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-3' />
        </svg>
    ),
    stack: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <path d='m12 3 9 5-9 5-9-5 9-5Z' />
            <path d='m3 13 9 5 9-5' />
        </svg>
    ),
    users: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <circle cx='9' cy='8' r='3' />
            <path d='M3 20a6 6 0 0 1 12 0' />
            <circle cx='17' cy='8' r='2.5' />
            <path d='M15 20a5 5 0 0 1 6-4.9' />
        </svg>
    ),
    calc: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <rect x='4' y='3' width='16' height='18' rx='2' />
            <path d='M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01' />
        </svg>
    ),
    arrow: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M5 12h14M13 5l7 7-7 7' />
        </svg>
    ),
};

// ── Feature data ──────────────────────────────────────────────────────────
const FEATURES = [
    {
        icon: 'scan',
        name: 'Market Scanner',
        benefit: 'Rank every Volatility Index by live signal strength.',
        example: 'See at a glance which markets are trending, ranging, or waiting.',
    },
    {
        icon: 'digits',
        name: 'D-Circles Analysis',
        benefit: 'Digit distribution charts for Even/Odd, Over/Under, and Matches/Differs.',
        example: 'Visualise the last 1,000 ticks against statistical expectation.',
    },
    {
        icon: 'pattern',
        name: 'Pattern Watch',
        benefit: 'Track 3-digit sequences and what historically follows them.',
        example: 'Choose a history window from 100 to 10,000 ticks.',
    },
    {
        icon: 'bot',
        name: 'Trading Bots',
        benefit: '17 pre-built strategies, ready to load and adjust.',
        example: 'Martingale, D’Alembert, Oscar’s Grind, and 14 more.',
    },
    {
        icon: 'hand',
        name: 'Manual Trader',
        benefit: 'Place trades directly, with confirmation before every order.',
        example: 'Full control when you want it — automation when you don’t.',
    },
    {
        icon: 'stack',
        name: 'Bulk Trader',
        benefit: 'Configure and execute multiple trades together.',
        example: 'Set up a sequence, review it, and fire it in one pass.',
    },
    {
        icon: 'users',
        name: 'Copy Trading',
        benefit: 'Mirror the trades of an experienced trader in real time.',
        example: 'Follow, unfollow, and set position limits per leader.',
    },
    {
        icon: 'calc',
        name: 'Risk Calculator',
        benefit: 'Position sizing, Martingale sequencing, and breakeven win-rate.',
        example: 'Know your max drawdown before you enter a trade.',
    },
];

const STEPS = [
    {
        n: '01',
        title: 'Connect your Deriv account',
        desc: 'Sign in with Deriv OAuth. No separate account, no email, no password we ever see.',
    },
    {
        n: '02',
        title: 'Pick your market',
        desc: 'Scan all volatility indices, or jump straight to the one you already trade.',
    },
    {
        n: '03',
        title: 'Choose a strategy or go manual',
        desc: 'Load a bot, mirror a leader, or place trades yourself — with confirmation on every order.',
    },
];

const LandingPage = () => {
    const navigate = useNavigate();
    const { activeLoginid, setIsAuthorizing } = useApiBase();

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const has_oauth_callback = Boolean(params.get('code') && params.get('state'));

        if (has_oauth_callback || activeLoginid) {
            navigate('/app', { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeLoginid]);

    const handleGetStarted = async () => {
        if (activeLoginid) {
            navigate('/app');
            return;
        }
        try {
            setIsAuthorizing(true);
            const oauthUrl = await generateOAuthURL();
            if (oauthUrl) {
                window.location.replace(oauthUrl);
            } else {
                setIsAuthorizing(false);
            }
        } catch {
            setIsAuthorizing(false);
        }
    };

    return (
        <div className='tradeflux-landing'>
            {/* ── Top bar ───────────────────────────────────────────── */}
            <header className='tradeflux-landing__topbar'>
                <a href='/' className='tradeflux-landing__brand'>
                    <img src='/tradeflux-logo.svg' alt='' className='tradeflux-landing__brand-mark' />
                    <span className='tradeflux-landing__brand-name'>Tradeflux</span>
                </a>
                <nav className='tradeflux-landing__topnav' aria-label='Main'>
                    <a href='#features'>Features</a>
                    <a href='#how-it-works'>How it works</a>
                    <a href='#faq'>FAQ</a>
                </nav>
                <button
                    type='button'
                    className='tradeflux-landing__topbar-cta'
                    onClick={handleGetStarted}
                >
                    {localize('Sign in with Deriv')}
                </button>
            </header>

            {/* ── Hero ─────────────────────────────────────────────── */}
            <section className='tradeflux-landing__hero'>
                <div className='tradeflux-landing__hero-grid'>
                    <div className='tradeflux-landing__hero-copy'>
                        <p className='tradeflux-landing__eyebrow'>
                            {localize('Built on Deriv')}
                        </p>
                        <h1 className='tradeflux-landing__headline'>
                            {localize('Every volatility index, one trading console.')}
                        </h1>
                        <p className='tradeflux-landing__subheadline'>
                            {localize(
                                'Live market scanning, digit analysis, pattern tracking, and 17 pre-built bots — assembled in one workspace you can actually use.'
                            )}
                        </p>

                        <div className='tradeflux-landing__hero-actions'>
                            <button
                                type='button'
                                className='tradeflux-landing__cta'
                                onClick={handleGetStarted}
                            >
                                {localize('Get started')}
                                <span className='tradeflux-landing__cta-icon' aria-hidden>
                                    {Icon.arrow}
                                </span>
                            </button>
                            <a
                                href='#how-it-works'
                                className='tradeflux-landing__cta-secondary'
                            >
                                {localize('See how it works')}
                            </a>
                        </div>

                        <dl className='tradeflux-landing__trust'>
                            <div>
                                <dt>{localize('Bots included')}</dt>
                                <dd>17</dd>
                            </div>
                            <div>
                                <dt>{localize('Volatility indices')}</dt>
                                <dd>10+</dd>
                            </div>
                            <div>
                                <dt>{localize('Tick history per chart')}</dt>
                                <dd>10,000</dd>
                            </div>
                        </dl>
                    </div>

                    <div className='tradeflux-landing__hero-visual' aria-hidden>
                        <div className='product-shot'>
                            <div className='product-shot__chrome'>
                                <span className='product-shot__dot' />
                                <span className='product-shot__dot' />
                                <span className='product-shot__dot' />
                                <span className='product-shot__title'>
                                    Tradeflux · Market Scanner
                                </span>
                            </div>
                            <div className='product-shot__body'>
                                <div className='product-shot__row'>
                                    <span className='product-shot__label'>V10</span>
                                    <span className='product-shot__bar'>
                                        <span style={{ width: '78%' }} />
                                    </span>
                                    <span className='product-shot__value'>78</span>
                                </div>
                                <div className='product-shot__row'>
                                    <span className='product-shot__label'>V25</span>
                                    <span className='product-shot__bar'>
                                        <span style={{ width: '62%' }} />
                                    </span>
                                    <span className='product-shot__value'>62</span>
                                </div>
                                <div className='product-shot__row'>
                                    <span className='product-shot__label'>V50</span>
                                    <span className='product-shot__bar'>
                                        <span style={{ width: '47%' }} />
                                    </span>
                                    <span className='product-shot__value'>47</span>
                                </div>
                                <div className='product-shot__row'>
                                    <span className='product-shot__label'>V75</span>
                                    <span className='product-shot__bar'>
                                        <span style={{ width: '34%' }} />
                                    </span>
                                    <span className='product-shot__value'>34</span>
                                </div>
                                <div className='product-shot__row'>
                                    <span className='product-shot__label'>V100</span>
                                    <span className='product-shot__bar'>
                                        <span style={{ width: '21%' }} />
                                    </span>
                                    <span className='product-shot__value'>21</span>
                                </div>
                                <div className='product-shot__digits'>
                                    <span>Digit distribution · last 1,000 ticks</span>
                                    <div className='product-shot__digits-grid'>
                                        {[42, 58, 61, 39, 55, 47, 63, 41, 52, 44].map(
                                            (v, i) => (
                                                <span key={i} className='product-shot__digit'>
                                                    <span
                                                        className='product-shot__digit-fill'
                                                        style={{ height: `${v}%` }}
                                                    />
                                                    <em>{i}</em>
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ─────────────────────────────────────────── */}
            <section id='features' className='tradeflux-landing__section'>
                <header className='tradeflux-landing__section-header'>
                    <p className='tradeflux-landing__eyebrow'>
                        {localize('What’s inside')}
                    </p>
                    <h2 className='tradeflux-landing__section-title'>
                        {localize('Eight tools. One tab.')}
                    </h2>
                    <p className='tradeflux-landing__section-lede'>
                        {localize(
                            'Each module is a real, working piece of the console — not a screenshot on a marketing page.'
                        )}
                    </p>
                </header>

                <ul className='tradeflux-landing__features'>
                    {FEATURES.map(f => (
                        <li className='tradeflux-feature' key={f.name}>
                            <span className='tradeflux-feature__icon' aria-hidden>
                                {Icon[f.icon as keyof typeof Icon]}
                            </span>
                            <h3 className='tradeflux-feature__name'>{localize(f.name)}</h3>
                            <p className='tradeflux-feature__benefit'>{localize(f.benefit)}</p>
                            <p className='tradeflux-feature__example'>{localize(f.example)}</p>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ── How it works ─────────────────────────────────────── */}
            <section id='how-it-works' className='tradeflux-landing__section tradeflux-landing__section--muted'>
                <header className='tradeflux-landing__section-header'>
                    <p className='tradeflux-landing__eyebrow'>
                        {localize('How it works')}
                    </p>
                    <h2 className='tradeflux-landing__section-title'>
                        {localize('Three steps, about ninety seconds.')}
                    </h2>
                    <p className='tradeflux-landing__section-lede'>
                        {localize(
                            'No downloads, no separate account, no card. Your Deriv login is the only thing Tradeflux ever sees.'
                        )}
                    </p>
                </header>

                <ol className='tradeflux-landing__steps'>
                    {STEPS.map(step => (
                        <li className='tradeflux-step' key={step.n}>
                            <span className='tradeflux-step__n'>{step.n}</span>
                            <h3 className='tradeflux-step__title'>{localize(step.title)}</h3>
                            <p className='tradeflux-step__desc'>{localize(step.desc)}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ── FAQ ──────────────────────────────────────────────── */}
            <section id='faq' className='tradeflux-landing__section'>
                <header className='tradeflux-landing__section-header'>
                    <p className='tradeflux-landing__eyebrow'>
                        {localize('Frequently asked')}
                    </p>
                    <h2 className='tradeflux-landing__section-title'>
                        {localize('Questions we get a lot.')}
                    </h2>
                </header>

                <div className='tradeflux-landing__faq'>
                    <details>
                        <summary>{localize('Is Tradeflux owned by Deriv?')}</summary>
                        <p>
                            {localize(
                                'No. Tradeflux is a third-party console that connects to Deriv through their official OAuth. Your funds, your trades, and your account remain entirely with Deriv.'
                            )}
                        </p>
                    </details>
                    <details>
                        <summary>{localize('Does Tradeflux have access to my money?')}</summary>
                        <p>
                            {localize(
                                'No. Tradeflux never sees your balance, your deposits, or your withdrawals. It only places trades you authorise.'
                            )}
                        </p>
                    </details>
                    <details>
                        <summary>{localize('What is a volatility index?')}</summary>
                        <p>
                            {localize(
                                'Synthetic markets offered by Deriv that simulate volatility without being tied to any real underlying asset. They run 24/7.'
                            )}
                        </p>
                    </details>
                    <details>
                        <summary>{localize('Can I use the bots without understanding them?')}</summary>
                        <p>
                            {localize(
                                'You can, but you shouldn’t. Every bot exposes its parameters before you load it. Read them.'
                            )}
                        </p>
                    </details>
                </div>
            </section>

            {/* ── Final CTA ────────────────────────────────────────── */}
            <section className='tradeflux-landing__final'>
                <h2 className='tradeflux-landing__final-title'>
                    {localize('Ready when you are.')}
                </h2>
                <p className='tradeflux-landing__final-lede'>
                    {localize(
                        'Sign in with your Deriv account and the console opens in a new tab.'
                    )}
                </p>
                <button
                    type='button'
                    className='tradeflux-landing__cta'
                    onClick={handleGetStarted}
                >
                    {localize('Sign in with Deriv')}
                    <span className='tradeflux-landing__cta-icon' aria-hidden>
                        {Icon.arrow}
                    </span>
                </button>
            </section>

            {/* ── Footer ───────────────────────────────────────────── */}
            <footer className='tradeflux-landing__footer'>
                <div className='tradeflux-landing__footer-inner'>
                    <div className='tradeflux-landing__footer-brand'>
                        <img src='/tradeflux-logo.svg' alt='' />
                        <p>Tradeflux</p>
                    </div>
                    <p className='tradeflux-landing__footer-note'>
                        {localize(
                            'Tradeflux is a third-party application. It is not affiliated with, endorsed by, or operated by Deriv. Trading involves significant risk of loss and may not be suitable for all investors. Only trade with money you can afford to lose.'
                        )}
                    </p>
                    <p className='tradeflux-landing__footer-copy'>
                        © {new Date().getFullYear()} Tradeflux. {localize('All rights reserved.')}
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;