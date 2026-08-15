import React from 'react';
import { useNavigate } from 'react-router-dom';
import { generateOAuthURL } from '@/components/shared';
import { useApiBase } from '@/hooks/useApiBase';
import { localize } from '@deriv-com/translations';
import './landing.scss';

const FEATURES = [
    { icon: '📡', title: 'Market Scanner', desc: 'Live signal ranking across every Volatility Index, updated in real time.' },
    { icon: '🎯', title: 'D-Circles Analysis', desc: 'Digit distribution analysis for Even/Odd, Over/Under, and Matches/Differs.' },
    { icon: '🔍', title: 'Pattern Watch', desc: 'Tracks 3-digit sequences and what historically follows them.' },
    { icon: '🤖', title: 'Trading Bots', desc: '17 pre-built strategies including Martingale and D\u2019Alembert, ready to load.' },
    { icon: '✋', title: 'Manual Trader', desc: 'Place trades directly with full confirmation before every order.' },
    { icon: '📦', title: 'Bulk Trader', desc: 'Configure and execute multiple trades together in one pass.' },
    { icon: '👥', title: 'Copy Trading', desc: 'Automatically replicate the trades of an experienced trader.' },
    { icon: '🧮', title: 'Risk Calculator', desc: 'Position sizing, Martingale sequencing, and breakeven win-rate tools.' },
];

const COIN_COUNT = 18;

const LandingPage = () => {
    const navigate = useNavigate();
    const { activeLoginid, setIsAuthorizing } = useApiBase();

    // If arriving from an OAuth redirect (code/state present) or already
    // authenticated, skip straight to the app instead of showing the marketing page.
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

    const falling_items = React.useMemo(
        () =>
            Array.from({ length: COIN_COUNT }).map((_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 8,
                duration: 6 + Math.random() * 6,
                is_coin: Math.random() > 0.5,
                size: 20 + Math.random() * 16,
            })),
        []
    );

    return (
        <div className='landing'>
            <div className='landing__falling-items' aria-hidden='true'>
                {falling_items.map(item => (
                    <span
                        key={item.id}
                        className={item.is_coin ? 'falling-coin' : 'falling-note'}
                        style={{
                            left: `${item.left}%`,
                            animationDelay: `${item.delay}s`,
                            animationDuration: `${item.duration}s`,
                            width: item.size,
                            height: item.size,
                        }}
                    >
                        {item.is_coin ? (
                            <svg viewBox='0 0 40 40'>
                                <circle cx='20' cy='20' r='18' fill='#f5c542' stroke='#c9971f' strokeWidth='2' />
                                <text x='20' y='27' textAnchor='middle' fontSize='18' fontWeight='700' fill='#8a6a10'>
                                    $
                                </text>
                            </svg>
                        ) : (
                            <svg viewBox='0 0 40 26'>
                                <rect x='1' y='1' width='38' height='24' rx='2' fill='#4caf50' stroke='#2e7d32' strokeWidth='1.5' />
                                <circle cx='20' cy='13' r='7' fill='none' stroke='#e8f5e9' strokeWidth='1.5' />
                            </svg>
                        )}
                    </span>
                ))}
            </div>

            <section className='landing__hero'>
                <img src='/voltra-logo.svg' alt='Voltra' className='landing__logo' />
                <h1 className='landing__headline'>{localize('Trade Smarter on Volatility Indices')}</h1>
                <p className='landing__subheadline'>
                    {localize(
                        'Live market scanning, digit analysis, pattern tracking, and pre-built strategies — all in one place.'
                    )}
                </p>
                <button className='landing__cta' onClick={handleGetStarted}>
                    {localize('Get Started')}
                </button>
                <p className='landing__disclaimer'>
                    {localize(
                        'Trading involves significant risk of loss and may not be suitable for all investors.'
                    )}
                </p>
            </section>

            <section className='landing__features'>
                <h2 className='landing__features-title'>{localize('Everything You Need to Trade')}</h2>
                <div className='landing__features-grid'>
                    {FEATURES.map(f => (
                        <div className='feature-card' key={f.title}>
                            <span className='feature-card__icon'>{f.icon}</span>
                            <h3 className='feature-card__title'>{localize(f.title)}</h3>
                            <p className='feature-card__desc'>{localize(f.desc)}</p>
                        </div>
                    ))}
                </div>
            </section>

            <footer className='landing__footer'>
                <p>© {new Date().getFullYear()} Voltra. {localize('All rights reserved.')}</p>
            </footer>
        </div>
    );
};

export default LandingPage;