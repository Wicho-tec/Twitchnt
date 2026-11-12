/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        twitch: {
          purple: '#9146FF',
          darkPurple: '#772CE8',
          bg: '#0E0E10',
          card: '#18181B',
          hover: '#1F1F23',
          border: '#26262C',
          text: '#EFEFF1',
          muted: '#ADADB8',
          accent: '#00E5FF'
        }
      }
    },
  },
  plugins: [],
}
