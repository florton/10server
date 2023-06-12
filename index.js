const express = require('express')
const app = express()
const uuid =require('uuid')

app.use(express.json())

const port = 3000

const users = {}
const matches = {}

const newUser = (name) => ({
  name,
  id: uuid.v4(),
  match: null,
  challenges: []
})

const newMatch = (userId, challengerId) => ({
  turn: 0,
  attacker: userId,
  players: {
    [userId] : {
      id: userId,
      health: 5,
      choice: null,
      prevChoice: null
    },
    [challengerId] : {
      id: challengerId,
      health: 5,
      choice: null,
      prevChoice: null
    }
  }
})

// Lobby

app.get('/lobby/users', function (req, res) {
  // todo garbage collect inactive users
  res.send({status: 200, data: Object.values(users)})
})

app.get('/lobby/register/:name', function (req, res) {
  const { name } = req.params
  const user = newUser(name)
  users[user.id] = user
  res.send({status: 200, data: user.id})
})

app.get('/lobby/challenge/:userId/:challengerId', function (req, res) {
  const { userId, challengerId } = req.params
  if(users[challengerId]){
    users[challengerId].challenges.push(userId)
    res.send({status: 200})
  } else {
    res.send({status: 400})
  }
})

app.get('/lobby/accept/:userId/:challengerId', function (req, res) {
  const { userId, challengerId } = req.params
  if(users[userId] && users[challengerId]){
    const user = users[userId]
    const challenger = users[challengerId]
    if (user.challenges.includes(challengerId) && challenger.match == null){
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
  const { matchId } = req.params
  if(matches[matchId]){
    const filteredMatch = {
      ...matches[matchId],
      players: matches[matchId].players.map(
        player => ({
          ...player,
          // dont expose opponent choice to player
          choice: player.choice === null ? false : true
        })
      )
    }
    res.send({status: 200, data: filteredMatch})
  } else {
    res.send({status: 400})
  }
})

const processTurn = (matchId) => {
  if (matches[matchId]){
    const match = matches[matchId]
    const choices = match.players.map(
      player => player.choice
    )
    if (choices.filter(x => x).length == 2){
      //both players have locked in
      const blocked = choices[0] === choices[1]
      const attacker = match.players[match.attacker]
      const defender = match.players.filter(
        player => player.id !== match.attacker
      )[0]
      if(blocked){
        match.attacker = defender.id
      }else{
        defender.hp -= choice === "0" ? 1 : 2
      }
      attacker.prevChoice = attacker.choice
      attacker.choice = null
      defender.prevChoice = attacker.choice
      defender.choice = null
      match.turn += 1
      if (defender.hp <= 0){
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