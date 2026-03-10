import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./services/supabase";

import Login from "./pages/Login";
import Explore from "./pages/Explore";
import Likes from "./pages/Likes";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import CompleteProfile from "./pages/CompleteProfile";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  // Detectar sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // Comprobar si perfil ya existe
  useEffect(() => {
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function loadProfile() {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      setProfile(data); // null si no existe
      setLoading(false);
    }

    loadProfile();
  }, [session]);

  // Spinner mientras se decide mostrar CompleteProfile o Explore
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {session && <Header />}
      <Routes>
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/" />}
        />

        {/* CompleteProfile solo si perfil no existe */}
        <Route
          path="/complete-profile"
          element={
            session ? (
              profile ? (
                <Navigate to="/" />
              ) : (
                <CompleteProfile user={session.user} />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Explorar pantalla principal */}
        <Route
          path="/"
          element={
            session ? (
              profile ? (
                <Explore user={session.user} />
              ) : (
                <Navigate to="/complete-profile" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/explore"
          element={
            session ? <Explore user={session.user} /> : <Navigate to="/login" />
          }
        />

        <Route
          path="/likes"
          element={
            session ? <Likes user={session.user} /> : <Navigate to="/login" />
          }
        />

        <Route
          path="/matches"
          element={
            session ? <Matches user={session.user} /> : <Navigate to="/login" />
          }
        />

        <Route
          path="/profile"
          element={
            session ? <Profile user={session.user} /> : <Navigate to="/login" />
          }
        />
      </Routes>

      {session && profile && location.pathname !== "/complete-profile" && (
        <BottomNav />
      )}
    </div>
  );
}

export default App;
