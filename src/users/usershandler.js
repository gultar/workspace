const fs = require("fs").promises;
const bcrypt = require('bcrypt')

let accountFilePath = "./users/accounts.json"

const validateLogin = async ({ username, password }) =>{

    try{
      const user = getUser(username)
      if(user == undefined){
        return false
      }
  
      const { hash } = user
      const isValid = await isValidPassword(password, hash)
      return isValid
    }catch(e){
      console.log(e)
      return false
    }
  
}
  
const isValidPassword = async (password, hash) => {
    try{
      const isEqual = await bcrypt.compare(password, hash)
      return isEqual
    }catch(e){
      console.log(e)
      return false
    }
}
  
const createUser = async ({ username, password, timestamp }) =>{
    try{
      if(userExists(username) == true) return "User already exists"
      
      const rounds = 10
      const hash = await bcrypt.hash(password, rounds)
      addUserToAccountFile({
        username:username,
        hash:hash,
        timestamp:timestamp,
      })
      return `User ${username} created`
    }catch(e){
      throw e
    }
}
  
const createUserHandler = async (req, res) =>{
    try{
        const { username, password, timestamp } = req.body
        res.end(await createUser({ username, password, timestamp }))
    }catch(e){
        console.log(e)
        res.end(e.message)
    }
}

const addUserToAccountFile = async ({ username, hash, timestamp, rounds}) =>{
    try{
        const exists = await fs.readFile(accountFilePath)
        if(!exists){
            await createAccountFile()
        }
    }catch(e){
        console.log(e)
        throw e
    }
    
    const accounts = getAccountsFromFile()
    
    if(accounts[username] !== undefined) throw new Error(`User ${username} already exists`)
    
    accounts[username] = {
      hash:hash,
      created:timestamp,
      rounds:rounds
    }
  
    const written = await fs.writeFile(accountFilePath,JSON.stringify(accounts))
    return written
}

const createAccount = async ({ username, password, timestamp }) =>{
    const rounds = 10
    const hash = await bcrypt.hash(password, rounds)
    const user = {
        username:username,
        hash:hash,
        timestamp:timestamp,
    }
    return user
}

const createAccountFile = async () =>{
    
    const accounts = {
        root:await createAccount({ username:'root', password:'root', timestamp:Date.now() }),
        guest:await createAccount({ username:'guest', password:'guest', timestamp:Date.now() })
    }
  
    const written = await fs.writeFile(accountFilePath,JSON.stringify(accounts))
    return written
    
}
  
const getAccountsFromFile = async () =>{
    try{
        const accountsFileString = await fs.readFile(accountFilePath).toString()
        const accounts = JSON.parse(accountsFileString)
        return accounts
    }catch(e){
        console.log(e)
        return false
    }
}
  
const userExists = (username) =>{
    const accounts = getAccountsFromFile()
    return (accounts[username] ? true : false)
}
  
const getUser = (username) =>{
    const accounts = getAccountsFromFile()
    console.log(accounts)
    return accounts[username]
}


module.exports = {
    validateLogin,
    isValidPassword,
    createUser,
    createUserHandler,
    addUserToAccountFile,
    getAccountsFromFile,
    userExists,
    getUser,
} 