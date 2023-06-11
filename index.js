const express = require('express')
const app = express()
const uuid =require('uuid')

app.use(express.json())

const port = 3000

const users = {}

app.get('/lobby/users', function (req, res) {
  res.send({status: 200, data: Object.values(users)})
})

app.get('/lobby/register/:name', function (req, res) {
  const { name } = req.params
  if (!users[name]){
    users[name] = {
      name,
      id: uuid.v4()
    }
    res.send({status: 200, message: "success"})
  }else {
    res.send({status: 409, message: "user already registered"})
  }
})

app.post('/', (req, res) => {
  res.send('Got a POST request')
})

app.listen(port)
console.log("listening on: " + port)