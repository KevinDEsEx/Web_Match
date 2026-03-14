import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./services/supabase";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import BottomNav from "./components/BottomNav";
import Header from "./components/Header";

/* ---------- LAZY LOAD ---------- */

const Login = lazy(() => import("./pages/Login"));
const Explore = lazy(() => import("./pages/Explore"));
const Likes = lazy(() => import("./pages/Likes"));
const Matches = lazy(() => import("./pages/Matches"));
const Profile = lazy(() => import("./pages/Profile"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const location = useLocation();

  /* ---------- PREFETCH DE PÁGINAS ---------- */

  function prefetchPages() {
    import("./pages/Likes");
    import("./pages/Matches");
    import("./pages/Profile");
  }

  /* ---------- DETECTAR SESIÓN ---------- */

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoadingSession(false);
    }

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---------- CARGAR PERFIL ---------- */

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    async function loadProfile() {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      setProfile(data);
      setLoadingProfile(false);

      /* Prefetch después de tener sesión */
      prefetchPages();
    }

    loadProfile();
  }, [session]);

  /* ---------- LOADER GLOBAL ---------- */

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
      {/* HEADER */}
      {session && <Header />}

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 pb-24">
        {session && loadingProfile ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Cargando tu perfil...</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Cargando página...</p>
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
                  session ? (
                    <Likes user={session.user} />
                  ) : (
                    <Navigate to="/login" />
                  )
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
        )}
      </div>

      {/* NAVBAR */}
      {session && profile && location.pathname !== "/complete-profile" && (
        <BottomNav />
      )}
    </div>
  );
}

export default App;
