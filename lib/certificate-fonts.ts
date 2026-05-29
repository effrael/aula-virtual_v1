/**
 * Fuentes para el diseñador y generador de certificados.
 * CDN: jsDelivr + @fontsource (CORS habilitado, estable).
 * Compatible con browser (Designer) y server (generateCertificate).
 *
 * subset: false evita que fontkit/pdf-lib genere subsets corruptos con woff2,
 * lo que causaría que el texto renderice invisible en el PDF generado.
 */
import { getDefaultFont } from "@pdfme/common";

const CDN = "https://cdn.jsdelivr.net/npm/@fontsource";

// Fuentes incluidas por defecto en todas las plantillas
export const DEFAULT_FONT_URLS: Record<string, string> = {
  "Roboto":          `${CDN}/roboto/files/roboto-latin-400-normal.woff2`,
  "Roboto Bold":     `${CDN}/roboto/files/roboto-latin-700-normal.woff2`,
  "Open Sans":       `${CDN}/open-sans/files/open-sans-latin-400-normal.woff2`,
  "Open Sans Bold":  `${CDN}/open-sans/files/open-sans-latin-700-normal.woff2`,
  "Montserrat":      `${CDN}/montserrat/files/montserrat-latin-400-normal.woff2`,
  "Montserrat Bold": `${CDN}/montserrat/files/montserrat-latin-700-normal.woff2`,
  "DM Sans":         `${CDN}/dm-sans/files/dm-sans-latin-400-normal.woff2`,
  "DM Sans Bold":    `${CDN}/dm-sans/files/dm-sans-latin-700-normal.woff2`,
};

export type CustomFont = { name: string; url: string };

type FontEntry = { data: ArrayBuffer; fallback?: boolean; subset: boolean };

// Cache en memoria para el servidor (null = no cargado aún)
let serverFontCache: Map<string, FontEntry> | null = null;

async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function makeEntry(data: ArrayBuffer, fallback?: boolean): FontEntry {
  return { data, fallback, subset: false };
}

/**
 * Carga las fuentes por defecto + fuentes custom de la plantilla.
 * En el servidor las fuentes por defecto se cachean en memoria.
 * subset:false evita corrupción de texto al embeber woff2 en PDF.
 */
export async function getCertificateFonts(
  customFonts: CustomFont[] = []
): Promise<Record<string, FontEntry>> {
  // Cargar fuentes por defecto (con caché en servidor)
  if (!serverFontCache) {
    const entries = await Promise.all(
      Object.entries(DEFAULT_FONT_URLS).map(async ([name, url]) => {
        const data = await fetchFont(url);
        return data ? [name, makeEntry(data, name === "Roboto")] as const : null;
      })
    );

    serverFontCache = new Map(
      entries.filter((e): e is NonNullable<typeof e> => e !== null)
    );

    // No cachear en browser
    if (typeof window !== "undefined") serverFontCache = null;
  }

  const fonts: Record<string, FontEntry> = {};

  // Fuentes por defecto del cache (o recién cargadas en browser)
  const defaults = serverFontCache
    ?? new Map(
        await Promise.all(
          Object.entries(DEFAULT_FONT_URLS).map(async ([name, url]) => {
            const data = await fetchFont(url);
            return data ? [name, makeEntry(data, name === "Roboto")] as const : null;
          })
        ).then((r) => r.filter((e): e is NonNullable<typeof e> => e !== null))
       );

  for (const [name, value] of defaults) {
    fonts[name] = value;
  }

  // Fuentes custom de la plantilla
  await Promise.all(
    customFonts.map(async ({ name, url }) => {
      if (!name.trim() || !url.trim()) return;
      const data = await fetchFont(url);
      if (data) fonts[name] = makeEntry(data);
    })
  );

  // Garantizar que siempre haya al menos un font con fallback:true
  const hasFallback = Object.values(fonts).some((f) => f.fallback);
  if (!hasFallback) {
    Object.assign(fonts, getDefaultFont());
  }

  return fonts;
}
