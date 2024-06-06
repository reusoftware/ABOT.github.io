document.addEventListener('DOMContentLoaded', () => {
    let socket;
    let isConnected = false;
    let packetIdNum = 0;
    let sendWelcomeMessages = false;

    const loginButton = document.getElementById('loginButton');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const searchImageButton = document.getElementById('searchImageButton');
    const statusDiv = document.getElementById('status');
    const chatbox = document.getElementById('chatbox');
    const welcomeCheckbox = document.getElementById('welcomeCheckbox');
    const roomListbox = document.getElementById('roomListbox');
    const userListDiv = document.getElementById('userList');
    const debugBox = document.getElementById('debugBox'); // Debug box to display received messages

    loginButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await connectWebSocket(username, password);
    });

    joinRoomButton.addEventListener('click', async () => {
        const room = document.getElementById('room').value;
        await joinRoom(room);
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
            await sendMessageToSocket(loginMessage);

            // Fetch public rooms
            await fetchPublicRooms();
        };

        socket.onmessage = (event) => {
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

            // Fetch user list
            await fetchUserList(roomName);
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
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

    async function sendMessageToSocket(message) {
        if (isConnected && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        } else {
            statusDiv.textContent = 'WebSocket is not open';
        }
    }

    function generatePacketID() {
        packetIdNum += 1;
        return `R.U.BULAN©pinoy-2023®#${packetIdNum.toString().padStart(3, '0')}`;
    }

    function processReceivedMessage(message) {
        debugBox.value += `${message}\n`; // Add message to the debug box for inspection

        try {
            const jsonDict = JSON.parse(message);

            if (jsonDict) {
                const handler = jsonDict.handler;

                if (handler === 'login_event') {
                    handleLoginEvent(jsonDict);
                } else if (handler === 'room_event') {
                    handleRoomEvent(jsonDict);
                } else if (handler === 'chat_message') {
                    handleChatMessage(jsonDict);
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
                } else if (handler === 'receipt_ack') {
                    onChatMessageSent(jsonDict.id, parseInt(jsonDict.timestamp, 10));
                }
            }
        } catch (ex) {
            console.error('Error processing received message:', ex);
        }
    }

    function handleLoginEvent(messageObj) {
        const status = messageObj.type;
        if (status === 'success') {
            statusDiv.textContent = 'Login successful!';
        } else if (status === 'failed') {
            const reason = messageObj.reason;
            statusDiv.textContent = `Login failed: ${reason}`;
        }
    }

    function handleRoomEvent(messageObj) {
        const type = messageObj.type;
        const userName = messageObj.user || 'Unknown'; // Fallback to 'Unknown' if user is undefined

        if (type === 'you_joined') {
            sendMessage(`Welcome! I'm a welcome bot running on the web`);
            statusDiv.textContent = `You joined the room: ${messageObj.name}`;
        } else if (type === 'user_joined') {
            if (sendWelcomeMessages) {
                sendMessage(`Welcome to the room!`);
            }
            displayChatMessage({ sender: 'System', message: `${userName} joined the room.` });
        } else if (type === 'user_left') {
            displayChatMessage({ sender: 'System', message: `${userName} left the room.` });
        }
    }

    function handleChatMessage(messageObj) {
        if (messageObj.type !== 'state' && messageObj.type !== 'seen' && messageObj.type !== 'delivery') {
            displayChatMessage({ sender: messageObj.sender, message: messageObj.body });
        }
    }

    function handleMucEvent(messageObj) {
        if (messageObj.type === 'room_create') {
            if (messageObj.result === 'success') {
                joinRoom(messageObj.name);
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
        const messageDiv = document.createElement('div');
        messageDiv.textContent = `${messageObj.sender}: ${messageObj.message}`;
        chatbox.appendChild(messageDiv);
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    async function fetchPublicRooms() {
        if (isConnected) {
            const fetchRoomsMessage = {
                handler: 'fetch_rooms',
                id: generatePacketID()
            };
            await sendMessageToSocket(fetchRoomsMessage);
        }
    }

    async function fetchUserList(roomName) {
        if (isConnected) {
            const fetchUsersMessage = {
                handler: 'fetch_users',
                id: generatePacketID(),
                room: roomName
            };
            await sendMessageToSocket(fetchUsersMessage);
        }
    }

    function updateRoomList(rooms) {
        roomListbox.innerHTML = '';
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room;
            option.textContent = room;
            roomListbox.appendChild(option);
        });
    }

    function updateUserList(users) {
        userListDiv.innerHTML = '';
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.textContent = user;
            userListDiv.appendChild(userDiv);
        });
    }

    function onUserProfileUpdates(userStatus) {
        // Handle user profile updates
    }

    function onMucInvitation(inviter, name, privacy) {
        // Handle MUC (Multi-User Chat) invitation
    }

    function onUserPresence(userPresence) {
        // Handle user presence changes
    }

    function onUserActivityResult(userActivity) {
        // Handle user activity results
    }

    function onRoster(roster) {
        // Handle roster updates
    }

    function onFriendRequest(friendRequest) {
        // Handle friend requests
    }

    function handleRegisterEvent(messageObj) {
        const status = messageObj.type;
        if (status === 'success') {
            statusDiv.textContent = 'Registration successful!';
        } else {
            const reason = messageObj.reason;
            if (reason === 'user_exists') {
                statusDiv.textContent = 'User already exists.';
            } else if (reason === 'error_non_latin_name') {
                statusDiv.textContent = 'Non-Latin characters are not allowed.';
            } else if (reason === 'limit_reached') {
                statusDiv.textContent = 'User limit reached.';
            } else {
                statusDiv.textContent = 'Registration error.';
            }
        }
    }

    function onGetUserProfile(profile) {
        // Handle getting user profile
    }

    function onChatMessageSent(id, timestamp) {
        // Handle message sent acknowledgment
    }
});
