/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(250, 250, 250)',
        text: {
          primary: 'rgb(23, 23, 23)',
          secondary: 'rgb(102, 102, 102)',
        },
        button: {
          primary: {
            bg: 'rgb(0, 0, 0)',
            text: 'rgb(255, 255, 255)',
          },
          secondary: {
            bg: 'rgba(0, 0, 0, 0)',
            text: 'rgb(23, 23, 23)',
          },
        },
      },
      fontFamily: {
        sans: ['Geist', 'Arial', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'sans-serif'],
      },
      fontSize: {
        body: '16px',
        button: '14px',
        h1: '47.9625px',
      },
      borderRadius: {
        button: '6px',
      },
      spacing: {
        unit: '8px',
        small: '8px',
        medium: '16px',
        large: '24px',
      },
    },
  },
  plugins: [],
}

