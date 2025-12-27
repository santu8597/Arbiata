/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary blacks
        'pure-black': '#000000',
        'charcoal': '#0B0B0B',
        'graphite': '#141414',
        
        // Metallic / Neutral
        'metallic-silver': '#BFC3C7',
        'steel-gray': '#2A2A2A',
        'gunmetal': '#1C1C1C',
        
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#9A9A9A',
        'text-tertiary': '#C7C7C7',
        
        // Semantic
        'profit': '#C0392B',
        'loss': '#555555',
        'warning': '#D4A84B',
      },
      fontFamily: {
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
}
