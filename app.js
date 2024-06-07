document.addEventListener('DOMContentLoaded', () => {
    let socket;
    let isConnected = false;
    let packetIdNum = 0;
    let sendWelcomeMessages = false;
    let currentUsername = '';

    const loginButton = document.getElementById('loginButton');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const leaveRoomButton = document.getElementById('leaveRoomButton');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const searchImageButton = document.getElementById('searchImageButton');
    const statusDiv = document.getElementById('status');
    const chatbox = document.getElementById('chatbox');
    const welcomeCheckbox = document.getElementById('welcomeCheckbox');
    const roomListbox = document.getElementById('roomListbox');
    const userListDiv = document.getElementById('userList');
    const debugBox = document.getElementById('debugBox');

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

    sendMessageButton.addEventListener('click', async () => {
        const message = document.getElementById('message').value;
        await sendMessage(message);
    });

    searchImageButton.addEventListener('click', async () => {
        const searchTerm = document.getElementById('searchTerm').value;
        await searchImage(searchTerm);
    });

    welcomeCheckbox.addEventListener('change', () => {
        sendWelcomeMessages = welcomeCheckbox.checked;
    });

    roomListbox.addEventListener('change', async () => {
        const selectedRoom = roomListbox.value;
        if (selectedRoom) {
            await joinRoom(selectedRoom);
        }
    });

    async function connectWebSocket(username, password) {
        statusDiv.textContent = 'Connecting to server...';
        socket = new WebSocket('wss://chatp.net:5333/server');

        socket.onopen = async () => {
            isConnected = true;
            statusDiv.textContent = 'Connected to server';

            const loginMessage = {
                username: username,
                password: password,
                handler: 'login',
                id: generatePacketID()
            };
            console.log('Sending login message:', loginMessage);
            await sendMessageToSocket(loginMessage);
        };

        socket.onmessage = (event) => {
            console.log('Received message:', event.data);
            processReceivedMessage(event.data);
        };

        socket.onclose = () => {
            isConnected = false;
            statusDiv.textContent = 'Disconnected from server';
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            statusDiv.textContent = 'WebSocket error. Check console for details.';
        };
    }

    async function joinRoom(roomName) {
        if (isConnected) {
            const joinMessage = {
                handler: 'room_join',
                id: generatePacketID(),
                name: roomName
            };
            await sendMessageToSocket(joinMessage);
            await fetchUserList(roomName);

            if (sendWelcomeMessages) {
                const welcomeMessage = `Hello world, I'm a web bot! Welcome, ${currentUsername}!`;
                await sendMessage(welcomeMessage);
            }
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

    async function leaveRoom(roomName) {
        if (isConnected) {
            const leaveMessage = {
                handler: 'room_leave',
                id: generatePacketID(),
                name: roomName
            };
            await sendMessageToSocket(leaveMessage);
            statusDiv.textContent = `You left the room: ${roomName}`;
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

    async function sendMessage(message) {
        if (isConnected) {
            const messageData = {
                handler: 'room_message',
                type: 'text',
                id: generatePacketID(),
                body: message,
                room: document.getElementById('room').value,
                url: '',
                length: '0'
            };
            await sendMessageToSocket(messageData);

            // Check for special spin command
            if (message.trim() === '.s') {
                const responses = ["Good luck!", "Try again!", "Better luck next time!", "Jackpot!", "Spin again!"];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                await sendMessage(randomResponse);
            }
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

    async function sendMessageToSocket(message) {
        if (isConnected && socket.readyState === WebSocket.OPEN) {
            console.log('Sending message to socket:', message);
            socket.send(JSON.stringify(message));
        } else {
            statusDiv.textContent = 'WebSocket is not open';
            console.error('WebSocket is not open');
        }
    }

    function generatePacketID() {
        packetIdNum += 1;
        return `R.U.BULAN©pinoy-2023®#${packetIdNum.toString().padStart(3, '0')}`;
    }

    function processReceivedMessage(message) {
        console.log('Received message:', message);
        debugBox.value += `${message}\n`;

        try {
            const jsonDict = JSON.parse(message);

            if (jsonDict) {
                const handler = jsonDict.handler;

                if (handler === 'login_event') {
                    handleLoginEvent(jsonDict);
                } else if (handler === 'room_event') {
                    handleRoomEvent(jsonDict);
                } else if (handler === 'chat_message') {
                    displayChatMessage(jsonDict);
                } else if (handler === 'presence') {
                    onUserProfileUpdates(jsonDict);
                } else if (handler === 'group_invite') {
                    onMucInvitation(jsonDict.inviter, jsonDict.name, 'private');
                } else if (handler === 'user_online' || handler === 'user_offline') {
                    onUserPresence(jsonDict);
                } else if (handler === 'muc_event') {
                    handleMucEvent(jsonDict);
                } else if (handler === 'last_activity') {
                    onUserActivityResult(jsonDict);
                } else if (handler === 'roster') {
                    onRoster(jsonDict);
                } else if (handler === 'friend_requests') {
                    onFriendRequest(jsonDict);
                } else if (handler === 'register_event') {
                    handleRegisterEvent(jsonDict);
                } else if (handler === 'profile_other') {
                    onGetUserProfile(jsonDict);
                } else if (handler === 'followers_event') {
                    onFollowersList(jsonDict);
                } else if (handler === 'add_buddy') {
                    onAddBuddy(jsonDict);
                } else {
                    console.log('Unknown handler:', handler);
                }
            }
        } catch (ex) {
            console.error('Error processing received message:', ex);
        }
    }

    async function handleRoomEvent(messageObj) {
        const type = messageObj.type;
        const userName = messageObj.username || 'Unknown';
        const role = messageObj.role;

        if (type === 'you_joined') {
            displayChatMessage({ from: 'System', body: `**You** joined the room as ${role}` });

            // Display room subject
            displayChatMessage({ from: 'System', body: `Room subject: ${messageObj.subject} (by ${messageObj.subject_author})` });

            // Display list of users with roles
            messageObj.users.forEach(user => {
                displayChatMessage({ from: 'System', body: `${user.username} - ${user.role}` });
            });
        } else if (type === 'user_joined') {
            displayChatMessage({ from: 'System', body: `${userName} joined the room as ${role}` });

            if (sendWelcomeMessages) {
                const welcomeMessage = `Hello ${role} ${userName}, welcome back!`;
                await sendMessage(welcomeMessage);
            }
        } else if (type === 'user_left') {
            displayChatMessage({ from: 'System', body: `${userName} left the room.` });

            if (sendWelcomeMessages) {
                const goodbyeMessage = `Bye ${userName}!`;
                await sendMessage(goodbyeMessage);
            }
        } else if (type === 'text') {
            const body = messageObj.body;
            const from = messageObj.from;
            displayChatMessage({ from, body });

            if (body === '@bot') {
                const welcomeMessage = `Hello ${from}, what can I help you with?`;
                await sendMessage(welcomeMessage);
            } else if (body === '+wc') {
                welcomeCheckbox.checked = true;
                sendWelcomeMessages = true;
                await sendMessage('Welcome messages activated.');
            } else if (body === '-wc') {
                welcomeCheckbox.checked = false;
                sendWelcomeMessages = false;
                await sendMessage('Welcome messages deactivated.');
            }
        } else if (type === 'room_create') {
            if (messageObj.result === 'success') {
                await joinRoom(messageObj.name);
            } else if (messageObj.result === 'room_exists') {
                statusDiv.textContent = `Room ${messageObj.name} already exists.`;
            } else if (messageObj.result === 'empty_balance') {
                statusDiv.textContent = 'Cannot create room: empty balance.';
            } else {
                statusDiv.textContent = 'Error creating room.';
            }
        }
    }

    function displayChatMessage(messageObj) {
        const { from, body } = messageObj;
        const newMessage = document.createElement('div');
        newMessage.textContent = `${from}: ${body}`;
        chatbox.appendChild(newMessage);
        chatbox.scrollTop = chatbox.scrollHeight;
    }
});
