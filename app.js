let socket;
let isConnected = false;
let currentRoom = '';
let users = new Set();
let sendWelcomeMessages = false;

document.getElementById('connectButton').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Please enter both username and password.');
        return;
    }
    
    try {
        await connectToWebSocket(username, password);
        document.getElementById('connectButton').disabled = true;
        document.getElementById('disconnectButton').disabled = false;
        document.getElementById('joinRoomButton').disabled = false;
    } catch (error) {
        console.error('Connection failed:', error);
    }
});

document.getElementById('disconnectButton').addEventListener('click', () => {
    if (socket && isConnected) {
        socket.close();
        isConnected = false;
        document.getElementById('connectButton').disabled = false;
        document.getElementById('disconnectButton').disabled = true;
        document.getElementById('joinRoomButton').disabled = true;
        document.getElementById('sendMessageButton').disabled = true;
    }
});

document.getElementById('joinRoomButton').addEventListener('click', () => {
    const roomName = document.getElementById('roomName').value;
    if (roomName) {
        joinRoom(roomName);
        document.getElementById('sendMessageButton').disabled = false;
    }
});

document.getElementById('sendMessageButton').addEventListener('click', () => {
    const message = document.getElementById('messageInput').value;
    if (message) {
        sendMessage(message);
        document.getElementById('messageInput').value = '';
    }
});

document.getElementById('welcomeCheckbox').addEventListener('change', (event) => {
    sendWelcomeMessages = event.target.checked;
});

async function connectToWebSocket(username, password) {
    const url = 'wss://chatp.net:5333/server';
    socket = new WebSocket(url);

    socket.onopen = async () => {
        isConnected = true;
        await login(username, password);
    };

    socket.onmessage = (event) => {
        processReceivedMessage(event.data);
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
        isConnected = false;
        console.log('WebSocket connection closed.');
    };
}

async function login(username, password) {
    if (!isConnected) {
        console.error('Not connected to the server.');
        return;
    }

    const authMessage = JSON.stringify({
        username: username,
        password: password,
        handler: 'login',
        id: generateUniqueId()
    });

    try {
        socket.send(authMessage);
    } catch (error) {
        console.error('Error sending login message:', error);
    }
}

function joinRoom(roomName) {
    if (!isConnected) {
        console.error('Not connected to the server.');
        return;
    }

    const joinMessage = JSON.stringify({
        handler: 'room_event',
        type: 'join',
        name: roomName,
        id: generateUniqueId()
    });

    try {
        socket.send(joinMessage);
        currentRoom = roomName;
    } catch (error) {
        console.error('Error sending join room message:', error);
    }
}

function sendMessage(message) {
    if (!isConnected || !currentRoom) {
        console.error('Not connected to the server or no room joined.');
        return;
    }

    const chatMessage = JSON.stringify({
        handler: 'chat_message',
        type: 'text',
        room: currentRoom,
        message: message,
        id: generateUniqueId()
    });

    try {
        socket.send(chatMessage);
    } catch (error) {
        console.error('Error sending chat message:', error);
    }
}

function processReceivedMessage(message) {
    try {
        const messageObj = JSON.parse(message);
        const handler = messageObj.handler;

        switch (handler) {
            case 'login_event':
                handleLoginEvent(messageObj);
                break;
            case 'room_event':
                handleRoomEvent(messageObj);
                break;
            case 'chat_message':
                displayChatMessage(messageObj);
                break;
            case 'presence':
                updateUserPresence(messageObj);
                break;
            // Add other cases as needed
            default:
                console.warn('Unknown handler:', handler);
        }

        document.getElementById('chatbox').innerText += message + '\n';
    } catch (error) {
        console.error('Error processing received message:', error);
    }
}

function handleLoginEvent(messageObj) {
    const type = messageObj.type;
    if (type === 'success') {
        console.log('Login successful');
    } else if (type === 'failed') {
        console.error('Login failed:', messageObj.reason);
    }
}

function handleRoomEvent(messageObj) {
    const type = messageObj.type;
    const userName = messageObj.name;
    
    if (type === 'you_joined') {
        console.log('You joined the room:', currentRoom);
    } else if (type === 'user_joined') {
        users.add(userName);
        if (sendWelcomeMessages) {
            sendMessage(`Welcome ${userName} to the room!`);
        }
        updateUserList();
    } else if (type === 'user_left') {
        users.delete(userName);
        if (sendWelcomeMessages) {
            sendMessage(`Goodbye ${userName}!`);
        }
        updateUserList();
    }
}

function displayChatMessage(messageObj) {
    const chatbox = document.getElementById('chatbox');
    chatbox.innerText += `${messageObj.sender}: ${messageObj.message}\n`;
}

function updateUserPresence(messageObj) {
    const userName = messageObj.name;
    const isOnline = messageObj.is_online;

    if (isOnline) {
        users.add(userName);
    } else {
        users.delete(userName);
    }

    updateUserList();
}

function updateUserList() {
    const userListDiv = document.getElementById('userList');
    userListDiv.innerHTML = Array.from(users).join('<br>');
}

function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}
