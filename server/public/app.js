const socket = io()

const messageInput = document.querySelector("#message")
const nnameInput = document.querySelector("#nickname")
const prroomInput = document.querySelector("#private-room")
const action = document.querySelector(".current_action")
const usList = document.querySelector(".user-list")
const roomList = document.querySelector(".room-list")
const chatDis = document.querySelector(".chat-dis")

function sendMessage(e) {
    e.preventDefault()


    if (nnameInput.value && messageInput.value && prroomInput.value) {
        socket.emit("message", {
            nickname: nnameInput.value,
            text: messageInput.value
        })
        messageInput.value = ''
    }
    messageInput.focus()
}

function enterRoom(e) {
    e.preventDefault()

    if (nnameInput.value && prroomInput.value) {
        socket.emit("entrRoom", {
            nickname: nnameInput.value,
            room: prroomInput.value
        })
    }
}

document.querySelector('.form-message').addEventListener('submit', sendMessage)
document.querySelector('.form-join').addEventListener('submit', enterRoom)

messageInput.addEventListener('keypress', () =>{ 
    socket.emit("action", nnameInput.value)
})

//Listener for messages

socket.on('message', (data) => {
    action.textContent = ""
    const {nickname, text, time} = data
    const li = document.createElement('li')
    li.className = 'post'
    if (nickname === nnameInput.value) li.className = 'post post--left'
    if (nickname !== nnameInput.value && nickname !== "Admin") li.className = 'post post--right'
    if (nickname !== 'Admin'){
        li.innerHTML = `<div class = "post__header ${nickname === nnameInput.value ? 'post__header--user' : 'post__header--reply'}">
        <span class ="post__header--name">${nickname}</span>
        <span class ="post__header--time">${time}</span>
        </div>
        <div class ="post__text">${text}</div>`
    } else {
        li.innerHTML = `<div class ="post__text">${text}</div>`
    }
    document.querySelector('.chat-dis').appendChild(li)

    chatDis.scrollTop = chatDis.scrollHeight
})

let actionTimer;
socket.on('action', (nickname) => {
    action.textContent = `${nickname} is typing...`

    clearTimeout(actionTimer)
    actionTimer = setTimeout(() => {
        action.textContent = ''
    }, 2000)
})

socket.on('userList', ({users}) => {
    showUsers(users)
})
socket.on('roomList', ({rooms}) => {
    showRooms(rooms)
})

function showUsers(users = Array) {
    usList.textContent = ''
    if (users) {
        usList.innerHTML = `<em>Users are in a ${prroomInput.value}:</em>`
        users.forEach((user, i) => {
            usList.textContent += ` ${user.nickname}`
            if (users.length > 1 && i !== users.length - 1) {
                usList.textContent += ','
            }
        })
    }
}

function showRooms(rooms = Array) {
    roomList.textContent = ''
    if (rooms) {
        roomList.innerHTML = `<em>Active Rooms:</em>`
        rooms.forEach((room, i) => {
            roomList.textContent += ` ${room}`
            if (rooms.length > 1 && i !== rooms.length - 1) {
                roomList.textContent += ','
            }
        })
    }
}