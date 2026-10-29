# Guía de publicación y mantenimiento — Sitio de Geoanalytics

Esta guía explica cómo poner el sitio en línea, cómo publicar y editar artículos sin programar, y cómo mantenerlo funcionando a largo plazo. Todas las herramientas de la primera versión son gratuitas.

---

## 1. Cómo está armado el sitio

| Pieza | Herramienta | Costo | Para qué sirve |
|---|---|---|---|
| Código y contenidos | **GitHub** (repositorio) | Gratis | Guarda todos los archivos y el historial de cambios. Nada se pierde: cualquier versión anterior se puede recuperar. |
| Generador del sitio | **Eleventy** | Gratis (código abierto) | Convierte los artículos (archivos de texto) en páginas web. |
| Publicación | **GitHub Pages** | Gratis | Aloja el sitio y lo actualiza solo cada vez que hay un cambio. |
| Panel de edición | **Pages CMS** | Gratis (código abierto) | Permite crear y editar artículos desde el navegador, con formularios. |
| Formulario de contacto | **Web3Forms** | Gratis hasta 250 consultas/mes | Envía al correo de la empresa cada consulta del formulario. |
| Estadísticas (opcional) | **GoatCounter** | Gratis para uso no comercial pequeño; revise sus condiciones | Cuenta visitas sin cookies. |

**El flujo es siempre el mismo:** se guarda un cambio (desde Pages CMS o directamente en GitHub) → GitHub compila el sitio automáticamente (1–2 minutos) → el cambio aparece en línea.

### Estructura de carpetas

```
geoanalytics/
├── src/
│   ├── articulos/          ← un archivo .md por artículo
│   ├── servicios/          ← un archivo .md por servicio
│   ├── media/              ← imágenes (portadas/) y datos para gráficos (datos/)
│   ├── _data/
│   │   ├── site.json       ← nombre, contacto, clave del formulario, dirección del sitio
│   │   ├── categorias.json ← secciones: Geomarketing, Inteligencia comercial, Datos y mapas…
│   │   └── navegacion.json ← menú principal
│   ├── paginas/            ← Artículos, Servicios, Sobre, Contacto, Buscar, archivo, RSS, sitemap
│   ├── _includes/          ← plantillas de diseño
│   └── assets/             ← estilos (css/) y funciones (js/)
├── .pages.yml              ← configuración del panel de edición
├── .github/workflows/      ← publicación automática
├── GUIA.md                 ← este documento
└── PLANTILLA-ARTICULO.md   ← modelo para escribir artículos a mano
```

---

## 2. Poner el sitio en línea (una sola vez)

### 2.1 Crear el repositorio en GitHub

1. Cree una cuenta gratuita en <https://github.com> (puede ser con el correo de la empresa).
2. Haga clic en **New repository**. Nombre sugerido: `geoanalytics`. Visibilidad: **Public** (GitHub Pages gratuito requiere repositorio público).
3. En la página del repositorio vacío, elija **uploading an existing file** y arrastre **todo el contenido** de la carpeta del proyecto descomprimida (incluidas las carpetas `.github` y el archivo `.pages.yml`; si su sistema oculta los archivos que empiezan con punto, actívelos para verlos).
   - Alternativa recomendada: instale **GitHub Desktop** (gratis), elija *Add existing repository* sobre la carpeta y presione *Publish repository*. Así se suben también los archivos ocultos sin problemas.
4. Confirme con **Commit changes**.

### 2.2 Activar GitHub Pages

1. En el repositorio, vaya a **Settings → Pages**.
2. En **Source**, elija **GitHub Actions**.
3. Vaya a la pestaña **Actions**: verá el proceso "Publicar sitio" en marcha. Cuando aparezca la marca verde, el sitio estará en `https://SU-USUARIO.github.io/geoanalytics/`.

### 2.3 Indicar la dirección pública del sitio

Abra `src/_data/site.json` (o, una vez configurado el panel, **Configuración del sitio**) y complete:

```json
"url": "https://SU-USUARIO.github.io/geoanalytics"
```

Sin barra al final. Esta dirección se usa para Google, para las vistas previas al compartir en redes y para el mapa del sitio.

### 2.4 Activar el formulario de contacto

1. Entre a <https://web3forms.com>, escriba el correo donde quiere recibir las consultas y presione **Create Access Key**. La clave llega por correo.
2. Pegue la clave en `site.json` → `formulario.access_key` (o en el panel: **Configuración del sitio → Formulario de contacto**).
3. Pruebe enviando una consulta desde la página Contacto.

Mientras no haya clave, el formulario avisa que todavía no está activado y no envía nada.

#### ¿Adónde van las consultas y las cotizaciones del simulador?

El sitio no tiene base de datos (GitHub Pages solo publica páginas). No hace falta una:

1. **Su correo (siempre).** Cada consulta y cada pedido de cotización del simulador llega como correo a la casilla que registró en Web3Forms. Los del simulador traen un número (por ejemplo `COT-20261028-4821`), el tipo de estudio, la cantidad, el presupuesto indicado, el precio referencial y los datos del cliente. En el panel de Web3Forms puede ver el historial de los últimos 30 días y **exportarlo a CSV** (plan gratuito: 250 envíos por mes).
2. **Una planilla de Google (opcional, gratis, recomendado).** Queda un registro permanente, fila por fila, que puede filtrar y compartir con el equipo:
   1. Cree una planilla nueva en Google Sheets, por ejemplo «Consultas web».
   2. Menú **Extensiones → Apps Script**. Borre el contenido y pegue el archivo `scripts/google-sheets-cotizaciones.gs` de este repositorio. Guarde.
   3. **Implementar → Nueva implementación → Tipo: Aplicación web**. «Ejecutar como»: usted. «Quién tiene acceso»: **Cualquier usuario**. Autorice los permisos.
   4. Copie la URL que termina en `/exec` y péguela en `site.json` → `formulario.google_sheets_url` (o en el panel: **Configuración del sitio → Formulario de contacto**).
   5. Envíe una prueba. Aparece una hoja «Consultas» con una fila por envío; las columnas se crean solas.

La URL `/exec` solo permite **agregar** filas; no permite leer la planilla, así que puede estar en el repositorio público sin exponer datos. No guarde claves ni datos de clientes en el repositorio.

### 2.5 Completar los datos de contacto

En **Configuración del sitio → Datos de contacto** complete correo, teléfono, WhatsApp, LinkedIn y dirección. **Los campos vacíos no se muestran**, por eso el sitio funciona aunque falten.

### 2.6 Dominio propio (opcional, con costo)

Para usar `www.geoanalytics.com.py` u otro dominio:

1. Registre el dominio (los `.com.py` se gestionan a través de NIC Paraguay; los `.com` en cualquier registrador). Es el único componente con costo anual.
2. En **Settings → Pages → Custom domain**, escriba el dominio y siga las instrucciones de DNS que muestra GitHub.
3. Active **Enforce HTTPS**.
4. Cambie `url` en `site.json` por la nueva dirección (por ejemplo `https://www.geoanalytics.com.py`).

Además, en `eleventy.config.js` borre la línea `pathPrefix: "/geoanalytics-sitio/",`: con dominio propio el sitio ya no lleva ese prefijo en las rutas.

---

## 3. Configurar el panel de edición (Pages CMS)

1. Entre a <https://app.pagescms.org> y presione **Sign in with GitHub**.
2. Autorice el acceso al repositorio `geoanalytics` (puede limitarlo solo a ese repositorio).
3. Abra el repositorio desde el panel. Verá en el menú lateral: **Artículos**, **Servicios**, **Secciones**, **Configuración del sitio** y **Media**.

Para que otra persona del equipo publique, agréguela como colaboradora del repositorio en GitHub (**Settings → Collaborators**); luego ingresa a Pages CMS con su propia cuenta.

---

## 4. Publicar un artículo nuevo

### Desde el panel (recomendado)

1. **Artículos → Add an entry** (Agregar).
2. Complete los campos:
   - **Título**: claro y específico. Evite títulos genéricos como "Análisis del mercado".
   - **Resumen**: una o dos frases. Aparece en las tarjetas, en Google y al compartir.
   - **Fecha de publicación**: si pone una fecha futura, el artículo se publicará automáticamente ese día (el sitio se recompila cada mañana).
   - **Sección**: Geomarketing, Inteligencia comercial, Datos y mapas u Opinión técnica.
   - **Etiquetas**: temas transversales (por ejemplo: *Retail*, *Asunción*, *Censo*). Escriba cada etiqueta siempre igual para que se agrupen bien.
   - **Imagen principal**: súbala con el botón de imagen. Formato horizontal, idealmente 1200 × 675 px, menos de 400 KB. Complete siempre la **descripción de la imagen**. Si no tiene una foto o un mapa propio, cree una ilustración 3D con el **generador de portadas** (ver más abajo).
   - **Destacar en la portada**: el artículo destacado más reciente ocupa el lugar principal del inicio.
   - **Borrador**: márquelo mientras el texto no esté listo. Se guarda, pero no aparece en el sitio.
   - **Servicios relacionados**: aparecen al costado del artículo y lo conectan con la página del servicio.
   - **Texto del artículo**: use *Título 2* para subtítulos principales y *Título 3* para secundarios.
3. Presione **Save**. En 1–2 minutos el artículo está en línea, en la portada, en su sección, en el buscador, en el mapa del sitio y en el RSS.

### Crear una portada 3D

El sitio incluye una herramienta interna en `https://SU-DIRECCION/generador-portadas/` (no aparece en el menú ni en Google):

1. Elija la **escena** (capas de análisis, áreas de influencia, red de distribución o mapa de hexágonos) y el **fondo** (azul marino o claro).
2. Presione **Otra variación** hasta encontrar una que le guste. El número de variación permite volver a obtener exactamente la misma imagen.
3. Presione **Descargar imagen (PNG)** y súbala como *Imagen principal* del artículo.

Son ilustraciones abstractas: no muestran datos. Para mostrar datos reales use los gráficos y mapas de la sección 5.

### La dirección (URL) del artículo

Se forma con el nombre del archivo, que Pages CMS genera a partir del título: `/articulos/que-es-el-geomarketing/`. **Evite renombrar el archivo después de publicar**: los enlaces compartidos dejarían de funcionar. Para corregir el título, cambie solo el campo *Título*.

### Editar o actualizar un artículo

Abra el artículo en el panel, haga los cambios y guarde. Si la actualización es sustancial (datos nuevos, correcciones), complete **Fecha de actualización**: se mostrará en el artículo y le indica a Google que el contenido fue renovado.

### Archivar o retirar un artículo

- **Archivar**: no hace falta hacer nada. Todos los artículos quedan accesibles en *Artículos*, en su sección, en las etiquetas y en *Archivo por año*.
- **Retirar temporalmente**: marque **Borrador**.
- **Eliminar**: bórrelo desde el panel. Queda en el historial de GitHub y se puede recuperar.

---

## 5. Gráficos y mapas en los artículos

En el campo **Gráficos y mapas** de cada artículo se pueden agregar visualizaciones. Se muestran al final del texto.

### Gráfico de barras o líneas (con un archivo CSV)

1. Prepare los datos en Excel o Google Sheets con este formato:

   | Departamento | 2022 | 2023 |
   |---|---|---|
   | Zona A | 10,5 | 12,1 |
   | Zona B | 8,2 | 9,0 |

   - Primera columna: categorías (o fechas, para gráficos de líneas).
   - Cada columna siguiente: una serie de datos.
2. Guarde como **CSV**. Funciona tanto el CSV de Excel en español (separado por punto y coma, con coma decimal) como el CSV estándar (separado por comas, con punto decimal y sin separador de miles).
3. En el artículo, agregue una visualización: **Tipo** = barras, barras horizontales o líneas; **Archivo de datos** = suba el CSV; complete **Título**, **Unidad** (por ejemplo `%`), **Nota** y **Fuente**.

### Mapa interactivo

- **Tipo**: Mapa interactivo. Indique **latitud**, **longitud** y **zoom** del centro (por ejemplo, Asunción: −25.29, −57.63, zoom 12).
- **Archivo de datos** (opcional): un **GeoJSON** con puntos, líneas o polígonos (exportable desde QGIS, gratuito, o desde <https://geojson.io>). Las propiedades de cada elemento se muestran al hacer clic. Si no indica centro, el mapa se ajusta a los datos.
- El mapa base es OpenStreetMap; su atribución se muestra automáticamente.

### Gráfico o mapa hecho en otra herramienta

Herramientas gratuitas como **Datawrapper**, **Flourish** o **Google My Maps** permiten crear mapas coropléticos y gráficos interactivos más elaborados. Publique el gráfico allí, copie su enlace de publicación (que empiece con `https://`) y péguelo en **Dirección del contenido externo**, con **Tipo** = Gráfico o mapa externo.

### Regla editorial

Cada gráfico y mapa debe indicar su **fuente** y su **fecha de referencia**. Si los datos son ilustrativos, dígalo explícitamente en la **Nota**, como en el ejemplo del modelo de Huff.

---

## 6. Servicios, industrias, demostraciones y textos institucionales

- **Servicios**: los seis pilares (estadística y data analytics, trade marketing, ruteo, investigación de mercados, geomarketing y operaciones de campo) se editan en el panel (**Servicios**). Cada uno tiene área, ícono, entregables, preguntas y, si corresponde, una demostración relacionada. Si crea un servicio nuevo, agréguelo también a la lista de *Servicios relacionados* en `.pages.yml`.
- **Direcciones antiguas**: las páginas de servicios anteriores y `/sobre/` redirigen solas a sus páginas nuevas. La lista está en `src/_data/redirecciones.json`.
- **Industrias**: los textos, preguntas y servicios de cada industria están en `src/_data/industrias.json`.
- **Metodología**: las cuatro etapas (entender, diseñar, medir y validar, activar decisiones) están en `src/_data/metodologia.json` y aparecen en el inicio, en servicios y en cada servicio.
- **Demostraciones**: góndola 3D, ruteo y encuestas, en `/demostraciones/`. Generan datos simulados en el navegador y lo indican en pantalla; no use nombres de marcas o clientes reales en ellas. Los textos de las tarjetas están en `src/_data/demos.json`.
- **Secciones de artículos**: Geomarketing, Inteligencia comercial y Datos y mapas se editan en **Secciones (categorías)**. No cambie el *identificador*.
- **Sobre Geoanalytics**: el texto está en `src/paginas/nosotros.md`. Ajústelo a la realidad de la empresa (equipo, trayectoria verificable, RUC).
- **Portada**: el título y la presentación están en `src/index.njk`. La ciudad comercial 3D se programa en `src/assets/js/hero3d.js`; la escena de capas sobre el contorno de Paraguay (`paraguay3d.js`) se muestra en el servicio de geomarketing. Si el navegador no puede mostrar 3D, se ve una imagen fija de la misma escena.

Para editar archivos que no están en el panel, ábralos en GitHub, presione el lápiz (**Edit**) y luego **Commit changes**.

---

## 6 quater. Identidad de marca

El sitio aplica el **Manual Estratégico de Marca** (versión 1.0, octubre 2026):

- **Logotipo**: `src/media/marca/logo-geoanalytics.webp` (fondo transparente) e `isotipo-geoanalytics.png` (favicon y redes). Sobre fondos oscuros va siempre sobre placa blanca, como indica el manual. Si tiene el logo maestro en alta resolución o en SVG, reemplace esos archivos con el mismo nombre.
- **Colores**: azul profundo `#0B2D4A`, azul tecnológico `#007BFF`, turquesa `#00C2C7`, verde `#39D98A`, blanco azulado `#F2F8FF`, gris azulado `#DCEAF5`. Están al inicio de `src/assets/css/estilos.css`.
- **Tipografías**: Montserrat (títulos) e Inter (texto), desde Google Fonts.
- **Quiénes somos** (`/nosotros/`) toma esencia, propósito, misión, visión, valores, personalidad y segmentos de `src/_data/marca.json` (en el panel: **Marca**). El manual marca la misión y la visión como pendientes de confirmación: ajústelas ahí cuando estén aprobadas.
- El método de trabajo de seis pasos está en `src/_data/metodologia.json`.
- No se publicaron las partes internas del manual (desafíos, objetivos, indicadores, hoja de ruta y decisiones pendientes).

## 6 ter. Soluciones para Retail y Distribución y Laboratorio

- **Soluciones** (`/soluciones/`) tiene dos accesos: **supermercados** (`/soluciones/supermercados/`) y **distribuidoras** (`/soluciones/distribuidoras/`). Aparecen también en la portada, en el menú y en el formulario de contacto (tema preseleccionado desde cada página).
- Cada página lista las soluciones con lo que se mide, el servicio relacionado, la demostración del laboratorio y un enlace al simulador con el tipo de estudio ya elegido (`/simulador/?tipo=mystery`, por ejemplo).
- Se editan en el panel, **Soluciones para Retail y Distribución** (archivo `src/_data/soluciones.json`). No cambie el campo «Identificador»: forma la dirección de la página.
- El **Laboratorio de inteligencia comercial** (`/demostraciones/`, la dirección no cambió) tiene cuatro demostraciones con datos ficticios: góndola 3D, tablero de rutas y costos, desempeño por sucursal y categoría, y simulador de encuestas con segmentación. Los nombres de sucursales y los costos de ruta son de ejemplo y están rotulados como simulados.

## 6 bis. Simulador de costos de estudios

La página **Simulador** (`/simulador/`) responde dos preguntas:

- **¿Cuánto me alcanza?** (la opción inicial): el visitante elige el estudio, escribe su presupuesto con IVA y dónde se hace el campo, y el simulador busca la mayor cantidad de encuestas, visitas, grupos o puntos de venta que entra en ese monto. En encuestas y relevamientos con muestra aleatoria muestra también el margen de error (proporción de 50 %, 95 % de confianza). Si el presupuesto no alcanza el estudio mínimo, lo dice y muestra cuánto cuesta ese mínimo.
- **¿Cuánto cuesta?**: elige la cantidad y obtiene el precio referencial.

Debajo del resultado, **Recibir esta cotización** abre un formulario corto (nombre, empresa, correo, teléfono). Al enviarlo, la simulación completa le llega por correo con un número de cotización y, si la configuró, se registra en la planilla de Google (sección 2.4). **Copiar el resumen** copia el texto de la simulación.

**Cómo calcula el precio**

1. **Costo operativo** = diseño y coordinación + trabajo de campo + procesamiento, análisis e informe.
2. **Economía de escala**: el costo de campo por unidad baja por tramos (por ejemplo, de la unidad 101 en adelante cuesta un 10 % menos). Además, los costos fijos de diseño e informe se reparten entre más unidades.
3. **Precio de honorarios** = costo operativo ÷ (1 − margen). Con margen de 60 %, un costo de US$ 1.200 da un precio de US$ 3.000. El margen de cada tipo de estudio siempre queda entre el mínimo y el máximo configurados (50 % y 70 %).
4. **Gastos fuera de Asunción y Gran Asunción** (viáticos, hotel y transporte): se calculan según la proporción del campo en el interior y la distancia, y se suman al costo, sin margen (se puede configurar un recargo).
5. Se muestra el subtotal, el IVA y un rango de ±10 %.

**Versión interna**: `/simulador-interno/` (no aparece en el menú ni en Google) muestra además el costo operativo, el margen aplicado, la ganancia y el cálculo de días de campo y viajes. Úsela para preparar presupuestos.

**Actualizar los valores**: en el panel, **Simulador de costos**. **Los valores incluidos son de ejemplo**: reemplácelos por los costos reales antes de difundir el simulador. Puede agregar o quitar tipos de estudio y tramos de escala.

## 7. Buscadores (SEO) y redes sociales

Ya está incluido y funciona solo:

- título y descripción propios en cada página;
- dirección canónica, **sitemap.xml** y **robots.txt**;
- datos estructurados (Schema.org) de organización y de artículo;
- vista previa con imagen al compartir en LinkedIn, WhatsApp, Facebook y X;
- botones para compartir en cada artículo y canal **RSS** (`/feed.xml`).

**Tareas únicas recomendadas:**

1. Registre el sitio en **Google Search Console** (gratis) y envíe la dirección del sitemap: `https://SU-DIRECCION/sitemap.xml`.
2. Haga lo mismo en **Bing Webmaster Tools** (gratis).
3. Cree la página de empresa en LinkedIn y cargue su dirección en *Configuración del sitio*.

**Buenas prácticas por artículo:** título que contenga lo que alguien buscaría; resumen claro; subtítulos descriptivos; imagen con descripción; enlaces a artículos propios relacionados y a fuentes originales.

---

## 8. Estadísticas de visitas (opcional)

1. Cree una cuenta en <https://www.goatcounter.com> y elija un código (por ejemplo `geoanalytics`). Revise que las condiciones de uso gratuito se ajusten a su caso.
2. Escriba ese código en **Configuración del sitio → Estadísticas de visitas**.

No usa cookies, por lo que no hace falta un aviso de cookies.

---

## 9. Mantenimiento

| Frecuencia | Tarea |
|---|---|
| Cada publicación | Revisar el artículo en línea en el teléfono y en la computadora. |
| Mensual | Enviar una consulta de prueba desde Contacto. Revisar en Search Console si hay errores. |
| Trimestral | Revisar que los enlaces a fuentes externas sigan funcionando. Actualizar artículos con datos nuevos (y su fecha de actualización). |
| Anual | Renovar el dominio (si tiene). Actualizar dependencias (ver abajo). |

### Si algo falla

- **El cambio no aparece**: vaya a la pestaña **Actions** del repositorio. Si el proceso tiene una cruz roja, ábralo: el mensaje indica el archivo con problemas (en general, un campo mal escrito en el encabezado de un artículo). Corríjalo o vuelva a la versión anterior desde el historial.
- **Volver atrás**: en GitHub, cada archivo tiene **History**; puede ver y restaurar cualquier versión.
- **Recompilar manualmente**: **Actions → Publicar sitio → Run workflow**.

### Actualizar componentes técnicos (anual, opcional)

Con Node.js instalado (gratis, <https://nodejs.org>):

```bash
npm install          # instala lo necesario
npm start            # vista previa local en http://localhost:8080 (muestra también borradores)
npm update           # actualiza componentes dentro de versiones compatibles
npm run build        # verifica que todo compile
```

Si compila sin errores, suba los cambios a GitHub.

### Copias de seguridad

GitHub guarda todo el historial. Como resguardo adicional, descargue de vez en cuando el repositorio completo (**Code → Download ZIP**).

---

## 10. Alternativas si el sitio crece

- **Cloudflare Pages** (gratis): alternativa de alojamiento con la misma configuración (comando de compilación `npx eleventy`, carpeta de salida `_site`). Útil si GitHub Pages se queda corto o si necesita funciones adicionales.
- **Más de 250 consultas al mes**: plan pago de Web3Forms o un servicio equivalente.
- **Buscador con muchos artículos**: el buscador actual funciona bien con cientos de artículos. Si el archivo crece mucho, puede reemplazarse por Pagefind (gratuito) sin cambiar el diseño.
- **Boletín por correo**: el canal RSS puede conectarse a servicios con plan gratuito para enviar las novedades por correo.

---

## 11. Criterios editoriales sugeridos

- Publicar con regularidad (por ejemplo, un artículo cada una o dos semanas) importa más que publicar mucho de golpe.
- Alternar formatos: guías de método, lecturas de datos públicos, mapas comentados y opinión técnica.
- No publicar cifras, clientes ni resultados que no puedan respaldarse. Citar siempre la fuente y la fecha.
- Cerrar cada artículo vinculándolo a un servicio relacionado: así el lector interesado encuentra el camino a una consulta.
