# Calculadora de ventiladores (CPEM)

Página web en React + Vite. Todo el cálculo corre en el navegador: no hay servidor ni base de datos, así que cualquier número de personas puede usarla a la vez.

## Uso local

```bash
npm install
npm run dev        # abre http://localhost:5173
npm test           # pruebas de la lógica de cálculo
npm run build      # genera la carpeta dist/ lista para publicar
```

Requiere Node 18 o superior.

## Publicar

Suba el contenido de `dist/` a cualquier hosting estático: Netlify (arrastrar la carpeta `dist`), Vercel, GitHub Pages, o una carpeta de su propio servidor web. El proyecto usa rutas relativas, así que funciona en subcarpetas.

## Cómo editar los datos

- **Catálogo de ventiladores:** `src/data/ventiladores.json`. Para agregar un modelo copie una línea y cambie los valores. `caudalM3min` es el caudal en m³/min; si solo tiene CFM, divida entre 35.31 (m³/min = CFM ÷ 35.31). `nota` es opcional y se muestra como advertencia.
- **Renovaciones por tipo de local:** `src/data/locales.json`. Son valores típicos de referencia; cámbielos por los criterios de la empresa.
- **Colores y estilo:** `src/styles.css`. La paleta VEGGA está en las variables del inicio del archivo (`--naranja`, `--carbon`, etc.); cambiándolas se actualiza toda la página. El logo es por ahora el texto "VEGGA" (`src/components/Navbar.jsx` y `Footer.jsx`); se puede reemplazar por una imagen.
- **Nombre que se muestra:** por defecto es `modelo`. Si el nombre comercial es distinto, agregue `nombreMostrado` (ej. AIP-600).
- **Modelos que extraen / expulsan aire:** agregue `"extraccion": true` al modelo en `ventiladores.json`. Hoy están marcados AXIAL 9,5, AXIAL 12,5, AIP-500 y AIP-600 de forma PROVISIONAL; confirmar con el cliente.
- **Niveles de ruido:** `src/data/ruido.json`. Cada nivel define un máximo de dB por unidad (hoy: moderado 70 dB, bajo 60 dB). El filtro usa el ruido máximo del catálogo (velocidad máxima).
- **Lógica:** `src/lib/calculo.js`. Criterio de "más apto": menos unidades; a igual número, menor exceso de caudal. Cuando agreguen precios se puede añadir como segundo criterio.

Después de cambiar datos o lógica, ejecute `npm test` para comprobar que los resultados siguen siendo los esperados.

## Pendientes por confirmar

- AXIAL 12,5: el Excel original trae 37000 sin unidad y potencia 0.75; se interpretó m³/h y kW.
- Factor de eficiencia por defecto: 80 % (ajustable en la página).
