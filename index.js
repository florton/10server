const express = require('express')
const app = express()
const uuid =require('uuid')

app.use(express.json())

const port = 3000

const users = {}
const matches = {}

const garbageCollectTimeout = 10000 // 10s

let garbageCollectTimestamp = new Date()

const newUser = (name, clientId) => ({
  name,
  clientId,
  id: uuid.v4(),
  match: null,
  challenges: [],
  lastSeen: (new Date())
})

const newMatch = (userId, challengerId) => ({
  turn: 0,
  attacker: userId,
  players: {
    [userId] : {
      id: userId,
      name: users[userId].name,
      health: 5,
      choice: null,
      prevChoice: null
    },
    [challengerId] : {
      id: challengerId,
      name: users[challengerId].name,
      health: 5,
      choice: null,
      prevChoice: null
    }
  }
})

// Lobby
const updateAndGarbageCollect = (clientId) => {
  for (let user of Object.values(users)){
    if (user.clientId == clientId){
      user.lastSeen = (new Date())
    }
  }
  if ((new Date()) - garbageCollectTimestamp > garbageCollectTimeout){
    garbageCollectTimestamp = new Date()
    for (user of Object.values(users)){
      if ((new Date()) - user.lastSeen > garbageCollectTimeout){
        delete users[user.id]
      }
    }
  }
}

app.get('/lobby/users', function (req, res) {
  res.send({status: 200, data: Object.values(users)})
  const clientId = req.headers.referer
  updateAndGarbageCollect(clientId)
})

app.get('/lobby/register/:name', function (req, res) {
  const clientId = req.headers.referer
  const { name } = req.params
  const user = newUser(name, clientId)
  users[user.id] = user
  console.log('Registered ' + name)
  res.send({status: 200, data: user.id})
})

app.get('/lobby/challenge/:userId/:challengerId', function (req, res) {
  const { userId, challengerId } = req.params
  if(users[challengerId]){
    const user = users[userId]
    const challenger = users[challengerId]
    users[challengerId].challenges.push(userId)
    if (user.challenges.includes(challengerId) && challenger.match == null){
      console.log('Match started')
      const matchId = uuid.v4()
      matches[matchId] = newMatch(userId, challengerId)
      user.match = matchId
      challenger.match = matchId
      res.send({status: 200})
    }else{
      res.send({status: 200})
    }
  } else {
    res.send({status: 400})
  }
})

// Match
app.get('/match/:matchId', function (req, res) {
  const clientId = req.headers.referer
  const { matchId } = req.params
  if(matches[matchId]){
    const filteredPlayers = {}
    Object.values(matches[matchId].players).forEach(
      player => {filteredPlayers[player.id] = {
        ...player,
        // dont expose opponent choice to player
        choice: player.choice === null ? false : true
      }}
    )
    const filteredMatch = {
      ...matches[matchId],
      players: filteredPlayers
    }
    res.send({status: 200, data: filteredMatch})
  } else {
    res.send({status: 400})
  }
  updateAndGarbageCollect(clientId)
})

const processTurn = (matchId) => {
  if (matches[matchId]){
    const match = matches[matchId]
    const choices = Object.values(match.players).map(
      player => player.choice
    )
    if (choices.filter(x => x).length == 2){
      //both players have locked in
      const blocked = choices[0] === choices[1]
      const attacker = match.players[match.attacker]
      const defender = Object.values(match.players).filter(
        player => player.id !== match.attacker
      )[0]
      if(blocked){
        match.attacker = defender.id
      }else{
        // game rule(s) lol
        defender.health -= attacker.choice === "0" ? 1 : 2
      }
      attacker.prevChoice = attacker.choice
      attacker.choice = null
      defender.prevChoice = defender.choice
      defender.choice = null
      match.turn += 1
      if (defender.health <= 0){
        //game over
      }
    }
  }
}

app.get('/match/lock_in/:matchId/:userId/:choice', function (req, res) {
  const {matchId, userId, choice} = req.params
  if (matches[matchId] && matches[matchId].players[userId]){
    if (choice == "0" || choice == "1"){
      matches[matchId].players[userId].choice = choice
      processTurn(matchId)
      res.send({status: 200})
    } else {
      res.send({status: 400})
    }
  } else {
    res.send({status: 400})
  }
})

app.post('/', (req, res) => {
  res.send('Got a POST request')
})

app.listen(port)
console.log("listening on: " + port)