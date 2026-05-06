import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['Inter', 'DM Sans', 'sans-serif'],
        headline: ['Inter', 'Space Grotesk', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // Neon Glassmorphism Colors
        neon: {
          cyan: '#00E5FF',
          purple: '#A57CFF',
          emerald: '#00FFC6',
          pink: '#FF6EC7',
          blue: '#4D9EFF',
        },
        // Also add as top-level utilities for easier use
        'neon-cyan': '#00E5FF',
        'neon-purple': '#A57CFF',
        'neon-emerald': '#00FFC6',
        'neon-pink': '#FF6EC7',
        'neon-blue': '#4D9EFF',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 12px)",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 10px 40px rgba(0, 0, 0, 0.4)',
        'neon-cyan': '0 0 30px rgba(0, 229, 255, 0.6)',
        'neon-purple': '0 0 30px rgba(165, 124, 255, 0.6)',
        'neon-emerald': '0 0 30px rgba(0, 255, 198, 0.6)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-slow": {
          "50%": { opacity: ".7" },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(8px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        // Animations disabled for performance - set duration to 0ms
        "accordion-down": "accordion-down 0s ease-out",
        "accordion-up": "accordion-up 0s ease-out",
        "pulse-slow": "pulse-slow 0s cubic-bezier(0.4, 0, 0.6, 1)",
        "fade-in-up": "fade-in-up 0s ease-out",
        "shimmer": "shimmer 0s linear",
        "glow": "glow 0s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config;
