const path = require('path')
const fs = require('fs')
const axios = require('axios-https-proxy-fix')
const FormData = require('form-data')
const helper = require('./helper')

class Phonegap {
  constructor (options) {
    this.buildDomain = 'https://build.phonegap.com'
    this.options = Object.assign({}, options)
  }

  async runTasks () {
    console.log('uploading...')
    await this.uploadArchive()
    console.log('adding to queue...')
    await this.buildApp()
    console.log('waiting compile...')
    let response = await this.checkBuildStatusWhileAllPlatformCompileEnded()
    console.log('downloading...')
    console.log('compile ended v' + response.version)
    if (this.options.pathToSaveDownloadedApp) {
      console.log('start downloading...')
      for (let i = 0; i < this.options.downloadPlatforms.length; i++) {
        let platform = this.options.downloadPlatforms[i]
        await this.downloadAndSaveApp(platform)
      }
    }
    return true
  }

  downloadAndSaveApp (platform) {
    console.log('start app downloading for ' + platform + '...')
    return axios.get(
      this.buildDomain + '/api/v1/apps/' + this.options.appId + '/' + platform,
      Object.assign(this.options.axiosParams, {
        responseType: 'arraybuffer'
      })
    ).then(({data}) => {
      let saveTo = path.join(this.options.pathToSaveDownloadedApp, helper.getAppFileNameByPlatform(platform))
      fs.writeFile(
        saveTo,
        data,
        function (err) {
          if (err) {
            throw err
          }
          console.log('downloaded and saved to ' + saveTo)
          return Promise.resolve(true)
        }
      )
    })
  }

  async checkBuildStatusWhileAllPlatformCompileEnded () {
    let result = {}
    let i = 0
    for (; i < this.options.repeats; i++) {
      let delay = i > 0
        ? this.options.delay
        : 0
      let response = await new Promise((resolve, reject) => {
        setTimeout(() => {
          axios.get(
            this.buildDomain + '/api/v1/apps/' + this.options.appId,
            this.options.axiosParams
          ).then(({data}) => {
            resolve(data)
          }).catch(e => {
            resolve({})
          })
        }, delay)
      })
      if (response && response.status) {
        let errors = []
        let complete = []
        let completeDownloadsPlatform = []
        let msg = ['Statuses']
        for (let platform in response.status) {
          let status = response.status[platform]
          if (status == 'complete') {
            complete.push(platform)
            if (this.options.downloadPlatforms.indexOf(platform) > -1) {
              completeDownloadsPlatform.push(platform)
            }
          } else if (status == 'error') {
            if (this.options.downloadPlatforms.indexOf(platform) > -1) {
              let err = 'Build for platfrom downloadPlatforms ' + platform + ' was failed: '
              if (response.error && response.error[platform]) {
                err += ' reason: ' + response.error[platform]
              } else {
                err += ' reason: unknown compile status'
              }
              throw new Error(err)
            }
            errors.push(platform)
          }
          msg.push(platform + ':' + status)
        }
        let platformsCount = Object.keys(response.status).length
        let compileCount = errors.length + complete.length
        if (compileCount === platformsCount || completeDownloadsPlatform.length === this.options.downloadPlatforms.length) {
          result = response
          console.log(msg.join(', '))
          break
        }

        if (i % 3 === 0 || i === 0) {
          console.log(msg.join(', '))
        }
      }
    }
    if (i < this.options.repeats) {
      return result
    } else {
      throw new Error('max repeated count is exceeded')
    }
  }

  buildApp () {
    return axios.post(
      this.buildDomain + '/api/v1/apps/' + this.options.appId + '/build',
      {},
      this.options.axiosParams
    )
  }

  uploadArchive () {
    let archiveFilePath = path.join(this.options.pathToPhonegap, this.options.archiveName)
    let form = new FormData()
    form.append('file', fs.createReadStream(archiveFilePath), this.options.archiveName)
    let buildSetting = {}
    form.append('data', JSON.stringify(buildSetting))

    // @bug: axios doesnt support upload on Node
    // solution: https://github.com/axios/axios/issues/1006#issuecomment-352071490
    return helper.getPostHeaders(form).then(headers => {
      return axios.put(
        this.buildDomain + '/api/v1/apps/' + this.options.appId,
        form,
        Object.assign({headers}, this.options.axiosParams)
      )
    })
  }
}

module.exports = Phonegap
