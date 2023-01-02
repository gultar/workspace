

class CollapsibleBar{
    constructor({ startingPath="/", mountDOM, hostId, listenerController }){
        if(!mountDOM) throw new Error('Collapsible bar needs a mount point in the DOM')
        if(!hostId) throw new Error("Collapsible bar needs id of host element")
        if(!listenerController) throw new Error("Collapsible bar needs listener controller to remove active listeners")
        this.collapsibleId = Date.now()
        this.barDOM = `
        <div class="collapsible-container">
            <link rel="stylesheet" href="./css/collapsible.css">
            <ul data-level="1" id="${this.collapsibleId}-bar-container" class="parent">
            
            </ul>
        </div>
        `
        this.mountDOM = mountDOM
        this.mountDOM.innerHTML = this.barDOM
        this.hostId = hostId
        this.workingDir = startingPath 
        this.root = ""
        this.homePath = ""
        this.pointerId = ""
        this.listenerController = listenerController
    }

    async init(){
        const {signal} = this.listenerController
        this.pointerId = await getNewPointerId(this.collapsibleId)
        const contents = await this.exec('ls',[this.workingDir])
        const barDOM = document.getElementById(`${this.collapsibleId}-bar-container`)
        
        this.buildDOM(contents, barDOM)

        window.addEventListener(`message-${this.hostId}`, (event)=>{
            const message = event.detail
            if(message.expandDir){
                const path = message.expandDir
                const ulElement = document.querySelector(`#${message.ulElementId}`)
                this.openDirectory(path, ulElement)
                
            }
        }, { signal })
        this.createCollapsibleFileMenu()
        this.createCollapsibleDirectoryMenu()
    }
    
    destroy(){
        $.contextMenu("destroy",`.file-element-${this.collapsibleId}`)
        $.contextMenu("destroy",`.directory-element-${this.collapsibleId}`)
    }
    
    async openAtDirectory(){
        
    }

    async openDirectory(path, element){
        this.workingDir = path
        
        const contents = await this.exec('ls',[path])
        
        await this.buildDOM(contents, element)
    }

    async buildDOM(contents, element){
        let level = parseInt(element.dataset.level)
        let domToInject = ""
        for await(let item of contents){
            if(item.includes("/")){
                domToInject = domToInject + this.makeDirectoryDOM(item, this.workingDir+item, level+1)
            }else if(item !== '..'){
                
                domToInject = domToInject + this.makeFileDOM(item, this.workingDir+item)
            }
            
        }

        element.innerHTML = domToInject
    }


    async exec(cmd, args){
        return await exec(cmd, args, this.pointerId)
    }

    makeDirectoryDOM(name, path, level=1){
        const stripName = (name) =>{
            name = name.replace("@","")
            name = name.replace("/","")
            name = name.replace(".","")
            return name
        }
        return `
        <li class="directory-element collapse-element directory-element-${this.collapsibleId}"
            id="${stripName(name)}-${this.collapsibleId}" 
            class="directory-line"
            data-path="${path}"
            data-name="${stripName(name)}"
            data-summaryid="${stripName(name)}-summary">
            <details>
                <summary id="${stripName(name)}-summary" onclick="sendEvent('message-${this.hostId}',{ expandDir:'${path}', ulElementId:'${stripName(name)}-${level}-${this.collapsibleId}-content' })">
                <img src="./images/icons/folder-color-large.png" height="8px" width="8px"> ${name} </summary>
                <ul class="directory-content" data-level="${level}" id="${stripName(name)}-${level}-${this.collapsibleId}-content">
                    
                </ul
            </details>
        </li>
        `
    }

    makeFileDOM(name, path){
        return `
        <li class="file-element collapse-element file-element-${this.collapsibleId}"
            id="${name.replace(".","")}-${this.collapsibleId}" 
            class="directory-line"
            data-path="${path}"
            data-name="${name}"
            onclick="select(this, (()=>sendEvent('message-${this.hostId}',{ collapseFileOpen:'${path}' })))">
            <img src="./images/icons/file-color-large.png" height="8px" width="8px"> ${name}
        </li>`
    }
    
    createCollapsibleFileMenu(){
        const hostId = this.hostId
        return $.contextMenu({
            selector: `.file-element-${this.collapsibleId}`, 
            callback: function(key, options){
                if(key == 'Open file') sendEvent(`collapsible-file-open-${hostId}`, { path:this.context.dataset.path, id:hostId })
                else if(key == 'Open in Editor') new Editor(this.context.dataset.path)
                else if(key == 'Delete') sendEvent(`collapsible-file-delete-${hostId}`, { path:this.context.dataset.path, id:hostId })
                else if(key == 'Get info') popup(this.context.dataset.path)
            },   
            items: {
                "Open file": {name: "Open file", icon: 'fa-edit'},
                "Open in Editor": {name: "Open in Editor", icon: "fa-regular fa-window"},
                'Delete': {name: "Delete", icon: "fa-delete"},
                'Get info': {name: "Get info", icon: "fa-delete"},
            }
        });
    }
    
    createCollapsibleDirectoryMenu(){
        const hostId = this.hostId
        return $.contextMenu({
            selector: `.directory-element-${this.collapsibleId}`, 
            callback: function(key, options) {
                if(key == 'Open in Explorer') new FileExplorer(0,0, { workingDir:this.context.dataset.path })
                else if(key == 'Delete') sendEvent(`collapsible-directory-delete-${hostId}`, { path:this.context.dataset.path, id:hostId })
                else if(key == 'Get info') popup(this.context.dataset.path)
            },   
            items: {
                "Open in Explorer": {name: "Open in Explorer", icon: 'fa-edit'},
                'Delete': {name: "Delete", icon: "fa-delete"},
                'Get info': {name: "Get info", icon: "fa-delete"},
            }
        });
    }
}
