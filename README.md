# @pulzar/core

Este paquete contiene utilidades y componentes básicos reutilizables dentro del ecosistema Pulzar.

## Instalación

```bash
pnpm add @pulzar/core
```

## Uso básico

```ts
import { helloPulzar } from "@pulzar/core";

console.log(helloPulzar()); // "Hola desde Pulzar Core"
```

## Versionado automático y publicación

Este paquete sigue **Versionado Semántico (SemVer)**, y la versión se incrementa de forma **completamente automática** cuando haces *push* a la rama `main`. El flujo está gestionado por [semantic-release](https://semantic-release.gitbook.io/semantic-release/) y un workflow de **GitHub Actions**.

### 1. Convenciones de commit

semantic-release analiza los mensajes usando el estándar **Conventional Commits**:

| Tipo | Ejemplo                   | Cambio de versión |
|------|---------------------------|-------------------|
| `fix` | `fix: corrige cálculo`     | _patch_ (x.y.**z+1**)
| `feat`| `feat: soporte X`          | _minor_ (x.**y+1**.0)
| `BREAKING CHANGE:` en cuerpo | `feat!: rompe API` | _major_ (**x+1**.0.0)

Otros tipos (`chore`, `docs`, `style`, etc.) **no** generan release.

### 1.1 Ramas de **prueba** (`feature/*`)

Se añadió soporte para ramas `feature/*` en `.releaserc.json`:

```json
"branches": [
  "main",
  { "name": "feature/*", "prerelease": "beta" }
]
```

Cuando haces push a una rama `feature/mi-experimento`, semantic-release creará **pre-releases** con el identificador `-beta.X`, por ejemplo:

* `1.2.0-beta.0`, `1.2.0-beta.1`, etc.

Estos paquetes **también** se publican a npm, pero con la etiqueta `beta`; instalables mediante:

```bash
pnpm add @pulz-ar/core@beta
```

Cuando esa rama finalmente se mergea a `main`, se genera la versión estable (`1.2.0`).

### 1.2 ¿Qué pasa si el commit no contiene palabras clave?

Si ningún commit desde la última versión lleva `feat`, `fix` o `BREAKING CHANGE`, semantic-release **no generará un nuevo release**. El flujo de CI finalizará sin error, simplemente indicará `There are no relevant changes, so no new version is released.`

Esto es útil para commits de _docs_, _chore_, _refactor_ menores, etc. Si realmente deseas forzar un release para otro tipo, agrega el prefijo que corresponda (`feat`/`fix`) o usa el flag manual `BREAKING CHANGE:` en el cuerpo.

> Consejo: Usa `[skip release]` en el título o `[skip ci]` para saltar por completo tanto CI como release si necesitas un commit trivial.

### 2. Configuración (`pulzar-core/.releaserc.json`)

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/npm", { "npmPublish": true, "pkgRoot": "." }],
    ["@semantic-release/git", {
      "assets": ["package.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }]
  ]
}
```

* **branches**: sólo `main` produce releases.
* **commit-analyzer / release-notes**: calculan la siguiente versión y generan notas.
* **npm**: publica el paquete a npm (requiere `NPM_TOKEN`).
* **git**: commitea `CHANGELOG.md` y el `package.json` con la nueva versión.

### 3. Workflow de CI (`.github/workflows/release.yml`)

Cada *push* a `main` ejecuta:

1. `pnpm install` → instala dependencias (usa caché).
2. `pnpm run build` → compila a `dist/`.
3. `pnpm run release` → ejecuta semantic-release.

El job necesita los secretos:

* `GITHUB_TOKEN` (provisto por GitHub), para push/tag.
* `NPM_TOKEN` con permiso *publish* para el scope `@pulz-ar`.

### 4. Flujo diario

```text
feature branch → PR → merge a main → push → CI → nueva versión + publicación
```

1. Crea una rama (`feat/nueva-feature`).
2. Commits siguiendo Conventional Commits.
3. Abre un Pull Request contra `main`.
4. Al hacer *merge*, el workflow calcula la versión adecuada y publica.

### 5. Cómo hacer commits correctamente

Para que semantic-release detecte tus cambios y genere una nueva versión, **debes usar mensajes de commit convencionales**:

#### Formato básico
```
<tipo>: <descripción corta>

[cuerpo opcional con más detalles]

[footer opcional: BREAKING CHANGE: descripción]
```

#### Ejemplos prácticos

**Para bugfixes (incrementa PATCH: 1.0.0 → 1.0.1):**
```bash
git commit -m "fix: corrige error en validación de datos"
git commit -m "fix: resuelve memory leak en agent service"
```

**Para nuevas features (incrementa MINOR: 1.0.0 → 1.1.0):**
```bash
git commit -m "feat: agrega soporte para dataset transformations"
git commit -m "feat: añade exportación de módulos de file y transform"
```

**Para cambios breaking (incrementa MAJOR: 1.0.0 → 2.0.0):**
```bash
git commit -m "feat!: cambia API de agent service

BREAKING CHANGE: el método execute ahora requiere contexto obligatorio"
```

**Commits que NO generan release:**
```bash
git commit -m "chore: actualiza dependencias"
git commit -m "docs: mejora README"
git commit -m "style: formatea código"
git commit -m "refactor: reorganiza estructura de archivos"
```

#### ⚠️ Importante
- Si no hay commits con `feat:` o `fix:` desde el último release, **no se generará una nueva versión**
- Esto es normal y esperado para commits de mantenimiento
- Si necesitas forzar un release, agrega un commit con `feat:` o `fix:`

### 6. Publicar manualmente (desarrollo local)

#### Opción A: Comandos simplificados (Recomendado)

```powershell
# Asegúrate de tener tokens configurados (solo primera vez)
setx NPM_TOKEN "tu-token-de-npm"
setx GH_TOKEN "tu-token-de-github"

# Reinicia el terminal después de configurar tokens

# Para publicar una nueva versión:
pnpm run ship:patch   # Bugfixes:      1.0.0 → 1.0.1
pnpm run ship:minor   # Nuevas features: 1.0.0 → 1.1.0
pnpm run ship:major   # Breaking changes: 1.0.0 → 2.0.0
```

Cada comando `ship:*` hace automáticamente:
1. Incrementa la versión en `package.json`
2. Compila el proyecto (`pnpm run build`)
3. Publica a npm (`pnpm run release`)

#### Opción B: Proceso manual paso a paso

```powershell
# 1. Asegúrate de tener commits con formato convencional
git log --oneline -5  # Verifica que tengas commits feat: o fix:

# 2. Si NO tienes commits convencionales, crea uno:
git add .
git commit -m "feat: agrega nuevas funcionalidades"

# 3. Compila el proyecto
pnpm run build

# 4. Publica (semantic-release calculará la versión automáticamente)
npx semantic-release --no-ci
```

#### Opción C: Solo para testing (no publica a npm)

```powershell
# Ver qué versión se generaría sin publicar
pnpm run release  # Corre en dry-run mode localmente
```

#### Troubleshooting

**Problema: "There are no relevant changes, so no new version is released"**
```powershell
# Solución: Necesitas commits con formato convencional
git add .
git commit -m "feat: describe tus cambios aquí"
pnpm run build
npx semantic-release --no-ci
```

**Problema: "ENOTOKEN" o "npm ERR! need auth"**
```powershell
# Solución: Configura tu token de npm
# Genera un token en: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
setx NPM_TOKEN "npm_XXXXXXXXXXXXXXXXXXXX"
# Reinicia el terminal
```

**Problema: La versión no se actualiza en otros proyectos**
```powershell
# Después de publicar, ve al proyecto que consume @pulz-ar/core:
cd ..\pulzar-web
pnpm update @pulz-ar/core --latest
```

### 7. Desarrollo local: Link a proyectos que consumen @pulz-ar/core

Para desarrollo local, puedes vincular este paquete directamente a proyectos que lo usan (como `pulzar-web`), para que los cambios se reflejen inmediatamente sin necesidad de publicar:

```powershell
# Desde pulzar-web (o cualquier proyecto que use @pulz-ar/core)
cd c:\Users\aleja\storias\projects\pulzar\pulzar-web
pnpm link ..\pulzar-lib-core

# Ahora cuando hagas cambios en pulzar-lib-core:
cd ..\pulzar-lib-core
# ... edita archivos en src/ ...
pnpm run build  # Compila los cambios

# Los cambios están inmediatamente disponibles en pulzar-web
```

**Para deshacer el link y volver a la versión de npm:**
```powershell
cd c:\Users\aleja\storias\projects\pulzar\pulzar-web
pnpm unlink @pulz-ar/core
pnpm install @pulz-ar/core --force
```

**Verificar si estás usando link o npm:**
```powershell
# Verás algo como:
# @pulz-ar/core 1.4.0 <- ..\pulzar-lib-core   (link activo)
# @pulz-ar/core 1.4.0                         (versión de npm)
pnpm list @pulz-ar/core
```

### 8. Reglas importantes

❌ **NO hagas:**
- `npm version major/minor/patch` manualmente (usa `ship:*`)
- Editar `package.json` manualmente para cambiar versión
- Hacer push sin commits convencionales si esperas un release
- Olvidar ejecutar `pnpm run build` después de cambios cuando uses link

✅ **SÍ haz:**
- Usa mensajes de commit convencionales (`feat:`, `fix:`)
- Deja que semantic-release calcule la versión
- Usa comandos `pnpm run ship:*` para publicaciones locales
- Verifica que la versión se publicó: `npm view @pulz-ar/core versions`
- Usa `pnpm link` para desarrollo local cross-repo 