import socket from 'socket'

const socketHandler = (data, state) => {
  //console.log('socket data: ', data, state)
  if (!data || !data.action) return false

  const dispatch = []

  switch (data.action) {

    case 'ROOM:NEW_ROOM':
      //console.log('ROOM:NEW_ROOM:', data)
      state.roomsList[data.roomId] = data.newRoom

      dispatch.push({
        type: 'roomsList',
        payload: state.roomsList
      })

      socket.emit('ROOM:JOIN', {
        roomId: data.roomId,
        activeRoom: state.activeRoom
      })
      //console.log('state:', state)
      return {dispatch}

    case 'ROOM:NEW_MESSAGE':

      if (data.lastMsgUser) state.roomsList[data.roomId].lastMsgUser = data.lastMsgUser
      else state.roomsList[data.roomId].lastMsgUser = false

      if (data.lastMsgText) state.roomsList[data.roomId].lastMsgText = data.lastMsgText
      if (data.lastDate) state.roomsList[data.roomId].lastDate = data.lastDate
      
      const roomsNotify = () => {
        if (!state.roomsList[data.roomId].notify) state.roomsList[data.roomId].notify = 1
        else state.roomsList[data.roomId].notify++

        return state.roomsList
      }

      if (state.activeRoom === data.roomId) {

        if (state.userData.userId === data.message.userId) {
          const textarea = document.querySelector('textarea')
          textarea.value = ''
          textarea.style.height = '100%';
        }

        let autoScroll = false
        const chatElem = document.getElementById("chat-elem")
        //console.log('chatElem2:', (chatElem2.scrollTop+chatElem2.offsetHeight), chatElem2.scrollHeight)
        if ((chatElem.scrollTop + chatElem.offsetHeight) > (chatElem.scrollHeight - 50)) {
          autoScroll = true
        }

        setTimeout(() => {
          const chatElem = document.getElementById("chat-elem")
          //console.log('chatElem:', (chatElem.scrollTop+chatElem.offsetHeight), chatElem.scrollHeight)
          if (autoScroll) {
            chatElem.scrollTop = chatElem.scrollHeight
          }
          else if (state.userData.userId === data.message.userId) {
            chatElem.scrollTop = chatElem.scrollHeight
          }
          else if (state.userData.userId !== data.message.userId) {
            data.message.unread = 'unread'
            state.roomsList = roomsNotify()
          }
        }, 1)
       
        if (!state.roomsMessages[data.roomId]) state.roomsMessages[data.roomId] = []
        state.roomsMessages[data.roomId].push(data.message)

        dispatch.push({
          type: 'roomsMessages',
          payload: state.roomsMessages
        })
      }
      else state.roomsList = roomsNotify()

      dispatch.push({
        type: 'roomsList',
        payload: state.roomsList
      })

      return {dispatch}

    case 'USER:JOIN':
      //console.log('USER:JOIN:', data)
      if (data.userData) {
        if (!state.roomsUsers[data.roomId]) state.roomsUsers[data.roomId] = []
        state.roomsUsers[data.roomId][data.userData.userId] = data.userData
        dispatch.push({
          type: 'roomsUsers',
          payload: state.roomsUsers
        })
      }
      return {dispatch}

    case 'ROOM:LEAVE':
      if (state.roomsUsers[data.roomId] && state.roomsUsers[data.roomId][data.userId]) {
        delete state.roomsUsers[data.roomId][data.userId]
        dispatch.push({
          type: 'roomsUsers',
          payload: state.roomsUsers
        })
      }
      return {dispatch}

    case 'USER:ONLINE':
      //console.log('USER:ONLINE:', data)

      if ((data.privateRoom || data.online === false) && state.roomsList[data.roomId]) {
        state.roomsList[data.roomId].online = data.online
        dispatch.push({
          type: 'roomsList',
          payload: state.roomsList
        })
      }
      
      if (data.userId) {
        if (!state.roomsUsers[data.roomId]) state.roomsUsers[data.roomId] = []
        if (!state.roomsUsers[data.roomId][data.userId]) state.roomsUsers[data.roomId][data.userId] = {}
        state.roomsUsers[data.roomId][data.userId].online = data.online
        dispatch.push({
          type: 'roomsUsers',
          payload: state.roomsUsers
        })
      }
      return {dispatch}

    case 'USER:TYPING':
      //console.log('USER:ONLINE:', data)
      if ((data.privateRoom || data.off === false) && state.roomsList[data.roomId]) {
        state.roomsList[data.roomId].typing = data.off
        dispatch.push({
          type: 'roomsList',
          payload: state.roomsList
        })
      }

      if (data.userId) {
        if (!state.roomsUsers[data.roomId]) state.roomsUsers[data.roomId] = []
        state.roomsUsers[data.roomId][data.userId].typing = data.off
        dispatch.push({
          type: 'roomsUsers',
          payload: state.roomsUsers
        })
      }
      return {dispatch}

    case 'ROOM:JOIN':
      //console.log('ROOM:JOIN:', data)
      if (state.activeRoom !== data.roomId && !data.noSwitch) {
        dispatch.push({
          type: 'activeRoom',
          payload: data.roomId
        })
      }

      let updateRoomsList = false
      if (state.roomsList[data.roomId] && 
        state.roomsList[data.roomId].notify > 0
      ) {
        updateRoomsList = true
        state.roomsList[data.roomId].notify = 0
      }
      if (data.newRoom) {
        updateRoomsList = true
        state.roomsList[data.roomId] = data.newRoom
      }

      if (updateRoomsList) {
        dispatch.push({
          type: 'roomsList',
          payload: state.roomsList
        })
      }

      if (data.users) {
        state.roomsUsers[data.roomId] = data.users
        dispatch.push({
          type: 'roomsUsers',
          payload: state.roomsUsers
        })
      }

      if (data.messages) {
        state.roomsMessages[data.roomId] = data.messages.reverse()
        dispatch.push({
          type: 'roomsMessages',
          payload: state.roomsMessages
        })

        dispatch.push({
          type: 'firstLoad',
          payload: true
        })
      }

      return {dispatch}

    case 'USER:AUTH':
      socket.emit('ROOM:JOIN', {
        roomId: 'all'
      })
      dispatch.push({
        type: 'userData',
        payload: data.userData
      })
      dispatch.push({
        type: 'roomsList',
        payload: data.roomsList
      })
      return {dispatch}

    default:
      return {dispatch}
  }
}

export default socketHandler