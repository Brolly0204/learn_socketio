const express = require('express')
const path = require('path')
const { MessageModel } = require('./model.js')

const app = express()
app.use(express.static(__dirname))

app.get('/', function(req, res) {
  res.sendFile(path.resolve(__dirname, 'index.html'))
})

const server = require('http').createServer(app)

server.listen(7700)

const io = require('socket.io')(server)

const SYSTEM = 'SYSTEM'
const ALL_USERS = {}

io.on('connection', socket => {
  // console.log('客户端已经连接', socket)
  socket.on('message', data => {
    console.log(data)
  })

  socket.on('getAllMessage', async () => {
    const docs = await MessageModel.find({})
      .sort({ createAt: -1 })
      .limit(10)
    socket.emit('allMessage', docs.reverse())
  })

  let rooms = []
  socket.on('join', roomname => {
    if (!rooms.includes(roomname)) {
      socket.join(roomname)
      rooms.push(roomname)
      socket.emit('receive', {
        username: SYSTEM,
        content: `你已经成功加入到了${roomname}房间内`,
        createAt: new Date()
      })
      socket.emit('joined', roomname)
      socket.broadcast.to(roomname).emit('receive', {
        username: SYSTEM,
        content: `${username}进入了${roomname}房间`,
        createAt: new Date()
      })
    } else {
      socket.emit('receive', {
        username: SYSTEM,
        content: `你已经在${roomname}房间内了`,
        createAt: new Date()
      })
    }
  })

  socket.on('leave', roomname => {
    const isRoom = rooms.includes(roomname)
    if (isRoom) {
      socket.leave(roomname)
      rooms = rooms.filter(room => room !== roomname)
      socket.emit('receive', {
        username: SYSTEM,
        content: `你已经退出${roomname}房间`,
        createAt: new Date()
      })
      socket.emit('leave', roomname)

      // 向房间内其他人 广播
      socket.broadcast.to(roomname).emit('receive', {
        username: SYSTEM,
        content: `${username}离开了${roomname}房间`,
        createAt: new Date()
      })
    } else {
      socket.emit('receive', {
        username: SYSTEM,
        content: `你根本不在这个房间内`,
        createAt: new Date()
      })
    }
  })

  socket.on('room', rooname => {
    let roomSockets = io.sockets.adapter.rooms[rooname].sockets
    let count = Object.keys(roomSockets).length
    console.log(roomSockets)
    console.log(`${rooname}房间${count}人在线`)
    io.in(rooname).emit('peopleNum', {
      count,
      content: `${rooname}房间${count}人在线`
    })
  })

  let username
  const cNameReg = /^cname:(.+)$/
  const privateReg = /^@(\w+)?/
  socket.on('chat', async data => {
    if (username) {
      const result = data.match(cNameReg)
      const priResult = data.match(privateReg)
      if (result) {
        // 改昵称
        let newName = result[1]
        io.emit('receive', {
          username: SYSTEM,
          content: `${username}成功改名为${newName}`,
          createAt: new Date()
        })
        ALL_USERS[newName] = ALL_USERS[username]
        delete ALL_USERS[username]
        username = newName
      } else if (priResult) {
        // 私聊
        let priName = priResult[1]
        let priSocket = ALL_USERS[priName]
        if (priSocket) {
          priSocket.emit('receive', {
            username,
            content: data,
            createAt: new Date()
          })
        } else {
          socket.emit('receive', {
            username: SYSTEM,
            content: `私聊用户${priName} 不存在`,
            createAt: new Date()
          })
        }
      } else {
        let doc = await MessageModel.create({
          username,
          content: data
        })
        console.log('1213', doc)
        // 聊天消息
        ALL_USERS[username] = socket
        if (rooms.length > 0) {
          rooms.forEach(room => {
            io.in(room).emit('receive', {
              username,
              content: data,
              createAt: new Date()
            })
          })
        } else {
          console.log(doc)
          io.emit('receive', doc)
        }
      }
    } else {
      username = data
      io.emit('receive', {
        username: SYSTEM,
        content: `欢迎${username}`,
        createAt: new Date()
      })
    }
  })
})
