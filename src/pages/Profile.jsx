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
  age: z.coerce.number().min(18).max(99),
  gender: z.enum(["Hombre", "Mujer", "Otro"]),
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
  const [photoUrlPreview, setPhotoUrlPreview] = useState("");
  const [prefix, setPrefix] = useState("+53");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
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

      const googleAvatar =
        user?.user_metadata?.avatar_url ||
        user?.identities?.[0]?.identity_data?.avatar_url ||
        "";

      setPhotoUrlPreview(data.photo || googleAvatar);

      const foundPrefix = COUNTRY_PREFIXES.find((p) =>
        data.phone?.startsWith(p.code),
      );

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

  function getGoogleAvatar() {
    return (
      user?.user_metadata?.avatar_url ||
      user?.identities?.[0]?.identity_data?.avatar_url ||
      ""
    );
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);

      const compressed = await imageCompression(file, {
        maxSizeMB: 0.04,
        maxWidthOrHeight: 320,
        fileType: "image/webp",
        initialQuality: 0.7,
        useWebWorker: true,
      });

      if (profile?.photo) {
        const oldPath = profile.photo.split("/avatars/")[1];
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      const fileName = `${user.id}-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, compressed, {
          cacheControl: "31536000",
          upsert: true,
        });

      if (uploadError) {
        toast.error("Error subiendo la imagen");
        setUploadingPhoto(false);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const photoUrl = data.publicUrl;

      const { error } = await supabase
        .from("users")
        .update({ photo: photoUrl })
        .eq("id", user.id);

      if (error) {
        toast.error("Error actualizando foto");
      } else {
        setPhotoUrlPreview(photoUrl);
        setProfile((prev) => ({ ...prev, photo: photoUrl }));
        toast.success("Foto actualizada 📸");

        window.dispatchEvent(new Event("profileUpdated"));
      }
    } catch {
      toast.error("Error procesando imagen");
    }

    setUploadingPhoto(false);
  }

  async function removeProfilePhoto() {
    const confirmDelete = window.confirm(
      "¿Quieres eliminar tu foto de perfil?",
    );

    if (!confirmDelete) return;

    try {
      if (profile.photo) {
        const path = profile.photo.split("/avatars/")[1];
        if (path) {
          await supabase.storage.from("avatars").remove([path]);
        }
      }

      const { error } = await supabase
        .from("users")
        .update({ photo: null })
        .eq("id", user.id);

      if (error) {
        toast.error("Error eliminando foto");
        return;
      }

      const googleAvatar = getGoogleAvatar();

      setPhotoUrlPreview(googleAvatar);
      setProfile((prev) => ({ ...prev, photo: null }));

      toast.success("Foto eliminada");

      window.dispatchEvent(new Event("profileUpdated"));
    } catch {
      toast.error("Error eliminando foto");
    }
  }

  async function onSubmit(data) {
    setSaving(true);

    const phoneClean = data.phone.replace(/\s+/g, "");
    const fullPhone = prefix + phoneClean;

    const { error } = await supabase
      .from("users")
      .update({
        name: data.name,
        phone: fullPhone,
        age: data.age,
        gender: data.gender,
        description: data.description,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success("Perfil actualizado");
      loadProfile();
      window.dispatchEvent(new Event("profileUpdated"));
    }

    setSaving(false);
  }

  async function deleteAccount() {
    const confirm1 = window.confirm("¿Seguro que quieres eliminar tu perfil?");
    if (!confirm1) return;

    const confirm2 = window.confirm(
      "Esta acción es irreversible. ¿Eliminar definitivamente?",
    );
    if (!confirm2) return;

    try {
      if (profile.photo) {
        const path = profile.photo.split("/avatars/")[1];
        if (path) {
          await supabase.storage.from("avatars").remove([path]);
        }
      }

      await supabase.from("users").delete().eq("id", user.id);

      await supabase.auth.signOut();

      toast.success("Cuenta eliminada");
      window.location.href = "/login";
    } catch {
      toast.error("Error eliminando cuenta");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  if (!profile)
    return (
      <div className="flex justify-center mt-20">
        <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen pb-28 bg-gray-50 border-t">
      <div className="flex flex-col items-center p-6 bg-white border-b mb-6">
        <div className="relative">
          <img
            src={
              photoUrlPreview ||
              `https://ui-avatars.com/api/?background=f472b6&color=fff&size=120&name=${encodeURIComponent((profile?.name || "U").slice(0, 2).toUpperCase())}`
            }
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
          />

          <label className="absolute bottom-0 right-0 bg-pink-500 text-white p-2 rounded-full cursor-pointer shadow-lg">
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

        {profile.photo && (
          <button
            onClick={removeProfilePhoto}
            className="mt-3 text-sm text-red-500 font-semibold hover:underline"
          >
            Eliminar foto de perfil
          </button>
        )}

        {uploadingPhoto && (
          <p className="text-sm text-gray-500 mt-2">Subiendo foto...</p>
        )}

        <p className="text-xl font-bold mt-3 text-gray-800">{profile.name}</p>
      </div>

      <div className="px-4 max-w-md mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <input
                {...field}
                className="w-full border p-3 rounded-xl"
                placeholder="Nombre"
              />
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name="age"
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  className="border p-3 rounded-xl"
                  placeholder="Edad"
                />
              )}
            />

            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <select {...field} className="border p-3 rounded-xl">
                  <option value="">Genero</option>
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                  <option value="Otro">Otro</option>
                </select>
              )}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="border p-3 rounded-xl"
            >
              {COUNTRY_PREFIXES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>

            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <input
                  {...field}
                  className="flex-1 border p-3 rounded-xl"
                  placeholder="Número"
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <textarea
                {...field}
                rows="4"
                className="w-full border p-3 rounded-xl"
                placeholder="Sobre ti..."
              />
            )}
          />

          <button
            type="submit"
            disabled={!isDirty || saving}
            className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full bg-gray-200 py-3 rounded-xl font-bold"
          >
            Cerrar sesión
          </button>

          <button
            type="button"
            onClick={deleteAccount}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-bold mt-6"
          >
            Eliminar perfil
          </button>
        </form>
      </div>

      <div className="max-w-md mx-auto mt-10 px-4">
        <h3 className="text-center font-bold mb-4">
          Vista previa de tu tarjeta
        </h3>

        <div className="flex justify-center">
          <div className={previewMode === 1 ? "w-1/2" : "w-full"}>
            <UserCard
              user={{
                ...profile,
                photo: photoUrlPreview,
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
