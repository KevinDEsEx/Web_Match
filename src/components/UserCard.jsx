import { useRef, useState } from "react";

export default function UserCard({ user, liked, onLike, grid, isMe }) {
  const lastTap = useRef(0);

  const [smallHeart, setSmallHeart] = useState(false);
  const [bigHeart, setBigHeart] = useState(false);
  const [loaded, setLoaded] = useState(false);

  /* tamaño optimizado según layout */

  const imgWidth = grid ? 320 : 420;

  /* imagen optimizada */

  const image = user.photo
    ? `${user.photo}?width=${imgWidth}&quality=60`
    : "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400&q=60";

  /* preview blur muy ligera */

  const blurImage = user.photo ? `${user.photo}?width=20&quality=20` : image;

  const description =
    user.description?.trim() ||
    "Descúbreme en TENEX ✨ quizás tengamos más en común de lo que imaginas.";

  function handleTap() {
    if (isMe) return;

    const now = Date.now();
    const diff = now - lastTap.current;

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
      className={`animate-fadeIn relative overflow-hidden rounded-2xl shadow-lg transition duration-300 active:scale-[0.98]
      ${user.premium ? "border-2 border-yellow-400 premium-glow" : ""}`}
    >
      <div className={`${grid ? "aspect-square" : "aspect-[3/4]"} relative`}>
        {/* Blur preview */}
        <img
          src={blurImage}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover blur-lg scale-110 transition-opacity duration-500 ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Skeleton mientras carga */}
        {!loaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {/* Imagen real */}
        <img
          src={image}
          loading="lazy"
          decoding="async"
          alt={user.name}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {bigHeart && (
        <div className="absolute inset-0 flex items-center justify-center animate-heartPop pointer-events-none">
          <span className="material-symbols-outlined text-pink-500 text-8xl drop-shadow-lg">
            favorite
          </span>
        </div>
      )}

      {smallHeart && (
        <div className="absolute inset-0 flex items-center justify-center animate-heartSmall pointer-events-none">
          <span className="material-symbols-outlined text-pink-400 text-4xl">
            favorite
          </span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h2 className="font-bold text-sm sm:text-base leading-tight">
          {user.name}, {user.age}
        </h2>

        <p className="text-xs opacity-80">{user.gender}</p>

        {!grid && (
          <p className="text-xs opacity-90 line-clamp-2">{description}</p>
        )}
      </div>

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

      {user.premium && (
        <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 text-xs font-bold rounded shadow">
          ✨ VIP
        </div>
      )}

      {isMe && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 text-xs font-bold rounded">
          Eres tú
        </div>
      )}
    </div>
  );
}
