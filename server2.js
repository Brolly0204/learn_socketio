const express = require('express')
const path = require('path')

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

  let username
  const cNameReg = /^cname:(.+)$/
  const privateReg = /^@(\w+)?/
  socket.on('chat', data => {
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
        ALL_USERS[username] = socket
        io.emit('receive', {
          username,
          content: data,
          createAt: new Date()
        })
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

io.of('/chat').on('connection', socket => {
  // console.log('客户端已经连接', socket)
  socket.on('message', data => {
    console.log(data)
  })

  let username
  const cNameReg = /^cname:(.+)$/
  const privateReg = /^@(\w+)?/
  socket.on('chat', data => {
    if (username) {
      const result = data.match(cNameReg)
      const priResult = data.match(privateReg)

      if (result) {
        // 改昵称
        let newName = result[1]
        io.of('/chat').emit('receive', {
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
        ALL_USERS[username] = socket
        io.of('/chat').emit('receive', {
          username,
          content: data,
          createAt: new Date()
        })
      }
    } else {
      username = data
      io.of('/chat').emit('receive', {
        username: SYSTEM,
        content: `欢迎${username}`,
        createAt: new Date()
      })
    }
  })
})
