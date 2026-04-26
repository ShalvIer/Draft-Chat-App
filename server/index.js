import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url) 
const __dirname = path.dirname(__filename)
//We goota use it due to the type: module

const PORT = process.env.PORT || 3500
const ADMIN = "Admin"

const app = express()

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on a port ${PORT}`)
})

// State for users

const StateUsers = {
    'users': [],
    'setUsers': function(newUsersArray) {
        this.users = newUsersArray
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})

io.on('connection', socket => {
    console.log(`User ${socket.id} connected!`)

    // Upon connection - only for user
    socket.emit('message', messageBuilder(ADMIN, "Welcome to the Chat app!"))

    socket.on('entrRoom', ({nickname, room}) => {
        // leave the prev room
        const prevRoom = getUser(socket.id)?.room

        if (prevRoom) {
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', messageBuilder(ADMIN, `${nickname} has left the room!`))
        }
        const user = activateUser(socket.id, nickname, room)

        //have to update the state in active user before the prev room users list
        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: usersToRoom(prevRoom)
            })
        }

        // join room
        socket.join(user.room)

        // The joined User msg
        socket.broadcast.to(user.room).emit('message', messageBuilder(ADMIN, `${user.nickname} has joined the room!`))

        //To those who joined
        socket.emit('message', messageBuilder(ADMIN, `You've joined the ${user.pr_room} chatroom!`))

        //To others
        socket.broadcast.to(user.pr_room).emit('message', messageBuilder(ADMIN, `${user.nickname} has joined the room!`))

        //Update the userlist

        io.to(user.pr_room).emit('userList', {
            users: usersToRoom(user.pr_room)
        })

        //Upddate rooms list for all

        io.emit('roomList', {
            rooms: getAllActiveRooms()
        }) 
    })

    //When the user disconects the message goes to all others
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeaves(socket.id);
    
        // FIX: Check if 'user' actually exists before using it
        if (user) {
            io.to(user.room).emit('message', messageBuilder(ADMIN, `${user.nickname} has left the room!`));
    
            io.to(user.room).emit('userList', {
                users: usersToRoom(user.room)
            });
    
            io.emit('roomList', {
                rooms: getAllActiveRooms()
            });
    
            console.log(`User ${user.nickname} has disconnected!`);
        } else {
            // If user is undefined, they never joined a room—just log the socket ID
            console.log(`Socket ${socket.id} disconnected before joining a room.`);
        }
    });

    // Listening for an event
    socket.on('message', ({nickname, text}) => {
        const room = getUser(socket.id)?.room
        if (room) {
             io.to(room).emit('message', messageBuilder(nickname, text))
        }
    })

    //Listen for the action

    socket.on("action", (nickname) => {
        const room = getUser(socket.id)?.room
        if (room) {
            socket.broadcast.to(room).emit('action', nickname)
        }
    })
})

function messageBuilder(nickname, text) {
    return {
        nickname,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

// User func's

function activateUser(id, nickname, room) {
    const user = {id, nickname, room}
    StateUsers.setUsers([
        ...StateUsers.users.filter(user => user.id !== id),
        user
    ])
    return user
}

function userLeaves(id) {
    StateUsers.setUsers(
        StateUsers.users.filter(user => user.id !== id)
    )
}

function getUser(id) {
    return StateUsers.users.find(user => user.id === id)
}

function usersToRoom(room) {
    return StateUsers.users.filter(user => user.room === room)
}

function getAllActiveRooms() {
    return Array.from(new Set (StateUsers.users.map(user => user.room)))
}