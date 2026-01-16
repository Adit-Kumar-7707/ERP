/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                tally: {
                    yellow: "#F0C419", // The classic top bar yellow
                    blue: "#2692D0",   // Selection / Interaction blue
                    green: "#34A853",  // Success / Numbers
                    bg: "#F2F3F5",     // App background
                    text: "#1A1A1A",   // Primary text
                    muted: "#666666",  // Secondary text
                    border: "#E0E0E0", // Subtle borders
                    lemon: "#FEF9E7",  // Light yellow backgrounds
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"], // Clean, modern, but professional
                mono: ["Roboto Mono", "monospace"], // For numbers/amounts
            }
        },
    },
    plugins: [],
}
