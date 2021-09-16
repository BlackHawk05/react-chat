import React from 'react'
import PropTypes from 'prop-types'
import autosize from 'autosize'
import { TodosDispatch } from 'context'
import ChatList from './ChatList'
import socket from 'socket'
import lang from 'samples/lang'

class Chat extends React.Component {

  static contextType = TodosDispatch

  static propTypes = {
    roomsMessages: PropTypes.object,
    activeRoom: PropTypes.string,
    userData: PropTypes.object,
  }

  componentDidMount () {
    const textarea = document.getElementById("textarea")
    textarea.focus()
    autosize(textarea)
  }
  componentDidUpdate() {
    //console.log('componentDidUpdate')
  }

  textareaListen = (e) => {
    const textarea = document.getElementById("textarea")
    if (e.target.value.length === textarea.selectionEnd) {
      const objDiv = document.getElementById("send-form")
      objDiv.scrollTop = objDiv.scrollHeight
    }
    //console.log('charCode:', e.charCode)
    if (e.charCode === 13) {
      if (!e.ctrlKey) {
        e.preventDefault()
        this.sendMessage()
      }
      else textarea.value += '\r\n'
    }

    this.handleUserActivity()
    this.handleTyping()
  }

  sendMessage = (form) => {
    let textarea = document.getElementById("textarea")
    if (!textarea.value.trim()) return false
    socket.emit('ROOM:NEW_MESSAGE', {
      text: textarea.value
    })
  }

  handleTyping = () => {
    
    const [ state, dispatch ] = this.context
    let userTyping = false
    let privateRoom = false

    if (state.roomsUsers[state.activeRoom] &&
      state.roomsUsers[state.activeRoom][state.userData.userId] &&
      !state.roomsUsers[state.activeRoom][state.userData.userId].typing) {

      state.roomsUsers[state.activeRoom][state.userData.userId].typing = true
      dispatch({
        type: 'roomsUsers',
        payload: state.roomsUsers
      })
      userTyping = true
    }

    if (state.roomsList[state.activeRoom] && 
      (!state.roomsList[state.activeRoom].type || state.roomsList[state.activeRoom].type !== 'group') &&
      !state.roomsList[state.activeRoom].myTyping
    ) {
      state.roomsList[state.activeRoom].myTyping = true
      dispatch({
        type: 'roomsList',
        payload: state.roomsList
      })
      userTyping = true
      privateRoom = true
    }

    if (userTyping) {
      socket.emit('USER:TYPING', {
        roomId: state.activeRoom,
        off: false,
        privateRoom
      })
    }

    this.userTyping()
  }
  userTyping = () => {

    const [ state, dispatch ] = this.context

    clearTimeout(state.timers.typing)
    state.timers.typing = setTimeout(() => {
      //console.log('offline:', 'true')
      let userNotTyping = false
      let privateRoom = false

      if (state.roomsUsers[state.activeRoom] && 
        state.roomsUsers[state.activeRoom][state.userData.userId] &&
        state.roomsUsers[state.activeRoom][state.userData.userId].typing
      ) {
        state.roomsUsers[state.activeRoom][state.userData.userId].typing = false
        dispatch({
          type: 'roomsUsers',
          payload: state.roomsUsers
        })
        userNotTyping = true
      }

      if (state.roomsList[state.activeRoom] && 
        (!state.roomsList[state.activeRoom].type || state.roomsList[state.activeRoom].type !== 'group') &&
        state.roomsList[state.activeRoom].myTyping
      ) {
        state.roomsList[state.activeRoom].myTyping = false
        dispatch({
          type: 'roomsList',
          payload: state.roomsList
        })
        userNotTyping = true
        privateRoom = true
      }

      if (userNotTyping) {
        socket.emit('USER:TYPING', {
          roomId: state.activeRoom,
          off: true,
          privateRoom
        })
      }
      
    }, 700)

    dispatch({
      type: 'timers',
      payload: state.timers
    })
  }

  handleUserActivity = () => {
    
    const [ state, dispatch ] = this.context
    let userOnline = false
    let privateRoom = false

    if (state.roomsUsers[state.activeRoom] &&
      state.roomsUsers[state.activeRoom][state.userData.userId] &&
      !state.roomsUsers[state.activeRoom][state.userData.userId].online
    ) {
      state.roomsUsers[state.activeRoom][state.userData.userId].online = state.activeRoom
      dispatch({
        type: 'roomsUsers',
        payload: state.roomsUsers
      })
      userOnline = true
    }
    //console.log('roomsUsers:', state.roomsUsers)
    if (state.roomsList[state.activeRoom] && 
      (!state.roomsList[state.activeRoom].type || state.roomsList[state.activeRoom].type !== 'group') &&
      !state.roomsList[state.activeRoom].myOnline
    ) {
      state.roomsList[state.activeRoom].myOnline = true
      dispatch({
        type: 'roomsList',
        payload: state.roomsList
      })
      userOnline = true
      privateRoom = true
    }

    if (userOnline) {
      socket.emit('USER:ONLINE', {
        roomId: state.activeRoom,
        off: false,
        privateRoom
      })
    }

    this.userOffline()
  }

  userOffline = () => {

    const [ state, dispatch ] = this.context
    
    clearTimeout(state.timers.offline)

    state.timers.offline = setTimeout(() => {
      let userOffline = false
      let privateRoom = false
      //console.log('offline:', 'true')
      if (state.roomsUsers[state.activeRoom] &&
        state.roomsUsers[state.activeRoom][state.userData.userId] &&
        state.roomsUsers[state.activeRoom][state.userData.userId].online
      ) {
        state.roomsUsers[state.activeRoom][state.userData.userId].online = false
        dispatch({
          type: 'roomsUsers',
          payload: state.roomsUsers
        })
        userOffline = true
      }

      if (state.roomsList[state.activeRoom] && 
        (!state.roomsList[state.activeRoom].type || state.roomsList[state.activeRoom].type !== 'group') &&
        state.roomsList[state.activeRoom].myOnline
      ) {
        state.roomsList[state.activeRoom].myOnline = false
        dispatch({
          type: 'roomsList',
          payload: state.roomsList
        })
        userOffline = true
        privateRoom = true
      }

      if (userOffline) {
        socket.emit('USER:ONLINE', {
          roomId: state.activeRoom,
          off: true,
          privateRoom
        })
      }
    }, 15000)

    dispatch({
      type: 'timers',
      payload: state.timers
    })
  }
  
  render () {
    return (
      <div className="flex-fill rel padb-5 animate__animated animate__fadeIn">
        <div id="chat-elem" className="msg-list">
          <ChatList userOffline={this.userOffline} handleUserActivity={this.handleUserActivity} />
        </div>
        <div id="send-form-elem" className="send-form rel clearfix">
          <div id="send-form" className="ovf">
            <textarea id="textarea" 
                      onKeyPress={(e) => this.textareaListen(e)}
                      placeholder={lang.enterYourMessage} 
            />
          </div>
          <div className="ico-send" onClick={() => this.sendMessage(false)}></div>
        </div>
      </div>
    )
  }
}

export default Chat