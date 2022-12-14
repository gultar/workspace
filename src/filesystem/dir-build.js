const fs = require("fs")
const File = require('../../public/js/filesystem/file.js')

const root = {
    contents:[]
}

const log = (...text) =>{
    if(!process.silentBuild) console.log(`[build:>]`, ...text)
}

let totalDirectories = 0
let totalFiles = 0

const buildFileSystemRepresentation = (dirPath, fsPosition=root) =>{ //new RootFS().system
    
    try{
        files = fs.readdirSync(dirPath)
    }catch(e){
        log('DIR BUILD ERROR', e)
        files = []
    }
    fsPosition.contents = []

  for(const file of files) {
    try{
        const isDirectory = fs.statSync(dirPath + "/" + file).isDirectory()
        
        if (isDirectory) {
            
            const dir = file
            fsPosition[dir] = {
                contents:[]
            }
            log(`Adding directory ${dir}`)
            totalDirectories++
            buildFileSystemRepresentation(dirPath + "/" + file, fsPosition[dir])
        } else {
            
            
            const path = dirPath + "/" + file
            const fileContent = ""//fs.readFileSync(path).toString()
            totalFiles++
            const newFile = new File(file, fileContent, path)
            fsPosition.contents.push(newFile)
            log(`\\_Adding file ${path}`)
        }

    }catch(e){
        log('DIR BUILD statSync ERROR',e)
    }
  }
  return fsPosition
}

const getBuildStats = () =>{
    return { totalDirectories:totalDirectories, totalFiles:totalFiles }
}

module.exports = { buildFileSystemRepresentation, getBuildStats }
