import { supabase } from "@/integrations/supabase/client";

export function extractStoragePath(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath) return null;
  const marker = `/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) {
    // Assume already a path
    return urlOrPath.replace(/^\/+/, "");
  }
  return urlOrPath.substring(idx + marker.length);
}

export async function getSignedStorageUrl(
  bucket: string,
  urlOrPath: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractStoragePath(urlOrPath, bucket);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}