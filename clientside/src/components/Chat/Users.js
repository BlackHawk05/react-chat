import React from 'react'
import PropTypes from 'prop-types'
import socket from 'socket'
import { TodosDispatch } from 'context'

const Users = () => {

  const [ state ] = React.useContext(TodosDispatch)
  const { roomsUsers, activeRoom, roomsList } = state
  
  if (!roomsUsers || !roomsUsers[activeRoom]) return false
  
  if (roomsList[activeRoom].type !== 'group') return (<div></div>)

  if (roomsUsers && roomsUsers[activeRoom]) {
    if (Object.keys(roomsUsers[activeRoom]).length === 0) {
      return (<div></div>)
    }
  }

  const privateChat = userId => {
    //console.log('userClick:', userId)
    socket.emit('ROOM:JOIN', { roomId: false, userId })
  }
  //console.log('roomsList:', activeRoom, roomsList[activeRoom].type)

  return (
    <div key="users-list" className="users-list animate__animated animate__flipInY">
      {
        Object.keys(roomsUsers[activeRoom]).map(userId => {
          const user = roomsUsers[activeRoom][userId]
          return (
            <li key={`user${userId}`} className="user-item ps-2 clearfix" onClick={() => privateChat(userId)}>
              <div className="d-flex flex-row py-2">
                <div className="rel">
                  {
                    user.avatar ?
                    <div className="user-avatar ovfh">
                      <img src={user.avatar} alt={user.name}/>
                    </div> :
                    <div className="user-avatar ovfh brd2-g txt-g padt-01"
                        style={user.color ? {backgroundColor: "#"+user.color} : {}}
                    >
                      {user.name ? user.name.charAt(0).toUpperCase() : ''}
                    </div>
                  }
                  {user.online === activeRoom && <div className={"user-online"+(user.typing ? " typing" : "")}></div>}
                </div>
                <div className="flex-fill ps-2 rel">
                  <div className={"user-name padt-02"+(String(userId) === String(state.userData.userId) ? " b" : "")}>{user.login}</div>
                </div>
              </div>
            </li>
          )
        })
      }
    </div>
  )
}

Users.propTypes = {
  roomsUsers: PropTypes.object,
  activeRoom: PropTypes.string,
}

export default Users