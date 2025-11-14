# Industry Themed Terminal Panel

A terminal emulator panel for the [Panel Framework V2](https://github.com/principal-ade/panel-framework), featuring industry theming and full terminal capabilities.

## Overview

This panel package provides a single, non-tabbed terminal emulator that integrates with the panel-framework's actions and events APIs. It uses `@principal-ade/industry-themed-terminal` for consistent styling and xterm.js for terminal emulation.

## Features

- Full terminal emulation via xterm.js
- Industry-themed UI with custom header
- WebGL acceleration support
- Unicode 11 support
- Built-in search functionality
- Clickable web links
- Repository-aware session creation
- Framework-integrated lifecycle management

## Getting Started

### 1. Clone or Use This Template

```bash
# Clone the starter
git clone https://github.com/your-org/panel-starter.git my-panel-extension
cd my-panel-extension

# Install dependencies
bun install
# or: npm install
```

### 2. Customize Your Package

Update `package.json` with your information:

```json
{
  "name": "@your-org/your-panel-name",
  "description": "Your panel description",
  "author": "Your Name",
  "keywords": ["panel-extension"],
  "repository": {
    "url": "git+https://github.com/your-org/your-panel-name.git"
  }
}
```

### 3. Develop Your Panel

Edit `src/panels/ExamplePanel.tsx` or create new panel components:

```tsx
import React from 'react';
import type { PanelComponentProps } from '../types';

export const MyPanel: React.FC<PanelComponentProps> = ({
  context,
  actions,
  events,
}) => {
  return (
    <div>
      <h1>My Custom Panel</h1>
      <p>Repository: {context.repositoryPath}</p>
    </div>
  );
};
```

### 4. Register Your Panels

Update `src/index.tsx` to export your panel definitions:

```tsx
import { MyPanel } from './panels/MyPanel';

export const panels = [
  {
    id: 'your-org.my-panel',
    name: 'My Panel',
    icon: '🚀',
    description: 'My custom panel',
    component: MyPanel,
  },
];
```

### 5. Develop with Storybook

```bash
# Start Storybook for interactive development
bun run storybook

# Build Storybook for deployment
bun run build-storybook
```

Storybook will open at `http://localhost:6006` with:

- Interactive component documentation
- Multiple panel states and examples
- Live prop editing
- Code snippets

### 6. Build and Test

```bash
# Development mode (watch for changes)
bun run dev

# Build for production
bun run build

# Type checking
bun run typecheck

# Linting
bun run lint
```

## Project Structure

```
panel-starter/
├── src/
│   ├── panels/
│   │   ├── ExamplePanel.tsx           # Your panel components
│   │   └── ExamplePanel.stories.tsx   # Storybook stories
│   ├── types/
│   │   └── index.ts                   # TypeScript type definitions
│   ├── mocks/
│   │   └── panelContext.tsx           # Mock providers for Storybook
│   ├── Introduction.mdx               # Storybook introduction
│   └── index.tsx                      # Main entry - export panels array
├── .storybook/
│   ├── main.ts                        # Storybook configuration
│   └── preview.ts                     # Storybook preview config
├── dist/
│   └── panels.bundle.js               # Built output (generated)
├── package.json                       # Package configuration
├── tsconfig.json                      # TypeScript config
├── vite.config.ts                     # Build configuration
├── eslint.config.js                   # Linting rules
└── README.md                          # This file
```

## Panel Component API

### PanelComponentProps

Every panel component receives these props:

```typescript
interface PanelComponentProps {
  // Access to shared data and state
  context: PanelContextValue;

  // Actions for host interaction
  actions: PanelActions;

  // Event system for inter-panel communication
  events: PanelEventEmitter;
}
```

### Context

Access repository data and state:

```tsx
const { context } = props;

// Repository information
context.repositoryPath; // Current repository path
context.repository; // Repository metadata

// Data slices
context.gitStatus; // Git status information
context.fileTree; // File tree structure
context.markdownFiles; // Markdown files list

// State management
context.loading; // Loading state
context.refresh(); // Refresh data
context.hasSlice('git'); // Check slice availability
```

### Actions

Interact with the host application:

```tsx
const { actions } = props;

// File operations
actions.openFile?.('path/to/file.ts');
actions.openGitDiff?.('path/to/file.ts', 'unstaged');

// Navigation
actions.navigateToPanel?.('panel-id');

// Notifications
actions.notifyPanels?.(event);
```

### Events

Subscribe to and emit panel events:

```tsx
const { events } = props;

// Subscribe to events
useEffect(() => {
  const unsubscribe = events.on('file:opened', (event) => {
    console.log('File opened:', event.payload);
  });

  return unsubscribe; // Cleanup
}, [events]);

// Emit events
events.emit({
  type: 'custom:event',
  source: 'my-panel',
  timestamp: Date.now(),
  payload: { data: 'value' },
});
```

## Panel Definition

Each panel must be defined with metadata:

```typescript
interface PanelDefinition {
  id: string; // Unique ID (e.g., 'org.panel-name')
  name: string; // Display name
  icon?: string; // Icon (emoji or URL)
  version?: string; // Version (defaults to package.json)
  author?: string; // Author (defaults to package.json)
  description?: string; // Short description
  component: React.FC; // The panel component

  // Optional lifecycle hooks
  onMount?: (context) => void | Promise<void>;
  onUnmount?: (context) => void | Promise<void>;
  onDataChange?: (slice, data) => void;
}
```

## Lifecycle Hooks

### Per-Panel Hooks

Called for individual panels:

```typescript
{
  id: 'my-panel',
  component: MyPanel,

  onMount: async (context) => {
    console.log('Panel mounted');
    if (context.hasSlice('git')) {
      await context.refresh();
    }
  },

  onUnmount: async (context) => {
    console.log('Panel unmounting');
    // Cleanup logic
  },

  onDataChange: (slice, data) => {
    console.log(`Data changed: ${slice}`, data);
  },
}
```

### Package-Level Hooks

Called once for the entire package:

```typescript
export const onPackageLoad = async () => {
  console.log('Package loaded');
  // Initialize shared resources
};

export const onPackageUnload = async () => {
  console.log('Package unloading');
  // Cleanup shared resources
};
```

## Building and Publishing

### Build Configuration

The build process (via Vite) automatically:

- Externalizes React and ReactDOM (provided by host)
- Bundles all other dependencies
- Generates TypeScript declarations
- Creates source maps
- Outputs to `dist/panels.bundle.js`

### Local Testing

Link your panel locally for testing:

```bash
# In your panel directory
bun run build
bun link

# In your host application
bun link @your-org/your-panel-name
```

### Publishing to NPM

```bash
# Build the package
bun run build

# Verify the output
ls -la dist/

# Publish to NPM
npm publish --access public
```

### Installing in Host Application

```bash
# In the host application
npm install @your-org/your-panel-name
```

The host application will automatically discover your panel by the `panel-extension` keyword in `package.json`.

## Best Practices

### 1. Namespaced Panel IDs

Use reverse domain notation for panel IDs:

```typescript
id: 'com.company.feature-panel'; // ✅ Good
id: 'my-panel'; // ❌ Bad (collision risk)
```

### 2. Error Handling

Always handle errors gracefully:

```tsx
const [error, setError] = useState(null);

useEffect(() => {
  const loadData = async () => {
    try {
      if (!context.hasSlice('git')) {
        throw new Error('Git data not available');
      }
      // Use data...
    } catch (err) {
      setError(err);
    }
  };
  loadData();
}, [context]);

if (error) {
  return <div>Error: {error.message}</div>;
}
```

### 3. Loading States

Show loading indicators:

```tsx
if (context.loading || context.isSliceLoading('git')) {
  return <div>Loading...</div>;
}
```

### 4. Cleanup Subscriptions

Always unsubscribe from events:

```tsx
useEffect(() => {
  const unsubscribe = events.on('event:type', handler);
  return unsubscribe; // Cleanup on unmount
}, [events]);
```

### 5. Type Safety

Use provided types for type safety:

```tsx
import type { PanelComponentProps, GitStatus } from './types';

const MyPanel: React.FC<PanelComponentProps> = ({ context }) => {
  const gitStatus: GitStatus = context.gitStatus;
  // ...
};
```

## Available Data Slices

Panels can access these data slices from the host:

| Slice      | Type             | Description                  |
| ---------- | ---------------- | ---------------------------- |
| `git`      | `GitStatus`      | Git repository status        |
| `markdown` | `MarkdownFile[]` | Markdown files in repository |
| `fileTree` | `FileTree`       | File system tree structure   |
| `packages` | `PackageLayer[]` | Package dependencies         |
| `quality`  | `QualityMetrics` | Code quality metrics         |

Check availability before use:

```tsx
if (context.hasSlice('git') && !context.isSliceLoading('git')) {
  // Use git data
}
```

## Event Types

Standard panel events:

| Event                | Description        | Payload                |
| -------------------- | ------------------ | ---------------------- |
| `file:opened`        | File was opened    | `{ filePath: string }` |
| `file:saved`         | File was saved     | `{ filePath: string }` |
| `file:deleted`       | File was deleted   | `{ filePath: string }` |
| `git:status-changed` | Git status changed | `GitStatus`            |
| `git:commit`         | Git commit made    | `{ hash: string }`     |
| `git:branch-changed` | Branch changed     | `{ branch: string }`   |
| `panel:focus`        | Panel gained focus | `{ panelId: string }`  |
| `panel:blur`         | Panel lost focus   | `{ panelId: string }`  |
| `data:refresh`       | Data was refreshed | `{ slices: string[] }` |

## Dependencies

### Peer Dependencies (Required)

These are provided by the host application:

- `react` >= 19.0.0
- `react-dom` >= 19.0.0

### Optional Peer Dependencies

- `@principal-ade/panel-framework-core` - For advanced panel features

### Bundled Dependencies

Include any libraries unique to your panel:

```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "date-fns": "^2.29.0",
    "your-custom-lib": "^1.0.0"
  }
}
```

These will be bundled into your panel output.

## Troubleshooting

### Panel Not Discovered

Ensure `package.json` has:

```json
{
  "keywords": ["panel-extension"],
  "main": "dist/panels.bundle.js"
}
```

### Build Errors

Check that peer dependencies are externalized in `vite.config.ts`:

```typescript
external: ['react', 'react-dom'];
```

### Type Errors

Ensure TypeScript can find types:

```bash
bun run typecheck
```

### Runtime Errors

Check browser console and ensure:

- Panel ID is unique
- Required exports are present (`panels` array)
- Component is a valid React component

## Resources

- [Panel Extension Store Specification V2](https://github.com/principal-ade/panel-framework/blob/main/PANEL_EXTENSION_STORE_SPECIFICATION_V2.md)
- [Panel Framework Core](https://github.com/principal-ade/panel-framework-core)
- [Example Implementations](https://github.com/principal-ade/example-panels)

## License

MIT © Your Name

## Contributing

Contributions welcome! Please read the contributing guidelines first.

## Support

For issues and questions:

- [GitHub Issues](https://github.com/your-org/your-panel-name/issues)
- [Discussions](https://github.com/your-org/your-panel-name/discussions)
