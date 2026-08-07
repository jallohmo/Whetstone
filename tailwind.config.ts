import type { Config } from "tailwindcss";

// Literal translation of 06-design-tokens.ts (Whetstone design system).
// Role-of-colour rule (enforced in component defaults, not just docs):
//  - ink (#111114) = primary actions (buttons, active nav) — NOT blue
//  - blue = links / data accents only, used sparingly
//  - amber = warm "earned/practical" accent for fit callouts / prep tips
//  - green = verified / trust signals
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: "#ffffff",
        gray: {
          50: "#f7f7f8",
          100: "#f0f0f2", // customer shell canvas
          150: "#e9e9ec", // ops shell canvas
          200: "#e0e0e4", // hairline / border
          300: "#cfcfd5", // dashed divider
          400: "#a6a6ae", // tertiary text
          500: "#7c7c85", // secondary text
          600: "#5a5a62",
          700: "#3c3c43",
          800: "#202024",
          900: "#111114", // "ink" — primary text AND primary action colour
        },
        ink: "#111114",
        brand: {
          blue: "#2e45ff",
          "blue-600": "#2233e6",
          "blue-100": "#e9ecff",
          pink: "#ff2d78",
          "pink-600": "#e01f64",
          "pink-100": "#ffe6ef",
          cyan: "#17c4e8",
        },
        green: { 100: "#e7f8ee", 500: "#21c45d", 700: "#158043" },
        amber: { 100: "#fff2df", 500: "#ff9f1c", 700: "#a45c00" },
        red: { 100: "#ffe7e5", 500: "#ff3b30", 700: "#c22a21" },
        purple: { 100: "#eee9ff", 500: "#7c5cff", 700: "#5535d6" },
      },
      fontFamily: {
        sans: ["'General Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        display1: ["56px", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        display2: ["44px", { lineHeight: "1.08", letterSpacing: "-0.02em", fontWeight: "700" }],
        display3: ["34px", { lineHeight: "1.12", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["28px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["22px", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" }],
        h3: ["18px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.45" }],
        body: ["15px", { lineHeight: "1.45" }],
        sm: ["13px", { lineHeight: "1.45" }],
        xs: ["12px", { lineHeight: "1.4" }],
        "2xs": ["11px", { lineHeight: "1.4" }],
      },
      spacing: {
        // 4px grid — key rhythm values used across shells
        "page-gap": "20px",
        "list-rhythm": "12px",
        card: "24px",
        "card-lg": "28px",
      },
      borderRadius: {
        xs: "6px",
        sm: "10px", // inputs, chips, ops controls
        md: "14px", // buttons, rows
        lg: "18px", // inner cards
        xl: "24px", // primary cards / panels
        "2xl": "28px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,17,20,.03), 0 8px 24px rgba(17,17,20,.05)",
        md: "0 2px 4px rgba(17,17,20,.04), 0 12px 32px rgba(17,17,20,.08)",
        lg: "0 4px 8px rgba(17,17,20,.06), 0 24px 56px rgba(17,17,20,.14)",
        "ink-glow": "0 6px 18px rgba(17,17,20,.22)",
        "inset-well": "inset 0 1px 2px rgba(17,17,20,.06)",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.2,0,0,1)",
      },
      transitionDuration: {
        DEFAULT: "120ms",
        slow: "280ms",
      },
      maxWidth: {
        shell: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
