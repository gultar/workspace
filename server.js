const path = require('path');
const express = require('express')
const session = require('express-session')
const helmet = require('helmet')
const cors = require('cors');
const bodyParser = require('body-parser')
const { createServer } = require("http")
const crypto = require('crypto')
const buildUserspace = require('./src/filesystem/build-userspace.js')

const sha256 = (text) =>{
  return crypto
  .createHash('sha256')
  .update(text)
  .digest('hex');
}

const authorizedUsers = {
  kerac:{
    passwordHash:sha256("awd"),
    tokenHash:"",
  },
  root:{
    passwordHash : sha256("root"),
    tokenHash:""
  }
}

const createNewUser = (username, password) =>{
  if(authorizedUsers[username] !== undefined) return false
  
  authorizedUsers[username] = {
    passwordHash : sha256(password),
    tokenHash:""
  }

  return true
}

const isValidPassword = (username, password) =>{
  const user = authorizedUsers[username]
  const isValidPassword = sha256(password) === user.passwordHash
  return isValidPassword
}

const runServer = (FileSystem={}, origin={ http:true }) =>{

  const runCommand = async (cmd, args) =>{
    try{
      
      if(!args) args = []

      const availableCommands = FileSystem.exposeCommands()
      if(availableCommands[cmd]){
        const result = await FileSystem[cmd](...args)
        
        return result
      }else{
        return { error:`Command ${cmd} unavailable` }
      }

    }catch(e){
      console.log(e)
      return { error:e.message }
    }
  }


  const expressApp = express();
  const httpServer = createServer(expressApp)
  const port = process.env.PORT || 8000;
  
  expressApp.get("/", (req, res)=>{
    const query = req.query
    if(!query.token){
      return res.redirect("/log")
    }

    const { token, username } = query

    FileSystem = buildUserspace(username)
    
    res.sendFile(__dirname + '/public/index.html')
  })

  expressApp.use('/',express.static(__dirname + '/public'));
  expressApp.use("/log", express.static(__dirname + '/public/login'))
  
  expressApp.use(cors())
  // expressApp.use(helmet.frameguard())
  expressApp.use(bodyParser.json());       // to support JSON-encoded bodies
  expressApp.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
  }));

  


  expressApp.post("/login", (req, res)=>{
    const { username, password, timestamp } = req.body

    if(!authorizedUsers[username]){
      const newUser = createNewUser(username, password)
    }
    
    
    if(!isValidPassword(username, password))
      return res.send({ 
        error:`Password of user ${username} is invalid`, 
        status:401 
      })

    let code = `${username}${password}${timestamp}`

    let hexHash = sha256(code)

    authorizedUsers[username].token = hexHash
    return res.json({ 
        token:{
          hash:hexHash.toString("hex"),
          username:username,
          status:200,
        }
    })
  })

  expressApp.post("/logout", (req, res)=>{
    const { username } = req.body
    FileSystem = null;
    console.log(`Logged out of user ${username}'s session`)
  })

  expressApp.post('/command', async(req, res)=> {
    const { cmd, args } = req.body
    const result = await runCommand(cmd, args)
    if(result.error) res.json({ error:result.error })
    else res.json({ result:result })
  });

  expressApp.get("/origin", async(req, res)=>{
    res.send(origin)
  })
  
  httpServer.listen(port, ()=>{
    console.log('HTTP Server listening on '+port)
  });
    
}
module.exports = runServer 