const ejs = require('ejs')
const fs = require('fs-extra')
const path = require('path')
const { FileAdapter, ImageAdapter} = require('binda')
class _ {
    constructor(props) {
        this._props = Object.assign({}, props)
    }

    get props() {
        return this._props
    }

    get filepath() {
        return this.props.filepath
    }

    get dir () {
        return this.props.dir
    }

    get path() {
        return (!this.dir || !this.filepath) ? null : path.resolve(this.dir, this.filepath)
    }

    get exists() {
        return this.path && fs.existsSync(path.resolve(this.path))
    }

    get type () {
        return this._type || _.TYPES.ASSET
    }  
    
    get adapter () {
        return this._type || 'ASSET'
    }

    detectType () {
        if (this._type) {
            // Not necessary
            return 
        }

        // Figure out the file's extension
        const ext = path.extname(this.path).toUpperCase().substring(1)

        for (let [type, values] of Object.entries(_.TYPES)) {
            if (values.includes(ext)) {
                // Looks like we recognize this type
                this._type = values
                // Trying to reuse to same function to save not just the type (value), but the overall category
                this._adapter = type
                return 
            }
        }
    }

    get isCompilable() {
        return !_.NONCOMPILABLE_TYPES.includes(this.type)
    }

    process(args, options = {}) {



        return new Promise((resolve, reject) => {
            try {
                // Attempt to load the file 
                // HELP NEEDED not sure if I just read the stream like this or need to pipe it
                

                const readStream = fs.createReadStream(this.path)

                if (!readStream) {
                    // Next let's make sure we stop right here for empty files
                    resolve("")
                    return
                }

                // Create a new adapter

                let adapter

                switch (this.adapter) {
                    case 'IMAGE':
                        adapter = new ImageAdapter(readStream)
                        break;
                    default:
                        adapter = new FileAdapter(readStream)
                        break;
                }

                // HELP NEEDED Robi: not sure how do I call the image adapter, for example (process or download?)
                //Might be an idea to use the same name for the main function of the adapters (like process)

                
                //HELP NEEDED here
                // resolve(adapter.process())
                resolve()
            } catch (error) {
                reject(new Error(_.ERRORS.CANNOT_LOAD(error.message)))
            }
        })
    }

    load(args, options = {}) {
        if (!this.exists) {
            // First make sure the file exists
            return Promise.reject(new Error(_.ERRORS.CANNOT_LOAD('it does not exist')))
        }

        // Let's see if this is a recognized file y]type 
        this.detectType()

        // Process the file
        return this.process(args, options)
    }

    copy(dest) {
        // Create sub directories if necessary
        const dir = path.resolve(dest, path.dirname(this.filepath))
        fs.existsSync(dir) || fs.mkdirs(dir)

        return new Promise((resolve, reject) => {
            // Let's move the file over
            fs.copySync(this.path, path.resolve(dest, this.filepath))
            
            resolve()
        })    
    }

    save(dest, args = {}) {
        if (!this.exists) {
            // First make sure the file exists
            return Promise.reject(new Error(_.ERRORS.CANNOT_SAVE('it does not exist')))
        }
        
        if (!fs.existsSync(dest)) {
            // First make sure the destination location
            return Promise.reject(new Error(_.ERRORS.CANNOT_SAVE('the destination does not exist')))
        }

        // Let's see if this is a recognized file type 
        this.detectType()

        if (!this.isCompilable) {
            // Let's move the file over
            return this.copy(dest)
        }

        // Create sub directories if necessary
        const dir = path.resolve(dest, path.dirname(this.filepath))
        fs.existsSync(dir) || fs.mkdirsSync(dir)

        // Load and then save it
        return this.load(args).then((output) => {
            fs.writeFileSync(path.resolve(dest, this.filepath), output, 'utf8')
        })

    }
}

_.ERRORS = {
    CANNOT_LOAD: (reason) => reason ? `Cannot load file because ${reason}` : `Cannot load file`,
    CANNOT_SAVE: (reason) => reason ? `Cannot save file because ${reason}` : `Cannot save file`
}

_.ADAPTERS = {
    ASSET: FileAdapter,
    IMAGE: ImageAdapter,
    JSON: FileAdapter,
    JAVASCRIPT: FileAdapter,
    CSS: FileAdapter,
    MARKDOWN: FileAdapter
}

_.TYPES = {
    ASSET: "ASSET_TYPE",
    IMAGE: ["PNG", "JPG", "JPEG", "GIF", "SVG"],
    JSON: ["JSON"],
    JAVASCRIPT: ["JS"],
    CSS: ["CSS"],
    MARKDOWN: ["MD"]
}

_.NONCOMPILABLE_TYPES = [ _.TYPES.ASSET, _.TYPES.IMAGE ]

module.exports = _