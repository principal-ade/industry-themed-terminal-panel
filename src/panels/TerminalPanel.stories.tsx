import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@a24z/industry-theme';
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
