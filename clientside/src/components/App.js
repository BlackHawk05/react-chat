import React from 'react'
import LoginUser from './LoginUser'
import ChatInit from './Chat'
import lang from 'samples/lang'
import reducer from 'reducer'
import socket from 'socket'
import socketHandler from 'socketHandler'
import { TodosDispatch } from 'context'

const App = () => {

  const [ state, dispatch ] = React.useReducer(reducer, {
    roomsUsers: {},
    roomsMessages: {},
    roomsList: {},
    userData: {},
    activeRoom: 'all',
    firstLoad: true,
    timers: {}
  })

  React.useEffect(() => {
    const handler = message => {
      const result = socketHandler(message, state)
      if (result.dispatch && result.dispatch.length > 0) {
        Object.keys(result.dispatch).map(key => {
          dispatch(result.dispatch[key])
          return false
        }) 
      }
    }

    socket
    .on('message', handler)
    .on('disconnect', () => {
      console.log('disconnect')
      /*dispatch({
        type: 'userData',
        payload: {}
      })*/
      document.location.reload()
    })

    return () => {
      socket.off('message', handler)
    }
  })
  //console.log('state: ', state)

  const userAuth = code => {
    socket.emit('USER:AUTH', {
      authCode: code,
      social: 'github'
    })
  }
  
  return (
    <TodosDispatch.Provider value={[state, dispatch]}>
      <div className="wrapper">
        <div id="header" className="animate__animated animate__fadeInDown"><h1>{lang.header}</h1></div>
          {
            state.userData.login ? 
            <div className="content"><ChatInit /></div> : 
            <LoginUser userAuth={userAuth}/>
          }
      </div>
      </TodosDispatch.Provider>
  );
}

export default App;
