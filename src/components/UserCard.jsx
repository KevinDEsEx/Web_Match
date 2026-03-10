import { useRef, useState } from "react";

export default function UserCard({ user, liked, onLike, grid, isMe }) {
  const lastTap = useRef(0);

  const [smallHeart, setSmallHeart] = useState(false);
  const [bigHeart, setBigHeart] = useState(false);

  const image =
    user.photo ||
    "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d";

  const description =
    user.description?.trim() ||
    "Descúbreme en TENEX ✨ quizás tengamos más en común de lo que imaginas.";

  function handleTap() {
    if (isMe) return;

    const now = Date.now();
    const diff = now - lastTap.current;

    // doble tap
    if (diff < 300) {
      onLike(user.id);

      setBigHeart(true);
      setTimeout(() => setBigHeart(false), 800);
    } else {
      setSmallHeart(true);
      setTimeout(() => setSmallHeart(false), 500);
    }

    lastTap.current = now;
  }

  return (
    <div
      onClick={handleTap}
      className={`relative overflow-hidden rounded-2xl shadow-lg transition duration-300 hover:scale-[1.02]
      ${user.premium ? "border-2 border-yellow-400 premium-glow" : ""}`}
    >
      {/* FOTO */}
      <div
        className={`${grid ? "aspect-square" : "aspect-[3/4]"} bg-cover bg-center`}
        style={{ backgroundImage: `url(${image})` }}
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* CORAZÓN GRANDE */}
      {bigHeart && (
        <div className="absolute inset-0 flex items-center justify-center animate-heartPop pointer-events-none">
          <span className="material-symbols-outlined text-pink-500 text-8xl drop-shadow-lg">
            favorite
          </span>
        </div>
      )}

      {/* CORAZÓN PEQUEÑO */}
      {smallHeart && (
        <div className="absolute inset-0 flex items-center justify-center animate-heartSmall pointer-events-none">
          <span className="material-symbols-outlined text-pink-400 text-4xl">
            favorite
          </span>
        </div>
      )}

      {/* INFO */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h2 className="font-bold text-sm sm:text-base leading-tight">
          {user.name}, {user.age}
        </h2>

        <p className="text-xs opacity-80">{user.gender}</p>

        {!grid && (
          <p className="text-xs opacity-90 line-clamp-2">{description}</p>
        )}
      </div>

      {/* BOTÓN LIKE */}
      {!isMe && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike(user.id);
          }}
          className={`absolute right-3 bottom-3 w-11 h-11 flex items-center justify-center rounded-full
          transition transform active:scale-75 shadow-lg
          ${
            liked
              ? "bg-pink-500 text-white animate-pulse"
              : "bg-white text-pink-500"
          }`}
        >
          <span className="material-symbols-outlined">favorite</span>
        </button>
      )}

      {/* ETIQUETA PREMIUM */}
      {user.premium && (
        <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 text-xs font-bold rounded shadow">
          ✨ VIP
        </div>
      )}

      {/* ETIQUETA TU */}
      {isMe && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 text-xs font-bold rounded">
          Eres tú
        </div>
      )}
    </div>
  );
}
