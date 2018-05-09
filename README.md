# build-phonegap-webpack-plugin
Update configs, convert icons, create archive, upload to build.phonegap.com, compile, download and upload to Google Play

## Usage
Add to webpack
```
const BuildPhonegap = require('build-phonegap-webpack-plugin')
const packageVersion = require('./package.json').version

...
  plugins: [
     ...
     new BuildPhonegap({
        version: packageVersion,
        // app id from phonegap
        appId: 999,
        // phonegap username and pass
        username: '',
        password: '',
        // files which need add archive for upload to
        // phonegap
        archiveFiles: [
            'google-services.json',
            'GoogleService-Info.plist'
        ],
        // which app need to dowload
        downloadPlatforms: [
            'android'
        ],
        // path to phonegap
        pathToPhonegap: path.resolve(__dirname, '../phonegap'),
        // icon and splash will be converted
        // set null for disable
        pathToIcon: path.resolve(__dirname, '../phonegap/icon.png'),
        pathToSplash: path.resolve(__dirname, '../phonegap/splash.png'),
        // where save downloaded app from phonegap
        pathToSaveDownloadedApp: path.resolve(__dirname, '../dist'),
        // google paly options
        googlePlay: {
          packageName: 'ru.bla-bal',
          // see section Getting google service account file
          serviceAccountKeyFilePath: path.resolve(__dirname, '../config/api-6399313721890214112-528605-9d76ab573792.json')
        }
     })  
     ...
  ]
```

## Getting google service account file
1. Enable api in google play dev console in API section: https://play.google.com/apps/publish/#ApiAccessPlace
2. Go to google dev console https://console.developers.google.com/iam-admin/serviceaccounts
3. Choose Google Play Android Developer in projects and create account, download key file
4. Set permission in play console for service account

## Version code
For use version code, set in phonegap config.xml
```
versionCode="1" android-versionCode="1"
```
It will be replace by code: YYMMDDHHMM in UTC
