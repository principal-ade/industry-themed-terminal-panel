import { TerminalPanel } from './panels/TerminalPanel';
import type { PanelDefinition, PanelContextValue } from './types';

/**
 * Export array of panel definitions.
 * This is the required export for panel extensions.
 */
export const panels: PanelDefinition[] = [
  {
    metadata: {
      id: 'com.principal.terminal',
      name: 'Terminal',
      icon: '⚡',
      version: '0.1.0',
      author: 'Principal',
      description: 'Integrated terminal emulator with industry theming',
      slices: ['terminal'], // Declares dependency on 'terminal' data slice
    },
    component: TerminalPanel,

    // Optional: Called when this specific panel is mounted
    onMount: async (context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log(
        'Terminal Panel mounted for repository:',
        context.currentScope.repository?.path
      );

      // Verify terminal capability is available
      if (!context.hasSlice('terminal')) {
        console.warn('Terminal data slice not available in context');
      }
    },

    // Optional: Called when this specific panel is unmounted
    onUnmount: async (_context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log('Terminal Panel unmounting');
      // Cleanup handled in component useEffect
    },
  },
];

/**
 * Optional: Called once when the entire package is loaded.
 * Use this for package-level initialization.
 */
export const onPackageLoad = async () => {
  // eslint-disable-next-line no-console
  console.log('Panel package loaded - Terminal Panel Extension');
};

/**
 * Optional: Called once when the package is unloaded.
 * Use this for package-level cleanup.
 */
export const onPackageUnload = async () => {
  // eslint-disable-next-line no-console
  console.log('Panel package unloading - Terminal Panel Extension');
};

// Re-export types for convenience
export type {
  PanelDefinition,
  PanelMetadata,
  PanelComponentProps,
  PanelContextValue,
  PanelActions,
  PanelEventEmitter,
  TerminalSessionInfo,
  CreateTerminalSessionOptions,
  TerminalPanelActions,
  TerminalEventType,
  TerminalScope,
  TerminalPanelProps,
} from './types';
