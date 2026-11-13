// Carga un componente .jsx en Node para las pruebas de integración.
// Node no entiende JSX, así que se compila con esbuild (viene instalado con Vite, no hace falta instalar nada)
// a un archivo temporal en tests/.tmp/ y luego se importa. React y react-dom se toman de node_modules.
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const carpetaTmp = fileURLToPath(new URL("../.tmp/", import.meta.url));

export async function cargarComponente(rutaRelativa) {
  const { build } = await import("esbuild");
  mkdirSync(carpetaTmp, { recursive: true });
  const salida = join(carpetaTmp, `${rutaRelativa.replace(/[\\/]/g, "_")}.mjs`);
  await build({
    entryPoints: [join(raiz, rutaRelativa)],
    outfile: salida,
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    loader: { ".js": "jsx", ".jsx": "jsx", ".json": "json" },
    external: ["react", "react-dom", "react/jsx-runtime"],
    logLevel: "error",
  });
  return import(`${pathToFileURL(salida).href}?v=${Date.now()}`);
}

/** Convierte un componente en HTML (sin navegador) para revisar qué muestra. */
export async function aHtml(elemento) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return renderToStaticMarkup(elemento);
}

/** Texto visible del HTML (sin etiquetas), para buscar frases. */
export const texto = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
