document.addEventListener('DOMContentLoaded', () => {
    let socket;
    let isConnected = false;
    let packetIdNum = 0;

    const loginButton = document.getElementById('loginButton');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const searchImageButton = document.getElementById('searchImageButton');
    const statusDiv = document.getElementById('status');
    const chatDiv = document.getElementById('chat');

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

    async function connectWebSocket(username, password) {
        socket = new WebSocket('wss://chatp.net:5333/server');

        socket.onopen = async () => {
            isConnected = true;
            statusDiv.textContent = 'Connected to server';

            // Login
            const loginMessage = {
                username: username,
                password: password,
                handler: 'login',
                id: generatePacketID()
            };
            await sendMessageToSocket(loginMessage);
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
        console.log('Received:', message);
        // Add your logic to handle incoming messages here
    }

    async function searchImage(searchTerm) {
        const apiKey = 'AIzaSyCnrx2oyApKgdDrzWuvmzPMI6MdrBl9jaQ';
        const cx = '844d92c4759c04be2';
        const requestUrl = `https://www.googleapis.com/customsearch/v1?q=${searchTerm}&cx=${cx}&searchType=image&key=${apiKey}`;

        try {
            const response = await fetch(requestUrl);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const imageUrl = data.items[0].link;
                document.getElementById('imageResult').src = imageUrl;
            }
        } catch (error) {
            console.error('Error searching image:', error);
        }
    }
});
