const path = require('path')
const archiver = require('archiver')
const Jimp = require('jimp')
const fs = require('fs')

class Prepare {
  constructor (options) {
    this.options = Object.assign({}, options)
  }

  async runTasks () {
    if (this.options.pathToIcon) {
      await this.convertImages('icon(.*?)src="([^"]+)"', this.options.pathToIcon)
    }
    if (this.options.pathToSplash) {
      await this.convertImages('splash(.*?)src="([^"]+)"', this.options.pathToSplash)
    }
    await this.updateConfigXml()
    await this.archivePhoneGapFiles()
    return true
  }

  async convertImages (findAttRegExp, newImage) {
    let config = fs.readFileSync(this.options.configFilePath).toString()
    let regExp = new RegExp(findAttRegExp, 'img')
    let icons = []
    config.replace(regExp, (...args) => {
      icons.push(path.join(this.options.pathToPhonegap, args[2]))
    })
    for (let i = 0; i < icons.length; i++) {
      let [height, width] = await Jimp.read(icons[i]).then(icon => {
        return [icon.bitmap.height, icon.bitmap.width]
      })
      await Jimp.read(newImage).then(icon => {
        return icon.contain(width, height).write(icons[i])
      })
      console.log('Convert to ', height, 'x', width, ', save in ', icons[i])
    }
    return true
  }

  updateConfigXml () {
    return new Promise((resolve, reject) => {
      let configChangedFilePath = this.options.configFilePath + '.changed'
      let appVersion = this.options.version || '1.0.0'
      let needWrite = false

      fs.readFile(this.options.configFilePath, function (err, data) {
        if (err) {
          throw err
        }
        data = data.toString()
        let versionRegExp = new RegExp(/ version="([^"]+)" /)
        let match = data.match(versionRegExp)
        if (match && match.length) {
          let configVersion = match[1]
          if (appVersion && configVersion != appVersion) {
            console.log('bump version to ', appVersion)
            needWrite = true
            data = data.replace(versionRegExp, ` version="${appVersion}" `)
          }
        }

        let versionCodeRegExp = new RegExp(/ versionCode="([^"]+)" /)
        match = data.match(versionRegExp)
        const addZero = (val) => {
          return val > 9
            ? `${val}`
            : `0${val}`
        }
        if (match && match.length) {
          let cD = new Date()
          let versionCode = `${cD.getUTCFullYear()}`
          versionCode += addZero(cD.getUTCMonth() + 1)
          versionCode += addZero(cD.getUTCDate())
          versionCode += addZero(cD.getUTCHours())
          versionCode += addZero(cD.getUTCMinutes())
          needWrite = true
          console.log('version code=', versionCode)
          data = data.replace(versionCodeRegExp, ` versionCode="${versionCode}" `)
        }

        if (needWrite === false) {
          resolve(true)
        } else {
          console.log('update config.xml and save to ' + configChangedFilePath)
          fs.writeFile(configChangedFilePath, data, 'utf8', function (err) {
            if (err) {
              throw err
            }
            resolve(true)
          })
        }
      })
    })
  }

  archivePhoneGapFiles () {
    return new Promise((resolve, reject) => {
      let workingDirectory = this.options.pathToPhonegap
      let configFileCnangedPath = this.options.configFilePath + '.changed'

      console.log('start zipping some files in dir ' + workingDirectory)
      let archiveFilePath = path.join(this.options.pathToPhonegap, this.options.archiveName)
      if (fs.existsSync(archiveFilePath)) {
        console.log('old archive found, remove it')
        fs.unlinkSync(archiveFilePath)
      }

      // create a file to stream archive data to
      let output = fs.createWriteStream(archiveFilePath)
      let archive = archiver('zip', {
        zlib: { level: 9 }
      })

      archive.on('error', function (err) {
        reject(err)
      })

      archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
          console.log(err)
        } else {
          reject(err)
        }
      })

      output.on('close', function() {
        let bytes = archive.pointer()
        let mb = bytes > 0
          ? (bytes / 1024 / 1024).toFixed(2)
          : 0
        console.log(mb + ' total mb')

        if (fs.existsSync(configFileCnangedPath)) {
          fs.unlinkSync(configFileCnangedPath)
        }

        console.log('archive was created in ' + archiveFilePath)

        resolve()
      })

      archive.pipe(output)

      this.options.archiveDirs.forEach(dir => {
        archive.directory(workingDirectory + '/' + dir, dir)
      })

      this.options.archiveFiles.forEach(name => {
        archive.file(workingDirectory + '/' + name, {name})
      })

      if (fs.existsSync(configFileCnangedPath)) {
        console.log('added to archive ' + configFileCnangedPath + ' as ' + this.options.configFile)
        archive.file(configFileCnangedPath, {name: this.options.configFile})
      } else {
        console.log('added to archive ' + this.options.configFilePath + ' as ' + this.options.configFile)
        archive.file(this.options.configFilePath, {name: this.options.configFile})
      }

      archive.finalize()
    })
  }
}

module.exports = Prepare
