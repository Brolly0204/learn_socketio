const mongoose = require('mongoose')

const Schema = mongoose.Schema

const messageSchema = new Schema({
  username: { type: String, required: true },
  content: { type: String },
  createAt: { type: Date, default: Date.now() }
})

let conn = mongoose.createConnection('mongodb://localhost:27017/message', {
  useNewUrlParser: true
})

const MessageModel = conn.model('Message', messageSchema)

exports.MessageModel = MessageModel
