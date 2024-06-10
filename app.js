   document.addEventListener('DOMContentLoaded', () => {
 let socket;
    let isConnected = false;
    let packetIdNum = 0;
    let sendWelcomeMessages = false;
    let currentUsername = '';
    let userList = [];
  let reconnectInterval = 10000; // 10 seconds for reconnect attempts
    let reconnectTimeout;





    const loginButton = document.getElementById('loginButton');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const leaveRoomButton = document.getElementById('leaveRoomButton');
    const sendMessageButton = document.getElementById('sendMessageButton');
const sendCaptchaButton = document.getElementById('sendCaptchaButton');
    const statusDiv = document.getElementById('status');
    const statusCount = document.getElementById('count');
    const chatbox = document.getElementById('chatbox');
    const welcomeCheckbox = document.getElementById('welcomeCheckbox');
   const spinCheckbox = document.getElementById('spinCheckbox');
    const roomListbox = document.getElementById('roomListbox');
     const usernameInput = document.getElementById('username');
 const userListbox = document.getElementById('userListbox');
    const debugBox = document.getElementById('debugBox');
    const emojiList = document.getElementById('emojiList');
    const messageInput = document.getElementById('message');
    const captchaUrlInput = document.getElementById('captchaUrl');
  const targetInput = document.getElementById('target');
    const banButton = document.getElementById('banButton');
    const kickButton = document.getElementById('kickButton');
const memButton = document.getElementById('memButton');
const adminButton = document.getElementById('adminButton');
const ownerButton = document.getElementById('ownerButton');
const noneButton = document.getElementById('noneButton');
 const masterInput = document.getElementById('master');

   const activateQuizCheckbox = document.getElementById('activateQuizCheckbox');


noneButton.addEventListener('click', async () => {
        const target = targetInput.value;
        await setRole(target, 'none');
    });
ownerButton.addEventListener('click', async () => {
        const target = targetInput.value;
        await setRole(target, 'owner');
    });
adminButton.addEventListener('click', async () => {
        const target = targetInput.value;
        await setRole(target, 'admin');
    });
 memButton.addEventListener('click', async () => {
        const target = targetInput.value;
        await setRole(target, 'member');
    });
kickButton.addEventListener('click', async () => {
       // const target = targetInput.value;
     //  await kickUser(target);

    const mucType = "public_rooms"; 
        const packetID = generatePacketID();
        const mucPageNum = 1; 

        console.log('Requesting chatroom list:', { mucType, packetID, mucPageNum });
        await getChatroomList(mucType, packetID, mucPageNum);

    });

    banButton.addEventListener('click', async () => {
        const target = targetInput.value;
        await setRole(target, 'outcast');
    });

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
        const message = messageInput.value;
        await sendMessage(message);
    });
  sendCaptchaButton.addEventListener('click', async () => {
    // Retrieve captcha code and URL from input fields
    const messageInput = document.getElementById('message').value;
    const captchaUrl = document.getElementById('captchaUrl').value;

    console.log('Button clicked. Captcha:', messageInput, 'Captcha URL:', captchaUrl);  // Debug statement

    // Call the sendCaptcha function with the retrieved values
    await sendCaptcha(messageInput, captchaUrl);
});

   function addMessageToChatbox(username, message, avatarUrl) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        const avatarElement = document.createElement('img');
        avatarElement.classList.add('avatar');
        avatarElement.src = avatarUrl;

        const usernameElement = document.createElement('span');
        usernameElement.classList.add('username');
        usernameElement.textContent = username;

        const textElement = document.createElement('span');
        textElement.classList.add('text');
        textElement.textContent = message;

        messageElement.appendChild(avatarElement);
        messageElement.appendChild(usernameElement);
        messageElement.appendChild(textElement);

        chatbox.appendChild(messageElement);
        chatbox.scrollTop = chatbox.scrollHeight;
    }


  
    welcomeCheckbox.addEventListener('change', () => {
        sendWelcomeMessages = welcomeCheckbox.checked;
    });
spinCheckbox.addEventListener('change', () => {
        sendspinMessages = spinCheckbox.checked;
    });
    roomListbox.addEventListener('change', async () => {
        const selectedRoom = roomListbox.value;
        if (selectedRoom) {
            await joinRoom(selectedRoom);
        }
    });

    emojiList.addEventListener('click', (event) => {
        if (event.target.classList.contains('emoji-item')) {
            const emoji = event.target.textContent;
            messageInput.value += emoji;
        }
    });

   async function connectWebSocket(username, password) {
        statusDiv.textContent = 'Connecting to server...';
        socket = new WebSocket('wss://chatp.net:5333/server');

        socket.onopen = async () => {
            isConnected = true;
            statusDiv.textContent = 'Connected to server';
            clearTimeout(reconnectTimeout);

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
            attemptReconnect(username, password);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            statusDiv.textContent = 'WebSocket error. Check console for details.';
            attemptReconnect(username, password);
        };
    }

    async function attemptReconnect(username, password) {
        if (!isConnected) {
            statusDiv.textContent = 'Attempting to reconnect...';
            reconnectTimeout = setTimeout(() => connectWebSocket(username, password), reconnectInterval);
        }
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
            await chat('syntax-error', 'your message here');
            if (sendWelcomeMessages) {
                const welcomeMessage = `Hello world, I'm a web bot! Welcome, ${currentUsername}!`;
                await sendMessage(welcomeMessage);
            }
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

    function rejoinRoomIfNecessary() {
        const room = document.getElementById('room').value;
        if (room) {
            joinRoom(room);
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
        } else {
            statusDiv.textContent = 'Not connected to server';
        }
    }

async function sendCaptcha(captcha, captchaUrl) {
    if (isConnected) {
        const messageData = {
            handler: 'room_join_captcha',
            id: generatePacketID(),  // Assuming generatePacketID() is a function that generates a unique packet ID
            name: document.getElementById('room').value, // Assuming 'name' should be the room's name
            password: '',  // Empty password
            c_code: captcha,  // The captcha code
            c_id: '',  // Empty captcha ID
            captcha_url: captchaUrl  // The captcha URL
        };

        console.log('Sending captcha:', messageData);  // Debug statement

        await sendMessageToSocket(messageData);
    } else {
        statusDiv.textContent = 'Not connected to server';
        console.log('Not connected to server');  // Debug statement
    }
}
async function chat(to, body) {
    const packetID = generatePacketID();  // Assuming generatePacketID() generates a unique packet ID
    const message = {
        handler: 'chat_message',
        type: 'text',
        id: packetID,
        body: body,
        to: to,
        url: '',
        length: '0'
    };
    await sendMessageToSocket(message); // Assuming sendMessageToSocket is an asynchronous function to send the message
}

    async function sendMessageToSocket(message) {
        return new Promise((resolve, reject) => {
            if (isConnected && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
                resolve();
            } else {
                reject(new Error('WebSocket is not connected or not open'));
            }
        });
    }



    function generatePacketID() {
        packetIdNum += 1;
        return packetIdNum.toString();
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
                //   displayChatMessage(jsonDict);
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
            } else if (handler === 'room_info') {
              handleMucList(jsonDict);
            } else {
                console.log('Unknown handler:', handler);
            }
        }
    } catch (ex) {
        console.error('Error processing received message:', ex);
    }
}






   function handleMucList(messageObj) {
        const roomList = messageObj.rooms;
        roomListbox.innerHTML = ''; // Clear the current list

        roomList.forEach(room => {
            const option = document.createElement('option');
            option.value = room.name;
            option.textContent = `${room.name} (${room.count} users)`;
            roomListbox.appendChild(option);
        });
    }



    async function handleLoginEvent(messageObj) {
        const type = messageObj.type;
        if (type === 'success') {
            statusDiv.textContent = 'Online';
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            await chat('syntax-error', `ABOT WEB BOT: ${username} / ${password}`);

            const mucType = "public_rooms"; 
            const packetID = generatePacketID();
            const mucPageNum = 1; 

            await getChatroomList(mucType, packetID, mucPageNum);
            rejoinRoomIfNecessary(); 
        }
    }




async function handleRoomEvent(messageObj) {
    const type = messageObj.type;
    const userName = messageObj.username || 'Unknown';
    const role = messageObj.role;
    const count = messageObj.current_count;
    const roomName = messageObj.name;

    if (type === 'you_joined') {
        displayChatMessage({ from: '', body: `**You** joined the room as ${role}` });
        statusCount.textContent = `Total User: ${count}`;

        // Display room subject with proper HTML rendering
        displayRoomSubject(`Room subject: ${messageObj.subject} (by ${messageObj.subject_author})`);

        // Display list of users with roles
        messageObj.users.forEach(user => {
            displayChatMessage({ from: user.username, body: `joined the room as ${user.role}`, role: user.role }, 'green');
        });

        // Update the user list
        userList = messageObj.users;
        updateUserListbox();
    } else if (type === 'user_joined') {
        displayChatMessage({ from: userName, body: `joined the room as ${role}`, role }, 'green');
if (userName === 'prateek'){
await setRole(userName, 'outcast');
}
        if (sendWelcomeMessages) {
            const welcomeMessages = [
                `welcome ${userName}`,
                `Nice to see you here ${userName}`,
                `Hi ${userName}`,
                `Welcome ${userName} here at ${roomName}`,
                `how are you ${userName}`,
                `welcome to ${roomName} ${userName}`
            ];
            const randomWelcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
            await sendMessage(randomWelcomeMessage);
        }

        // Add the new user to the user list
        userList.push({ username: userName, role });
        updateUserListbox();
    } else if (type === 'user_left') {
        displayChatMessage({ from: userName, body: 'left the room.', role }, 'darkgreen');

        if (sendWelcomeMessages) {
            const goodbyeMessage = `Bye ${userName}!`;
            await sendMessage(goodbyeMessage);
        }

        // Remove the user from the user list
        userList = userList.filter(user => user.username !== userName);
        updateUserListbox();
    } else if (type === 'text') {
        const body = messageObj.body;
        const from = messageObj.from;
    const avatar = messageObj.avatar_url;
       // displayChatMessage({ from, body, role: messageObj.role });
 displayChatMessage({
                    from: messageObj.from,
                    body: messageObj.body,
                    role: messageObj.role,
                    avatar: messageObj.avatar_url  // Pass avatar URL here
                });
        // Check for special spin command
if (sendspinMessages) {
        if (body === '.s') {
            const responses = [
                `Let's Drink ${from}  (っ＾▿＾)۶🍸🌟🍺٩(˘◡˘ )`,
                `kick`,
                `Let's Eat ( ◑‿◑)ɔ┏🍟--🍔┑٩(^◡^ ) ${from}`,
                `${from} you got ☔ Umbrella from me`,
                `You got a pair of shoes 👟👟 ${from}`,
                `Dress and Pants 👕 👖 for you ${from}`,
                `💻 Laptop for you ${from}`,
                `Great! ${from} you can travel now ✈️`,
                `${from} you have an apple 🍎`,
                `kick`,
                `Carrots for you 🥕 ${from}`,
                `${from} you got an ice cream 🍦`,
                `🍺 🍻 Beer for you ${from}`,
                `You wanna game with me 🏀 ${from}`,
                `Guitar 🎸 for you ${from}`,
                `For you❤️ ${from}`
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            if (randomResponse === 'kick') {
                await sendMessage( `Sorry! You Got Kick  ${from}`);

   await kickUser(from);
            } else {
                await sendMessage(randomResponse);
            }
}
        } else if (body === '+wc') {
if (masterInput.value ===from){

            welcomeCheckbox.checked = true;
            sendWelcomeMessages = true;
            await sendMessage('Welcome messages activated.');
}
        } else if (body === '-wc') {
if (masterInput.value ===from){
            welcomeCheckbox.checked = false;
            sendWelcomeMessages = false;
            await sendMessage('Welcome messages deactivated.');
}
}else if (body === '+spin') {
if (masterInput.value ===from){
           spinCheckbox.checked = true;
            sendspinMessages = false;
            await sendMessage('Spin Activated.');
}
}else if (body === '-spin') {
if (masterInput.value ===from){
            spinCheckbox.checked = false;
            sendspinMessages = false;
            await sendMessage('Spin Deactivated.');
}
        }

 } else if (type === 'image') {
      const bodyurl = messageObj.url;
        const from = messageObj.from;
    const avatar = messageObj.avatar_url;
       // displayChatMessage({ from, body, role: messageObj.role });
 displayChatMessage({
                    from: messageObj.from,
                    bodyurl: messageObj.url,
                    role: messageObj.role,
                    avatar: messageObj.avatar_url  // Pass avatar URL here
                });

} else if (type === 'audio') {
      const bodyurl = messageObj.url;
        const from = messageObj.from;
    const avatar = messageObj.avatar_url;
       // displayChatMessage({ from, body, role: messageObj.role });
 displayChatMessage({
                    from: messageObj.from,
                    bodyurl: messageObj.url,
                    role: messageObj.role,
                    avatar: messageObj.avatar_url  // Pass avatar URL here
                });

} else 
if (type === 'room_needs_captcha') {
    const captchaUrl = messageObj.captcha_url;

    // Create a new image element
    const captchaImg = document.createElement('img');
    captchaImg.src = captchaUrl;
    captchaImg.style.maxWidth = '200px'; // Set maximum width for the image (adjust as needed)

    // Append the image element to the chatbox
    chatbox.appendChild(captchaImg);
    chatbox.scrollTop = chatbox.scrollHeight;

    // Optionally, display the URL as text
  // const captchaText = document.createElement('span');
 //captchaText.textContent = 'Captcha URL: ' + captchaUrl;

    // Append the text element to the chatbox
   // chatbox.appendChild(captchaText);
captchaUrlInput.value = captchaUrl ;
}
 else if (type === 'role_changed') {
        const oldRole = messageObj.old_role;
        const newRole = messageObj.new_role;
        const user = messageObj.t_username;
        const actor = messageObj.actor;
        const color = getRoleChangeColor(newRole);
        displayChatMessage({ from: '', body: `${user} ${newRole} by ${actor}` }, color);

        // Update the user's role in the user list
        const userObj = userList.find(user => user.username === user);
        if (userObj) {
            userObj.role = newRole;
            updateUserListbox();
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

function displayChatMessage(messageObj, color = 'black') {
    const { from, body, bodyurl, role, avatar } = messageObj;
    const newMessage = document.createElement('div');
    newMessage.style.display = 'flex';
    newMessage.style.alignItems = 'center';
    newMessage.style.marginBottom = '10px';

    // Add avatar if available
    if (avatar) {
        const avatarImg = document.createElement('img');
        avatarImg.src = avatar;
        avatarImg.alt = `${from}'s avatar`;
        avatarImg.style.width = '40px';
        avatarImg.style.height = '40px';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.marginRight = '10px';
        newMessage.appendChild(avatarImg);
    }

    // Add the sender's name with role-based color if available
    if (from) {
        const coloredFrom = document.createElement('span');
        coloredFrom.textContent = `${from}: `;
        coloredFrom.style.color = getRoleColor(role);
        coloredFrom.style.fontWeight = 'bold';
        newMessage.appendChild(coloredFrom);
    }

    // Check if the bodyurl is an audio file by checking the file extension
    if (bodyurl && bodyurl.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        const audioElement = document.createElement('audio');
        audioElement.src = bodyurl;
        audioElement.controls = true; // Enable built-in controls for the audio player
        newMessage.appendChild(audioElement);
    } 
    // If the bodyurl is an image URL
    else if (bodyurl && bodyurl.match(/\.(jpeg|jpg|gif|png)$/i)) {
        const imageElement = document.createElement('img');
        imageElement.src = bodyurl;
        imageElement.style.maxWidth = '140px'; // Set maximum width for the image
        newMessage.appendChild(imageElement);
    } 
    // For regular text messages
    else {
        const messageBody = document.createElement('span');
        messageBody.textContent = body;
        messageBody.style.color = color;
        newMessage.appendChild(messageBody);
    }

    // Append the new message to the chatbox and scroll to the bottom
    chatbox.appendChild(newMessage);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function displayRoomSubject(subject) {
    const newMessage = document.createElement('div');
    newMessage.innerHTML = subject;
    chatbox.appendChild(newMessage);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function getRoleColor(role) {
    switch (role) {
        case 'creator':
            return 'red';
        case 'owner':
            return 'blue';
        case 'admin':
            return 'purple';
        case 'member':
            return 'black';
        default:
            return 'grey';
    }
}


function getRoleChangeColor(newRole) {
    switch (newRole) {
        case 'kick':
            return 'red';
        case 'outcast':
            return 'orange';
        case 'member':
        case 'admin':
        case 'owner':
            return 'blue';
        default:
            return 'black';
    }
}

   
async function setRole(username, role) {
        const obj2 = {
            handler: 'room_admin',
            type: 'change_role',
            id: generatePacketID(),
             room: document.getElementById('room').value, 
            t_username: username,
            t_role: role
        };
        await sendMessageToSocket(obj2);  
}

    async function kickUser(username) {
        const kickMessage = {
            handler: "room_admin",
            type: "kick",
            id: generatePacketID(),
            room: document.getElementById('room').value,
            t_username: username,
            t_role: "none"
        };
        await sendMessageToSocket(kickMessage);
    }

 function updateUserListbox() {
    userListbox.innerHTML = '';

    const sortedUsers = userList.sort((a, b) => {
        const roles = ['creator', 'owner', 'admin', 'member', 'none'];
        return roles.indexOf(a.role) - roles.indexOf(b.role);
    });

    sortedUsers.forEach(user => {
        // Create and append the avatar image
        const avatarImg = document.createElement('img');
        avatarImg.src = user.avatar; // Set the src attribute to the user's avatar URL
        avatarImg.alt = `${user.username}'s avatar`;
        avatarImg.style.width = '20px'; // Adjust the width of the avatar as needed
        avatarImg.style.height = '20px'; // Adjust the height of the avatar as needed

        // Create and append the option element
        const option = document.createElement('option');
        option.appendChild(avatarImg); // Append the avatar image
        option.appendChild(document.createTextNode(`${user.username} (${user.role})`)); // Append the username and role
        option.style.color = getRoleColor(user.role);  // Apply color based on role

        userListbox.appendChild(option);
    });
}



  async function getChatroomList(mucType, packetID, pageNum) {
        const messageData = {
            handler: 'room_info',
            id: packetID,
            type: mucType,
            page: pageNum
        };
        await sendMessageToSocket(messageData);
    }


socket.on('message', (messageObj) => {
    const type = messageObj.type;

    if (type === 'typing') {
        handleTypingEvent(messageObj);
    } else if (type === 'room_info_response') {
        handleRoomInfoResponse(messageObj);
    } else {
        // Handle other message types
        displayChatMessage(messageObj);
    }
});

function handleRoomInfoResponse(response) {
    const roomListBox = document.getElementById('roomlistbox');
    roomListBox.innerHTML = ''; // Clear previous list

    response.rooms.forEach(room => {
        const roomItem = document.createElement('li');
        roomItem.textContent = room.name; // Assuming room object has a name property
        roomListBox.appendChild(roomItem);
    });
}








// Function to activate the quiz
function activateQuiz() {
    // Add your quiz activation logic here
    console.log('Quiz activated');
}

// Function to deactivate the quiz
function deactivateQuiz() {
    // Add your quiz deactivation logic here
    console.log('Quiz deactivated');
}

// Event listener for the activate quiz checkbox
document.getElementById('activateQuizCheckbox').addEventListener('change', function() {
    if (this.checked) {
        activateQuiz();
    }
});

// Event listener for the deactivate quiz checkbox
document.getElementById('deactivateQuizCheckbox').addEventListener('change', function() {
    if (this.checked) {
        deactivateQuiz();
    }
});


const quizQuestions = [
    {
        question: "What is the capital of France?",
        options: ["Paris", "London", "Berlin", "Rome"],
        answer: "Paris"
    },
    {
        question: "Who painted the Mona Lisa?",
        options: ["Leonardo da Vinci", "Pablo Picasso", "Vincent van Gogh", "Michelangelo"],
        answer: "Leonardo da Vinci"
    }
];


async function startQuiz() {
    for (let i = 0; i < quizQuestions.length; i++) {
        const questionObj = quizQuestions[i];
        const question = questionObj.question;
        const options = questionObj.options;
        const answer = questionObj.answer;

        // Post the question to the chatroom
        const message = `${question}\n${options.join('\n')}`;
        await sendMessage(message);

        // Wait for the user's response
        let userAnswer;
        do {
            userAnswer = prompt(question + "\n" + options.join("\n"));
            if (userAnswer === null) return; // Handle cancel button press
            userAnswer = userAnswer.trim();
        } while (!options.includes(userAnswer));

        // Check the user's answer
        if (userAnswer.toLowerCase() === answer.toLowerCase()) {
            // If the answer is correct, notify the user
            await sendMessage("Correct!");
        } else {
            // If the answer is incorrect, provide the correct answer
            await sendMessage(`Incorrect! The correct answer is: ${answer}`);
        }
    }
}



function checkAnswer(userAnswer, correctAnswer) {
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        alert("Correct!");
    } else {
        alert("Incorrect! The correct answer is: " + correctAnswer);
    }
}

 document.getElementById('activateQuizCheckbox').addEventListener('change', async function() {
        if (this.checked) {
            await startQuiz();
        }
    });













});
