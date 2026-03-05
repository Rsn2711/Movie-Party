/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            screens: {
                'xs': '480px',
            },
            colors: {
                // Core brand palette
                bg: {
                    base: '#080808',
                    deep: '#0f0f0f',
                    card: '#161616',
                    hover: '#1e1e1e',
                    modal: '#141414',
                    surface: '#1a1a1a',
                },
                red: {
                    brand: '#E50914',
                    hover: '#F40612',
                    dark: '#B20710',
                    muted: 'rgba(229,9,20,0.12)',
                    glow: 'rgba(229,9,20,0.35)',
                    subtle: 'rgba(229,9,20,0.06)',
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#A8A8A8',
                    muted: '#6B6B6B',
                    accent: '#E50914',
                    dim: '#404040',
                },
                border: {
                    DEFAULT: '#222222',
                    bright: '#333333',
                    subtle: '#1a1a1a',
                },
            },
            fontFamily: {
                sans: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
                heading: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
                body: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
                display: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
            },
            fontSize: {
                '2xs': ['0.625rem', { lineHeight: '1' }],
            },
            spacing: {
                '4.5': '1.125rem',
                '13': '3.25rem',
                '18': '4.5rem',
            },
            borderRadius: {
                'DEFAULT': '8px',
                'sm': '4px',
                'md': '8px',
                'lg': '12px',
                'xl': '16px',
                '2xl': '20px',
                '3xl': '24px',
            },
            boxShadow: {
                'red': '0 0 24px rgba(229,9,20,0.4), 0 4px 16px rgba(0,0,0,0.6)',
                'red-sm': '0 0 12px rgba(229,9,20,0.25)',
                'red-lg': '0 0 48px rgba(229,9,20,0.35)',
                'card': '0 4px 24px rgba(0,0,0,0.6)',
                'card-hover': '0 8px 40px rgba(0,0,0,0.8)',
                'glow': '0 0 60px rgba(229,9,20,0.15)',
                'modal': '0 32px 80px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04)',
                'input-focus': '0 0 0 3px rgba(229,9,20,0.2)',
                'inset': 'inset 0 2px 8px rgba(0,0,0,0.4)',
            },
            animation: {
                'pulse-red': 'pulseRed 2s ease-in-out infinite',
                'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                'fade-in': 'fadeIn 0.3s ease-out',
                'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                'shimmer': 'shimmer 2s infinite linear',
                'spin-slow': 'spin 3s linear infinite',
            },
            keyframes: {
                pulseRed: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.4' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(16px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    from: { opacity: '0', transform: 'translateY(-16px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                scaleIn: {
                    from: { opacity: '0', transform: 'scale(0.94)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    from: { backgroundPosition: '-200% 0' },
                    to: { backgroundPosition: '200% 0' },
                },
            },
            transitionDuration: {
                '250': '250ms',
            },
            transitionTimingFunction: {
                'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            maxWidth: {
                'content': '1280px',
            },
            zIndex: {
                '60': '60',
                '70': '70',
                '80': '80',
                '90': '90',
                '100': '100',
            },
            backgroundImage: {
                'red-gradient': 'linear-gradient(135deg, #E50914 0%, #B20710 100%)',
                'surface-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #141414 100%)',
                'glass': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            },
        },
    },
    plugins: [],
}
