let socket;
let username, password;
let userList = new Set();
let welcomeMessages = ["Welcome! #1", "Hello! #2"];  // Customize your welcome messages
let goodbyeMessages = ["Goodbye! #1", "See you! #2"];  // Customize your goodbye messages

function connect() {
    username = document.getElementById('username').value;
    password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Username and password are required.');
        return;
    }

    updateStatus('Connecting...');

    try {
        socket = new WebSocket('wss://chatp.net:5333/server');

        socket.onopen = function() {
            console.log('WebSocket is connected.');
            updateStatus('Connected');
            login(username, password);
        };

        socket.onmessage = function(event) {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);
            processMessage(message);
        };

        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
            updateStatus('Error');
        };

        socket.onclose = function() {
            console.log('WebSocket is closed.');
            updateStatus('Disconnected');
        };

        setTimeout(() => {
            if (socket.readyState !== WebSocket.OPEN) {
                console.error('WebSocket connection timed out.');
                updateStatus('Connection timed out');
                socket.close();
            }
        }, 5000);
    } catch (error) {
        console.error('Error in WebSocket connection:', error);
        updateStatus('Connection error');
    }
}

function login(username, password) {
    const authMessage = {
        username: username,
        password: password,
        handler: 'login',
        id: generatePacketID()
    };
    console.log('Sending login message:', authMessage);
    socket.send(JSON.stringify(authMessage));
}

function joinRoom() {
    const room = document.getElementById('room').value;
    const joinMessage = {
        handler: 'room_join',
        id: generatePacketID(),
        name: room
    };
    console.log('Sending join room message:', joinMessage);
    socket.send(JSON.stringify(joinMessage));
}

function sendMessage() {
    const message = document.getElementById('message').value;
    const room = document.getElementById('room').value;
    const chatMessage = {
        handler: 'room_message',
        type: 'text',
        id: generatePacketID(),
        body: message,
        room: room,
        url: '',
        length: '0'
    };
    console.log('Sending chat message:', chatMessage);
    socket.send(JSON.stringify(chatMessage));
    document.getElementById('message').value = '';
}

function processMessage(message) {
    const chatbox = document.getElementById('chatbox');
    const userListElement = document.getElementById('userList');

    if (message.handler === 'room_message') {
        const fromUser = message.from;
        const body = message.body;
        chatbox.innerHTML += `<p><strong>${fromUser}:</strong> ${body}</p>`;
        chatbox.scrollTop = chatbox.scrollHeight;
    } else if (message.handler === 'user_joined') {
        handleUserPresence(message, true);
    } else if (message.handler === 'user_left') {
        handleUserPresence(message, false);
    } else if (message.handler === 'login') {
        if (message.success) {
            chatbox.innerHTML += '<p>Login successful.</p>';
        } else {
            chatbox.innerHTML += '<p style="color: red;">Login failed: ' + message.error + '</p>';
            socket.close();
        }
    }
}

function handleUserPresence(message, isJoining) {
    const chatbox = document.getElementById('chatbox');
    const userListElement = document.getElementById('userList');
    const username = message.username;
    const role = message.role;

    if (isJoining) {
        if (!userList.has(username)) {
            userList.add(username);
            userListElement.innerHTML += `<li>${username}</li>`;
        }
        chatbox.innerHTML += `<p style="color: green;">${username} joined the room as ${role}.</p>`;
        chatbox.scrollTop = chatbox.scrollHeight;
        sendGreeting(username, true);
    } else {
        if (userList.has(username)) {
            userList.delete(username);
            const listItem = [...userListElement.children].find(li => li.textContent === username);
            if (listItem) {
                userListElement.removeChild(listItem);
            }
        }
        chatbox.innerHTML += `<p style="color: darkgreen;">${username} left the room.</p>`;
        chatbox.scrollTop = chatbox.scrollHeight;
        sendGreeting(username, false);
    }
}

function sendGreeting(username, isWelcome) {
    const messages = isWelcome ? welcomeMessages : goodbyeMessages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)].replace("#", username);
    document.getElementById('message').value = randomMessage;
    sendMessage();
}

function generatePacketID() {
    return 'R.U.BULAN©pinoy-2023®#' + Math.floor(Math.random() * 100000);
}

function updateStatus(status) {
    document.getElementById('status').innerText = status;
}
