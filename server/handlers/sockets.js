import userAuth from './auth.js'
import lang from '../lang.js'
import colors from '../colors.js'

const roomsData = new Map([
  ['connections', new Map()], // socketId: userId
  ['users', new Map()], // userId: userData
  ['userConns', new Map()], // userId: [ socketId,... ]
  ['rooms', new Map()], // roomId: [ socketId,... ]
  ['userRooms', new Map()], // socketId: [ roomId,... ]
  ['activeRoom', new Map()], // socketId: roomId
  ['sockets', new Map()], //socketId: socket
])

const pushData = (key, index, value) => {
  const obj = roomsData.get(key)
  let data = !obj.has(index) ? [] : obj.get(index)
  data.push(value)// = true
  obj.set(index, data)
}

const useSocket = (socket, db) => {

  if (!roomsData.get('sockets').has(socket.id)) roomsData.get('sockets').set(socket.id, socket)

  socket.on('USER:AUTH', async data => {
    //console.log('USER:AUTH', data)
    const userData = await userAuth(data.authCode)
    userData.rooms = {}

    let roomsList = {}
    roomsList['all'] = {
      name: lang.commonChat,
      avatar: false,
      color: '#000000',
      type: 'group',
    }

    let queryLastMsg = await db.awaitQuery(
      'SELECT * FROM `messages` WHERE `roomID` = ? ORDER BY `id` DESC LIMIT 0,1',
      ['all']
    )
    
    if (queryLastMsg && queryLastMsg[0]) {
      roomsList['all'].lastMsgUser = queryLastMsg[0].userName
      roomsList['all'].lastMsgText = queryLastMsg[0].text.substr(0, 30)
      roomsList['all'].lastDate = queryLastMsg[0].timeStamp
    }

    let queryGetUser = await db.awaitQuery(
      'SELECT * FROM `users` WHERE `social` = ? AND (`email` = ? OR `login` = ?)',
      [data.social, userData.email, userData.login]
    )

    if (!queryGetUser[0]) {

      const userColor = colors[Math.floor(Math.random()*colors.length)]
      userData.rooms['3'] = true
      userData.rooms = JSON.stringify(userData.rooms)

      let queryInsertUser = await db.awaitQuery(
        'INSERT INTO `users` (`social`, `email`, `rooms`, `name`, `avatar`, `login`, `color`) \
        VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          data.social, 
          userData.email, 
          userData.rooms,
          userData.name, 
          userData.avatar, 
          userData.login, 
          userColor
        ]
      )

      userData.userId = queryInsertUser.insertId
      userData.color = userColor
    }
    else if (queryGetUser[0].id) {

      userData.userId = queryGetUser[0].id
      userData.color = queryGetUser[0].color
      userData.rooms = queryGetUser[0].rooms

      if (queryGetUser[0] && queryGetUser[0].rooms) { //join to rooms of this user
        const userRooms = JSON.parse(queryGetUser[0].rooms)

        const getRoomsList = async (roomsList, userRooms) => { 

          for (const roomId of Object.keys(userRooms)) {
            //console.log('roomId:', roomId)

            let querySelectRoom = await db.awaitQuery(
              'SELECT * FROM `rooms` WHERE `id` = ?',
              [roomId]
            )

            socket.join(roomId)

            if (querySelectRoom[0] && querySelectRoom[0].public) {
              socket.broadcast.to(roomId).emit('message', {
                action: 'USER:JOIN',
                userData,
                roomId
              })
            }

            pushData('userRooms', socket.id, roomId)
            pushData('rooms', roomId, socket.id)
  
            if (querySelectRoom[0] && querySelectRoom[0].id) {
  
              if (!querySelectRoom[0].public) {
  
                const users = JSON.parse(querySelectRoom[0].users)
                delete users[queryGetUser[0].id]
                //console.log('users:', users, Object.keys(users)[0])
                const chatUserId = Object.keys(users)[0]
                let querySelectUser = await db.awaitQuery(
                  'SELECT * FROM `users` WHERE `id` = ?',
                  [chatUserId]
                )

                if (querySelectUser[0] && querySelectUser[0].id) {
                  //console.log('user:', querySelectUser)
                  roomsList[roomId] = {
                    name: querySelectUser[0].login,
                    avatar: querySelectUser[0].avatar,
                    color: querySelectUser[0].color
                  }
                }
              }
              else {
                roomsList[roomId] = {
                  name: querySelectRoom[0].name,
                  avatar: querySelectRoom[0].avatar,
                  color: querySelectRoom[0].color,
                  type: 'group'
                }
              }

              let queryLastMsg = await db.awaitQuery(
                'SELECT * FROM `messages` WHERE `roomId` = ? ORDER BY `id` DESC LIMIT 0,1',
                [roomId]
              )

              if (queryLastMsg[0] && queryLastMsg[0].id) {

                if (querySelectRoom[0].public)
                  roomsList[roomId].lastMsgUser = queryLastMsg[0].userName
                else if (queryLastMsg[0].userId === queryGetUser[0].id)
                  roomsList[roomId].lastMsgUser = 'You'

                roomsList[roomId].lastMsgText = queryLastMsg[0].text.substr(0, 30)
                roomsList[roomId].lastDate = queryLastMsg[0].timeStamp
              }
            }
          }
        }

        await getRoomsList(roomsList, userRooms)
      }
      //console.log('roomsList:', roomsList)
      if (queryGetUser[0].name !== userData.name || 
        queryGetUser[0].avatar !== userData.avatar ||
        queryGetUser[0].email !== userData.email ||
        queryGetUser[0].login !== userData.login
        ) {

        db.awaitQuery(
          'UPDATE `users` SET `name` = ?, `avatar` = ?, `email` = ?, `login` = ? WHERE `id` = ?',
          [userData.name, userData.avatar, userData.email, userData.login, queryGetUser[0].id]
        )
      }
    }
    //console.log('USER:AUTH:', userData)
    socket.emit('message', {
      action: 'USER:AUTH',
      userData,
      roomsList
    })

    roomsData.get('connections').set(socket.id, userData.userId)
    roomsData.get('users').set(userData.userId, userData)
    
    pushData('userConns', userData.userId, socket.id)
    //console.log("users:", roomsData.get('users'))
  })

  socket.on('ROOM:JOIN', async data => {
    //console.log('ROOM:JOIN:', data)
    let joined = false
    let users = {}
    let messages = []
    let newRoom = {}

    if (!data.roomId) {

      const userId = roomsData.get('connections').get(socket.id)

      if (!data.userId || data.userId == userId) return false

      const userData = roomsData.get('users').get(userId)

      let queryRoomExists = await db.awaitQuery(
        'SELECT * FROM `rooms` WHERE `users` LIKE ? AND `users` LIKE ?',
        [ `%"${data.userId}"%`, `%"${userId}"%` ]
      )

      if (!queryRoomExists[0]) {

        let pvRoomUsers = {}
        pvRoomUsers[userId] = true
        pvRoomUsers[data.userId] = true
        let queryInsertRoom = await db.awaitQuery(
          'INSERT INTO `rooms` (`users`) VALUES (?)', [ JSON.stringify(pvRoomUsers) ]
        )
        data.roomId = queryInsertRoom.insertId
        data.newRoom = {}
      }
      else {
        data.roomId = queryRoomExists[0].id
      }
    }


    let queryGetRoom = await db.awaitQuery(
      'SELECT * FROM `rooms` WHERE `roomId` = ? OR `id` = ?',
      [data.roomId, data.roomId]
    )

    if (queryGetRoom[0] && queryGetRoom[0].id) {
      
      const userId = roomsData.get('connections').get(socket.id)

      if (!queryGetRoom[0].public) { //if room not public, check user access

        if (queryGetRoom[0].users) {
          let pvRoomUsers = JSON.parse(queryGetRoom[0].users)
          if (pvRoomUsers[userId]) joined = true
        }
      }
      else joined = true
      
      if (joined) {

        const getRoomMessages = async (messages, roomId) => {
          let queryGetMessages = await db.awaitQuery(
            'SELECT * FROM `messages` WHERE `roomId` = ? ORDER BY `id` DESC LIMIT 0,100',
            [roomId]
          )
          for (const msgId of Object.keys(queryGetMessages)) {
            messages[msgId] = queryGetMessages[msgId]
          }
        }
        await getRoomMessages(messages, data.roomId)
        
        const userData = roomsData.get('users').get(userId)
        userData.online = data.roomId
        roomsData.get('users').set(userData.userId, userData)

        const rooms = roomsData.get('rooms')
        //push client to room
        pushData('rooms', data.roomId, socket.id)

        //if room is public get users list
        if (queryGetRoom[0].public) {
          const roomUsers = rooms.get(data.roomId)
          //console.log("roomUsers:", roomUsers)
          Object.values(roomUsers).map(connId => {
            const userId = roomsData.get('connections').get(connId)
            //if (userData.userId != userId) {
              const user = roomsData.get('users').get(userId)
              users[userId] = user//.push(user)
            //}
          })
        }

        socket.broadcast.to(data.roomId).emit('message', {
          action: 'USER:JOIN',
          userData: queryGetRoom[0].public ? userData : false,
          roomId: data.roomId
        })

        roomsData.get('activeRoom').set(socket.id, data.roomId)
        //save client rooms
        pushData('userRooms', socket.id, data.roomId)

        socket.join(data.roomId)
        


        if (data.newRoom) {
          
          let pvRoomUsers = JSON.parse(queryGetRoom[0].users)
          delete pvRoomUsers[userId]
          data.userId = parseFloat(Object.keys(pvRoomUsers)[0])

          let pvUsersData = {}

          pvUsersData[userId] = roomsData.get('users').get(userId)
          pvUsersData[userId].rooms = JSON.parse(pvUsersData[userId].rooms)
          //console.log('pvUsersData:', pvUsersData)
          pvUsersData[userId].rooms[data.roomId] = true
          
          pvUsersData[data.userId] = roomsData.get('users').get(data.userId)
          pvUsersData[data.userId].rooms = JSON.parse(pvUsersData[data.userId].rooms)
          pvUsersData[data.userId].rooms[data.roomId] = true

          Object.keys(pvUsersData).map(userId => {
            const pvUserData = pvUsersData[userId]
            pvUserData.rooms = JSON.stringify(pvUserData.rooms)
            db.awaitQuery(
              'UPDATE `users` SET `rooms` = ? WHERE `id` = ?',
              [ pvUserData.rooms, userId ]
            )
            roomsData.get('users').set(userId, pvUserData)
          })
          
          let queryRoomUser = await db.awaitQuery(
            'SELECT * FROM `users` WHERE `id` = ?',
            [data.userId]
          )
          //console.log('queryRoomUser:', queryRoomUser)
          if (queryRoomUser[0]) {
            data.newRoom.name = queryRoomUser[0].login
            data.newRoom.avatar = queryRoomUser[0].avatar
            data.newRoom.color = queryRoomUser[0].color
          }
          //console.log('pvRoomUserId:', data.userId)

          const userConns = roomsData.get('userConns').get(data.userId)
          Object.keys(userConns).map(key => {
            const socketId = userConns[key]
            const socketB = roomsData.get('sockets').get(socketId)
            socketB.join(data.roomId)
          })
          //console.log('sockets:', roomsData.get('sockets'))
          socket.broadcast.to(data.roomId).emit('message', {
            action: 'ROOM:JOIN',
            users: queryGetRoom[0].public ? users : false,
            messages,
            roomId: data.roomId,
            newRoom: data.newRoom,
            noSwitch: true
          })
        }

        if (!queryGetRoom[0].public) {
          socket.broadcast.to(data.roomId).emit('message', {
            action: 'USER:ONLINE',
            roomId: data.roomId,
            online: data.roomId,
            privateRoom: true
          })
        }

        //console.log('ROOM:JOIN:', data)
        socket.emit('message', {
          action: 'ROOM:JOIN',
          users: queryGetRoom[0].public ? users : false,
          messages,
          roomId: data.roomId,
          newRoom: data.newRoom && data.newRoom
        })

        if (data.activeRoom) { //transition to another room
          socket.broadcast.to(data.activeRoom).emit('message', {
            action: 'USER:ONLINE',
            roomId: data.activeRoom,
            userId: userData.userId,
            online: false
          })

          if (userData.typing) {
            socket.broadcast.to(data.roomId).emit('message', {
              action: 'USER:TYPING',
              roomId: data.activeRoom,
              userId: userData.userId,
              off: true
            })
          }
        }
      }
    }
  })

  socket.on('USER:ONLINE', data => {
    //console.log("USER:ONLINE:", data)
    const userId = roomsData.get('connections').get(socket.id)
    const users = roomsData.get('users')
    const user = users.get(userId)

    if (!user) return false

    user.online = data.off ? false : data.roomId
    users.set(userId, user)

    socket.broadcast.to(data.roomId).emit('message', {
      action: 'USER:ONLINE',
      roomId: data.roomId,
      userId: userId,
      online: user.online,
      privateRoom: data.privateRoom
    })
  })

  socket.on('USER:TYPING', data => {
    //console.log("USER:TYPING:", data)
    const userId = roomsData.get('connections').get(socket.id)
    const users = roomsData.get('users')
    const user = users.get(userId)

    if (!user) return false

    user.typing = !data.off
    users.set(userId, user)

    socket.broadcast.to(data.roomId).emit('message', {
      action: 'USER:TYPING',
      roomId: data.roomId,
      userId: userId,
      off: !data.off,
      privateRoom: data.privateRoom
    })
  })

  socket.on('ROOM:NEW_MESSAGE', async data => {

    const userId = roomsData.get('connections').get(socket.id)
    const userData = roomsData.get('users').get(userId)
    const dateNow = new Date().getTime()
    const timeStamp = Math.floor(dateNow / 1000)
    const roomId = roomsData.get('activeRoom').get(socket.id)
    //console.log('ROOM:NEW_MESSAGE', data.text, userData.login)

    let queryInsertMessage = await db.awaitQuery(
      'INSERT INTO `messages` (`roomId`, `userId`, `text`, `timeStamp`, `userName`, `avatar`, `color`) \
      VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        roomId,
        userId,
        data.text,
        timeStamp,
        userData.login,
        userData.avatar,
        userData.color,
      ]
    )

    if (queryInsertMessage.insertId) {

      const querySelectRoom = async () => {
        return await db.awaitQuery(
          'SELECT * FROM `rooms` WHERE `roomId` = ? OR `id` = ?',
          [roomId, roomId]
        )
      }
      
      let queryGetRoom = await querySelectRoom()

      const msgData = {
        action: 'ROOM:NEW_MESSAGE',
        roomId: roomId,
        lastMsgText: data.text.substr(0, 30),
        lastDate: timeStamp,
        message: {
          userId: userData.userId,
          text: data.text,
          timeStamp,
          userName: userData.login,
          avatar: userData.avatar,
          color: userData.color,
          id: queryInsertMessage.insertId
        }
      }

      if (queryGetRoom[0].public) msgData.lastMsgUser = userData.login
      socket.broadcast.to(roomId).emit('message', msgData)

      msgData.lastMsgUser = queryGetRoom[0].public ? userData.login : 'You'
      socket.emit('message', msgData)
    }
  })

  socket.on("disconnect", () => {
    console.log('disconnect:', socket.id)
    const userId = roomsData.get('connections').get(socket.id)
    const userRooms = roomsData.get('userRooms').get(socket.id)
    const rooms = roomsData.get('rooms')
    const userData = roomsData.get('users').get(userId)

    roomsData.get('connections').delete(socket.id)

    let usersList = [ ...roomsData.get('connections').values() ]

    const roomsList = roomsData.get('userRooms').get(socket.id)
    //console.log('roomsList:', roomsList)
    if (roomsList) {
      Object.values(roomsList).map(roomId => {
        //console.log('roomId:', roomId)
        if (usersList.indexOf(userId) == -1) {
          socket.broadcast.to(roomId).emit('message', {
            action: 'ROOM:LEAVE',
            userId: userId,
            roomId: roomId
          })
          socket.broadcast.to(roomId).emit('message', {
            action: 'USER:ONLINE',
            roomId: roomId,
            online: false
          })
          //if (roomsList[roomId])
          roomsData.get('users').delete(userId)
        }
        socket.leave(roomId)

        const roomUsers = rooms.get(roomId)
        if (roomUsers) {
          let index = roomUsers.indexOf(socket.id);
          if (index > -1) {
            roomUsers.splice(index, 1)
            if (roomUsers.length == 0) roomsData.get('rooms').delete(roomId)
            else rooms.set(roomId, roomUsers)
          }
        }
      })
    }

    const userConns = roomsData.get('userConns').get(userId)
    if (userConns) {
      let index = userConns.indexOf(socket.id);
      if (index > -1) {
        userConns.splice(index, 1)
        if (userConns.length > 0) roomsData.get('userConns').set(userId, userConns)
        else roomsData.get('userConns').delete(userId)
      }
    }

    roomsData.get('activeRoom').delete(socket.id)
    roomsData.get('userRooms').delete(socket.id)
    roomsData.get('sockets').delete(socket.id)
  })


}

export default useSocket