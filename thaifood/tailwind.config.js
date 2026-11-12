/** @type {import('tailwindcss').Config} */
const tokenColor = name => 'rgb(var(--color-' + name + '-rgb) / <alpha-value>)';

module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: tokenColor('primary'), hover: tokenColor('primary-hover') },
        canvas: tokenColor('bg'),
        surface: tokenColor('surface'),
        ink: tokenColor('ink'),
        muted: tokenColor('muted'),
        sand: tokenColor('sand'),
        herb: tokenColor('herb'),
        border: tokenColor('border'),
        'control-border': tokenColor('control-border'),
        danger: tokenColor('danger'),
        success: tokenColor('success'),
        warning: tokenColor('warning'),
        // Compatibility names used by the existing pages.
        leaf: tokenColor('primary'),
        mist: tokenColor('bg'),
      },
      fontFamily: {
        sans: ['var(--font-family-body)'],
        heading: ['var(--font-family-heading)'],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)',
        card: 'var(--radius-card)',
      },
      boxShadow: {
        soft: 'var(--shadow-sm)',
        raised: 'var(--shadow-md)',
      },
      maxWidth: { content: 'var(--container-max)' },
    },
  },
  plugins: [],
};
