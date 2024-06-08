document.addEventListener('DOMContentLoaded', () => {
    let socket;
    let isConnected = false;
    let packetIdNum = 0;
    let sendWelcomeMessages = false;
    let currentUsername = '';
    let userList = [];

    const loginButton = document.getElementById('loginButton');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const leaveRoomButton = document.getElementById('leaveRoomButton');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const searchImageButton = document.getElementById('searchImageButton');
    const statusDiv = document.getElementById('status');
    const statusCount = document.getElementById('count');
    const chatbox = document.getElementById('chatbox');
    const welcomeCheckbox = document.getElementById('welcomeCheckbox');
    const roomListbox = document.getElementById('roomListbox');
    const userListbox = document.getElementById('userListbox');
    const debugBox = document.getElementById('debugBox');
    const emojiList = document.getElementById('emojiList');
    const messageInput = document.getElementById('message');

    loginButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        currentUsername = username;
        await connectWebSocket(username, password);
    });

    joinRoomButton.addEventListener('click', async () => {
        const room = document.getElementById('room').value;
        await joinRoom(room);
    });

    leaveRoomButton.addEventListener('click', async () => {
        const room = document.getElementById('room').value;
        await leaveRoom(room);
    });

    sendMessageButton.addEventListener('click', () => {
        const message = messageInput.value;
        sendMessage(message);
        messageInput.value = ''; // Clear input after sending
    });

    emojiList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('emoji-item')) {
            const emoji = target.getAttribute('data-emoji');
            messageInput.value += emoji;
            messageInput.focus(); // Keep focus on the input field
        }
    });

    searchImageButton.addEventListener('click', async () => {
        const searchTerm = document.getElementById('searchTerm').value;
        const imageUrl = await searchImage(searchTerm);
        document.getElementById('imageResult').src = imageUrl;
    });

    welcomeCheckbox.addEventListener('change', (event) => {
        sendWelcomeMessages = event.target.checked;
    });

    const connectWebSocket = async (username, password) => {
        socket = new WebSocket('ws://localhost:8000/ws');
        socket.addEventListener('open', () => {
            isConnected = true;
            statusDiv.innerHTML = 'Connected to WebSocket';
            debugBox.value += 'Connected to WebSocket\n';
            login(username, password);
        });

        socket.addEventListener('message', (event) => {
            const packet = JSON.parse(event.data);
            handlePacket(packet);
        });

        socket.addEventListener('close', () => {
            isConnected = false;
            statusDiv.innerHTML = 'WebSocket connection closed';
            debugBox.value += 'WebSocket connection closed\n';
        });

        socket.addEventListener('error', (error) => {
            statusDiv.innerHTML = 'WebSocket error: ' + error.message;
            debugBox.value += 'WebSocket error: ' + error.message + '\n';
        });
    };

    const login = (username, password) => {
        sendPacket({
            packetId: packetIdNum++,
            packetType: 'login',
            packetBody: {
                username: username,
                password: password
            }
        });
    };

    const joinRoom = (room) => {
        sendPacket({
            packetId: packetIdNum++,
            packetType: 'join_room',
            packetBody: {
                room: room
            }
        });
    };

    const leaveRoom = (room) => {
        sendPacket({
            packetId: packetIdNum++,
            packetType: 'leave_room',
            packetBody: {
                room: room
            }
        });
    };

    const sendMessage = (message) => {
        sendPacket({
            packetId: packetIdNum++,
            packetType: 'send_message',
            packetBody: {
                message: message
            }
        });
    };

    const searchImage = async (searchTerm) => {
        // Simulate an image search by returning a placeholder URL
        // Replace this with actual image search logic if needed
        return 'https://via.placeholder.com/150?text=' + encodeURIComponent(searchTerm);
    };

    const sendPacket = (packet) => {
        if (isConnected) {
            socket.send(JSON.stringify(packet));
        } else {
            statusDiv.innerHTML = 'WebSocket is not connected';
            debugBox.value += 'WebSocket is not connected\n';
        }
    };

    const handlePacket = (packet) => {
        const { packetType, packetBody } = packet;

        switch (packetType) {
            case 'login_response':
                if (packetBody.success) {
                    statusDiv.innerHTML = 'Login successful';
                    debugBox.value += 'Login successful\n';
                    userList = packetBody.users || [];
                    updateUserList();
                } else {
                    statusDiv.innerHTML = 'Login failed: ' + packetBody.error;
                    debugBox.value += 'Login failed: ' + packetBody.error + '\n';
                }
                break;

            case 'join_room_response':
                if (packetBody.success) {
                    statusDiv.innerHTML = 'Joined room: ' + packetBody.room;
                    debugBox.value += 'Joined room: ' + packetBody.room + '\n';
                    if (sendWelcomeMessages) {
                        sendMessage('Hello everyone! ' + currentUsername + ' has joined the room.');
                    }
                } else {
                    statusDiv.innerHTML = 'Failed to join room: ' + packetBody.error;
                    debugBox.value += 'Failed to join room: ' + packetBody.error + '\n';
                }
                break;

            case 'leave_room_response':
                if (packetBody.success) {
                    statusDiv.innerHTML = 'Left room: ' + packetBody.room;
                    debugBox.value += 'Left room: ' + packetBody.room + '\n';
                } else {
                    statusDiv.innerHTML = 'Failed to leave room: ' + packetBody.error;
                    debugBox.value += 'Failed to leave room: ' + packetBody.error + '\n';
                }
                break;

            case 'user_list_update':
                userList = packetBody.users || [];
                updateUserList();
                break;

            case 'new_message':
                const message = packetBody.message;
                chatbox.innerHTML += `<div>${message}</div>`;
                chatbox.scrollTop = chatbox.scrollHeight; // Auto-scroll to the bottom
                break;

            default:
                debugBox.value += 'Unknown packet type: ' + packetType + '\n';
        }
    };

    const updateUserList = () => {
        userListbox.innerHTML = '';
        userList.forEach(user => {
            const option = document.createElement('option');
            option.text = user.username;
            userListbox.add(option);
        });
        statusCount.innerHTML = 'Users online: ' + userList.length;
    };
});
