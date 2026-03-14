import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
  phone: z.string().min(6, { message: "Número inválido" }).regex(/^\d+$/, "Solo números"),
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

export default function CompleteProfile({ user }) {
  const navigate = useNavigate();

  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrlPreview, setPhotoUrlPreview] = useState(
    user?.user_metadata?.avatar_url || "",
  );
  
  const [prefix, setPrefix] = useState("+53");
  const [loading, setLoading] = useState(false);

  // Parse age if already set
  let initialAge = "";
  if (user?.user_metadata?.age) {
    initialAge = parseInt(user.user_metadata.age);
  }

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.user_metadata?.name || "",
      phone: "",
      age: initialAge,
      gender: "",
      description: "",
    },
  });

  /* CONTROL FOTO */
  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      setPhotoFile(compressed);
      setPhotoUrlPreview(URL.createObjectURL(compressed));
    } catch (err) {
      toast.error("Error al procesar la imagen.");
    }
  }

  /* GUARDAR PERFIL */
  async function onSubmit(data) {
    setLoading(true);

    let finalPhotoUrl = photoUrlPreview;

    if (photoFile) {
      const fileName = `${user.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, photoFile, {
          cacheControl: "3600",
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

    const unspacedPhone = data.phone.replace(/\s+/g, "");
    const fullPhone = prefix + unspacedPhone;

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      name: data.name,
      phone: fullPhone,
      gender: data.gender,
      age: data.age,
      description:
        data.description ||
        "Descúbreme en TENET ✨ quizás tengamos más en común de lo que imaginas.",
      photo: finalPhotoUrl,
    });

    setLoading(false);

    if (error) {
      toast.error("Error al guardar el perfil en la base de datos.");
    } else {
      toast.success("¡Perfil completado con éxito!");
      navigate("/");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
      {loading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white font-semibold shadow-sm">Guardando perfil...</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Sobre ti
        </h2>

        {/* FOTO */}
        <div className="flex flex-col items-center mb-6 relative">
          <div className="relative">
            <img
              src={photoUrlPreview || "/default-avatar.png"}
              alt="Avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-pink-100 shadow-sm bg-gray-50"
            />
            
            <label className="absolute bottom-0 right-0 bg-pink-500 hover:bg-pink-600 text-white p-2 rounded-full cursor-pointer shadow-lg transition transform hover:scale-105">
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
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
                    errors.name ? "border-red-500 focus:ring-red-400" : "border-gray-200"
                  }`}
                  placeholder="Tu nombre o apodo"
                />
              )}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name.message}</p>}
          </div>

          {/* TELEFONO + PREFIJO */}
          <div>
            <div className="flex gap-2">
              <select
                className="rounded-xl border border-gray-200 p-3 bg-gray-50 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer min-w-[100px]"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              >
                {COUNTRY_PREFIXES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code} {country.country.split(' ')[0]}
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
                        errors.phone ? "border-red-500 focus:ring-red-400" : "border-gray-200"
                      }`}
                      placeholder="Número de WhatsApp"
                    />
                  )}
                />
              </div>
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
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
                      errors.age ? "border-red-500 focus:ring-red-400" : "border-gray-200"
                    }`}
                    placeholder="Edad"
                  />
                )}
              />
              {errors.age && <p className="text-red-500 text-xs mt-1 ml-1">{errors.age.message}</p>}
            </div>

            <div>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full rounded-xl border p-3 bg-gray-50 text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition cursor-pointer ${
                      errors.gender ? "border-red-500 focus:ring-red-400" : "border-gray-200"
                    }`}
                  >
                    <option value="" disabled>Género</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                    <option value="Otro">Otro</option>
                  </select>
                )}
              />
              {errors.gender && <p className="text-red-500 text-xs mt-1 ml-1">{errors.gender.message}</p>}
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <textarea
                  {...field}
                  rows="3"
                  className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition resize-none"
                  placeholder="Escribe una pequeña bio..."
                />
              )}
            />
          </div>

          {/* BOTÓN SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 p-3.5 rounded-xl font-bold text-white bg-pink-500 hover:bg-pink-600 transition shadow-md active:scale-[0.98]"
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
