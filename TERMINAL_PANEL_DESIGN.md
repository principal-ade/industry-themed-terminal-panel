# Terminal Panel Design Document

**Project:** Industry Themed Terminal Panel
**Framework:** Panel Framework V2
**Date:** 2025-11-14
**Status:** Planning Phase

---

## Overview

This project creates a terminal panel package that integrates with the panel-framework. The panel will display a single terminal (non-tabbed, non-carousel) and conform to the panel-framework specifications.

### Key References

- **Panel Framework Starter:** `/Users/griever/Developer/industry-themed-panel-starter`
- **Existing Terminal Implementation:** `/Users/griever/Developer/desktop-app/electron-app`
- **Terminal Component Library:** `@principal-ade/industry-themed-terminal`

---

## Architecture

### Separation of Concerns

**This Package (Terminal Panel) Owns:**
- Terminal UI/UX rendering using xterm.js
- Framework API integration (actions + events)
- User interaction handling
- Session lifecycle management (React component level)
- Terminal display theming

**Framework/Host Application Owns:**
- Terminal backend infrastructure (PTY, WebSocket, etc.)
- Terminal action implementations
- Terminal event streaming
- Session persistence and state management
- Environment setup and shell configuration

### Design Philosophy

The terminal panel is a **presentation and interaction layer** that:
1. Calls framework-provided actions to control terminals
2. Subscribes to framework-provided events to receive terminal data
3. Renders terminal UI using existing components
4. Does NOT implement backend/streaming infrastructure

---

## Framework Integration Contract

### Required Framework Extensions

The panel-framework needs to provide terminal-specific APIs:

#### 1. Context API - Terminal State (Optional)

```typescript
interface PanelContextValue {
  // Existing fields...

  // Terminal-related context (optional)
  terminalSessions?: TerminalSessionInfo[];
  activeTerminalSession?: string;
}

interface TerminalSessionInfo {
  id: string;
  pid: number;
  cwd: string;
  shell: string;
  createdAt: number;
  repositoryPath?: string;
}
```

**Usage:** Panel can read current terminal sessions from context if needed.

#### 2. Actions API - Terminal Control (Required)

```typescript
interface PanelActions {
  // Existing actions...

  // Session management
  createTerminalSession?: (options: {
    cwd?: string;
    command?: string;
    env?: Record<string, string>;
  }) => Promise<string>;  // Returns session ID

  destroyTerminalSession?: (sessionId: string) => Promise<void>;

  // Terminal I/O
  writeToTerminal?: (sessionId: string, data: string) => void;
  resizeTerminal?: (sessionId: string, cols: number, rows: number) => void;

  // Terminal control
  clearTerminal?: (sessionId: string) => void;
}
```

**Usage:** Panel calls these actions to create, control, and destroy terminal sessions.

#### 3. Events API - Terminal Data Stream (Required)

```typescript
// Event payloads the panel subscribes to
interface TerminalEvents {
  'terminal:data': {
    sessionId: string;
    data: string;  // UTF-8 encoded terminal output
  };

  'terminal:exit': {
    sessionId: string;
    exitCode: number;
  };

  'terminal:created': {
    sessionId: string;
    info: TerminalSessionInfo;
  };

  'terminal:title-change': {
    sessionId: string;
    title: string;
  };

  'terminal:cwd-change': {
    sessionId: string;
    cwd: string;
  };
}
```

**Usage:** Panel subscribes to these events to receive terminal output and state changes.

---

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│  Host Application / Framework Core                  │
│                                                      │
│  Terminal Backend (implementation not our concern)  │
│  - PTY process management                           │
│  - Session state management                         │
│  - WebSocket/IPC/etc. communication                 │
│                                                      │
│  Provides to panels:                                │
│  - actions.createTerminalSession()                  │
│  - actions.writeToTerminal()                        │
│  - actions.resizeTerminal()                         │
│  - events.emit('terminal:data')                     │
│  - events.emit('terminal:exit')                     │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  Terminal Panel Package (this project)              │
│                                                      │
│  TerminalPanel Component:                           │
│  1. onCreate → actions.createTerminalSession()      │
│  2. Subscribe → events.on('terminal:data', ...)     │
│  3. Render → <ThemedTerminalWithProvider />         │
│  4. onUserInput → actions.writeToTerminal()         │
│  5. onResize → actions.resizeTerminal()             │
│  6. onUnmount → actions.destroyTerminalSession()    │
└─────────────────────────────────────────────────────┘
```

---

## Component Structure

### Panel Definition

```typescript
// src/index.tsx
export const panels: PanelDefinition[] = [
  {
    id: 'com.principal.terminal',
    name: 'Terminal',
    icon: '⚡',
    description: 'Integrated terminal emulator',
    component: TerminalPanel,
    onMount: async (context) => {
      // Validation: check if terminal actions are available
    },
    onUnmount: async () => {
      // Cleanup handled in component
    },
  }
];
```

### Main Terminal Component

```typescript
// src/panels/TerminalPanel.tsx
export const TerminalPanel: React.FC<PanelComponentProps> = ({
  context,
  actions,
  events
}) => {
  // 1. Create terminal session on mount
  // 2. Subscribe to terminal events
  // 3. Render ThemedTerminalWithProvider
  // 4. Handle user input → actions.writeToTerminal()
  // 5. Handle resize → actions.resizeTerminal()
  // 6. Cleanup on unmount → actions.destroyTerminalSession()
};
```

---

## Dependencies

### Bundled Dependencies

- `@xterm/xterm` - Terminal emulator core
- `@xterm/addon-fit` - Auto-resize support
- `@xterm/addon-search` - Search functionality
- `@xterm/addon-unicode11` - Unicode support
- `@xterm/addon-web-links` - Clickable URLs
- `@xterm/addon-webgl` - GPU acceleration (optional)
- `@principal-ade/industry-themed-terminal` - Themed terminal wrapper

### Peer Dependencies

- `react` >= 19.0.0
- `react-dom` >= 19.0.0
- `@principal-ade/panel-framework-core` (optional)

---

## Open Questions

### 1. Terminal Actions - Required or Optional? ✅ DECIDED

**Question:** Should terminal actions be considered mandatory for hosts that load this panel?

**Decision:** Option A - **Required** (with migration path to Option C)

**Rationale:**
- V1: Panel assumes `actions.createTerminalSession()` exists and will throw runtime error if not available
- Simpler implementation without defensive checks everywhere
- This panel is designed for terminal-aware hosts
- When framework adds capability declaration support, easy migration:
  ```typescript
  // Future migration (when framework supports it):
  export const panels: PanelDefinition[] = [{
    id: 'com.principal.terminal',
    requiredCapabilities: ['terminal'],  // Just add this field
    // ... rest stays the same
  }];
  ```

**Implementation:**
- Component code directly calls terminal actions without checks
- Clear error messages if actions are undefined (helpful for host developers)
- Documentation states terminal capability requirement

**Migration Path to Option C:**
When framework supports capability declaration:
1. Add `requiredCapabilities: ['terminal']` to panel definition
2. No changes needed to component code
3. Framework handles compatibility checking at load time

---

### 2. Session Ownership Model ✅ DECIDED

**Question:** Who is responsible for tracking which panel owns which terminal session?

**Decision:** Option C - **Hybrid** (Panel manages lifecycle, framework provides safety net)

**Rationale:**
- Panel explicitly creates/destroys sessions via actions
- Framework tracks session metadata for garbage collection
- Prevents orphaned PTY processes if panel crashes or cleanup fails
- Scales well to tabbed terminals (fine-grained control per tab)

**Implementation:**
```typescript
// Panel side: Explicit lifecycle management
const TerminalPanel = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const id = await actions.createTerminalSession({ cwd });
      setSessionId(id);
    };
    init();

    // Explicit cleanup on unmount
    return () => {
      if (sessionId) actions.destroyTerminalSession(sessionId);
    };
  }, []);
};

// Framework side: Safety net (garbage collection)
// - Tracks lastActivity timestamp
// - Cleans up sessions with no subscribers + old activity
// - Fallback for crashed panels or failed cleanup
```

**Benefits for Tabbed Terminals:**
- Panel can create/destroy individual tab sessions
- Framework prevents leaks if panel crashes mid-operation
- Clear ownership intent via explicit destroy calls

---

### 3. Terminal Data Slice in Context ✅ DECIDED

**Question:** Should there be a `'terminal'` data slice in the panel context API?

**Decision:** Option B - **Context + Events** (metadata only, no buffer)

**Rationale:**
- Context provides session metadata for tab management and garbage collection
- Events stream terminal output in real-time (keeps context lightweight)
- No buffer in context prevents memory issues with large terminal output
- Supports hybrid ownership model (panel needs to query session metadata)

**Implementation:**
```typescript
// Context API
interface PanelContextValue {
  terminalSessions?: TerminalSessionInfo[];
}

interface TerminalSessionInfo {
  id: string;
  pid: number;
  cwd: string;
  shell: string;
  createdAt: number;
  lastActivity: number;      // For garbage collection
  repositoryPath?: string;
  // NO buffer - keeps context lightweight
}

// Events API (streaming)
events.on('terminal:data', (event) => {
  // Real-time output, not buffered in context
  terminal.write(event.payload.data);
});
```

**Usage Example:**
```typescript
// Look up metadata for tab display
const sessionInfo = context.terminalSessions?.find(s => s.id === sessionId);
return <Tab title={sessionInfo?.cwd || 'Terminal'} />;
```

**Benefits:**
- Lightweight context (no large buffers)
- Session discovery for multi-tab support
- Framework can track lastActivity for garbage collection
- Clean separation: metadata in context, data via events

---

### 4. Multi-Terminal Support

**Question:** Should a single terminal panel manage one or multiple terminal sessions?

**Current Scope:** Single terminal (non-tabbed, non-carousel)

**Future Considerations:**
- A) **One Session Per Panel**: Simple, each panel instance = one terminal
  - User adds multiple panels for multiple terminals
  - Clean separation

- B) **Multi-Session Panel**: Panel can manage multiple terminals (tabs, split views)
  - Like desktop-app's TabbedTerminalPanel
  - More complex panel implementation
  - Fewer panel instances needed

**Recommendation for V1:** Option A (one session per panel)

**Impact:**
- Component complexity
- User experience
- Future extensibility

---

### 5. Error Handling Strategy ✅ DECIDED

**Question:** How should the panel handle terminal backend failures?

**Decision:** Keep simple for V1 - basic error states, defer comprehensive handling

**Rationale:**
- V1 focuses on core functionality in happy path
- Assume terminal actions exist (per Question 1 decision)
- Simple error display for edge cases
- Can enhance error handling in future versions

**V1 Implementation:**
```typescript
const [error, setError] = useState<string | null>(null);

try {
  const sessionId = await actions.createTerminalSession();
} catch (err) {
  setError(err.message);
  // Simple error display, no retry logic yet
}

if (error) {
  return <div>Failed to create terminal: {error}</div>;
}
```

**Deferred to Future Versions:**
- Retry mechanisms
- Reconnection logic for disconnected sessions
- Graceful degradation strategies
- Comprehensive error boundaries

---

### 6. Terminal Persistence ✅ DECIDED

**Question:** Should terminal sessions persist across panel unmount/remount?

**Decision:** Option A - **Ephemeral** for V1 (no persistence)

**Rationale:**
- Simpler implementation for initial version
- Clean session lifecycle (mount → create, unmount → destroy)
- Panel collapse/expand behavior depends on host application implementation
- Can add persistence in future versions if needed

**V1 Implementation:**
```typescript
useEffect(() => {
  // Create on mount
  const init = async () => {
    const id = await actions.createTerminalSession();
    setSessionId(id);
  };
  init();

  // Destroy on unmount
  return () => {
    if (sessionId) actions.destroyTerminalSession(sessionId);
  };
}, []);
```

**Future Enhancement:**
If panel collapse preserves React component state (doesn't unmount), sessions naturally persist.
If collapse does unmount, can add localStorage-based session reconnection in V2.

**Note:** Whether panel collapse unmounts the component is a **host application behavior**, not defined by panel-framework spec.

---

## Implementation Plan

### Phase 1: Scaffolding
- [ ] Copy panel-framework starter structure
- [ ] Set up package.json with dependencies
- [ ] Configure build (Vite)
- [ ] Set up TypeScript
- [ ] Create basic panel definition

### Phase 2: Core Terminal Component
- [ ] Create TerminalPanel component
- [ ] Integrate ThemedTerminalWithProvider
- [ ] Implement session lifecycle (create, destroy)
- [ ] Wire up actions API calls
- [ ] Wire up events subscriptions

### Phase 3: User Interaction
- [ ] Handle terminal input → writeToTerminal
- [ ] Handle terminal resize → resizeTerminal
- [ ] Implement keyboard shortcuts (if any)
- [ ] Focus management

### Phase 4: Error Handling & Edge Cases
- [ ] Handle missing actions gracefully
- [ ] Session creation failure UI
- [ ] Disconnection handling
- [ ] Cleanup on unmount

### Phase 5: Testing & Documentation
- [ ] Storybook stories with mocks
- [ ] Unit tests for component logic
- [ ] Integration test scenarios
- [ ] README documentation
- [ ] API documentation

### Phase 6: Polish
- [ ] Theming and styling
- [ ] Loading states
- [ ] Accessibility
- [ ] Performance optimization

---

## Testing Strategy

### Storybook Mocks

Mock the panel framework APIs for isolated development:

```typescript
<MockPanelProvider
  actionsOverrides={{
    createTerminalSession: mockCreateSession,
    writeToTerminal: mockWriteToTerminal,
    resizeTerminal: mockResizeTerminal,
  }}
  eventsOverrides={{
    on: mockEventSubscription,
  }}
>
  <TerminalPanel />
</MockPanelProvider>
```

### Test Scenarios

1. **Session Creation**
   - Panel mounts → session created
   - Session ID stored in state
   - Terminal renders

2. **Data Streaming**
   - Mock events emit terminal data
   - Data appears in xterm.js display

3. **User Input**
   - User types → `writeToTerminal` called
   - Correct session ID and data

4. **Resize**
   - Terminal resizes → `resizeTerminal` called
   - Correct dimensions

5. **Cleanup**
   - Panel unmounts → `destroyTerminalSession` called
   - Event subscriptions cleaned up

6. **Error States**
   - No terminal actions → error UI shown
   - Session creation fails → retry option shown
   - Session exits → exit message displayed

---

## Future Enhancements

### V2 Considerations
- Multiple terminal tabs (TabbedTerminalPanel port)
- Split terminal views
- Terminal search functionality
- Command history
- Session persistence across page reloads
- Terminal recording/playback
- Directory sync with file tree panel
- Git integration in terminal header
- Custom terminal themes

---

## Notes

- **Focus:** This panel focuses on presentation and framework integration, NOT backend implementation
- **Assumption:** Framework/host provides terminal streaming capability via actions + events
- **Scope:** Single terminal panel (non-tabbed) for V1
- **Reusability:** Design should allow easy extension to tabbed/multi-terminal later
- **Host Requirements:** This panel requires a host application that implements terminal actions. Host must provide:
  - `actions.createTerminalSession()`
  - `actions.writeToTerminal()`
  - `actions.resizeTerminal()`
  - `actions.destroyTerminalSession()`
  - `events.emit('terminal:data')`
  - `events.emit('terminal:exit')`

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-14 | Use actions + events pattern | Clean separation, testable, framework-agnostic backend |
| 2025-11-14 | Single terminal for V1 | Simplify initial implementation, extensible later |
| 2025-11-14 | Terminal actions are **Required** (Option A) | Simpler implementation, easy migration to capability declaration later |
| 2025-11-14 | **Hybrid ownership model** (Option C) | Panel manages lifecycle, framework provides garbage collection safety net |
| 2025-11-14 | **Context + Events** for data (Option B) | Metadata in context, streaming data via events, no buffer in context |
| 2025-11-14 | **Simple error handling** for V1 | Focus on happy path, enhance error handling in future versions |
| 2025-11-14 | **Ephemeral sessions** (Option A) | Create on mount, destroy on unmount, no persistence for V1 |

---

## Questions for Host Application Team

1. ✅ ~~Should terminal actions be required or optional?~~ **Decided: Required**
2. ✅ ~~Who owns session lifecycle?~~ **Decided: Hybrid model**
3. ✅ ~~Terminal data slice in context?~~ **Decided: Yes, metadata only**
4. ✅ ~~Error handling strategy?~~ **Decided: Simple for V1**
5. ✅ ~~Session persistence?~~ **Decided: Ephemeral for V1**
6. **Does panel collapse/expand trigger unmount?** (Affects whether sessions survive collapse)
7. What's the expected deployment model for the terminal backend service?
   - Electron main process?
   - Separate Node.js server?
   - Cloud-based terminal service?
8. What authentication/authorization is needed for terminal access?
