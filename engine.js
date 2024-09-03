// Game elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const debugInfo = document.getElementById('debugInfo');
const scoreBoard = document.getElementById('scoreBoard');
const recordsList = document.getElementById('recordsList');
const activityList = document.getElementById('activityList');
const newsList = document.getElementById('newsList');
const pauseOverlay = document.getElementById('pauseOverlay');
const playerCountDisplay = document.getElementById('playerCount');
const connectionStatus = document.getElementById('connectionStatus');
const mobileControls = document.getElementById('mobileControls');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');

// Check if the device is mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
    mobileControls.style.display = 'flex';
    mobileControls.style.justifyContent = 'space-between';
}

// Cloud Compute related names
const playerNames = [
    "EC2Explorer", "S3Surfer", "LambdaLeaper", "DynamoDBDiver", "RDSRacer",
    "CloudFrontCruiser", "ElasticBeanstalkBouncer", "KinesisKnight", "SageMakerSprinter", "GlacierGlider"
];

let playerName = playerNames[Math.floor(Math.random() * playerNames.length)];

// WebSocket connection
let socket;
let isOnline = false;

function connectWebSocket() {
    socket = new WebSocket('wss://travels-compounds-volt-storage.trycloudflare.com');

    socket.onopen = function() {
        isOnline = true;
        connectionStatus.textContent = 'Status: Online';
        connectionStatus.className = 'online';
        socket.send(JSON.stringify({ type: 'register', name: playerName }));
    };

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'playerCount') {
            playerCountDisplay.textContent = `Players: ${data.count}`;
        } else if (data.type === 'globalRecords') {
            updateGlobalRecords(data.records);
        } else if (data.type === 'activityLog') {
            updateActivityLog(data.log);
        } else if (data.type === 'welcome') {
            playerName = data.name;
        }
    };

    socket.onclose = function() {
        isOnline = false;
        connectionStatus.textContent = 'Status: Offline (Retrying in 5s)';
        connectionStatus.className = 'offline';
        setTimeout(connectWebSocket, 5000);
    };

    socket.onerror = function() {
        isOnline = false;
        connectionStatus.textContent = 'Status: Connection Error';
        connectionStatus.className = 'offline';
    };
}

connectWebSocket();

// Close WebSocket connection when the window is closed
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.close();
    }
});

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const CEILING = 50;
const GROUND = GAME_HEIGHT - 50;

// Game state
let isPaused = false;

// Performance monitoring
let lastTime = 0;
let fpsCounter = 0;
let fpsTimer = 0;

// Player
const player = {
    x: 50,
    y: GROUND - 50,
    width: 30,
    height: 50,
    speed: 5,
    velocityY: 0,
    gravity: 0.4,
    jumpStrength: -10,
    score: 0
};

// Clouds
const clouds = [];
const cloudWidth = 100;
const cloudHeight = 60;
const minCloudHeight = CEILING + cloudHeight;
const maxCloudHeight = GROUND - cloudHeight - 50;

// Static news items (replace with dynamic content from WebSocket if available)
const newsItems = [
    { title: "Amplify", description: "New function capabilities with scheduled cron jobs and streaming logs" },
    { title: "AppConfig", description: "Deletion protection for additional guardrails" },
    { title: "Backup", description: "Cross-Region backup with Neptune" },
    { title: "Bedrock", description: "Cross-region inference and Knowledge Bases support for Llama 3.1" },
    { title: "Braket", description: "Rigetti's 84-Qubit Ankaa™-2 system now available" }
];

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    fpsCounter++;
    fpsTimer += deltaTime;
    if (fpsTimer >= 1000) {
        debugInfo.textContent = `FPS: ${fpsCounter}\nObjects: ${clouds.length}`;
        fpsCounter = 0;
        fpsTimer = 0;
    }

    if (!isPaused) {
        update(deltaTime / 1000);
    }
    render();
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Player movement
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < GAME_WIDTH - player.width) player.x += player.speed;

    // Player jump and gravity
    player.velocityY += player.gravity;
    player.y += player.velocityY;

    // Ground collision
    if (player.y > GROUND - player.height) {
        player.y = GROUND - player.height;
        player.velocityY = 0;
    }

    // Ceiling collision
    if (player.y < CEILING) {
        player.y = CEILING;
        player.velocityY = 0;
    }

    // Generate clouds
    if (clouds.length < 5 && Math.random() < 0.02) {
        const newsItem = newsItems[Math.floor(Math.random() * newsItems.length)];
        clouds.push({
            x: GAME_WIDTH,
            y: Math.random() * (maxCloudHeight - minCloudHeight) + minCloudHeight,
            title: newsItem.title,
            description: newsItem.description
        });
    }

    // Move clouds and handle collision
    for (let i = clouds.length - 1; i >= 0; i--) {
        clouds[i].x -= 2;
        if (clouds[i].x + cloudWidth < 0) {
            clouds.splice(i, 1);
            continue;
        }

        // Collision detection
        if (player.x < clouds[i].x + cloudWidth &&
            player.x + player.width > clouds[i].x &&
            player.y < clouds[i].y + cloudHeight &&
            player.y + player.height > clouds[i].y) {
            addNewsToLog(`${clouds[i].title}: ${clouds[i].description}`);
            player.score++;
            updateScore();
            clouds.splice(i, 1);
        }
    }
}

function render() {
    ctx.fillStyle = 'skyblue';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, GAME_WIDTH, CEILING);

    ctx.fillStyle = 'orange';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = 'green';
    ctx.fillRect(0, GROUND, GAME_WIDTH, GAME_HEIGHT - GROUND);

    // Draw clouds
    ctx.fillStyle = 'white';
    for (let cloud of clouds) {
        drawCloud(cloud.x, cloud.y, cloudWidth, cloudHeight);
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.fillText(cloud.title, cloud.x + 10, cloud.y + cloudHeight / 2);
        ctx.fillStyle = 'white';
    }

    if (isPaused) {
        pauseOverlay.style.display = 'block';
    } else {
        pauseOverlay.style.display = 'none';
    }
}

function drawCloud(x, y, width, height) {
    ctx.beginPath();
    ctx.moveTo(x, y + height / 2);
    ctx.bezierCurveTo(x, y, x + width / 2, y - height / 2, x + width, y + height / 2);
    ctx.bezierCurveTo(x + width, y + height, x + width / 2, y + height * 1.5, x, y + height / 2);
    ctx.fill();
}

function addNewsToLog(news) {
    const li = document.createElement('li');
    li.textContent = news;
    newsList.prepend(li);
    if (newsList.children.length > 5) {
        newsList.removeChild(newsList.lastChild);
    }
}

function updateScore() {
    scoreBoard.textContent = `Score: ${player.score}`;
    if (isOnline) {
        socket.send(JSON.stringify({ type: 'updateScore', score: player.score }));
    }
}

function updateGlobalRecords(records) {
    recordsList.innerHTML = '';
    records.forEach(record => {
        const li = document.createElement('li');
        li.textContent = `${record.name}: ${record.score}`;
        recordsList.appendChild(li);
    });
}

function updateActivityLog(log) {
    activityList.innerHTML = '';
    log.forEach(activity => {
        const li = document.createElement('li');
        li.textContent = activity;
        activityList.appendChild(li);
    });
}

const keys = {};

function jump() {
    player.velocityY = player.jumpStrength;
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') jump();
    if (e.code === 'KeyP') {
        isPaused = !isPaused;
        pauseOverlay.style.display = isPaused ? 'block' : 'none';
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
});

// Touch controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
});

// Mobile button controls
if (isMobile) {
    leftButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.ArrowLeft = true;
    });
    leftButton.addEventListener('touchend', () => {
        keys.ArrowLeft = false;
    });
    rightButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.ArrowRight = true;
    });
    rightButton.addEventListener('touchend', () => {
        keys.ArrowRight = false;
    });
}

// Start the game
requestAnimationFrame(gameLoop);