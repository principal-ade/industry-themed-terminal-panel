import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@principal-ade/industry-theme';
import { TerminalPanel } from './TerminalPanel';
import { MockPanelProvider } from '../mocks/panelContext';
import type {
  TerminalPanelActions,
  PanelEventEmitter,
  PanelEvent,
  CreateTerminalSessionOptions,
} from '../types';

/**
 * Mock Terminal Backend Simulator
 *
 * Simulates a real terminal backend by:
 * - Creating sessions
 * - Streaming output data
 * - Echoing user input
 * - Handling basic commands
 */
class MockTerminalBackend {
  private sessions = new Map<string, { cwd: string; shell: string }>();
  private sessionCounter = 0;
  private eventEmitter: PanelEventEmitter | null = null;

  setEventEmitter(emitter: PanelEventEmitter) {
    this.eventEmitter = emitter;
  }

  createSession(options?: CreateTerminalSessionOptions): string {
    const sessionId = `mock-session-${++this.sessionCounter}`;
    const cwd = options?.cwd || '/Users/developer/my-project';
    const shell = 'zsh';

    this.sessions.set(sessionId, { cwd, shell });

    // Emit session created event
    this.emitEvent({
      type: 'terminal:created',
      source: 'mock-backend',
      timestamp: Date.now(),
      payload: {
        sessionId,
        info: {
          id: sessionId,
          pid: Math.floor(Math.random() * 10000),
          cwd,
          shell,
          createdAt: Date.now(),
          lastActivity: Date.now(),
        },
      },
    });

    // Send welcome message
    setTimeout(() => {
      this.sendData(sessionId, `\x1b[1;32m➜\x1b[0m  \x1b[1;36m${cwd.split('/').pop()}\x1b[0m \x1b[1;34mgit:(\x1b[1;31mmain\x1b[1;34m)\x1b[0m $ `);
    }, 100);

    // Execute initial command if provided
    if (options?.command) {
      setTimeout(() => {
        this.handleCommand(sessionId, options.command!);
      }, 200);
    }

    return sessionId;
  }

  destroySession(sessionId: string) {
    this.sessions.delete(sessionId);
    this.emitEvent({
      type: 'terminal:exit',
      source: 'mock-backend',
      timestamp: Date.now(),
      payload: { sessionId, exitCode: 0 },
    });
  }

  writeToTerminal(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Echo the input character
    this.sendData(sessionId, data);

    // Check for Enter key (carriage return)
    if (data === '\r') {
      // Extract the command (simplified - in reality would need to track input buffer)
      this.sendData(sessionId, '\n');
      this.handleCommand(sessionId, '');
    }
  }

  private handleCommand(sessionId: string, command: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const cmd = command.trim();

    // Simulate command execution
    setTimeout(() => {
      if (cmd === 'ls') {
        this.sendData(
          sessionId,
          '\x1b[1;34msrc\x1b[0m      \x1b[1;34mdist\x1b[0m     package.json  README.md     tsconfig.json\n'
        );
      } else if (cmd === 'pwd') {
        this.sendData(sessionId, `${session.cwd}\n`);
      } else if (cmd.startsWith('echo ')) {
        const message = cmd.substring(5);
        this.sendData(sessionId, `${message}\n`);
      } else if (cmd === 'git status') {
        this.sendData(sessionId, '\x1b[1;32mOn branch main\x1b[0m\n');
        this.sendData(sessionId, 'Your branch is up to date with \'origin/main\'.\n\n');
        this.sendData(sessionId, 'Changes not staged for commit:\n');
        this.sendData(sessionId, '  \x1b[31mmodified:   src/panels/TerminalPanel.tsx\x1b[0m\n\n');
      } else if (cmd === 'clear') {
        this.sendData(sessionId, '\x1b[2J\x1b[H');
      } else if (cmd === 'help') {
        this.sendData(sessionId, 'Available mock commands:\n');
        this.sendData(sessionId, '  ls           - List files\n');
        this.sendData(sessionId, '  pwd          - Print working directory\n');
        this.sendData(sessionId, '  echo [text]  - Echo text\n');
        this.sendData(sessionId, '  git status   - Show git status\n');
        this.sendData(sessionId, '  clear        - Clear screen\n');
        this.sendData(sessionId, '  help         - Show this help\n');
      } else if (cmd) {
        this.sendData(sessionId, `\x1b[31mzsh: command not found: ${cmd}\x1b[0m\n`);
      }

      // Show prompt again
      this.sendData(
        sessionId,
        `\x1b[1;32m➜\x1b[0m  \x1b[1;36m${session.cwd.split('/').pop()}\x1b[0m \x1b[1;34mgit:(\x1b[1;31mmain\x1b[1;34m)\x1b[0m $ `
      );
    }, 50);
  }

  private sendData(sessionId: string, data: string) {
    this.emitEvent({
      type: 'terminal:data',
      source: 'mock-backend',
      timestamp: Date.now(),
      payload: { sessionId, data },
    });
  }

  private emitEvent(event: PanelEvent) {
    if (this.eventEmitter) {
      this.eventEmitter.emit(event);
    }
  }
}

// Global backend instance for stories
const mockBackend = new MockTerminalBackend();

/**
 * Create mock actions with terminal backend
 */
const createTerminalMockActions = (): TerminalPanelActions => ({
  createTerminalSession: async (options?: CreateTerminalSessionOptions) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Creating terminal session:', options);
    return mockBackend.createSession(options);
  },
  destroyTerminalSession: async (sessionId: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Destroying terminal session:', sessionId);
    mockBackend.destroySession(sessionId);
  },
  writeToTerminal: (sessionId: string, data: string) => {
    mockBackend.writeToTerminal(sessionId, data);
  },
  resizeTerminal: (sessionId: string, cols: number, rows: number) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Resizing terminal:', sessionId, cols, rows);
  },
  clearTerminal: (sessionId: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Clearing terminal:', sessionId);
  },
});

const meta: Meta<typeof TerminalPanel> = {
  title: 'Panels/TerminalPanel',
  component: TerminalPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A terminal emulator panel that integrates with the panel-framework. ' +
          'Provides full terminal functionality with industry theming.\n\n' +
          '**Requirements:**\n' +
          '- Host must provide terminal actions (createTerminalSession, writeToTerminal, etc.)\n' +
          '- Host must emit terminal events (terminal:data, terminal:exit)\n\n' +
          '**Features:**\n' +
          '- Full xterm.js terminal emulation\n' +
          '- WebGL acceleration\n' +
          '- Unicode support\n' +
          '- Search functionality\n' +
          '- Clickable web links',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TerminalPanel>;

/**
 * Default terminal panel with mocked backend
 *
 * Try typing commands like:
 * - `ls` - List files
 * - `pwd` - Print working directory
 * - `echo hello` - Echo text
 * - `git status` - Show git status
 * - `help` - Show available commands
 */
export const Default: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ height: '600px', width: '100%' }}>
        <MockPanelProvider
          contextOverrides={{
            currentScope: {
              type: 'repository' as const,
              repository: {
                name: 'my-project',
                path: '/Users/developer/my-project',
              },
            },
          }}
          actionsOverrides={createTerminalMockActions()}
        >
          {(props) => {
            // Connect backend to event emitter
            mockBackend.setEventEmitter(props.events);
            return <TerminalPanel {...props} />;
          }}
        </MockPanelProvider>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Terminal with initial command
 *
 * Demonstrates creating a terminal session with an initial command to execute.
 */
export const WithInitialCommand: Story = {
  render: () => {
    // Override createSession to run initial command
    const actionsWithCommand: TerminalPanelActions = {
      ...createTerminalMockActions(),
      createTerminalSession: async (options) => {
        return mockBackend.createSession({
          ...options,
          command: 'git status',
        });
      },
    };

    return (
      <ThemeProvider>
        <div style={{ height: '600px', width: '100%' }}>
          <MockPanelProvider
            contextOverrides={{
              currentScope: { type: 'repository' as const, repository: { name: 'my-project', path: '/Users/developer/my-project' } },
            }}
            actionsOverrides={actionsWithCommand}
          >
            {(props) => {
              mockBackend.setEventEmitter(props.events);
              return <TerminalPanel {...props} />;
            }}
          </MockPanelProvider>
        </div>
      </ThemeProvider>
    );
  },
};

/**
 * Terminal with different working directory
 *
 * Shows terminal created in a specific directory.
 */
export const DifferentDirectory: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ height: '600px', width: '100%' }}>
        <MockPanelProvider
          contextOverrides={{
            currentScope: {
              type: 'repository' as const,
              repository: {
                name: 'awesome-app',
                path: '/Users/developer/awesome-app',
              },
            },
          }}
          actionsOverrides={createTerminalMockActions()}
        >
          {(props) => {
            mockBackend.setEventEmitter(props.events);
            return <TerminalPanel {...props} />;
          }}
        </MockPanelProvider>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Error: Terminal actions not available
 *
 * Demonstrates the error state when host doesn't provide terminal actions.
 */
export const ErrorNoActions: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ height: '600px', width: '100%' }}>
        <MockPanelProvider
          contextOverrides={{
            currentScope: { type: 'repository' as const, repository: { name: 'my-project', path: '/Users/developer/my-project' } },
          }}
          actionsOverrides={{
            // No terminal actions provided
            createTerminalSession: undefined,
          }}
        >
          {(props) => <TerminalPanel {...props} />}
        </MockPanelProvider>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Error: Session creation failed
 *
 * Demonstrates error handling when session creation fails.
 */
export const ErrorSessionFailed: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ height: '600px', width: '100%' }}>
        <MockPanelProvider
          contextOverrides={{
            currentScope: { type: 'repository' as const, repository: { name: 'my-project', path: '/Users/developer/my-project' } },
          }}
          actionsOverrides={{
            createTerminalSession: async () => {
              throw new Error('Failed to spawn terminal process: ENOENT');
            },
          }}
        >
          {(props) => <TerminalPanel {...props} />}
        </MockPanelProvider>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Multiple terminals side-by-side
 *
 * Shows how multiple terminal panels can coexist with different sessions.
 */
export const MultiplePanels: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ display: 'flex', height: '600px', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <MockPanelProvider
            contextOverrides={{
              currentScope: { type: 'repository' as const, repository: { name: 'project-1', path: '/Users/developer/project-1' } },
            }}
            actionsOverrides={createTerminalMockActions()}
          >
            {(props) => {
              mockBackend.setEventEmitter(props.events);
              return <TerminalPanel {...props} />;
            }}
          </MockPanelProvider>
        </div>
        <div style={{ flex: 1 }}>
          <MockPanelProvider
            contextOverrides={{
              currentScope: { type: 'repository' as const, repository: { name: 'project-2', path: '/Users/developer/project-2' } },
            }}
            actionsOverrides={createTerminalMockActions()}
          >
            {(props) => {
              mockBackend.setEventEmitter(props.events);
              return <TerminalPanel {...props} />;
            }}
          </MockPanelProvider>
        </div>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Compact size
 *
 * Shows terminal panel in a smaller container.
 */
export const CompactSize: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ height: '300px', width: '500px' }}>
        <MockPanelProvider
          contextOverrides={{
            currentScope: { type: 'repository' as const, repository: { name: 'my-project', path: '/Users/developer/my-project' } },
          }}
          actionsOverrides={createTerminalMockActions()}
        >
          {(props) => {
            mockBackend.setEventEmitter(props.events);
            return <TerminalPanel {...props} />;
          }}
        </MockPanelProvider>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Workspace Mode
 *
 * Terminal panel configured to use workspace directory instead of repository directory.
 * This is useful in workspace contexts where you want the terminal to stay in the
 * workspace root regardless of which repository is selected.
 */
export const WorkspaceMode: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ height: '600px', width: '100%' }}>
        <MockPanelProvider
          contextOverrides={{
            currentScope: {
              type: 'workspace' as const,
              workspace: {
                name: 'my-workspace',
                path: '/Users/developer/my-workspace',
              },
              repository: {
                name: 'repo-1',
                path: '/Users/developer/my-workspace/repo-1',
              },
            },
          }}
          actionsOverrides={createTerminalMockActions()}
        >
          {(props) => {
            mockBackend.setEventEmitter(props.events);
            return <TerminalPanel {...props} terminalScope="workspace" />;
          }}
        </MockPanelProvider>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Repository Mode
 *
 * Terminal panel configured to use repository directory (default behavior).
 * The terminal will be created in the current repository's directory.
 */
export const RepositoryMode: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ height: '600px', width: '100%' }}>
        <MockPanelProvider
          contextOverrides={{
            currentScope: {
              type: 'workspace' as const,
              workspace: {
                name: 'my-workspace',
                path: '/Users/developer/my-workspace',
              },
              repository: {
                name: 'repo-1',
                path: '/Users/developer/my-workspace/repo-1',
              },
            },
          }}
          actionsOverrides={createTerminalMockActions()}
        >
          {(props) => {
            mockBackend.setEventEmitter(props.events);
            return <TerminalPanel {...props} terminalScope="repository" />;
          }}
        </MockPanelProvider>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Re-render Issue Test Component
 */
const ReRenderIssueTestComponent: React.FC = () => {
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  // Create stable event emitter using useMemo
  const eventEmitter = React.useMemo(() => {
    const handlers = new Map<string, Set<(event: PanelEvent) => void>>();

    return {
      emit: (event: PanelEvent) => {
        console.log('Emitting event:', event);
        const eventHandlers = handlers.get(event.type);
        if (eventHandlers) {
          eventHandlers.forEach((handler) => handler(event));
        }
      },
      on: (type: string, handler: (event: PanelEvent) => void) => {
        console.log('Subscribing to event:', type);
        if (!handlers.has(type)) {
          handlers.set(type, new Set());
        }
        handlers.get(type)!.add(handler as (event: PanelEvent<unknown>) => void);

        return () => {
          console.log('Unsubscribing from event:', type);
          handlers.get(type)?.delete(handler as (event: PanelEvent<unknown>) => void);
        };
      },
      off: (type: string, handler: (event: PanelEvent) => void) => {
        handlers.get(type)?.delete(handler as (event: PanelEvent<unknown>) => void);
      },
    } as PanelEventEmitter;
  }, []);

  // Generate two screens worth of data
  const generateInitialData = () => {
    const lines: string[] = [];

    // Add a header
    lines.push('\x1b[1;36m=== Claude Code Output Simulation ===\x1b[0m\n');
    lines.push('\x1b[2mGenerating component files...\x1b[0m\n\n');

    // Generate ~40 lines of mock output (roughly 2 screens on typical terminal)
    for (let i = 1; i <= 40; i++) {
      if (i % 10 === 0) {
        lines.push(`\n\x1b[1;33m--- Section ${i / 10} ---\x1b[0m\n`);
      } else if (i % 5 === 0) {
        lines.push(`\x1b[32m✓\x1b[0m Processing file ${i}/40: \x1b[36msrc/components/Component${i}.tsx\x1b[0m\n`);
      } else {
        lines.push(`  \x1b[2m│\x1b[0m Analyzing dependencies for Component${i}...\n`);
      }
    }

    lines.push('\n\x1b[1;32m✓ All files processed successfully\x1b[0m\n');
    lines.push(`\x1b[2mTotal time: ${(Math.random() * 5 + 2).toFixed(2)}s\x1b[0m\n`);

    return lines.join('');
  };

  const initialData = React.useRef(generateInitialData());

  const sendData = (data: string) => {
    if (!sessionId) return;

    eventEmitter.emit({
      type: 'terminal:data',
      source: 'test-backend',
      timestamp: Date.now(),
      payload: { sessionId, data },
    });
  };

  const handleRenderInitial = () => {
    // Stream the data line by line to simulate real terminal output
    // This will cause the terminal to scroll to the bottom
    const lines = initialData.current.split('\n');
    let currentLine = 0;

    const streamInterval = setInterval(() => {
      if (currentLine < lines.length) {
        // Send each line with a newline (except we already split on \n)
        sendData(lines[currentLine] + (currentLine < lines.length - 1 ? '\n' : ''));
        currentLine++;
      } else {
        clearInterval(streamInterval);
      }
    }, 50); // Send a line every 50ms to simulate streaming
  };

  const handleClearScreen = () => {
    // ANSI escape codes: \x1b[2J clears screen, \x1b[H moves cursor to home
    // This clears the entire screen AND scrollback buffer
    sendData('\x1b[2J\x1b[H');
  };

  const handleClearVisibleOnly = () => {
    // Alternative: Clear only visible screen, preserve scrollback
    // \x1b[2J clears screen, \x1b[3J clears scrollback separately
    sendData('\x1b[2J\x1b[H');
  };

  const handleClearLines = () => {
    // Alternative: Move cursor to top and clear each line individually
    // This might not trigger a resize
    sendData('\x1b[H'); // Move to home
    // Clear 50 lines (more than our content)
    for (let i = 0; i < 50; i++) {
      sendData('\x1b[2K\n'); // Clear current line and move down
    }
    sendData('\x1b[H'); // Move back to home
  };

  const handleSoftClear = () => {
    // Alternative: Just move cursor to top without clearing
    // Then overwrite with new content (what Ink might be doing)
    sendData('\x1b[H\x1b[J'); // Move to home and clear from cursor to end of screen
  };

  const handleReRender = () => {
    sendData(initialData.current);
  };

  const handleClearAndReRender = () => {
    // Simulate what Claude Code does - clear then re-render in quick succession
    handleClearScreen();
    // Small delay to make the clear visible
    setTimeout(() => {
      handleReRender();
    }, 50);
  };

  const handleClearAndStreamReRender = () => {
    // Clear first
    handleClearScreen();
    // Then stream the data back (like initial render)
    setTimeout(() => {
      const lines = initialData.current.split('\n');
      let currentLine = 0;

      const streamInterval = setInterval(() => {
        if (currentLine < lines.length) {
          sendData(lines[currentLine] + (currentLine < lines.length - 1 ? '\n' : ''));
          currentLine++;
        } else {
          clearInterval(streamInterval);
        }
      }, 50);
    }, 100);
  };

  const handleStressTest = (clearMethod: 'full' | 'soft' = 'full', count: number = 10) => {
    let iteration = 0;

    const runIteration = () => {
      if (iteration >= count) return;

      // Clear based on method
      if (clearMethod === 'full') {
        sendData('\x1b[2J\x1b[H');
      } else {
        sendData('\x1b[H\x1b[J');
      }

      // Re-render after a short delay
      setTimeout(() => {
        sendData(initialData.current);
        iteration++;

        // Schedule next iteration
        if (iteration < count) {
          setTimeout(runIteration, 200); // 200ms between iterations
        }
      }, 50);
    };

    runIteration();
  };

  const handleClaudeCodeSimulation = () => {
    // This simulates what Claude Code actually does:
    // 1. Stream initial data (user scrolls to bottom)
    // 2. Clear screen (view shrinks)
    // 3. Re-render ALL AT ONCE (no streaming, user stays at top)

    // Step 1: Stream data (like initial render)
    const lines = initialData.current.split('\n');
    let currentLine = 0;

    const streamInterval = setInterval(() => {
      if (currentLine < lines.length) {
        sendData(lines[currentLine] + (currentLine < lines.length - 1 ? '\n' : ''));
        currentLine++;
      } else {
        clearInterval(streamInterval);

        // Step 2: After streaming completes, wait then clear
        setTimeout(() => {
          sendData('\x1b[2J\x1b[H'); // Clear screen

          // Step 3: Immediately re-render ALL AT ONCE (not streaming!)
          setTimeout(() => {
            sendData(initialData.current); // Instant render - user doesn't scroll to bottom
          }, 100);
        }, 1000); // Wait 1 second after streaming before clearing
      }
    }, 50);
  };

  const handleClaudeCodeStressTest = (count: number = 5) => {
    let iteration = 0;

    const runIteration = () => {
      if (iteration >= count) return;

      // Stream the data
      const lines = initialData.current.split('\n');
      let currentLine = 0;

      const streamInterval = setInterval(() => {
        if (currentLine < lines.length) {
          sendData(lines[currentLine] + (currentLine < lines.length - 1 ? '\n' : ''));
          currentLine++;
        } else {
          clearInterval(streamInterval);

          // Clear after streaming
          setTimeout(() => {
            sendData('\x1b[2J\x1b[H');

            // Instant re-render
            setTimeout(() => {
              sendData(initialData.current);
              iteration++;

              // Next iteration
              if (iteration < count) {
                setTimeout(runIteration, 500);
              }
            }, 100);
          }, 500);
        }
      }, 20); // Faster streaming for stress test
    };

    runIteration();
  };

  const handleAlternativeClearMethods = () => {
    // Try other clear methods that might be what Ink uses
    console.log('Testing alternative clear methods...');

    // Method 1: Clear screen without affecting scrollback at all
    sendData('\x1b[2J'); // Clear screen only (no cursor move)

    setTimeout(() => {
      sendData('\x1b[H'); // Move cursor to home
    }, 1000);

    setTimeout(() => {
      // Method 2: Erase in Display (ED) with different parameters
      sendData('\x1b[1J'); // Clear from cursor to beginning
    }, 2000);

    setTimeout(() => {
      // Method 3: Clear with scrollback explicitly preserved
      sendData('\x1b[3J'); // Clear scrollback buffer only
    }, 3000);

    setTimeout(() => {
      // Reset everything
      sendData('\x1b[2J\x1b[H');
      sendData(initialData.current);
    }, 4000);
  };

  const handleBuggySequence = () => {
    // This is the EXACT sequence from xterm.js bug #2638
    // https://github.com/xtermjs/xterm.js/issues/2638
    // \u001b[3J (clear scrollback) + \u001b[H (move cursor home) + \u001b[2J (clear screen)
    // This was known to cause DOM height issues - should be fixed in xterm 5.5.0
    console.log('Testing xterm.js bug #2638 sequence: \\x1b[3J\\x1b[H\\x1b[2J');
    sendData('\x1b[3J\x1b[H\x1b[2J');
  };

  const handleBuggySequenceWithRerender = () => {
    // Stream data, then use the buggy sequence, then re-render
    const lines = initialData.current.split('\n');
    let currentLine = 0;

    const streamInterval = setInterval(() => {
      if (currentLine < lines.length) {
        sendData(lines[currentLine] + (currentLine < lines.length - 1 ? '\n' : ''));
        currentLine++;
      } else {
        clearInterval(streamInterval);

        // Use the buggy sequence after streaming
        setTimeout(() => {
          console.log('Using buggy sequence from xterm.js #2638');
          sendData('\x1b[3J\x1b[H\x1b[2J'); // The problematic sequence

          // Re-render
          setTimeout(() => {
            sendData(initialData.current);
          }, 100);
        }, 1000);
      }
    }, 50);
  };

  const handleInkStyleRerender = () => {
    // Simulate what Ink's rendering engine actually does:
    // It doesn't use \x1b[2J - instead it:
    // 1. Moves cursor to the beginning
    // 2. Overwrites each line with new content OR spaces
    // 3. Might not preserve the full buffer

    const lines = initialData.current.split('\n');
    const lineCount = lines.length;

    // Move cursor to top
    sendData('\x1b[H');

    // Clear each line by overwriting with spaces, then writing new content
    let currentLine = 0;
    const overwriteInterval = setInterval(() => {
      if (currentLine < lineCount) {
        // Move to line, clear it, write content
        sendData(`\x1b[${currentLine + 1};1H`); // Move to line
        sendData('\x1b[2K'); // Clear line
        sendData(lines[currentLine]); // Write new content
        currentLine++;
      } else {
        clearInterval(overwriteInterval);
      }
    }, 10);
  };

  const handleInkStyleFullCycle = () => {
    // Full Ink simulation: Stream, then "Ink re-render"
    // Step 1: Stream data
    const lines = initialData.current.split('\n');
    let currentLine = 0;

    const streamInterval = setInterval(() => {
      if (currentLine < lines.length) {
        sendData(lines[currentLine] + (currentLine < lines.length - 1 ? '\n' : ''));
        currentLine++;
      } else {
        clearInterval(streamInterval);

        // Step 2: Wait, then do Ink-style re-render
        setTimeout(() => {
          // Move to top and overwrite everything
          sendData('\x1b[H'); // Move to home

          // Option A: Just overwrite (might leave artifacts)
          sendData(initialData.current);

          // OR Option B: Clear each line first (more accurate)
          // handleInkStyleRerender();
        }, 1000);
      }
    }, 50);
  };

  const handleCursorPositionTest = () => {
    // Test: Does cursor position affect auto-scroll?
    console.log('Testing cursor position effect on scrolling...');

    // First, render data with cursor at bottom (should auto-scroll)
    sendData('\n\n=== TEST 1: Writing with cursor at bottom ===\n');
    sendData('Line 1\n');
    sendData('Line 2\n');
    sendData('Line 3\n');
    sendData('(You should be scrolled to bottom)\n');

    setTimeout(() => {
      // Now move cursor to top and write (should NOT auto-scroll)
      sendData('\x1b[H'); // Move cursor to home (top)
      sendData('\n\n=== TEST 2: Writing with cursor at TOP ===\n');
      sendData('This is written from the top\n');
      sendData('You should still be at the top\n');
      sendData('NOT scrolled to bottom!\n');
    }, 3000);
  };

  const handleScrollToBottomAfterRender = () => {
    // Potential fix: After re-rendering, explicitly scroll to bottom
    // Step 1: Stream data
    const lines = initialData.current.split('\n');
    let currentLine = 0;

    const streamInterval = setInterval(() => {
      if (currentLine < lines.length) {
        sendData(lines[currentLine] + (currentLine < lines.length - 1 ? '\n' : ''));
        currentLine++;
      } else {
        clearInterval(streamInterval);

        // Step 2: Ink-style re-render from top
        setTimeout(() => {
          sendData('\x1b[H'); // Move to top
          sendData(initialData.current); // Re-render all at once

          // Step 3: Move cursor to bottom to force scroll
          setTimeout(() => {
            const lineCount = lines.length;
            sendData(`\x1b[${lineCount};1H`); // Move cursor to last line
            console.log(`Moved cursor to line ${lineCount} to force scroll to bottom`);
          }, 100);
        }, 1000);
      }
    }, 50);
  };

  const customActions: TerminalPanelActions = {
    createTerminalSession: async (options) => {
      const id = `test-session-${Date.now()}`;
      setSessionId(id);

      eventEmitter.emit({
        type: 'terminal:created',
        source: 'test-backend',
        timestamp: Date.now(),
        payload: {
          sessionId: id,
          info: {
            id,
            pid: 12345,
            cwd: options?.cwd || '/Users/developer/test-project',
            shell: 'zsh',
            createdAt: Date.now(),
            lastActivity: Date.now(),
          },
        },
      });

      return id;
    },
    destroyTerminalSession: async (id: string) => {
      eventEmitter.emit({
        type: 'terminal:exit',
        source: 'test-backend',
        timestamp: Date.now(),
        payload: { sessionId: id, exitCode: 0 },
      });
    },
    writeToTerminal: () => {},
    resizeTerminal: () => {},
    clearTerminal: () => {},
  };

    return (
      <ThemeProvider>
        <div style={{ display: 'flex', flexDirection: 'column', height: '700px', gap: '10px' }}>
          {/* Control buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '10px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px',
            }}
          >
            {/* Claude Code Simulation - Most Important */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px', backgroundColor: '#1f2937', borderRadius: '4px' }}>
              <span style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 'bold', width: '100%' }}>⭐ CLAUDE CODE SIMULATION (THE ACTUAL ISSUE):</span>
              <button
                onClick={handleClaudeCodeSimulation}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                🎯 Stream → Clear → Instant Re-render (Single)
              </button>
              <button
                onClick={() => handleClaudeCodeStressTest(5)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#c026d3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                🔥 Stream → Clear → Instant Re-render (x5)
              </button>
              <span style={{ color: '#9ca3af', fontSize: '11px', width: '100%', marginTop: '5px' }}>
                This simulates: Stream data (scrolls to bottom) → Clear (view shrinks?) → Re-render all at once (user stuck at top)
              </span>
            </div>

            {/* Initial render */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #444' }}>
              <span style={{ color: '#888', fontSize: '12px', width: '100%' }}>Basic Controls:</span>
              <button
                onClick={handleRenderInitial}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Render Initial Data (Stream)
              </button>
            </div>

            {/* xterm.js Bug #2638 Test */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #444' }}>
              <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', width: '100%' }}>🐛 xterm.js Bug #2638 Test:</span>
              <button
                onClick={handleBuggySequence}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Clear with Buggy Sequence (\\x1b[3J\\x1b[H\\x1b[2J])
              </button>
              <button
                onClick={handleBuggySequenceWithRerender}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#b91c1c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                Stream → Buggy Clear → Re-render
              </button>
              <span style={{ color: '#9ca3af', fontSize: '10px', width: '100%' }}>
                <a href="https://github.com/xtermjs/xterm.js/issues/2638" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
                  Bug #2638
                </a>: Known DOM height issue when clearing scrollback. Should be fixed in xterm 5.5.0 (current version).
              </span>
            </div>

            {/* INK-style rendering (likely the real method) */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #444' }}>
              <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold', width: '100%' }}>🎨 INK-Style Rendering (Cursor Repositioning):</span>
              <button
                onClick={handleInkStyleRerender}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Move Cursor + Overwrite Lines
              </button>
              <button
                onClick={handleInkStyleFullCycle}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#047857',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                Stream → Cursor Move → Overwrite
              </button>
              <span style={{ color: '#9ca3af', fontSize: '10px', width: '100%' }}>
                Ink doesn't use clear codes - it moves cursor to top and overwrites. This might be the real issue!
              </span>
            </div>

            {/* Cursor position and scroll behavior */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #444' }}>
              <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 'bold', width: '100%' }}>🎯 Cursor Position & Auto-Scroll:</span>
              <button
                onClick={handleCursorPositionTest}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#d97706',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Test: Cursor Position Effect
              </button>
              <button
                onClick={handleScrollToBottomAfterRender}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ea580c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                ✅ Stream → Re-render → Force Scroll to Bottom (FIX!)
              </button>
              <span style={{ color: '#9ca3af', fontSize: '10px', width: '100%' }}>
                Terminal only auto-scrolls when cursor is at bottom. Moving cursor to top (\x1b[H) then writing = user stuck at top!
              </span>
            </div>

            {/* Different clear methods */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #444' }}>
              <span style={{ color: '#888', fontSize: '12px', width: '100%' }}>ANSI Clear Methods (for comparison):</span>
              <button
                onClick={handleClearScreen}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Clear (Full)
              </button>
              <button
                onClick={handleSoftClear}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Clear (Soft)
              </button>
              <button
                onClick={handleClearLines}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ec4899',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Clear (Line-by-line)
              </button>
              <button
                onClick={handleReRender}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Re-render (Instant)
              </button>
            </div>

            {/* Combined actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #444' }}>
              <span style={{ color: '#888', fontSize: '12px', width: '100%' }}>Combined Actions (Test Scenarios):</span>
              <button
                onClick={() => { handleClearScreen(); setTimeout(handleReRender, 50); }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Full Clear + Instant Re-render
              </button>
              <button
                onClick={() => { handleSoftClear(); setTimeout(handleReRender, 50); }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Soft Clear + Instant Re-render
              </button>
              <button
                onClick={handleClearAndStreamReRender}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Full Clear + Stream Re-render
              </button>
            </div>

            {/* Stress tests */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #444' }}>
              <span style={{ color: '#888', fontSize: '12px', width: '100%' }}>Stress Tests (Rapid Clear/Re-render):</span>
              <button
                onClick={() => handleStressTest('full', 10)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                🔥 Full Clear x10 (Heavy)
              </button>
              <button
                onClick={() => handleStressTest('soft', 10)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ⚡ Soft Clear x10 (Heavy)
              </button>
              <button
                onClick={() => handleStressTest('full', 50)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#991b1b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                💥 Full Clear x50 (Extreme!)
              </button>
            </div>
          </div>

          {/* Terminal panel */}
          <div style={{ flex: 1 }}>
            <MockPanelProvider
              contextOverrides={{
                currentScope: {
                  type: 'repository' as const,
                  repository: {
                    name: 'test-project',
                    path: '/Users/developer/test-project',
                  },
                },
              }}
              actionsOverrides={customActions}
            >
              {(props) => {
                // Use our stable event emitter instead of the one from MockPanelProvider
                return <TerminalPanel {...props} events={eventEmitter} />;
              }}
            </MockPanelProvider>
          </div>
        </div>
      </ThemeProvider>
    );
};

/**
 * Scroll Position Indicators Demo
 *
 * Demonstrates the scroll position badges that appear in the terminal header.
 * The terminal generates lots of output so you can scroll and see the badges in action.
 *
 * **Try this:**
 * 1. Wait for output to finish streaming
 * 2. Scroll up in the terminal (you should see "Scrolled" badge in orange)
 * 3. Scroll all the way to the top (badge changes to "Top" in cyan)
 * 4. Scroll back to bottom (badge disappears - normal state)
 */
export const ScrollPositionIndicators: Story = {
  render: () => {
    const actionsWithLongOutput: TerminalPanelActions = {
      ...createTerminalMockActions(),
      createTerminalSession: async (options) => {
        const sessionId = mockBackend.createSession(options);

        // Generate lots of output after a short delay
        setTimeout(() => {
          for (let i = 1; i <= 100; i++) {
            setTimeout(() => {
              const data = `Line ${i}: This is a long line of output to test scrolling behavior\n`;
              mockBackend['sendData'](sessionId, data);
            }, i * 20);
          }
        }, 500);

        return sessionId;
      },
    };

    return (
      <ThemeProvider>
        <div style={{ height: '600px', width: '100%' }}>
          <div style={{
            padding: '10px',
            backgroundColor: '#2a2a2a',
            color: '#fff',
            marginBottom: '10px',
            borderRadius: '4px'
          }}>
            <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Scroll Position Badge Demo</p>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#aaa' }}>
              Watch the header while you scroll:
            </p>
            <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '12px', color: '#aaa' }}>
              <li><span style={{ color: '#ffb86c' }}>Orange "Scrolled"</span> badge appears when scrolled up from bottom</li>
              <li><span style={{ color: '#8be9fd' }}>Cyan "Top"</span> badge appears when scrolled all the way to top</li>
              <li>No badge when at bottom (normal state with auto-scroll enabled)</li>
            </ul>
          </div>
          <MockPanelProvider
            contextOverrides={{
              currentScope: {
                type: 'repository' as const,
                repository: {
                  name: 'scroll-demo',
                  path: '/Users/developer/scroll-demo',
                },
              },
            }}
            actionsOverrides={actionsWithLongOutput}
          >
            {(props) => {
              mockBackend.setEventEmitter(props.events);
              return <TerminalPanel {...props} />;
            }}
          </MockPanelProvider>
        </div>
      </ThemeProvider>
    );
  },
};

/**
 * Re-render Issue Test
 *
 * This story reproduces the issue where Claude Code's Ink renderer re-renders
 * the entire screen instead of doing incremental updates.
 *
 * **THE ACTUAL ISSUE (use the purple buttons):**
 * 1. Data is streamed (terminal auto-scrolls to bottom as user sees output)
 * 2. Screen is cleared (view SHRINKS - this is the problem!)
 * 3. All data is re-rendered INSTANTLY (not streamed)
 * 4. User is left at the TOP of the output instead of the bottom
 *
 * **What happens:**
 * - User sees streaming output and is scrolled to the bottom ✓
 * - Ink clears and re-renders the entire screen
 * - The view height shrinks during clear
 * - Re-render happens all at once (no auto-scroll to bottom)
 * - User is now stuck at the top looking at old content
 *
 * **What SHOULD happen:**
 * - Either: Don't clear/re-render, just update changed lines
 * - Or: If you must re-render, preserve scroll position or auto-scroll to bottom
 *
 * Use the other buttons to debug individual parts of the issue.
 */
export const ReRenderIssueTest: Story = {
  render: () => <ReRenderIssueTestComponent />,
};
