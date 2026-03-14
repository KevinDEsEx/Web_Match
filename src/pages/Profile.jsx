import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import { toast } from "react-toastify";
import imageCompression from "browser-image-compression";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [previewMode, setPreviewMode] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrlPreview, setPhotoUrlPreview] = useState("");
  const [prefix, setPrefix] = useState("+53");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      age: "",
      gender: "",
      description: "",
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setPhotoUrlPreview(data.photo || "");

      // Intentar extraer el prefijo y el número
      const foundPrefix = COUNTRY_PREFIXES.find(p => data.phone?.startsWith(p.code));
      if (foundPrefix) {
        setPrefix(foundPrefix.code);
        reset({
          name: data.name || "",
          phone: data.phone.replace(foundPrefix.code, ""),
          age: data.age || "",
          gender: data.gender || "",
          description: data.description || "",
        });
      } else {
        reset({
          name: data.name || "",
          phone: data.phone || "",
          age: data.age || "",
          gender: data.gender || "",
          description: data.description || "",
        });
      }
    }
  }

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

  async function onSubmit(data) {
    setSaving(true);
    let finalPhotoUrl = photoUrlPreview;

    try {
      if (photoFile) {
        const fileName = `${user.id}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, photoFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          toast.error("Error al subir la imagen.");
          setSaving(false);
          return;
        }

        const { data: bgData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        finalPhotoUrl = bgData.publicUrl;
      }

      const unspacedPhone = data.phone.replace(/\s+/g, "");
      const fullPhone = prefix + unspacedPhone;

      const { error } = await supabase
        .from("users")
        .update({
          name: data.name,
          phone: fullPhone,
          gender: data.gender,
          age: data.age,
          description: data.description,
          photo: finalPhotoUrl,
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Error al guardar el perfil.");
      } else {
        toast.success("Perfil actualizado correctamente ✅");
        loadProfile(); // Recargar para limpiar estados de archivos
        setPhotoFile(null);
      }
    } catch (err) {
      toast.error("Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  if (!profile) return (
    <div className="flex justify-center mt-20">
      <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-28 bg-gray-50 border-t">
      {/* CABECERA / FOTO */}
      <div className="flex flex-col items-center p-6 bg-white border-b mb-6">
        <div className="relative">
          <img
            src={photoUrlPreview || "/default-avatar.png"}
            alt="Avatar"
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl bg-gray-50"
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

        <p className="text-xl font-bold mt-3 text-gray-800">{profile.name}</p>
        <p className="text-sm text-gray-500">Toca el icono para cambiar tu foto</p>
      </div>

      {/* FORMULARIO */}
      <div className="px-4 max-w-md mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 ml-1 tracking-wider">
              Datos personales
            </h3>

            <div className="space-y-4">
              {/* NOMBRE */}
              <div>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full rounded-xl border p-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition ${
                        errors.name ? "border-red-500 focus:ring-red-400" : "border-gray-200"
                      }`}
                      placeholder="Nombre"
                    />
                  )}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{errors.name.message}</p>
                )}
              </div>

              {/* EDAD Y GENERO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Controller
                    control={control}
                    name="age"
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        className={`w-full rounded-xl border p-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition ${
                          errors.age ? "border-red-500 focus:ring-red-400" : "border-gray-200"
                        }`}
                        placeholder="Edad"
                      />
                    )}
                  />
                  {errors.age && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{errors.age.message}</p>
                  )}
                </div>

                <div>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <select
                        {...field}
                        className={`w-full rounded-xl border p-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400 transition cursor-pointer ${
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
                  {errors.gender && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{errors.gender.message}</p>
                  )}
                </div>
              </div>

              {/* TELEFONO */}
              <div>
                <div className="flex gap-2">
                  <select
                    className="rounded-xl border border-gray-200 p-3 bg-white text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer min-w-[90px]"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                  >
                    {COUNTRY_PREFIXES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.code}
                      </option>
                    ))}
                  </select>

                  <div className="flex-1">
                    <Controller
                      control={control}
                      name="phone"
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className={`w-full rounded-xl border p-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition ${
                            errors.phone ? "border-red-500 focus:ring-red-400" : "border-gray-200"
                          }`}
                          placeholder="Número"
                        />
                      )}
                    />
                  </div>
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* BIO */}
          <section>
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 ml-1 tracking-wider">
              Sobre mí
            </h3>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <textarea
                  {...field}
                  rows="4"
                  className="w-full rounded-xl border border-gray-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition resize-none"
                  placeholder="Cuéntale algo interesante a los demás..."
                />
              )}
            />
          </section>

          {/* ACCIONES */}
          <div className="space-y-3 pb-6">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-pink-500 text-white py-3.5 rounded-xl font-bold hover:bg-pink-600 transition shadow-md active:scale-[0.98] disabled:opacity-70"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full bg-gray-200 text-gray-600 py-3.5 rounded-xl font-bold hover:bg-gray-300 transition active:scale-[0.98]"
            >
              Cerrar sesión
            </button>
          </div>
        </form>
      </div>

      {/* VISTA PREVIA TARJETA */}
      <div className="max-w-md mx-auto mt-6 px-4 border-t pt-10">
        <h3 className="text-center font-bold text-gray-800 mb-6">Así verán tu perfil</h3>

        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setPreviewMode(0)}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
              previewMode === 0 ? "bg-pink-500 text-white shadow-md" : "bg-gray-200 text-gray-600"
            }`}
          >
            Tarjeta grande
          </button>

          <button
            onClick={() => setPreviewMode(1)}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
              previewMode === 1 ? "bg-pink-500 text-white shadow-md" : "bg-gray-200 text-gray-600"
            }`}
          >
            Tarjeta grid
          </button>
        </div>

        <div className="flex justify-center">
          <div className={previewMode === 1 ? "w-1/2" : "w-full"}>
            <UserCard
              user={{
                ...profile,
                name: control._formValues.name || profile.name,
                age: control._formValues.age || profile.age,
                description: control._formValues.description || profile.description,
                photo: photoUrlPreview || profile.photo,
              }}
              liked={false}
              onLike={() => {}}
              grid={previewMode === 1}
              isMe={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
