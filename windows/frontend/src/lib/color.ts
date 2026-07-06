// Extracts a representative color from a thumbnail so the full-screen player can
// tint its background from the artwork (Spotify-style). Google's thumbnail CDN
// (*.googleusercontent.com) sends CORS headers, so drawing the image to a canvas
// with crossOrigin="anonymous" does not taint it. Any failure (CORS, load error,
// tainted canvas) resolves to null and the caller falls back to the blurred backdrop.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const cache = new Map<string, RGB | null>();

export function rgbString({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}

// Darken toward black by `amount` (0..1) — used to keep the gradient readable.
export function darken({ r, g, b }: RGB, amount: number): RGB {
  const f = 1 - Math.min(1, Math.max(0, amount));
  return { r: Math.round(r * f), g: Math.round(g * f), b: Math.round(b * f) };
}

export async function extractDominantColor(url: string): Promise<RGB | null> {
  if (cache.has(url)) return cache.get(url) ?? null;

  const result = await new Promise<RGB | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 16;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 125) continue; // skip transparent
          const rr = data[i];
          const gg = data[i + 1];
          const bb = data[i + 2];
          const max = Math.max(rr, gg, bb);
          const min = Math.min(rr, gg, bb);
          if (max > 240 && min > 240) continue; // near-white
          if (max < 18) continue; // near-black
          r += rr;
          g += gg;
          b += bb;
          count++;
        }
        if (!count) return resolve(null);
        resolve({
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        });
      } catch {
        resolve(null); // tainted canvas / read blocked
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

  cache.set(url, result);
  return result;
}
