# Release Process - Ekairos Monorepo

Este documento describe el proceso para publicar nuevas versiones de los paquetes de Ekairos en npm.

## 📦 Paquetes Publicables

### Paquete Principal
- **`ekairos`** - Paquete wrapper que re-exporta @ekairos/story + @ekairos/domain

### Paquetes con Scope
- **`@ekairos/story`** - Sistema de agentes y stories (dependencia principal)
- **`@ekairos/domain`** - Utilidades de dominio
- **`@ekairos/dataset`** - Herramientas de datasets (depende de @ekairos/story)

### Paquetes Internos (No publicables)
- **`@ekairos/tsconfig`** - Configuración compartida de TypeScript
- **`@ekairos/example-workbench`** - Ejemplos de uso

## 🔄 Flujo de Release con Changesets

Este monorepo usa [@changesets/cli](https://github.com/changesets/changesets) para manejar versiones y releases.

### Pre-requisitos

1. **Autenticación en npm**: Asegúrate de estar autenticado con la org `ekairos`
   ```bash
   npm login
   # Verificar: npm whoami
   ```

2. **Permisos**: Debes tener permisos de publicación en la org `ekairos`

### Proceso de Release

#### 1. Crear un Changeset

Cuando haces cambios que requieren un release, crea un changeset:

```bash
pnpm changeset
```

Esto te guiará por un asistente interactivo:

1. **Seleccionar paquetes afectados**:
   - Usa espacio para seleccionar
   - Enter para confirmar
   - Ejemplo: si cambias @ekairos/story, selecciona @ekairos/story y ekairos

2. **Tipo de bump**:
   - `major` - Breaking changes (1.0.0 → 2.0.0)
   - `minor` - Nuevas features (1.6.0 → 1.7.0)
   - `patch` - Bug fixes (1.6.0 → 1.6.1)

3. **Descripción del cambio**:
   - Escribe un resumen del cambio
   - Se usará en el CHANGELOG

Esto crea un archivo en `.changeset/` con la metadata del cambio.

**Ejemplo de changeset manual** (`.changeset/my-feature.md`):
```markdown
---
"ekairos": minor
"@ekairos/story": minor
---

Added new story engine with workflow integration
```

#### 2. Commit el Changeset

```bash
git add .changeset/
git commit -m "chore: add changeset for new feature"
git push
```

#### 3. Versionar los Paquetes

Cuando estés listo para hacer release, ejecuta:

```bash
pnpm changeset version
```

Esto:
- ✅ Actualiza los `package.json` de los paquetes afectados
- ✅ Genera/actualiza los `CHANGELOG.md`
- ✅ Elimina los changesets procesados
- ✅ Actualiza dependencias internas (ej: ekairos depende de @ekairos/story)

#### 4. Commit los cambios de versión

```bash
git add .
git commit -m "chore: version packages"
git push
```

#### 5. Build y Publicar

```bash
# Build todos los paquetes
pnpm build

# Publicar todos los paquetes con cambios
pnpm changeset publish

# Push de los tags creados
git push --follow-tags
```

## 🎯 Releases Manuales (Sin Changesets)

Si prefieres control manual sin changesets:

### 1. Actualizar versiones manualmente

Edita los `package.json` de los paquetes afectados:

```json
{
  "version": "1.7.0"  // Incrementa según semver
}
```

**Importante**: Si actualizas `@ekairos/story`, también actualiza `ekairos`:
```json
// packages/ekairos/package.json
{
  "version": "1.7.0",  // Mismo número
  "dependencies": {
    "@ekairos/story": "1.7.0"  // Versión específica o workspace:*
  }
}
```

### 2. Build

```bash
pnpm build
```

### 3. Publicar

**Opción A: Publicar todos**
```bash
pnpm -r publish --access public
```

**Opción B: Publicar uno por uno**
```bash
# El orden importa (primero las dependencias)
pnpm --filter @ekairos/domain publish --access public
pnpm --filter @ekairos/story publish --access public
pnpm --filter ekairos publish --access public
pnpm --filter @ekairos/dataset publish --access public
```

### 4. Crear tag en git

```bash
git tag v1.7.0
git push origin v1.7.0
```

## 📋 Checklist de Release

- [ ] Todos los tests pasan: `pnpm test`
- [ ] Typecheck exitoso: `pnpm typecheck`
- [ ] Build exitoso: `pnpm build`
- [ ] Changeset creado (si usas changesets): `pnpm changeset`
- [ ] Versiones actualizadas: `pnpm changeset version` o manual
- [ ] CHANGELOG actualizado
- [ ] Commit y push de cambios
- [ ] Publicación: `pnpm changeset publish` o `pnpm -r publish`
- [ ] Tags pusheados: `git push --follow-tags`

## 🔐 Configuración de npm Token (CI/CD)

Para publicar desde CI, configura el token npm:

```bash
# Generar token en npmjs.com (Automation token)
# Agregar como secret en GitHub: NPM_TOKEN

# En GitHub Actions:
- name: Publish to npm
  run: |
    echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" > ~/.npmrc
    pnpm changeset publish
```

## 🎨 Estrategias de Versionado

### Opción 1: Versión unificada (Recomendado para inicio)
Todos los paquetes comparten la misma versión:
- `ekairos@1.7.0`
- `@ekairos/story@1.7.0`
- `@ekairos/domain@1.7.0`
- `@ekairos/dataset@1.7.0`

**Ventajas**: Simple, fácil de entender
**Desventajas**: Bumps innecesarios en paquetes no modificados

### Opción 2: Versiones independientes
Cada paquete tiene su propia versión:
- `ekairos@2.0.0`
- `@ekairos/story@1.8.5`
- `@ekairos/domain@1.2.1`
- `@ekairos/dataset@1.5.0`

**Ventajas**: Solo se versiona lo que cambia
**Desventajas**: Más complejo de gestionar

**Recomendación**: Empezar con versión unificada, migrar a independiente cuando sea necesario.

## 📊 Verificar Release

Después de publicar:

```bash
# Verificar en npm
npm view ekairos
npm view @ekairos/story
npm view @ekairos/dataset

# Verificar que se puede instalar
mkdir test-install && cd test-install
pnpm init
pnpm add ekairos
pnpm add @ekairos/dataset
```

## 🐛 Rollback de Release

Si necesitas revertir una publicación:

```bash
# Deprecar una versión (no se puede eliminar de npm)
npm deprecate ekairos@1.7.0 "Version deprecated due to critical bug"

# Publicar un patch inmediatamente
pnpm changeset
# (selecciona patch)
pnpm changeset version
pnpm build
pnpm changeset publish
```

## 🔗 Referencias

- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Publishing](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Turbo + Changesets Guide](https://turbo.build/repo/docs/handbook/publishing-packages)



