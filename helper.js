module.exports.getBuildStatusOnEachPlatform = function (statusObj, isSilent = false) {
  let endCount = 0
  let statusStr = ''
  for (let platform in statusObj) {
    if (statusObj[platform] == 'complete' || statusObj[platform] == 'error') {
      endCount++
    }
    statusStr += platform + ':'
    statusStr += statusObj[platform] + ', '
  }
  if (isSilent === false) {
    console.log('Compile statuses:: ' + statusStr)
  }
  return endCount
}

const getAppExtByPlatform = function (platform) {
  if (platform == 'ios') {
    return 'ipa'
  } else if (platform == 'android') {
    return 'apk'
  } else if (platform == 'winphone') {
    return 'xap'
  }
  return 'unknown'
}

module.exports.getAppFileNameByPlatform = function (platform) {
  return `${platform}.${getAppExtByPlatform(platform)}`
}

// @bug: axios doesnt support upload on Node
// solution: https://github.com/axios/axios/issues/1006#issuecomment-352071490
module.exports.getPostHeaders = function (form) {
  return new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err) { reject(err) }
      let headers = Object.assign({'Content-Length': length}, form.getHeaders())
      resolve(headers)
    })
  })
}

module.exports.getTimeInMinSec = function (startAt, endAt) {
  let spentSec = (endAt - startAt) / 1000
  let min = Math.floor(spentSec / 60)
  let sec = Math.round(spentSec - (min * 60))
  return min + 'min ' + sec + 'sec'
}
