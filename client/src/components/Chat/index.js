import Rooms from './Rooms'
import Chat from './Chat/index'
import Users from './Users'
//import socket from 'socket'

const ChatInit = props => {

  return (
    <div className="d-flex flex-row h25">
      <Rooms />
      <Chat />
      <Users />
    </div>
  )
}


export default ChatInit