import { useState } from "react";
import { supabase } from "../services/supabase";
import imageCompression from "browser-image-compression";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

/* ---------- VALORES POR DEFECTO ---------- */
const DEFAULT_DESCRIPTION =
  "Descúbreme en TENEX ✨ quizás tengamos más en común de lo que imaginas.";

// Avatar genérico estable (no caduca como el de Google)
const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?background=f472b6&color=fff&size=120&name=";

const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
  phone: z
    .string()
    .min(6, { message: "Número inválido" })
    .regex(/^\d+$/, "Solo números"),
  age: z.coerce
    .number({ invalid_type_error: "Debe ser un número" })
    .min(18, { message: "Debes ser mayor de 18 años" })
    .max(99, { message: "Edad no válida" }),
  gender: z.enum(["Hombre", "Mujer", "Otro"], {
    errorMap: () => ({ message: "Selecciona un género" }),
  }),
  description: z.string().optional(),
});

const COUNTRY_PREFIXES = [
  { code: "+53", country: "Cuba 🇨🇺" },
  { code: "+34", country: "España 🇪🇸" },
  { code: "+1", country: "USA 🇺🇸" },
  { code: "+52", country: "México 🇲🇽" },
  { code: "+57", country: "Colombia 🇨🇴" },
  { code: "+54", country: "Argentina 🇦🇷" },
];

export default function CompleteProfile({ user, onProfileSaved }) {
  const [photoFile, setPhotoFile] = useState(null);

  // Prioridad: foto de Google (si existe y no es placeholder) → sin foto (se usará el avatar generado)
  const googleAvatar = user?.user_metadata?.avatar_url || "";
  const [photoUrlPreview, setPhotoUrlPreview] = useState(googleAvatar);

  const [prefix, setPrefix] = useState("+53");
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
      phone: "",
      age: "",
      gender: "",
      description: "",
    },
  });

  // Para generar el avatar por defecto con el nombre si no hay foto
  const watchedName = watch("name");

  /* ---------- CONTROL FOTO ---------- */
  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.04,
        maxWidthOrHeight: 320,
        fileType: "image/webp",
        initialQuality: 0.7,
        useWebWorker: true,
      });
      setPhotoFile(compressed);
      setPhotoUrlPreview(URL.createObjectURL(compressed));
    } catch {
      toast.error("Error al procesar la imagen.");
    }
  }

  /* ---------- GUARDAR PERFIL ---------- */
  async function onSubmit(data) {
    setLoading(true);

    try {
      let finalPhotoUrl = photoUrlPreview;

      // Si se eligió un archivo nuevo → subir a Supabase Storage
      if (photoFile) {
        const fileName = `${user.id}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, photoFile, {
            cacheControl: "31536000",
            upsert: true,
          });

        if (uploadError) {
          toast.error("Error al subir la imagen a la nube.");
          setLoading(false);
          return;
        }

        const { data: bgData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        finalPhotoUrl = bgData.publicUrl;
      }

      // Si no hay ninguna foto → usar avatar generativo con el nombre
      if (!finalPhotoUrl) {
        const nameEncoded = encodeURIComponent(
          data.name?.slice(0, 2).toUpperCase() || "U"
        );
        finalPhotoUrl = `${DEFAULT_AVATAR}${nameEncoded}`;
      }

      const unspacedPhone = data.phone.replace(/\s+/g, "");
      const fullPhone = prefix + unspacedPhone;

      const { error } = await supabase.from("users").upsert({
        id: user.id,
        name: data.name.trim(),
        phone: fullPhone,
        gender: data.gender,
        age: data.age,
        description: data.description?.trim() || DEFAULT_DESCRIPTION,
        photo: finalPhotoUrl,
      });

      if (error) {
        console.error("Supabase upsert error:", error);
        toast.error("Error al guardar el perfil. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      toast.success("¡Perfil completado con éxito!");

      // Avisamos a App.jsx que recargue el perfil.
      // App.jsx detectará que `profile` ya existe y redirigirá solo a /explore.
      // NO llamamos navigate() aquí para evitar la race condition.
      if (onProfileSaved) {
        await onProfileSaved();
      } else {
        window.dispatchEvent(new Event("profileUpdated"));
      }
    } catch (err) {
      console.error("Error inesperado:", err);
      toast.error("Error inesperado. Intenta de nuevo.");
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  /* ---------- PANTALLA DE CARGA ---------- */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pink-500 p-6 px-4 text-center animate-pulse">
        <div className="bg-white p-8 rounded-full shadow-2xl mb-8 flex items-center justify-center">
          <span className="material-symbols-outlined text-[60px] text-pink-500">
            favorite
          </span>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-wide">
          Entrando a TENEX...
        </h2>
        <p className="text-pink-100 font-medium text-lg">
          Preparando tus mejores matches
        </p>
        <div className="w-64 h-2 bg-pink-400 rounded-full mt-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-white rounded-full animate-[progress_2s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  /* ---------- FORMULARIO ---------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Sobre ti
        </h2>

        {/* FOTO (opcional) */}
        <div className="flex flex-col items-center mb-6 relative">
          <div className="relative">
            <img
              src={
                photoUrlPreview ||
                `${DEFAULT_AVATAR}${encodeURIComponent(
                  watchedName?.slice(0, 2).toUpperCase() || "U"
                )}`
              }
              alt="Avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-pink-100 shadow-sm bg-gray-50"
            />
            <label className="absolute bottom-0 right-0 bg-pink-500 hover:bg-pink-600 text-white p-2 rounded-full cursor-pointer shadow-lg transition transform hover:scale-105">
              <span className="material-symbols-outlined text-[20px]">
                photo_camera
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-2">Foto opcional</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* NOMBRE */}
          <div>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  autoComplete="name"
                  className={`w-full rounded-xl border p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition ${
                    errors.name
                      ? "border-red-500 focus:ring-red-400"
                      : "border-gray-200"
                  }`}
                  placeholder="Tu nombre o apodo"
                />
              )}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1 ml-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* TELEFONO */}
          <div>
            <div className="flex gap-2">
              <select
                className="rounded-xl border border-gray-200 p-3 bg-gray-50 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer min-w-[100px]"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              >
                {COUNTRY_PREFIXES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code} {country.country.split(" ")[0]}
                  </option>
                ))}
              </select>

              <div className="flex-1 w-full relative">
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      onChange={(e) => {
                        const numeric = e.target.value.replace(/\D/g, "");
                        field.onChange(numeric);
                      }}
                      className={`w-full rounded-xl border p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition ${
                        errors.phone
                          ? "border-red-500 focus:ring-red-400"
                          : "border-gray-200"
                      }`}
                      placeholder="Número de WhatsApp"
                    />
                  )}
                />
              </div>
            </div>
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1 ml-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* EDAD Y GÉNERO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Controller
                control={control}
                name="age"
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    inputMode="numeric"
                    className={`w-full rounded-xl border p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition ${
                      errors.age
                        ? "border-red-500 focus:ring-red-400"
                        : "border-gray-200"
                    }`}
                    placeholder="Edad"
                  />
                )}
              />
              {errors.age && (
                <p className="text-red-500 text-xs mt-1 ml-1">
                  {errors.age.message}
                </p>
              )}
            </div>

            <div>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full rounded-xl border p-3 bg-gray-50 text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition cursor-pointer ${
                      errors.gender
                        ? "border-red-500 focus:ring-red-400"
                        : "border-gray-200"
                    }`}
                  >
                    <option value="" disabled>
                      Género
                    </option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                    <option value="Otro">Otro</option>
                  </select>
                )}
              />
              {errors.gender && (
                <p className="text-red-500 text-xs mt-1 ml-1">
                  {errors.gender.message}
                </p>
              )}
            </div>
          </div>

          {/* DESCRIPCIÓN (opcional) */}
          <div>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <textarea
                  {...field}
                  rows="3"
                  className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition resize-none"
                  placeholder="Escribe una pequeña bio... (opcional)"
                />
              )}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 p-3.5 rounded-xl font-bold text-white bg-pink-500 hover:bg-pink-600 transition shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            Comenzar a explorar
          </button>
        </form>

        <button
          onClick={logout}
          className="mt-4 text-sm font-semibold text-gray-400 w-full hover:text-gray-600 transition"
        >
          Cerrar sesión y salir
        </button>
      </div>
    </div>
  );
}
