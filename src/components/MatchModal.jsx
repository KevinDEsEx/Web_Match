export default function MatchModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="text-center text-white animate-fadeIn">
        <h1 className="text-4xl font-bold mb-4 text-pink-500">
          ❤️ ¡ES UN MATCH!
        </h1>

        <img
          src={user.photo}
          className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white"
        />

        <p className="text-lg">
          A ti y a <strong>{user.name}</strong> les gustaron mutuamente
        </p>

        <button
          onClick={onClose}
          className="mt-6 px-6 py-3 bg-pink-500 rounded-full font-bold"
        >
          Seguir explorando
        </button>
      </div>
    </div>
  );
}
