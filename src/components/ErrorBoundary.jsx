import { Component } from "react";
import { toast } from "react-toastify";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la UI alternativa
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Puedes registrar el error en un servicio de reporte de errores
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    toast.error("Hubo un problema de conexión al cargar la vista.");
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Puedes renderizar cualquier UI alternativa
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
            <span className="material-symbols-outlined text-6xl text-pink-500 mb-4">
              wifi_off
            </span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Problema de conexión
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Tu navegador o red interrumpieron la carga de la aplicación.
              Refresca para volver a intentar.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-xl transition cursor-pointer shadow-md"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
