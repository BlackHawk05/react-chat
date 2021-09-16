const reducer = (state, action) => {
  //if (action.type !== 'timers') console.log('dispatch:', action)
  let result = { ...state }
  result[action.type] = action.payload

  return result
}

export default reducer