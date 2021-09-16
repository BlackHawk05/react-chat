import React from 'react'
import PropTypes from 'prop-types'
import { TodosDispatch } from 'context'

class ChatList extends React.Component {

  static contextType = TodosDispatch

  static propTypes = {
    roomsMessages: PropTypes.object,
    activeRoom: PropTypes.string,
    userData: PropTypes.object,
  }
  
  componentDidMount () {
    //console.log('didmount')
    setTimeout(() => {
      const chatElem = document.getElementById("chat-elem")
      
      if (chatElem) {
        //chatElem.scrollTop = chatElem.scrollHeight
        chatElem.addEventListener('scroll', this.handleScroll)
      }
      window.addEventListener('mousemove', this.props.handleUserActivity)
    }, 200)

    this.props.userOffline()
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    const [ state, dispatch ] = this.context
    const chatElem = document.getElementById("chat-elem")

    if (state.firstLoad && chatElem && chatElem.scrollHeight > chatElem.offsetHeight) {
      chatElem.scrollTop = chatElem.scrollHeight
      dispatch({
        type: 'firstLoad',
        payload: false
      })
    }
    return null;
  }
  componentDidUpdate() { //wtf?
  }

  handleScroll = (event) => {
    const elem = event.srcElement
    const chatElem = document.getElementById("chat-elem")
    const [ state, dispatch ] = this.context
    
    if ((elem.scrollTop + chatElem.offsetHeight) === elem.scrollHeight) {
      state.roomsList[state.activeRoom].notify = 0
      dispatch({
        type: 'roomsList',
        payload: state.roomsList
      })
    }

    const chatListItems = document.querySelectorAll('li.unread')
    //console.log('chatListItems:', chatListItems)
    chatListItems.forEach(el => {
      //el.style.display = "none"
      if (this.isInViewport(el)) {
        const msgId = el.dataset.msgid
        //console.log('msgId:', msgId)
        state.roomsMessages[state.activeRoom][msgId].unread = 'read'
        dispatch({
          type: 'roomsMessages',
          payload: state.roomsMessages
        })
      }
    })
  }

  isInViewport = (element) => {
    const rect = element.getBoundingClientRect()
    const chatBottom = document.getElementById("header").offsetHeight + document.getElementById("chat-elem").offsetHeight
    //console.log('isInViewport:', rect.bottom, chatBottom)
    return (rect.bottom-10) <= chatBottom
  }

  render () {

    const [ state ] = this.context
    const { roomsMessages, activeRoom, userData } = state

    return (
      <ul>
        {
          (roomsMessages && roomsMessages[activeRoom]) &&
          Object.keys(roomsMessages[activeRoom]).map(msgId => {
            if (roomsMessages[activeRoom][msgId]) {
              const msg = roomsMessages[activeRoom][msgId]
              let msgDate = '';

              if (msg.timeStamp) {
                const dateNow = Math.floor(new Date().getTime()/ 1000)
                let dateObj = new Date(msg.timeStamp*1000)
                /*if (msg.timeStamp < (dateNow-3600*24*30)) {
                  var year = dateObj.getYear()
                  msgDate += (year+1900)+"\n"
                }*/
                if (msg.timeStamp < (dateNow-3600*24)) {
                  var month = dateObj.getMonth() + 1
                  var day = dateObj.getDate()
                  msgDate += (day < 10 ? '0'+day : day)+'.'+(month < 10 ? '0'+month : month)+"\n"
                }

                var hours = dateObj.getHours()
                var minutes = dateObj.getMinutes()
                //console.log('msgDate1:', hours, minutes)
                msgDate += (hours < 10 ? '0'+hours : hours)+':'+(minutes < 10 ? '0'+minutes : minutes)
              }

              //console.log('msg:', msg)
              return (
                <li key={`msg${msgId}`} 
                    className={"clearfix"+(msg.unread ? " "+msg.unread : "")} 
                    data-msgid={msgId}
                >
                  <div className={
                        "d-flex flex-row msg-content rel mt-2 "+
                        (msg.userId === userData.userId ? "right msg-r" : "left msg-l")
                       }
                  >
                    <div className="rel">
                      {
                        msg.avatar ?
                        <div className="msg-avatar ovfh">
                          <img src={msg.avatar} alt={msg.userName}/>
                        </div> :
                        <div className="msg-avatar ovfh brd2-g txt-g padt-01"
                            style={msg.color ? {backgroundColor: "#"+msg.color} : {}}
                        >
                          {msg.userName.charAt(0).toUpperCase()}
                        </div>
                      }
                      <div className="msg-date">{msgDate}</div>
                    </div>
                    <div className="msg-text rel flex-fill">
                      <div style={msg.color ? {color: "#"+msg.color} : {}}><b>{msg.userName}</b></div>
                      <div className="txt-g">{msg.text}</div>
                      <div className="msg-date"></div>
                    </div>
                  </div>
                </li>
              )
            }
            return <></>
          })
        }
      </ul>
    )
  }
}

export default ChatList