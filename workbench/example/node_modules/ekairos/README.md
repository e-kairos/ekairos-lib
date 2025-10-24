# Ekairos

**AI Stories and Workflows Runtime** - Build durable, intelligent workflows with AI.

## Installation

```bash
# Core package (story + domain)
pnpm add ekairos

# Dataset tools (separate package)
pnpm add @ekairos/dataset
```

## Quick Start

```typescript
import { story, engine, storyRunner } from 'ekairos';

// 1. Define your story
const myStory = {
  key: 'my-story',
  narrative: 'You are a helpful assistant that...',
  actions: [
    {
      name: 'doSomething',
      description: 'Does something useful',
      implementationKey: 'my.action',
      execute: async ({ arg, contextId }) => {
        // Your non-serializable code here
        return { success: true, result: 'done' };
      }
    }
  ],
  options: {
    reasoningEffort: 'medium',
    maxLoops: 10
  }
};

// 2. Register the story
export const storyEngineInstance = engine.register(myStory);
export const descriptor = storyEngineInstance.story('my-story');

// 3. Create a workflow (in app/workflows/my-story.ts)
import { storyRunner } from 'ekairos';
import { descriptor } from './stories';

export async function myWorkflow(args?: { context?: any }) {
  "use workflow";  // Required for Next.js Workflow DevKit
  return storyRunner(descriptor, args);
}

// 4. Start the workflow
import { start } from 'workflow/api';
import { myWorkflow } from './workflows/my-story';

await start(myWorkflow);
```

## Next.js Integration

```typescript
// next.config.ts
import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['ekairos'],
};

export default withWorkflow(nextConfig);
```

## What's Included

This package (`ekairos`) is a convenience wrapper that re-exports:
- **@ekairos/story** - AI agents, story engine, workflows, steps
- **@ekairos/domain** - Domain modeling utilities for InstantDB

**Not included:** Dataset tools are a separate package (`@ekairos/dataset`)

## Package Ecosystem

```bash
# Core runtime (recommended for most use cases)
pnpm add ekairos

# Dataset tools - SEPARATE package
pnpm add @ekairos/dataset

# Advanced: Use scoped packages directly if needed
pnpm add @ekairos/story   # Story engine only
pnpm add @ekairos/domain  # Domain utilities only
```

## Features

- 🤖 **AI Agents** - Durable agents with tool execution
- 🎭 **Story Engine** - Modular stories with non-serializable actions
- 🔄 **Workflow Integration** - Compatible with Vercel Workflow DevKit
- 💾 **Persistent State** - Built on InstantDB
- 🛠️ **Extensible** - Easy to add custom tools and actions

## Documentation

See the [monorepo README](../../README.md) for full documentation.

## License

MIT

