const rooms = new Map()

const roomEnter = (user, room) => {
  if (!rooms.has(room)) {
    rooms.set(
      room, 
      new Map(
        ['users', new Map()],
        ['messages', new Map()]
      )
    )
  }
  console.log('rooms:', rooms)
  //rooms.set()
}

export default roomEnter