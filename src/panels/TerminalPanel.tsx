import { useEffect, useRef, useState } from 'react';
import {
  ThemedTerminalWithProvider,
  type ThemedTerminalRef,
} from '@principal-ade/industry-themed-terminal';
import type { TerminalPanelProps } from '../types';
import {
  getTerminalDirectory,
  getTerminalSession,
} from '../types';

/**
 * Terminal Panel Component
 *
 * A single terminal emulator panel that integrates with the panel-framework.
 * Uses the framework's actions API to control terminals and events API to receive terminal data.
 *
 * Lifecycle:
 * - On mount: Creates a terminal session via actions.createTerminalSession()
 * - During use: Receives terminal output via events.on('terminal:data')
 * - On unmount: Destroys the session via actions.destroyTerminalSession()
 *
 * Requirements:
 * - Host must provide terminal actions (createTerminalSession, writeToTerminal, etc.)
 * - Host must emit terminal events (terminal:data, terminal:exit)
 * - Host must provide 'terminal' data slice with TerminalSessionInfo[]
 */
export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  context,
  actions,
  events,
  terminalScope = 'repository',
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const terminalRef = useRef<ThemedTerminalRef>(null);

  // Get terminal directory based on terminalScope
  const terminalDirectory = getTerminalDirectory(context, terminalScope);

  // Create terminal session on mount ONLY (not on context changes)
  useEffect(() => {
    const initTerminal = async () => {
      try {
        if (!actions.createTerminalSession) {
          throw new Error(
            'Terminal actions not available. Host must provide createTerminalSession action.'
          );
        }

        // Create session in determined directory
        const id = await actions.createTerminalSession({
          cwd: terminalDirectory || undefined,
        });

        setSessionId(id);
        setIsInitializing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setIsInitializing(false);
      }
    };

    initTerminal();

    // Cleanup: destroy session on unmount
    return () => {
      if (sessionId && actions.destroyTerminalSession) {
        actions.destroyTerminalSession(sessionId);
      }
    };
    // IMPORTANT: Only create session on mount, NOT when context changes
    // This prevents unwanted terminal recreation when repository selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to terminal data events
  useEffect(() => {
    if (!sessionId) return;

    // Track re-render state for auto-scroll fix
    let lastWriteTime = 0;
    let cursorMovedToHome = false;
    let autoScrollTimeout: NodeJS.Timeout | null = null;

    // Subscribe to terminal output
    const unsubscribeData = events.on<{ sessionId: string; data: string }>(
      'terminal:data',
      (event) => {
        if (
          event.payload?.sessionId === sessionId &&
          terminalRef.current
        ) {
          const data = event.payload.data;

          // Detect cursor move to home (potential re-render start)
          if (data.includes('\x1b[H')) {
            cursorMovedToHome = true;
            lastWriteTime = Date.now();
          }

          // Write data to xterm.js display via ThemedTerminalRef
          terminalRef.current.write(data);

          // If we detected a re-render pattern, schedule auto-scroll to bottom
          if (cursorMovedToHome) {
            // Clear any existing timeout
            if (autoScrollTimeout) {
              clearTimeout(autoScrollTimeout);
            }

            // After writes stop for 100ms, assume re-render is done and scroll to bottom
            autoScrollTimeout = setTimeout(() => {
              const now = Date.now();
              const timeSinceLastWrite = now - lastWriteTime;

              // If enough time has passed and we had a cursor-to-home, scroll to bottom
              if (timeSinceLastWrite >= 100 && cursorMovedToHome && terminalRef.current) {
                // Get terminal dimensions to move cursor to bottom
                const terminal = terminalRef.current;

                // Scroll to bottom by moving cursor to last row
                // This triggers the terminal to auto-scroll to show the cursor
                terminal.write('\x1b[9999;1H'); // Move to a very high row number (terminal will clamp to actual rows)

                // Reset re-render detection state
                cursorMovedToHome = false;
              }
            }, 100);
          }

          // Update last write time
          lastWriteTime = Date.now();
        }
      }
    );

    // Subscribe to terminal exit
    const unsubscribeExit = events.on<{ sessionId: string; exitCode: number }>(
      'terminal:exit',
      (event) => {
        if (event.payload?.sessionId === sessionId) {
          setError(`Terminal process exited with code ${event.payload.exitCode}`);
        }
      }
    );

    return () => {
      if (autoScrollTimeout) {
        clearTimeout(autoScrollTimeout);
      }
      unsubscribeData();
      unsubscribeExit();
    };
  }, [sessionId, events]);

  // Handle user input to terminal
  const handleTerminalData = (data: string) => {
    if (sessionId && actions.writeToTerminal) {
      actions.writeToTerminal(sessionId, data);
    }
  };

  // Handle terminal resize
  const handleTerminalResize = (cols: number, rows: number) => {
    if (sessionId && actions.resizeTerminal) {
      actions.resizeTerminal(sessionId, cols, rows);
    }
  };

  // Get session metadata from context for display using helper
  const sessionInfo = sessionId ? getTerminalSession(context, sessionId) : undefined;

  // Error state
  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#ef4444',
          backgroundColor: '#1a1a1a',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          Terminal Error
        </div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>{error}</div>
      </div>
    );
  }

  // Initializing state
  if (isInitializing || !sessionId) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#a0a0a0',
          backgroundColor: '#1a1a1a',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Initializing terminal...
      </div>
    );
  }

  // Terminal is ready - render the themed terminal component
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ThemedTerminalWithProvider
        ref={terminalRef}
        onData={handleTerminalData}
        onResize={handleTerminalResize}
        headerTitle={sessionInfo?.cwd || 'Terminal'}
        headerSubtitle={sessionInfo?.shell}
        autoFocus={true}
        convertEol={true}
        cursorBlink={true}
        scrollback={10000}
        enableWebGL={true}
        enableUnicode11={true}
        enableSearch={true}
        enableWebLinks={true}
      />
    </div>
  );
};
