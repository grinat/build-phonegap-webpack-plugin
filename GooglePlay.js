const path = require('path')
const fs = require('fs')
const {google} = require('googleapis')
const helper = require('./helper')

class GooglePlay {
  constructor (options) {
    this.options = Object.assign({}, options)
  }

  async runTasks () {
    if (this.options.downloadPlatforms.indexOf('android') > -1) {
      if (this.options.googlePlay.serviceAccountKeyFilePath) {
        this.googlePlayEditId = +new Date()
        console.log('get google play tokens...')
        await this.initGoogleApi()
        console.log('inserting to google play...')
        await this.insert()
        console.log('upload to google play...')
        const {data: {uploadResults}} = await this.upload()
        console.log('set track for', uploadResults)
        await this.update(uploadResults.versionCode)
        console.log('comiting...')
        const result = await this.commit()
        console.log('app in google play ', result)
      } else {
        console.log('uploading to GooglePlay skiped, no serviceAccountKeyFilePath')
      }
    }
    return true
  }

  async initGoogleApi () {
    const client = await google.auth.getClient({
      keyFile: this.options.googlePlay.serviceAccountKeyFilePath,
      scopes: 'https://www.googleapis.com/auth/androidpublisher'
    })
    this.play = google.androidpublisher({
      version: 'v2',
      auth: client,
      params: {
        packageName: this.options.googlePlay.packageName
      }
    })
    return true
  }

  insert () {
    return this.play.edits.insert({
      id: this.googlePlayEditId,
      expiryTimeSeconds: 600
    })
  }

  upload () {
    let file = fs.readFileSync(
      path.join(
        this.options.pathToSaveDownloadedApp,
        helper.getAppFileNameByPlatform('android')
      )
    )
    return this.play.edits.apks.upload({
      editId: this.googlePlayEditId,
      media: {
        mimeType: 'application/vnd.android.package-archive',
        body: file
      }
    })
  }

  update (versionCode) {
    return this.play.edits.tracks.update({
      editId: this.googlePlayEditId,
      packageName: this.options.googlePlay.packageName,
      track: this.options.googlePlay.track,
      resource: {
        track: this.options.googlePlay.track,
        versionCodes: [versionCode]
      }
    })
  }

  commit () {
    return this.play.edits.commit({
      editId: this.googlePlayEditId
    })
  }
}

module.exports = GooglePlay
