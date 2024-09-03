const WebSocket = require('ws');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 8080 });

let players = new Map();
let globalRecords = [];
const RECORDS_FILE = 'global_records.json';

// Load existing global records
try {
    const data = fs.readFileSync(RECORDS_FILE, 'utf8');
    globalRecords = JSON.parse(data);
} catch (err) {
    console.log('No existing records found. Starting fresh.');
}

wss.on('connection', function connection(ws) {
    let playerName = '';

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);

        if (data.type === 'register') {
            playerName = data.name;
            players.set(ws, playerName);
            ws.send(JSON.stringify({ type: 'welcome', name: playerName }));
            broadcastPlayerCount();
            sendGlobalRecords(ws);
            broadcastPlayerActivity(`${playerName} joined the game`);
        } else if (data.type === 'updateScore') {
            updateGlobalRecords(playerName, data.score);
            broadcastGlobalRecords();
        }
    });

    ws.on('close', function close() {
        if (playerName) {
            broadcastPlayerActivity(`${playerName} left the game`);
        }
        players.delete(ws);
        broadcastPlayerCount();
    });
});

function broadcastPlayerCount() {
    const count = players.size;
    broadcast({ type: 'playerCount', count: count });
}

function updateGlobalRecords(name, score) {
    const existingRecord = globalRecords.find(record => record.name === name);
    if (existingRecord) {
        if (score > existingRecord.score) {
            existingRecord.score = score;
            globalRecords.sort((a, b) => b.score - a.score);
        }
    } else {
        globalRecords.push({ name, score });
        globalRecords.sort((a, b) => b.score - a.score);
    }
    if (globalRecords.length > 10) {
        globalRecords = globalRecords.slice(0, 10);
    }
    // Save updated records to file
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(globalRecords));
}

function broadcastGlobalRecords() {
    broadcast({ type: 'globalRecords', records: globalRecords });
}

function sendGlobalRecords(ws) {
    ws.send(JSON.stringify({ type: 'globalRecords', records: globalRecords }));
}

function broadcastPlayerActivity(message) {
    broadcast({ type: 'playerActivity', message: message });
}

function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

console.log('CloudHop: AWS News Adventure server is running on ws://localhost:8080');