import type { ComponentType } from 'react';

/**
 * Panel data slices available from the host application.
 * Panels can declare dependencies on these slices.
 */
export type PanelDataSlice =
  | 'git'
  | 'markdown'
  | 'fileTree'
  | 'packages'
  | 'quality'
  | 'terminal';

/**
 * Panel event types for inter-panel communication.
 */
export type PanelEventType =
  | 'file:opened'
  | 'file:saved'
  | 'file:deleted'
  | 'git:status-changed'
  | 'git:commit'
  | 'git:branch-changed'
  | 'panel:focus'
  | 'panel:blur'
  | 'data:refresh'
  | 'terminal:data'
  | 'terminal:exit'
  | 'terminal:created'
  | 'terminal:title-change'
  | 'terminal:cwd-change';

/**
 * Panel event structure for communication between panels.
 */
export interface PanelEvent<T = unknown> {
  type: PanelEventType;
  source: string;
  timestamp: number;
  payload?: T;
}

/**
 * Git change status types.
 */
export type GitChangeSelectionStatus = 'staged' | 'unstaged' | 'untracked';

/**
 * Git status information provided by the host.
 */
export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
  deleted: string[];
}

/**
 * Repository metadata provided by the host.
 */
export interface RepositoryMetadata {
  name: string;
  path: string;
  branch?: string;
  remote?: string;
}

/**
 * File tree node structure.
 */
export interface FileTree {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTree[];
}

/**
 * Markdown file metadata.
 */
export interface MarkdownFile {
  path: string;
  title?: string;
  lastModified: number;
}

/**
 * Package layer information.
 */
export interface PackageLayer {
  name: string;
  version: string;
  path: string;
}

/**
 * Code quality metrics.
 */
export interface QualityMetrics {
  coverage?: number;
  issues?: number;
  complexity?: number;
}

/**
 * Terminal session metadata provided by the host.
 * Note: Does not include terminal buffer data - that streams via events.
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
 * Panel context value provided by the host application.
 * Contains shared data and state management functions.
 */
export interface PanelContextValue {
  // Repository metadata
  repositoryPath: string | null;
  repository: RepositoryMetadata | null;

  // Data slices (panels can depend on these)
  gitStatus: GitStatus;
  gitStatusLoading: boolean;
  markdownFiles: MarkdownFile[];
  fileTree: FileTree | null;
  packages: PackageLayer[] | null;
  quality: QualityMetrics | null;

  // Terminal sessions (metadata only, no buffer)
  terminalSessions?: TerminalSessionInfo[];

  // State management
  loading: boolean;
  refresh: () => Promise<void>;

  // Utility methods
  hasSlice: (slice: PanelDataSlice) => boolean;
  isSliceLoading: (slice: PanelDataSlice) => boolean;
}

/**
 * Actions provided by the host application for panel interactions.
 */
export interface PanelActions {
  // File operations
  openFile?: (filePath: string) => void;
  openGitDiff?: (filePath: string, status?: GitChangeSelectionStatus) => void;

  // Navigation
  navigateToPanel?: (panelId: string) => void;
  notifyPanels?: (event: PanelEvent) => void;

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
 * Event emitter for panel-to-panel communication.
 */
export interface PanelEventEmitter {
  emit<T>(event: PanelEvent<T>): void;
  on<T>(
    type: PanelEventType,
    handler: (event: PanelEvent<T>) => void
  ): () => void;
  off<T>(type: PanelEventType, handler: (event: PanelEvent<T>) => void): void;
}

/**
 * Props provided to all panel components by the host application.
 */
export interface PanelComponentProps {
  /** Access to shared data and state */
  context: PanelContextValue;

  /** Actions for interpanel communication */
  actions: PanelActions;

  /** Event system for panel-to-panel communication */
  events: PanelEventEmitter;
}

/**
 * Panel definition structure that must be exported by all panel packages.
 */
export interface PanelDefinition {
  // Metadata
  id: string; // Unique identifier (e.g., 'my-org.example-panel')
  name: string; // Display name
  icon?: string; // Icon (emoji or URL)
  version?: string; // Semantic version (defaults to package.json version)
  author?: string; // Author name or organization (defaults to package.json author)
  description?: string; // Short description of panel functionality

  // Component
  component: ComponentType<PanelComponentProps>;

  // Optional per-panel lifecycle hooks
  onMount?: (context: PanelContextValue) => void | Promise<void>;
  onUnmount?: (context: PanelContextValue) => void | Promise<void>;
  onDataChange?: (slice: PanelDataSlice, data: unknown) => void;
}

/**
 * Package-level lifecycle hooks (optional).
 */
export interface PackageLifecycleHooks {
  onPackageLoad?: () => void | Promise<void>;
  onPackageUnload?: () => void | Promise<void>;
}
