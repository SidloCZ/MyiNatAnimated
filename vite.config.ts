import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function terminalLoggerPlugin(): Plugin {
  return {
    name: 'terminal-logger',
    configureServer(server) {
      server.middlewares.use('/api/terminal-log', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { level, message, details } = JSON.parse(body);
              const time = new Date().toLocaleTimeString();
              const prefix = `[Browser ${time}] [${String(level).toUpperCase()}]`;
              if (level === 'error') {
                console.error(`\x1b[31m${prefix} ${message}\x1b[0m`, details || '');
              } else if (level === 'warn') {
                console.warn(`\x1b[33m${prefix} ${message}\x1b[0m`, details || '');
              } else {
                console.log(`\x1b[36m${prefix} ${message}\x1b[0m`, details || '');
              }
            } catch {
              // Ignore malformed payloads
            }
            res.statusCode = 200;
            res.end('ok');
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), terminalLoggerPlugin()],
  base: './',
  server: {
    port: 3000,
    open: false,
  },
});

