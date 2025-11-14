import React from 'react';
import type {
  PanelComponentProps,
  PanelContextValue,
  PanelEventEmitter,
  PanelEvent,
  DataSlice,
  TerminalSessionInfo,
  TerminalPanelActions,
} from '../types';

/**
 * Mock terminal sessions for Storybook
 */
export const mockTerminalSessions: TerminalSessionInfo[] = [
  {
    id: 'term-1',
    pid: 12345,
    cwd: '/Users/developer/my-project',
    shell: '/bin/zsh',
    createdAt: Date.now() - 300000, // 5 minutes ago
    lastActivity: Date.now() - 1000, // 1 second ago
    repositoryPath: '/Users/developer/my-project',
  },
];

/**
 * Create a mock data slice
 */
function createMockSlice<T>(
  name: string,
  data: T,
  loading = false,
  error: Error | null = null
): DataSlice<T> {
  return {
    scope: 'repository',
    name,
    data,
    loading,
    error,
    refresh: async () => {
      // eslint-disable-next-line no-console
      console.log(`[Mock] Refreshing slice: ${name}`);
    },
  };
}

/**
 * Mock Panel Context for Storybook
 */
export const createMockContext = (
  overrides?: Partial<PanelContextValue>
): PanelContextValue => {
  // Create mock slices
  const slices = new Map<string, DataSlice>([
    ['terminal', createMockSlice('terminal', mockTerminalSessions)],
    ['git', createMockSlice('git', {
      staged: ['src/components/Button.tsx', 'src/styles/theme.css'],
      unstaged: ['README.md', 'package.json'],
      untracked: ['src/new-feature.tsx'],
      deleted: [],
    })],
    ['fileTree', createMockSlice('fileTree', {
      name: 'my-project',
      path: '/Users/developer/my-project',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: '/Users/developer/my-project/src',
          type: 'directory',
        },
        {
          name: 'package.json',
          path: '/Users/developer/my-project/package.json',
          type: 'file',
        },
      ],
    })],
  ]);

  return {
    currentScope: {
      type: 'repository',
      repository: {
        name: 'my-project',
        path: '/Users/developer/my-project',
      },
    },
    slices,
    getSlice: <T = unknown>(name: string): DataSlice<T> | undefined => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Getting slice:', name);
      return slices.get(name) as DataSlice<T> | undefined;
    },
    getWorkspaceSlice: <T = unknown>(name: string): DataSlice<T> | undefined => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Getting workspace slice:', name);
      return slices.get(name) as DataSlice<T> | undefined;
    },
    getRepositorySlice: <T = unknown>(name: string): DataSlice<T> | undefined => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Getting repository slice:', name);
      return slices.get(name) as DataSlice<T> | undefined;
    },
    hasSlice: (name: string, _scope?: 'workspace' | 'repository'): boolean => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Checking slice:', name);
      return slices.has(name);
    },
    isSliceLoading: (name: string, _scope?: 'workspace' | 'repository'): boolean => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Checking if slice is loading:', name);
      return slices.get(name)?.loading ?? false;
    },
    refresh: async (_scope?: 'workspace' | 'repository', _slice?: string) => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Context refresh called');
    },
    ...overrides,
  };
};

/**
 * Mock Terminal Panel Actions for Storybook
 */
export const createMockActions = (
  overrides?: Partial<TerminalPanelActions>
): TerminalPanelActions => ({
  openFile: (filePath: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Opening file:', filePath);
  },
  openGitDiff: (filePath: string, status) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Opening git diff:', filePath, status);
  },
  navigateToPanel: (panelId: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Navigating to panel:', panelId);
  },
  notifyPanels: (event) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Notifying panels:', event);
  },
  createTerminalSession: async (options) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Creating terminal session:', options);
    return 'term-mock-' + Date.now();
  },
  destroyTerminalSession: async (sessionId: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Destroying terminal session:', sessionId);
  },
  writeToTerminal: (sessionId: string, data: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Writing to terminal:', sessionId, data);
  },
  resizeTerminal: (sessionId: string, cols: number, rows: number) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Resizing terminal:', sessionId, cols, rows);
  },
  clearTerminal: (sessionId: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Clearing terminal:', sessionId);
  },
  ...overrides,
});

/**
 * Mock Event Emitter for Storybook
 */
export const createMockEvents = (): PanelEventEmitter => {
  const handlers = new Map<
    string,
    Set<(event: PanelEvent<unknown>) => void>
  >();

  return {
    emit: (event) => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Emitting event:', event);
      const eventHandlers = handlers.get(event.type);
      if (eventHandlers) {
        eventHandlers.forEach((handler) => handler(event));
      }
    },
    on: (type, handler) => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Subscribing to event:', type);
      if (!handlers.has(type)) {
        handlers.set(type, new Set());
      }
      handlers.get(type)!.add(handler as (event: PanelEvent<unknown>) => void);

      // Return cleanup function
      return () => {
        // eslint-disable-next-line no-console
        console.log('[Mock] Unsubscribing from event:', type);
        handlers
          .get(type)
          ?.delete(handler as (event: PanelEvent<unknown>) => void);
      };
    },
    off: (type, handler) => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Removing event handler:', type);
      handlers
        .get(type)
        ?.delete(handler as (event: PanelEvent<unknown>) => void);
    },
  };
};

/**
 * Mock Panel Props Provider
 * Wraps components with mock context for Storybook
 */
export const MockPanelProvider: React.FC<{
  children: (props: PanelComponentProps) => React.ReactNode;
  contextOverrides?: Partial<PanelContextValue>;
  actionsOverrides?: Partial<TerminalPanelActions>;
}> = ({ children, contextOverrides, actionsOverrides }) => {
  const context = createMockContext(contextOverrides);
  const actions = createMockActions(actionsOverrides);
  const events = createMockEvents();

  return <>{children({ context, actions, events })}</>;
};
