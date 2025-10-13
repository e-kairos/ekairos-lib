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

### 5. Publicar manualmente (sólo casos extremos)

Si necesitas publicar localmente:

```powershell
# Instalar deps y compilar
yarn; # o pnpm install
pnpm run build;

# Ejecutar semantic-release en local (usa tus credenciales)
setx NPM_TOKEN "<token>";
setx GH_TOKEN "<token>";

pnpm run release;

# Comandos simplificados para versioning + build + release
pnpm run ship:major;  # 1.0.0 -> 2.0.0
pnpm run ship:minor;  # 1.0.0 -> 1.1.0
pnpm run ship:patch;  # 1.0.0 -> 1.0.1
```

No uses `npm version` ni edites `package.json`; todo lo gestiona semantic-release. 