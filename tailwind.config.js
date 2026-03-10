// tailwind.config.js
// Configuración de Tailwind. Define qué archivos escanear y extensiones personalizadas.

export default {
  content: [
    "./index.html", // Escanea el HTML base.
    "./src/**/*.{js,ts,jsx,tsx}", // Escanea todos los archivos en src para clases Tailwind.
  ],
  theme: {
    extend: {
      // Aquí puedes extender colores, fonts, etc. Por ahora vacío.
      // Ejemplo: colors: { custom: '#ff0000' },
    },
  },
  plugins: [], // Plugins adicionales si los necesitas más adelante.
};
