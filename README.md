# Calculadora CFM (VEGGA)

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

- **Catálogo de ventiladores:** `src/data/ventiladores.json`. Para agregar un modelo copie una línea y cambie los valores. `cfm` es el caudal de la ficha (fuente del cálculo; si solo tiene m³/min multiplique por 35.31). `linea` es `industrial` o `domestica`. `nota` es opcional y se muestra como advertencia.
- **Renovaciones por tipo de local:** `src/data/locales.json`. Cada local tiene `min` y `max` (tabla de VEGGA: bajo 4–6, medio 8–12, alto 15–30; almacén 5–10 según DIN 1946). La "media" es el promedio del rango, o el valor `media` si se define (almacén = 7). En la página el **calor de la zona** elige el valor del rango (Bajo = mínimo, Medio = media, Alto = máximo), o se escribe un valor manual.
- **Colores y estilo:** `src/styles.css`. La paleta VEGGA está en las variables del inicio del archivo (`--naranja`, `--carbon`, etc.); cambiándolas se actualiza toda la página. El logo es por ahora el texto "VEGGA" (`src/components/Navbar.jsx` y `Footer.jsx`); se puede reemplazar por una imagen.
- **Nombre que se muestra:** por defecto es `modelo`. Si el nombre comercial es distinto, agregue `nombreMostrado` (ej. AIP-60).
- **Modelos que extraen o inyectan aire:** agregue `"extraccion": true` y/o `"inyeccion": true` al modelo en `ventiladores.json`. Provisional; confirmar con el cliente.
- **Niveles de ruido:** `src/data/ruido.json`. Cada nivel define un máximo de dB por unidad (hoy: moderado 70 dB, bajo 60 dB). El filtro usa el ruido máximo del catálogo (velocidad máxima).
- **Lógica:** `src/lib/calculo.js`. Criterio de "más apto": menos unidades; a igual número, menor exceso de caudal. Cuando agreguen precios se puede añadir como segundo criterio.

Después de cambiar datos o lógica, ejecute `npm test` para comprobar que los resultados siguen siendo los esperados.

## Pendientes por confirmar

- AXIAL 12,5: el Excel original trae 37000 sin unidad y potencia 0.75; se interpretó m³/h y kW.
- AXIAL 12,5: se usa 26.176 CFM (Excel nuevo); el valor 37000 sin unidad queda sin confirmar.
- Dobles en el Excel (VP-16C) y ruidos inconsistentes en UR-623 y VO-16: ver `comentario` en el JSON.
- AIP-50/AIP-60 no traen CFM: convertidos desde m³/min.

## Cálculo (según las láminas de VEGGA)

- Volumen (m³) = largo × ancho × altura. Si se indica altura mínima, se usa el promedio de la máxima y la mínima.
- Q (m³/h) = volumen × renovaciones por hora (R/H). CFM = m³/h × 0.5886. l/s = m³/h ÷ 3.6.
- Voltaje: 110 V y 120 V se tratan como la misma conexión (120 V). Opciones: Cualquiera, 120 V, 220 V.
- Entrada de aire: si el local **tiene** entrada de aire, basta un inyector (el aire caliente sale por las aberturas). Si **no** la tiene, los modelos axiales (`"axial": true` en el catálogo) se instalan en pareja: un inyector y un extractor, cada uno con el caudal requerido (el doble de unidades; el caudal no se suma).
- Caudal a cubrir (barra 65–125 %): 100 % = caudal requerido con 80 % de rendimiento del ventilador. Más de 100 % pide un poco más de aire.
- Línea de ventiladores: Industrial (por defecto), Doméstica o Todas.

## Novedades (20 oct)

- **Alcance requerido** en botones: Cualquiera / Extracción / Inyección / Ambas. "Ambas" recomienda una pareja (inyector + extractor) con modelos marcados `extraccion` e `inyeccion`. Marcas actuales (PROVISIONALES): AXIAL y AIP (axiales) = ambas; el resto = solo inyección.
- **Elegir modelo:** en "Otras opciones", el botón Elegir lo muestra como resultado principal.
- **Contaminantes:** `src/data/contaminantes.json` (factor que multiplica las renovaciones: leve ×1,25, moderado ×1,5, alto ×2; criterio estimado, por confirmar).
- **Personas:** `rpp` (m³/h por persona) y `rm2` (m³/h por m²) en `locales.json` (IMC/ASHRAE 62.1); el aire por personas se SUMA al de renovaciones.
- **Listas obligatorias:** Tipo de local, Contaminantes, Entrada de aire y Personas empiezan en «Seleccionar…»; sin elegirlas no se calcula y el resultado indica qué falta. El campo `personas` de `locales.json` ("moderado" = trabajando, "bajo" = atención al público u oficina, "libre" = sin personas) se muestra como sugerencia bajo la pregunta de personas.
- **Bajar al resultado:** la página baja sola cuando se completa la última parte: todos los datos obligatorios y, si hay personas, la cantidad de personas (espera 1,2 s sin cambios, una sola vez).
- **¿Por qué este modelo?:** `explicarEleccion()` en `src/lib/calculo.js` arma las frases que ve el vendedor bajo el resultado (con botón "Copiar explicación").
- **Tolerancia de exceso:** constantes `TOLERANCIA_EXCESO` (0,3), `MAX_UNIDADES_EXTRA` (1, por lado) y `MAX_AUMENTO_POTENCIA` (0,5) al inicio de `src/lib/calculo.js`. Si la opción con menos unidades da más de 30 % de aire de más (medido contra el caudal pedido con la barra), pasa al frente la más ajustada que cumpla los límites, respete la preferencia doméstica y, en locales sin esa preferencia, no salte de industrial a doméstica. Si no hay ninguna, se mantiene la de menos unidades y la explicación lo indica.
- **Ventiladores de techo:** un modelo con `"techo": true` (hoy el UR-623 y el VO-16) cuenta para el caudal como los demás, pero si el piso mide más de `AREA_MAX_TECHO_M2` (30 m²) queda al final de la lista y no puede ser la recomendada, por el tipo de instalación. En espacios pequeños (habitaciones, cabinas, hostels) compite normal.
- **Tipo y control de los domésticos:** campos `tipo` ("de pared", "de pie", "de torre", "de techo", "de techo orbital", "3 en 1 (pie, pared o mesa)", etc.) y `control` ("cordón", "control remoto", "perilla", "botones", "control de pared", "control de pared tipo dimmer") en `ventiladores.json`. La explicación los usa para describir el modelo y la diferencia con la alternativa.
- **Fotos y fichas técnicas:** en `ventiladores.json`, `foto` es el nombre base de las imágenes en `public/img/ventiladores/` (`<foto>.webp` = foto recortada de unos 600 px; `<foto>-ficha.webp` = ficha completa). `nombreComercial`, `codigo` y `destacados` (lista corta de características) se muestran junto al modelo recomendado. Para agregar un modelo: optimizar la foto a WebP (máx. 600 px, unos 50 KB) y la ficha (máx. 1000 px de ancho), copiarlas a esa carpeta y llenar esos campos.
- **Tipo de ventilador:** campo `montaje` de `ventiladores.json`: lista con "pared", "piso" y/o "techo" (el LF-18, 3 en 1, tiene pared y piso; los de pie y de torre cuentan como piso; los axiales, como pared). En Ajustes avanzados, «Tipo de ventilador» filtra por ese campo. Si se elige «Techo», los ventiladores de techo no se relegan en espacios grandes.
- **Mínimo por personas:** constante `PERSONAS_POR_VENTILADOR` (10) en `src/lib/calculo.js`. Más personas generan más calor, así que se recomienda al menos 1 ventilador por cada 10 personas (30 estudiantes → 3). No aplica a los axiales, que renuevan el aire del local. La cantidad final es la mayor entre la cuenta por caudal, por área (domésticos) y por personas.
- **Cobertura en m²:** campo `coberturaM2` de `ventiladores.json` (área que cubre una unidad según la ficha). En `App.jsx`, `usarCobertura: "domesticos"` hace que, para los domésticos, la cantidad sea la mayor entre la cuenta por caudal (CFM) y la cuenta por área (m² del piso ÷ cobertura). Con `"todos"` se aplicaría también a los industriales que tengan el dato; con `"no"`, solo CFM. Si la cantidad la define el área, no se aplica la tolerancia de exceso y la explicación lo dice.
- **Domésticos sin entrada de aire:** si el local no tiene entrada de aire, a los modelos domésticos se les pide `FACTOR_DOMESTICO_SIN_ENTRADA` (1,25 = 25 % más) de caudal, porque les cuesta más mover el aire. Solo los axiales inyectan y extraen.
- **Aviso de 220 V:** si la conexión eléctrica está en "Cualquiera" y el modelo mostrado es de 220 V, el resultado pide confirmar que el local tenga 220 V.
- **Renovaciones:** valores DIN 1946 (Casals/Soler&Palau); por defecto se usa la media del rango (Calor de la zona = Medio; Bajo = zonas altas y frescas, Alto = costas y bajuras).
- **Caudal requerido vs. brindado:** el resultado compara ambos (CFM) y muestra el 100 % de catálogo.

## Escala de ruido (1–15)

- La escala está en `src/data/escalaRuido.json` (nombre, rango en dB y ejemplo de cada nivel).
- Cada modelo tiene `nivelRuido` (1–15) en `src/data/ventiladores.json`. **Editar ese número** según la experiencia de campo. Si un modelo no lo tiene, se convierte desde `ruidoMax` (cada nivel = 5 dB).
- El filtro "¿Hay personas?" usa niveles: trabajando = hasta nivel 10, atención al público/oficina = hasta nivel 7, personalizado = el nivel elegido. Se configura en `src/data/ruido.json` (`maxNivel`).

## Pruebas

Hay tres niveles de pruebas. Todas usan el corredor de pruebas que trae Node (`node:test`).

| Comando | Qué prueba | Cuánto tarda |
| --- | --- | --- |
| `npm run test:unitarias` | La lógica de cálculo (`src/lib/calculo.test.js`) y los datos: catálogo, tipos de local, ruido, contaminantes y que existan todas las fotos y fichas (`tests/unitarias/`). | 1 s |
| `npm run test:integracion` | Los componentes de React con la lógica y los datos reales, dibujados como HTML sin navegador: listas en «Seleccionar…», lo que falta, el resultado con nombre comercial, foto, ficha y explicación, el mensaje «No se puede calcular por», el aviso de 220 V (`tests/integracion/`). | 2 s |
| `npm test` | Unitarias + integración. Es lo que corre GitHub Actions antes de publicar: si falla, la página no se actualiza. | 3 s |
| `npm run test:funcionales` | Compila la página y la usa en un Chrome automático como un vendedor: llenar el formulario, bajar al resultado, elegir otra opción, «Ver todas», «Copiar explicación», «Limpiar», coma decimal, sin desbordes en 320, 375 y 768 px (`tests/funcionales/`). | 30 s |
| `npm run test:todo` | Todas. | 35 s |

Las funcionales necesitan Playwright, que se instala **una sola vez**:

```
npm install --save-dev playwright
npx playwright install chromium
```

Después de instalarlo, suba también `package.json` y `package-lock.json`. Si Playwright no está instalado, las pruebas funcionales se marcan como omitidas con un aviso, sin fallar.
