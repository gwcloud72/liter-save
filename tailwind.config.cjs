/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
