import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./services/supabase";

import BottomNav from "./components/BottomNav";
import Header from "./components/Header";

/* LAZY LOAD PÁGINAS */

const Login = lazy(() => import("./pages/Login"));
const Explore = lazy(() => import("./pages/Explore"));
const Likes = lazy(() => import("./pages/Likes"));
const Matches = lazy(() => import("./pages/Matches"));
const Profile = lazy(() => import("./pages/Profile"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  /* DETECTAR SESIÓN */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session),
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /* CARGAR PERFIL */

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

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, [session]);

  /* SPINNER GLOBAL */

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

      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
        <Routes>
          <Route
            path="/login"
            element={!session ? <Login /> : <Navigate to="/" />}
          />

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
              session ? (
                <Explore user={session.user} />
              ) : (
                <Navigate to="/login" />
              )
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
              session ? (
                <Matches user={session.user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route
            path="/profile"
            element={
              session ? (
                <Profile user={session.user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Suspense>

      {session && profile && location.pathname !== "/complete-profile" && (
        <BottomNav />
      )}
    </div>
  );
}

export default App;
