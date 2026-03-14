export default function SearchFilterBar({ search, setSearch, genderFilter, setGenderFilter }) {
  return (
    <div className="px-4 py-3 bg-white shadow-sm border-b sticky top-[64px] z-30">
      <div className="relative mb-3">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setGenderFilter("")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            genderFilter === ""
              ? "bg-pink-500 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setGenderFilter("Mujer")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            genderFilter === "Mujer"
              ? "bg-pink-500 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Mujeres
        </button>
        <button
          onClick={() => setGenderFilter("Hombre")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            genderFilter === "Hombre"
              ? "bg-pink-500 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Hombres
        </button>
      </div>
    </div>
  );
}
