import { useState } from "react";

export default function SwipeCard({ user, onLike, onSkip }) {
  const [startX, setStartX] = useState(0);
  const [moveX, setMoveX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function start(clientX) {
    setStartX(clientX);
    setDragging(true);
  }

  function move(clientX) {
    if (!dragging) return;
    setMoveX(clientX - startX);
  }

  function end() {
    if (!dragging) return;

    if (moveX > 120) {
      onLike(user.id);
    } else if (moveX < -120) {
      onSkip();
    }

    setMoveX(0);
    setDragging(false);
  }

  return (
    <div
      onMouseDown={(e) => start(e.clientX)}
      onMouseMove={(e) => move(e.clientX)}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={(e) => start(e.touches[0].clientX)}
      onTouchMove={(e) => move(e.touches[0].clientX)}
      onTouchEnd={end}
      style={{
        transform: `translateX(${moveX}px) rotate(${moveX / 18}deg)`,
      }}
      className="absolute w-full h-[72vh] rounded-3xl overflow-hidden shadow-2xl bg-white transition cursor-grab active:cursor-grabbing"
    >
      {/* FOTO */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${user.photo})` }}
      />

      {/* GRADIENTE */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* LIKE */}
      {moveX > 40 && (
        <div className="absolute top-10 left-6 text-green-400 text-4xl font-bold rotate-12">
          LIKE ❤️
        </div>
      )}

      {/* PASS */}
      {moveX < -40 && (
        <div className="absolute top-10 right-6 text-red-400 text-4xl font-bold -rotate-12">
          PASS ❌
        </div>
      )}

      {/* INFO */}
      <div className="absolute bottom-0 p-4 text-white">
        <h2 className="text-xl font-bold">
          {user.name}, {user.age}
        </h2>

        <p>{user.gender}</p>

        {user.description && (
          <p className="text-sm opacity-90 mt-1 line-clamp-2">
            {user.description}
          </p>
        )}
      </div>

      {/* INSTRUCCIÓN */}
      <div className="absolute top-3 w-full text-center text-white text-xs opacity-80">
        👉 Arrastra a la derecha para interesarte ❤️ ❌ Arrastra a la izquierda
        para pasar
      </div>
    </div>
  );
}
