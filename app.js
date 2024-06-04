let socket;
let username, password;

async function connect() {
    username = document.getElementById('username').value;
    password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Username and password are required.');
        return;
    }

    socket = new WebSocket('wss://chatp.net:5333/server');

    socket.onopen = function() {
        console.log('WebSocket is connected.');
        document.getElementById('chatbox').innerHTML += '<p>Connected to server.</p>';
        login(username, password);
    };

    socket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        processMessage(message);
    };

    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
        document.getElementById('chatbox').innerHTML += '<p style="color: red;">WebSocket error: ' + error.message + '</p>';
    };

    socket.onclose = function() {
        console.log('WebSocket is closed.');
        document.getElementById('chatbox').innerHTML += '<p>WebSocket connection closed.</p>';
    };

    // Add a timeout to handle connection issues
    setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection timed out.');
            document.getElementById('chatbox').innerHTML += '<p style="color: red;">WebSocket connection timed out.</p>';
            socket.close();
        }
    }, 5000);
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
    const userList = document.getElementById('userList');

    if (message.handler === 'room_message') {
        const fromUser = message.from;
        const body = message.body;
        chatbox.innerHTML += `<p><strong>${fromUser}:</strong> ${body}</p>`;
        chatbox.scrollTop = chatbox.scrollHeight;
    } else if (message.handler === 'user_joined') {
        const user = message.username;
        userList.innerHTML += `<li>${user}</li>`;
    } else if (message.handler === 'user_left') {
        const user = message.username;
        const userListItems = userList.getElementsByTagName('li');
        for (let i = 0; i < userListItems.length; i++) {
            if (userListItems[i].innerText === user) {
                userList.removeChild(userListItems[i]);
                break;
            }
        }
    } else if (message.handler === 'login') {
        if (message.success) {
            chatbox.innerHTML += '<p>Login successful.</p>';
        } else {
            chatbox.innerHTML += '<p style="color: red;">Login failed: ' + message.error + '</p>';
            socket.close();
        }
    }
}

function generatePacketID() {
    return 'R.U.BULAN©pinoy-2023®#' + Math.floor(Math.random() * 100000);
}
