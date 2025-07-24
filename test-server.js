const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Test Server Working!</h1><p>If you see this, the server is running.</p>');
});

const PORT = 8765;
server.listen(PORT, 'localhost', () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});