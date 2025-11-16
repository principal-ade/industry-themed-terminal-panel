/**
 * Terminal Panel Type Extensions
 *
 * This file extends the base panel-framework-core types with terminal-specific
 * functionality. It imports core types and adds terminal session management.
 */

// Import core framework types
export type {
  PanelComponentProps,
  PanelContextValue,
  PanelActions,
  PanelEventEmitter,
  PanelEvent,
  PanelEventType,
  PanelDefinition,
  PanelMetadata,
  PanelLifecycleHooks,
  DataSlice,
  RepositoryMetadata,
  WorkspaceMetadata,
} from '@principal-ade/panel-framework-core';

import type {
  PanelActions as CorePanelActions,
  PanelContextValue,
  DataSlice,
} from '@principal-ade/panel-framework-core';

/**
 * Terminal-specific event type literals
 */
export type TerminalEventType =
  | 'terminal:data'
  | 'terminal:exit'
  | 'terminal:created'
  | 'terminal:title-change'
  | 'terminal:cwd-change';

/**
 * Terminal session metadata provided by the host.
 * This is the data structure stored in the 'terminal' data slice.
 */
export interface TerminalSessionInfo {
  id: string;
  pid: number;
  cwd: string;
  shell: string;
  createdAt: number;
  lastActivity: number;
  repositoryPath?: string;
}

/**
 * Options for creating a terminal session.
 */
export interface CreateTerminalSessionOptions {
  cwd?: string;
  command?: string;
  env?: Record<string, string>;
}

/**
 * Extended panel actions that include terminal session management.
 * Host applications implementing terminal panels must provide these actions.
 */
export interface TerminalPanelActions extends CorePanelActions {
  // Terminal session management
  createTerminalSession?: (
    options?: CreateTerminalSessionOptions
  ) => Promise<string>;
  destroyTerminalSession?: (sessionId: string) => Promise<void>;

  // Terminal I/O
  writeToTerminal?: (sessionId: string, data: string) => void;
  resizeTerminal?: (sessionId: string, cols: number, rows: number) => void;

  // Terminal control
  clearTerminal?: (sessionId: string) => void;
}

/**
 * Helper function to get terminal sessions from the context.
 * Terminal sessions are stored in the 'terminal' data slice.
 */
export function getTerminalSessions(
  context: PanelContextValue
): TerminalSessionInfo[] {
  const slice = context.getSlice<TerminalSessionInfo[]>('terminal');
  return slice?.data ?? [];
}

/**
 * Helper function to get a specific terminal session by ID.
 */
export function getTerminalSession(
  context: PanelContextValue,
  sessionId: string
): TerminalSessionInfo | undefined {
  const sessions = getTerminalSessions(context);
  return sessions.find((s) => s.id === sessionId);
}

/**
 * Helper function to check if terminal slice is loading.
 */
export function isTerminalLoading(context: PanelContextValue): boolean {
  return context.isSliceLoading('terminal');
}

/**
 * Determines what directory scope the terminal should use.
 * - 'repository': Use context.currentScope.repository.path
 * - 'workspace': Use context.currentScope.workspace.path
 */
export type TerminalScope = 'repository' | 'workspace';

/**
 * Extended props for the TerminalPanel component.
 */
export interface TerminalPanelProps extends Omit<import('@principal-ade/panel-framework-core').PanelComponentProps, 'context' | 'actions' | 'events'> {
  context: PanelContextValue;
  actions: TerminalPanelActions;
  events: import('@principal-ade/panel-framework-core').PanelEventEmitter;

  /**
   * Determines what directory scope the terminal should use.
   * - 'repository': Use context.currentScope.repository.path
   * - 'workspace': Use context.currentScope.workspace.path
   * @default 'repository'
   */
  terminalScope?: TerminalScope;
}

/**
 * Helper function to get the current repository path from context.
 */
export function getRepositoryPath(context: PanelContextValue): string | null {
  return context.currentScope.repository?.path ?? null;
}

/**
 * Helper function to get the current workspace path from context.
 */
export function getWorkspacePath(context: PanelContextValue): string | null {
  return context.currentScope.workspace?.path ?? null;
}

/**
 * Helper function to get the terminal directory based on terminalScope.
 */
export function getTerminalDirectory(
  context: PanelContextValue,
  terminalScope: TerminalScope = 'repository'
): string | null {
  switch (terminalScope) {
    case 'workspace':
      return getWorkspacePath(context);
    case 'repository':
      return getRepositoryPath(context) ?? getWorkspacePath(context);
    default:
      return getRepositoryPath(context) ?? getWorkspacePath(context);
  }
}

/**
 * Helper function to get the terminal data slice directly.
 */
export function getTerminalSlice(
  context: PanelContextValue
): DataSlice<TerminalSessionInfo[]> | undefined {
  return context.getSlice<TerminalSessionInfo[]>('terminal');
}
