import { useState, useEffect } from "react";

const genders = ["Todos", "Hombre", "Mujer", "Otro"];

export default function SearchFilters({ onChange, results }) {
  const [searchInput, setSearchInput] = useState("");
  const [gender, setGender] = useState("Todos");

  useEffect(() => {
    const delay = setTimeout(() => {
      onChange({
        search: searchInput,
        gender,
      });
    }, 300);

    return () => clearTimeout(delay);
  }, [searchInput, gender]);

  return (
    <div className="sticky top-[56px] z-30 backdrop-blur bg-white/80 px-3 pt-3 pb-2 space-y-3">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
          search
        </span>

        <input
          type="search"
          placeholder="Buscar por nombre..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {genders.map((g) => {
          const active = gender === g;

          return (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition active:scale-95
              ${
                active
                  ? "bg-pink-500 text-white shadow-md scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      {results !== undefined && (
        <p className="text-xs text-gray-400 pl-1">
          {results} resultado{results === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
