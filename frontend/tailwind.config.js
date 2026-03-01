/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Netflix-inspired palette
                bg: {
                    base: '#0A0A0A',    // Near-pure black
                    deep: '#141414',    // Netflix black
                    card: '#181818',    // Card surface
                    hover: '#242424',   // Card hover
                    modal: '#1a1a1a',   // Modal bg
                },
                red: {
                    brand: '#E50914',   // Netflix red
                    hover: '#F40612',   // Bright hover
                    dark: '#B20710',    // Dark press
                    glow: 'rgba(229,9,20,0.35)', // Glow effect
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#A3A3A3',
                    muted: '#737373',
                    accent: '#E50914',
                },
                border: {
                    DEFAULT: '#2a2a2a',
                    bright: '#3a3a3a',
                },
            },
            fontFamily: {
                sans: ['Netflix Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
                heading: ['Netflix Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
                body: ['Netflix Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
            },
            boxShadow: {
                'red': '0 0 24px rgba(229,9,20,0.4), 0 4px 16px rgba(0,0,0,0.6)',
                'card': '0 8px 32px rgba(0,0,0,0.8)',
                'glow': '0 0 40px rgba(229,9,20,0.2)',
            },
            animation: {
                'pulse-red': 'pulseRed 2s ease-in-out infinite',
                'slide-up': 'slideUp 0.3s ease-out',
                'fade-in': 'fadeIn 0.4s ease-out',
            },
            keyframes: {
                pulseRed: {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                },
                slideUp: {
                    from: { opacity: 0, transform: 'translateY(12px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
                fadeIn: {
                    from: { opacity: 0 },
                    to: { opacity: 1 },
                },
            },
        },
    },
    plugins: [],
}
