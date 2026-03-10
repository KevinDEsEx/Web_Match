// vite.config.js
// Configuración principal de Vite. Aquí agregamos plugins para React y Tailwind.

import { defineConfig } from "vite"; // Importa la función para definir config.
import react from "@vitejs/plugin-react"; // Plugin para soporte de React.
import tailwindcss from "@tailwindcss/vite"; // Plugin para Tailwind v4 (integra estilos en build).

export default defineConfig({
  plugins: [
    react(), // Activa soporte para JSX y React.
    tailwindcss(), // Integra Tailwind automáticamente (no necesita PostCSS extra).
  ],
  build: {
    outDir: "dist",
  },
  server: {
    open: true,
  },
});
