/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F6',      // background
        ink: '#1C1B1A',        // primary text
        'ink-muted': '#6B6560',// secondary/label text
        hairline: '#E8E4DD',   // borders
        accent: {
          DEFAULT: '#8A6D3B',  // brass
          hover: '#6F5730',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],   // headings
        sans: ['Inter', 'sans-serif'],           // body
      },
      boxShadow: {
        sm: '0 1px 2px rgba(28,27,26,0.04)',
        md: '0 2px 8px rgba(28,27,26,0.06)',
      },
    },
  },
  plugins: [],
}