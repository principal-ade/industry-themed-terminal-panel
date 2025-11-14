import { useEffect, useRef, useState } from 'react';
import {
  ThemedTerminalWithProvider,
  type ThemedTerminalRef,
} from '@principal-ade/industry-themed-terminal';
import type { PanelComponentProps } from '../types';

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
 */
export const TerminalPanel: React.FC<PanelComponentProps> = ({
  context,
  actions,
  events,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const terminalRef = useRef<ThemedTerminalRef>(null);

  // Create terminal session on mount
  useEffect(() => {
    const initTerminal = async () => {
      try {
        if (!actions.createTerminalSession) {
          throw new Error(
            'Terminal actions not available. Host must provide createTerminalSession action.'
          );
        }

        // Create session in current repository directory
        const id = await actions.createTerminalSession({
          cwd: context.repositoryPath || undefined,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.repositoryPath]);

  // Subscribe to terminal data events
  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to terminal output
    const unsubscribeData = events.on<{ sessionId: string; data: string }>(
      'terminal:data',
      (event) => {
        if (
          event.payload?.sessionId === sessionId &&
          terminalRef.current
        ) {
          // Write data to xterm.js display via ThemedTerminalRef
          terminalRef.current.write(event.payload.data);
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

  // Get session metadata from context for display
  const sessionInfo = context.terminalSessions?.find((s) => s.id === sessionId);

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
