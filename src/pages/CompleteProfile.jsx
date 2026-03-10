import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

export default function CompleteProfile({ user }) {
  const navigate = useNavigate();

  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState(null); // archivo temporal
  const [photoUrlPreview, setPhotoUrlPreview] = useState(
    user?.user_metadata?.avatar_url || "",
  );

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const formValid = name && phone && gender && age;

  // Validaciones
  function validate() {
    let newErrors = {};
    if (name.length < 3)
      newErrors.name = "El nombre debe tener al menos 3 caracteres";
    if (phone && !/^[0-9]+$/.test(phone))
      newErrors.phone = "El teléfono solo puede contener números";
    if (age && !/^[0-9]+$/.test(age))
      newErrors.age = "La edad debe ser un número";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Seleccionar foto (solo preview)
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoUrlPreview(URL.createObjectURL(file)); // mostrar preview
  }

  // Guardar perfil (sube foto si existe)
  async function saveProfile() {
    if (!validate()) return;

    setLoading(true);

    let finalPhotoUrl = photoUrlPreview;

    // Subir foto a Supabase solo al presionar guardar
    if (photoFile) {
      const fileName = `${user.id}-${Date.now()}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, photoFile, { upsert: true });
      if (error) {
        console.error("Error subiendo foto:", error.message);
      } else {
        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        finalPhotoUrl = data.publicUrl;
      }
    }

    // Guardar perfil
    const { error } = await supabase.from("users").upsert({
      id: user.id,
      name,
      phone,
      gender,
      age: parseInt(age),
      description:
        description || "Esta es la mejor web y TENET el mejor proyecto",
      photo: finalPhotoUrl,
    });

    setLoading(false);

    if (!error) {
      navigate("/explore"); // Ir a Explore
    } else {
      console.error("Error guardando perfil:", error.message);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
      {/* Spinner al guardar */}
      {loading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Completa tu perfil
        </h2>

        {/* FOTO */}
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
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* NOMBRE */}
        <input
          className={`border rounded-lg w-full p-3 mb-1 ${errors.name ? "border-red-500" : ""}`}
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mb-3">{errors.name}</p>
        )}

        {/* TELÉFONO */}
        <input
          className={`border rounded-lg w-full p-3 mb-1 ${errors.phone ? "border-red-500" : ""}`}
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        />
        {errors.phone && (
          <p className="text-red-500 text-sm mb-3">{errors.phone}</p>
        )}

        {/* EDAD */}
        <input
          className={`border rounded-lg w-full p-3 mb-1 ${errors.age ? "border-red-500" : ""}`}
          placeholder="Edad"
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
        />
        {errors.age && (
          <p className="text-red-500 text-sm mb-3">{errors.age}</p>
        )}

        {/* GÉNERO */}
        <select
          className="border rounded-lg w-full p-3 mb-3"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Selecciona tu género</option>
          <option value="Hombre">Hombre</option>
          <option value="Mujer">Mujer</option>
        </select>

        {/* DESCRIPCIÓN */}
        <textarea
          className="border rounded-lg w-full p-3 mb-4"
          placeholder="Cuéntanos algo sobre ti (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* BOTÓN GUARDAR */}
        <button
          onClick={saveProfile}
          disabled={!formValid || loading}
          className={`w-full p-3 rounded-lg text-white transition ${
            formValid
              ? "bg-pink-500 hover:bg-pink-600"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {loading ? "Guardando..." : "Guardar perfil"}
        </button>

        {/* CERRAR SESIÓN */}
        <button onClick={logout} className="mt-3 text-sm text-gray-500 w-full">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
