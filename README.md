# Español con Astrid

Aplicación web (PWA) para practicar español a partir de las fichas de la profesora Astrid Domínguez. Pensada para instalarse en un teléfono Android directamente desde el navegador, sin tienda de aplicaciones.

## Contenido

El contenido vive en `data/content.json`, organizado como:

```
tema (ej. "Saludos y Expresiones de Cortesía")
 └── subsección (ej. "Despedidas")
      └── items { es, fr }
```

Cada subsección tiene un `kind`: `"vocab"` (palabras sueltas) o `"phrase"` (frases/instrucciones). Las subsecciones de tipo `phrase` habilitan el modo "Completar" (fill-in-the-blank) además de tarjetas y opción múltiple.

### Añadir nuevas fichas fotografiadas (rutina semanal)

1. Poner las fotos nuevas en `Photo/inbox/`.
2. Ejecutar `/import-photos` (comando de Claude Code) — transcribe solo esas fotos nuevas a `data/content.json`, las archiva en `Photo/` y registra el nombre del archivo en `data/processed_photos.json` para no volver a analizarlas nunca.
3. Revisar rápidamente las traducciones al francés generadas (la transcripción de fotos puede cometer errores de lectura).

`data/processed_photos.json` es el registro de qué fotos ya fueron incorporadas — permite añadir lotes nuevos cada semana sin tener que re-procesar las fotos anteriores.

## Ejercicios

- **Tarjetas (flashcards)**: autoevaluación (Sabía / No sabía), con repetición espaciada (SRS) guardada en `localStorage`.
- **Opción múltiple**: elegir la traducción correcta entre 4 opciones.
- **Completar**: rellenar la palabra que falta en una frase en español (solo para subsecciones `phrase`).

Cada tarjeta/pregunta tiene un botón 🔊 que usa la Web Speech API del navegador para pronunciar el texto en español.

## Desarrollo local

No requiere build ni instalación de dependencias. Para probarlo localmente:

```
python -m http.server 8765
```

y abrir `http://localhost:8765/index.html`.

## Publicar en GitHub Pages

1. Crear un repositorio en GitHub y subir este proyecto.
2. En el repositorio: **Settings → Pages → Source**, elegir la rama `main` y la carpeta `/ (root)`.
3. Guardar. GitHub publicará el sitio en `https://<usuario>.github.io/<repositorio>/`.
4. Abrir esa URL en el navegador del teléfono Android y usar el menú del navegador → **"Añadir a pantalla de inicio"** (o el aviso de instalación automático) para instalarla como app.

## Estructura del proyecto

```
index.html              punto de entrada
manifest.json            manifiesto PWA (icono, nombre, colores)
service-worker.js        cache offline
css/style.css
js/
  app.js                 router (#/, #/theme/:id, #/session/:subsectionId/:mode) y pantallas
  data.js                carga/indexa data/content.json, utilidades para "Completar"
  srs.js                 repetición espaciada (localStorage)
  exercises.js            lógica y render de cada modo de ejercicio
  speech.js               texto a voz
data/content.json        contenido transcrito de las fichas
data/processed_photos.json  registro de fotos ya importadas
icons/                   iconos de la PWA
Photo/                   fotos ya procesadas (archivo)
Photo/inbox/             fotos nuevas pendientes de importar (ver /import-photos)
.claude/skills/import-photos/  instrucciones del comando /import-photos
```
