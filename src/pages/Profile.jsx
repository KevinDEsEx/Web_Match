import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [previewMode, setPreviewMode] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
  }

  function updateField(field, value) {
    setProfile({ ...profile, [field]: value });
  }

  async function saveProfile() {
    if (!profile.name || !profile.age || !profile.gender || !profile.phone) {
      alert("Los campos nombre, edad, género y teléfono son obligatorios.");
      return;
    }

    setSaving(true);

    await supabase
      .from("users")
      .update({
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        phone: profile.phone,
        description: profile.description,
        photo: profile.photo,
      })
      .eq("id", user.id);

    setSaving(false);

    alert("Perfil actualizado correctamente ✅");
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];

    if (!file) return;

    const filePath = `${user.id}-${Date.now()}`;

    const { error } = await supabase.storage
      .from("photos")
      .upload(filePath, file);

    if (error) {
      alert("Error subiendo imagen");
      return;
    }

    const { data } = supabase.storage.from("photos").getPublicUrl(filePath);

    updateField("photo", data.publicUrl);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen pb-28">
      {/* FOTO PERFIL */}

      <div className="flex flex-col items-center p-6">
        <div className="relative">
          <div
            className="w-32 h-32 rounded-full bg-cover bg-center border-4 border-white shadow-xl"
            style={{ backgroundImage: `url(${profile.photo})` }}
          />

          <label className="absolute bottom-0 right-0 bg-pink-500 text-white p-2 rounded-full cursor-pointer shadow-lg hover:scale-105 transition">
            <span className="material-symbols-outlined text-sm">
              photo_camera
            </span>

            <input type="file" className="hidden" onChange={uploadPhoto} />
          </label>
        </div>

        <p className="text-lg font-bold mt-3">{profile.name}</p>

        <p className="text-sm text-gray-500">
          Toca el icono para cambiar tu foto
        </p>
      </div>

      {/* FORMULARIO */}

      <div className="px-4 max-w-md mx-auto space-y-6">
        {/* DATOS PERSONALES */}

        <section>
          <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">
            Datos personales
          </h3>

          <div className="space-y-4">
            <input
              className="w-full rounded-xl border p-3"
              placeholder="Nombre"
              value={profile.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                className="rounded-xl border p-3"
                placeholder="Edad"
                value={profile.age || ""}
                onChange={(e) => updateField("age", e.target.value)}
              />

              <select
                className="rounded-xl border p-3"
                value={profile.gender || ""}
                onChange={(e) => updateField("gender", e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <input
              type="tel"
              className="w-full rounded-xl border p-3"
              placeholder="Teléfono"
              value={profile.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
        </section>

        {/* BIO */}

        <section>
          <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">
            Sobre mí
          </h3>

          <textarea
            rows="4"
            className="w-full rounded-xl border p-3"
            placeholder="Cuéntale algo interesante a los demás..."
            value={profile.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
          />
        </section>

        {/* BOTÓN GUARDAR */}

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-pink-500 text-white py-3 rounded-xl font-semibold hover:scale-105 transition"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        {/* CERRAR SESIÓN */}

        <button
          onClick={logout}
          className="w-full bg-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
        >
          Cerrar sesión
        </button>
      </div>

      {/* VISTA PREVIA TARJETA */}

      <div className="max-w-md mx-auto mt-10 px-4">
        <h3 className="text-center font-bold mb-4">Así verán tu perfil</h3>

        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setPreviewMode(0)}
            className={`px-4 py-2 rounded-full text-sm ${
              previewMode === 0 ? "bg-pink-500 text-white" : "bg-gray-200"
            }`}
          >
            Tarjeta grande
          </button>

          <button
            onClick={() => setPreviewMode(1)}
            className={`px-4 py-2 rounded-full text-sm ${
              previewMode === 1 ? "bg-pink-500 text-white" : "bg-gray-200"
            }`}
          >
            Tarjeta grid
          </button>
        </div>

        {previewMode === 0 && (
          <UserCard
            user={profile}
            liked={false}
            onLike={() => {}}
            grid={false}
            isMe={true}
          />
        )}

        {previewMode === 1 && (
          <div className="max-w-[200px] mx-auto">
            <UserCard
              user={profile}
              liked={false}
              onLike={() => {}}
              grid={true}
              isMe={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
