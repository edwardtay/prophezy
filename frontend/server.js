const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// SSL certificate paths
const keyPath = path.join(__dirname, 'localhost-key.pem');
const certPath = path.join(__dirname, 'localhost.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ SSL certificates not found!');
  console.error('Please run: openssl req -x509 -newkey rsa:4096 -nodes -keyout localhost-key.pem -out localhost.pem -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

const app = next({ dev, hostname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(httpsOptions, async (req, res) => {
    try {
      console.log(`${req.method} ${req.url}`);
      // Force HTTPS headers
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('internal server error');
      }
    }
  });

  server.listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
    console.log(`> Ready on https://localhost:${port}`);
    console.log(`> Also available at https://127.0.0.1:${port}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err);
  process.exit(1);
});

