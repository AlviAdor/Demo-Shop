// Public origin used for canonical links, the sitemap and social previews.
// SITE_URL is read at runtime, so one build can be deployed to any domain. NEXT_PUBLIC_SITE_URL is accepted as a fallback.
export const siteUrl = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const siteName = "ALTA";
