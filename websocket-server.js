const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let playerCount = 0;

wss.on('connection', function connection(ws) {
  playerCount++;
  broadcastPlayerCount();

  ws.on('close', function close() {
    playerCount--;
    broadcastPlayerCount();
  });
});

function broadcastPlayerCount() {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'playerCount', count: playerCount }));
    }
  });
}

console.log('WebSocket server is running on ws://localhost:8080');
