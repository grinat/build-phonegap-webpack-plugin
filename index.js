const path = require('path')
const helper = require('./helper')
const Prepare = require('./Prepare')
const Phonegap = require('./Phonegap')
const GooglePlay = require('./GooglePlay')

class BuildPhonegap {

  constructor (options) {
    this.options = Object.assign({
      version: null,
      appId: null,
      username: null,
      password: null,
      configFile: 'config.xml',
      googlePlay: {},
      archiveFiles: [],
      pathToIcon: null,
      pathToSplash: null,
      pathToPhonegap: null,
      pathToSaveDownloadedApp: null,
      archiveDirs: [
        'www'
      ],
      downloadPlatforms: [
        'android'
      ],
      archiveName: 'phonegap.zip',
      axiosParams: {},
      repeats: 100,
      delay: 5000
    }, options)
    this.options.googlePlay = Object.assign({
      packageName: 'com.bla-bla',
      // 1. create in https://console.developers.google.com/iam-admin/serviceaccounts
      // 2. Enable api
      // 3. Set permision in play console for service account
      serviceAccountKeyFilePath: null,
      track: 'beta'
    }, options.googlePlay || {})
    // set options for use in classes
    this.options.configFilePath = path.join(this.options.pathToPhonegap, this.options.configFile)
    if (!this.options.axiosParams.hasOwnProperty('auth')) {
      this.options.axiosParams.auth = {
        username: this.options.username,
        password: this.options.password
      }
    }
    // create class in contructor
    // for be able to change them
    // let plugin = new BuildPhonegap()
    // plugin.prepare = new MyAwesomeClass()
    this.prepare = new Prepare(this.options)
    this.phonegap = new Phonegap(this.options)
    this.googlePlay = new GooglePlay(this.options)
  }

  updateOptions (compiler) {
    this.prepare.compiler = compiler
    this.phonegap.compiler = compiler
    this.googlePlay.compiler = compiler
  }

  apply (compiler) {
    this.updateOptions(compiler)
    compiler.plugin('after-emit', (...args) => this.onAfterEmit(...args))
  }

  onAfterEmit (compilation, callback) {
    if (compilation.errors && compilation.errors.length) {
      callback()
    } else {
      this.runTasks()
        .then(() => callback())
        .catch((e) => {
          let errorMsg = null
          if (e.response) {
            errorMsg = 'BuildPhonegap: ' + e.config.method + ' ' + e.config.url + ' ' + e.response.status + ' ' + e.response.statusText + ' '
            if (e.response.data) {
              if (typeof e.response.data === 'object') {
                errorMsg += JSON.stringify(e.response.data)
              } else {
                errorMsg += e.response.data
              }
            }
          } else {
            errorMsg = 'BuildPhonegap: ' + e.toString()
          }
          compilation.errors.push(new Error(errorMsg))
          callback()
        })
    }
  }

  async runTasks () {
    let startAt = +new Date()
    console.log('Build.phonegap start')
    await this.prepare.runTasks()
    await this.phonegap.runTasks()
    await this.googlePlay.runTasks()
    let endAt = +new Date()
    console.log('spent time ' + helper.getTimeInMinSec(startAt, endAt))
    return true
  }
}

module.exports = BuildPhonegap
