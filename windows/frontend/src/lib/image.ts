// Google's thumbnail CDN (yt3.googleusercontent.com, etc.) encodes the served
// size directly in the URL, e.g. "...=w120-h120-l90-rj" — the same image is
// available at any size on request. ytmusicapi often hands us a small variant;
// this rewrites it up for spots where artwork is displayed large (full player,
// hero headers), instead of stretching a 120x120 thumbnail to fill them.
export function hqThumbnail<T extends string | null | undefined>(url: T, size = 544): T {
  if (!url) return url;
  return url.replace(/([-=])w\d+-h\d+/, `$1w${size}-h${size}`) as T;
}
