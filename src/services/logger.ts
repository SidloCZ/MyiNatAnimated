/**
 * Utility to log browser debug, info, warn, and error messages directly
 * into the Vite development terminal stdout as well as browser console.
 */
export function logToTerminal(level: 'info' | 'warn' | 'error', message: string, details?: unknown) {
  // Always log to standard browser console
  if (level === 'error') {
    console.error(`[App] ${message}`, details || '');
  } else if (level === 'warn') {
    console.warn(`[App] ${message}`, details || '');
  } else {
    console.log(`[App] ${message}`, details || '');
  }

  // Forward to Vite dev server terminal in development mode
  if (import.meta.env.DEV) {
    try {
      let serializedDetails: string | undefined;
      if (details instanceof Error) {
        serializedDetails = `${details.name}: ${details.message}\n${details.stack || ''}`;
      } else if (typeof details === 'object' && details !== null) {
        try {
          serializedDetails = JSON.stringify(details);
        } catch {
          serializedDetails = String(details);
        }
      } else if (details !== undefined) {
        serializedDetails = String(details);
      }

      fetch('/api/terminal-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, details: serializedDetails }),
      }).catch(() => {
        // Silently swallow network drops
      });
    } catch {
      // Ignore serialization issues
    }
  }
}

// Global unhandled error and rejection listeners
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logToTerminal('error', `Nezachycená chyba: ${event.message} (${event.filename}:${event.lineno})`, event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    logToTerminal('error', `Nezachycené selhání Promise (unhandledrejection): ${reason}`, event.reason);
  });
}

