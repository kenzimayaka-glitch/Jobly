export const PUBLIC_PROFILE_PHOTO_BUCKET = "profile-photos";
export const PRIVATE_PROFILE_PHOTO_BUCKET = "profile-photos-private";

export function profilePhotoPathFromPublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const marker = `/storage/v1/object/public/${PUBLIC_PROFILE_PHOTO_BUCKET}/`;
  const index = value.indexOf(marker);
  if (index < 0) return null;
  const rawPath = value.slice(index + marker.length).split("?")[0];
  if (!rawPath || rawPath.includes("..")) return null;
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

export function isProfilePhotoPublic(user: Record<string, any> | null | undefined): boolean {
  return user?.profilePhotoVisibility === "PUBLIC" && Boolean(user?.profilePhotoConsentAt);
}

export function getProfilePhotoStoragePath(user: Record<string, any> | null | undefined): string | null {
  const stored = user?.profilePhotoStoragePath;
  if (typeof stored === "string" && stored && !stored.includes("..")) return stored;
  return profilePhotoPathFromPublicUrl(user?.profilePhotoUrl);
}

export async function resolveOwnProfilePhotoUrls(
  supabase: any,
  user: Record<string, any>,
  expiresIn = 3600,
): Promise<{ profilePhotoUrl: string | null; heroPhotoUrl: string | null; profilePhotoVisibility: "PUBLIC" | "PRIVATE" }> {
  const isPublic = isProfilePhotoPublic(user);
  const path = getProfilePhotoStoragePath(user);
  if (!path) {
    return {
      profilePhotoUrl: isPublic ? (user.profilePhotoUrl ?? null) : null,
      heroPhotoUrl: null,
      profilePhotoVisibility: isPublic ? "PUBLIC" : "PRIVATE",
    };
  }

  const bucket = isPublic ? PUBLIC_PROFILE_PHOTO_BUCKET : PRIVATE_PROFILE_PHOTO_BUCKET;
  if (isPublic) {
    const storage = supabase.storage.from(bucket);
    return {
      profilePhotoUrl: storage.getPublicUrl(path).data.publicUrl,
      heroPhotoUrl: storage.getPublicUrl(`${path}.hero.png`).data.publicUrl,
      profilePhotoVisibility: "PUBLIC",
    };
  }

  const storage = supabase.storage.from(bucket);
  const [photo, hero] = await Promise.all([
    storage.createSignedUrl(path, expiresIn),
    storage.createSignedUrl(`${path}.hero.png`, expiresIn),
  ]);
  return {
    profilePhotoUrl: photo.error ? null : photo.data?.signedUrl ?? null,
    heroPhotoUrl: hero.error ? null : hero.data?.signedUrl ?? null,
    profilePhotoVisibility: "PRIVATE",
  };
}
