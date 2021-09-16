import React from 'react'
import PropTypes from 'prop-types'
import socket from 'socket'
import { TodosDispatch } from 'context'

const Rooms = props => {

  const [ state, dispatch ] = React.useContext(TodosDispatch)
  const { roomsList, activeRoom } = state

  React.useEffect(() => {
    //console.log('state Rooms:', state)
  })

  const roomJoin = roomId => {
    //console.log('roomJoin:', roomId)
    if (activeRoom !== roomId) {

      if (state.roomsList[state.activeRoom].online) {
        socket.emit('USER:ONLINE', {
          roomId: state.activeRoom,
          off: true,
          privateRoom: true
        })
      }

      state.roomsMessages[roomId] = []
      dispatch({
        type: 'roomsMessages',
        payload: state.roomsMessages
      })

      socket.emit('ROOM:JOIN', { roomId, activeRoom })
    }
    else {

      const room = roomsList[roomId]

      const chatElem = document.getElementById("chat-elem")

      if (room.notify > 1) {

        let chatListItems = document.querySelectorAll('li.unread')
        if (!chatListItems[0]) chatListItems = document.querySelectorAll('li.read')
        if (!chatListItems[0]) return false
        //console.log('chatListItems:', chatListItems[0].innerHTML)
        const rect = chatListItems[0].getBoundingClientRect()
        const chatBottom = document.getElementById("header").offsetHeight + document.getElementById("chat-elem").offsetHeight

        const scrollTo = chatElem.scrollTop + (rect.bottom - chatBottom)
        //console.log('data:', scrollTo, rect.bottom, chatBottom, chatElem.scrollTop, chatElem.scrollHeight)
        chatElem.scrollTop = scrollTo

        state.roomsList[activeRoom].notify--
        dispatch({
          type: 'roomsList',
          payload: state.roomsList
        })
      }
      else chatElem.scrollTop = chatElem.scrollHeight
    }

    const textarea = document.getElementById("textarea")
    textarea.focus()
  }

  const roomTpl = (roomId) => {

    const room = roomsList[roomId]
    let lastDate = false

    if (room.lastDate) {
      const dateNow = Math.floor(new Date().getTime()/ 1000)
      let dateObj = new Date(room.lastDate*1000)
      
      if (room.lastDate < dateNow-3600*24) {
        var month = dateObj.getMonth() + 1
        var day = dateObj.getDate()
        var year = dateObj.getYear() - 100

        lastDate = (day < 10 ? '0'+day : day)+'.'+(month < 10 ? '0'+month : month)+'.'+(year < 10 ? '0'+year : year)
      }
      else {
        var hours = dateObj.getHours()
        var minutes = dateObj.getMinutes()

        lastDate = (hours < 10 ? '0'+hours : hours)+':'+(minutes < 10 ? '0'+minutes : minutes)
      }
    }
    //console.log('online:', roomId, room.online)
    return (
      <div className={"d-flex flex-row ps-2 pb-2"+(String(state.activeRoom) === String(roomId) ? " act" : "")} 
          onClick={() => roomJoin(roomId)}
      >
        <div className="pt-2 rel">
          {
            room.avatar ?
            <div className="room-avatar ovfh">
              <img src={room.avatar} alt={room.name}/>
            </div> :
            <div className="room-avatar ovfh brd2-g txt-g padt-01"
                style={room.color ? {backgroundColor: "#"+room.color} : {}}
            >
              {room.name ? room.name.charAt(0).toUpperCase() : ''}
            </div>
          }
          {room.online && <div className={"room-online"+(room.typing ? " typing" : "")}></div>}
        </div>
        <div className="flex-fill ps-2 rel">
          <div className="room-header d-flex">
            { (room.type && room.type === 'group') && <div className="ico-group vert-t"></div> }
            <div className="room-name flex-fill vert-t">{room.name}</div>
            <div className="room-date">{lastDate}</div>
          </div>
          <div className="room-content d-flex">
            <div className="room-msg flex-fill">
              {room.lastMsgUser && <span className="txt-b">{room.lastMsgUser}: </span>}
              {room.lastMsgText}
            </div>
            { room.notify > 0 && <div className="room-notify">{room.notify}</div> }
          </div>
        </div>
      </div>
    )
  }

  if (!roomsList['all']) return false
  //console.log('roomsList:', state.roomsList)
  return (
    <div className="rooms-list ovfh animate__animated animate__fadeIn">
      <ul>
        <li key="roomall" 
            className="room-item clearfix"
        >
          {roomTpl('all')}
        </li>

        {
          Object.keys(roomsList).map(roomId => {
            if (roomId !== 'all') {
              return (
                <li key={`rooms${roomId}`} className="room-item clearfix">
                  {roomTpl(roomId)}
                </li>
              )
            }
            return false
          })
        }
      </ul>
    </div>
  )
}

Rooms.propTypes = {
  roomsList: PropTypes.object,
  activeRoom: PropTypes.string,
}

export default Rooms