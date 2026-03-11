import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";

export default function CompleteProfile({ user }) {
  const navigate = useNavigate();

  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");

  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrlPreview, setPhotoUrlPreview] = useState(
    user?.user_metadata?.avatar_url || "",
  );

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const formValid = name && phone && gender && age;

  function validate() {
    let newErrors = {};

    if (name.length < 3) newErrors.name = "Nombre demasiado corto";

    if (phone && !/^[0-9]+$/.test(phone)) newErrors.phone = "Solo números";

    if (age && !/^[0-9]+$/.test(age)) newErrors.age = "Edad inválida";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  /* SELECCIONAR FOTO */

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const compressed = await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });

    setPhotoFile(compressed);
    setPhotoUrlPreview(URL.createObjectURL(compressed));
  }

  /* GUARDAR PERFIL */

  async function saveProfile() {
    if (!validate()) return;

    setLoading(true);

    let finalPhotoUrl = photoUrlPreview;

    if (photoFile) {
      const fileName = `${user.id}-${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, photoFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!error) {
        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        finalPhotoUrl = data.publicUrl;
      }
    }

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      name,
      phone,
      gender,
      age: parseInt(age),
      description:
        description ||
        "Descúbreme en TENEX ✨ quizás tengamos más en común de lo que imaginas.",
      photo: finalPhotoUrl,
    });

    setLoading(false);

    if (!error) navigate("/explore");
  }

  async function logout() {
    await supabase.auth.signOut();
    location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
      {loading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Completa tu perfil
        </h2>

        <div className="flex flex-col items-center mb-6">
          <img
            src={photoUrlPreview || "/default-avatar.png"}
            alt="Avatar"
            className="w-28 h-28 rounded-full object-cover border"
          />

          <label className="mt-3 text-blue-600 text-sm cursor-pointer">
            Cambiar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        <input
          type="text"
          autoComplete="name"
          className="border rounded-lg w-full p-3 mb-3"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          className="border rounded-lg w-full p-3 mb-3"
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        />

        <input
          type="number"
          inputMode="numeric"
          className="border rounded-lg w-full p-3 mb-3"
          placeholder="Edad"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />

        <select
          className="border rounded-lg w-full p-3 mb-3"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Selecciona tu género</option>
          <option value="Hombre">Hombre</option>
          <option value="Mujer">Mujer</option>
        </select>

        <textarea
          className="border rounded-lg w-full p-3 mb-4"
          placeholder="Cuéntanos algo sobre ti"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={saveProfile}
          disabled={!formValid || loading}
          className="w-full p-3 rounded-lg text-white bg-pink-500 hover:bg-pink-600"
        >
          Guardar perfil
        </button>

        <button onClick={logout} className="mt-3 text-sm text-gray-500 w-full">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
