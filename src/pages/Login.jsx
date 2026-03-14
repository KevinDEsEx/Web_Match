import { supabase } from "../services/supabase";

export default function Login() {
  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-xl p-8 w-80">
        <h1 className="text-3xl font-semibold text-center mb-2">TENET</h1>

        <p className="text-gray-500 text-center mb-6">
          La mejor web para conectar personas
        </p>

        <button
          onClick={loginGoogle}
          className="bg-red-500 hover:bg-red-600 text-white w-full p-3 rounded-lg"
        >
          Continuar con Google
        </button>
      </div>
    </div>
  );
}
