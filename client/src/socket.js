import io from 'socket.io-client'

const socket = io(process.env.REACT_APP_SERVER_HOST, {
  transports : ['websocket'], //fix cors error
  //reconnection: false
})

export default socket