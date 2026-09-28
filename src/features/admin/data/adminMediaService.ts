import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.generated";
import { validateProductImage } from "../productValidation";

function fail(message: string, error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null;
  throw new Error(code ? `${message} (${code}).` : message);
}

export interface UploadedPublicMedia {
  mediaAssetId: string;
  storagePath: string;
  url: string;
  viAlt: string;
  koAlt: string;
}

export async function uploadPublicMediaAsset(
  client: SupabaseClient<Database>,
  file: File,
  options: { pathPrefix: string; viAlt: string; koAlt: string; fallbackVi: string; fallbackKo: string },
): Promise<UploadedPublicMedia> {
  const extension = validateProductImage(file);
  const mediaAssetId = crypto.randomUUID();
  const storagePath = `${options.pathPrefix}/${mediaAssetId}.${extension}`;
  const viAlt = options.viAlt.trim() || options.fallbackVi;
  const koAlt = options.koAlt.trim() || options.fallbackKo;
  const upload = await client.storage.from("public-media").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (upload.error) fail("Không thể tải ảnh lên Storage", upload.error);

  let metadataInserted = false;
  try {
    const profile = await client.rpc("current_admin_profile_id");
    if (profile.error || !profile.data) fail("Không thể xác định hồ sơ Admin", profile.error);
    const media = await client.from("media_assets").insert({
      id: mediaAssetId,
      storage_bucket: "public-media",
      storage_path: storagePath,
      access: "PUBLIC",
      mime_type: file.type,
      byte_size: file.size,
      uploaded_by: profile.data,
    });
    if (media.error) fail("Không thể ghi metadata ảnh", media.error);
    metadataInserted = true;
    const translations = await client.from("media_asset_translations").insert([
      { media_asset_id: mediaAssetId, locale: "vi", alt_text: viAlt },
      { media_asset_id: mediaAssetId, locale: "ko", alt_text: koAlt },
    ]);
    if (translations.error) fail("Không thể lưu alt text ảnh", translations.error);
    return {
      mediaAssetId,
      storagePath,
      url: client.storage.from("public-media").getPublicUrl(storagePath).data.publicUrl,
      viAlt,
      koAlt,
    };
  } catch (error) {
    if (metadataInserted) await client.from("media_assets").delete().eq("id", mediaAssetId);
    await client.storage.from("public-media").remove([storagePath]);
    throw error;
  }
}

export async function discardUploadedPublicMediaAsset(client: SupabaseClient<Database>, media: UploadedPublicMedia) {
  await client.from("media_assets").delete().eq("id", media.mediaAssetId);
  await client.storage.from("public-media").remove([media.storagePath]);
}

export async function updatePublicMediaCopy(
  client: SupabaseClient<Database>,
  mediaAssetId: string,
  copy: { viAlt: string; koAlt: string; viCaption?: string; koCaption?: string },
) {
  if (!copy.viAlt.trim() || !copy.koAlt.trim()) throw new Error("Alt text VI và KO không được để trống.");
  const result = await client.from("media_asset_translations").upsert([
    {
      media_asset_id: mediaAssetId,
      locale: "vi",
      alt_text: copy.viAlt.trim(),
      ...(copy.viCaption !== undefined ? { caption: copy.viCaption.trim() || null } : {}),
    },
    {
      media_asset_id: mediaAssetId,
      locale: "ko",
      alt_text: copy.koAlt.trim(),
      ...(copy.koCaption !== undefined ? { caption: copy.koCaption.trim() || null } : {}),
    },
  ], { onConflict: "media_asset_id,locale" });
  if (result.error) fail("Không thể cập nhật nội dung ảnh", result.error);
}
