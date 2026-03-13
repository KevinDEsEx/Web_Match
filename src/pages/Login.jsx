// src/pages/Login.jsx
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-pink-500"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">
          TENET
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Conecta con personas interesantes cerca de ti
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 rounded-xl shadow transition"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-5 h-5"
          />
          Continuar con Google
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          Al continuar, aceptas nuestros términos y política de privacidad
        </p>
      </div>
    </div>
  );
}
