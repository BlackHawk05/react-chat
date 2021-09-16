import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import axios from 'axios'
import db from './db.js'
import useSocket from './handlers/sockets.js'

const app = express()
const http = createServer(app)
const io = new Server(http)

/*const db = useDb('users')
await db.read()
db.data = db.data || { posts: [] }
const { posts } = db.data
posts.push('hello world')
//db.write()*/

//console.log('process.env:', process.env)
app.use(express.json())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/authchat', (req, res) => {
  res.send() //заглушка для обратного вызова
})

/*app.post('/auth', async (req, res) => {
  //console.log('authCode:', req.body)
  res.json(userData)
})*/

io.on('connection', socket => {
  console.log('user connected', socket.id)

  useSocket(socket, db)
})

http.listen(8080, (err) => {
  if (err) throw Error(err)
  console.log('THE SERVER IS RUNNING!')
})