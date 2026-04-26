// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyCwMowpwjmzJaSR6tnjDJ04_8xS3--fg8I',
    authDomain: 'signbridge-577bb.firebaseapp.com',
    projectId: 'signbridge-577bb',
    storageBucket: 'signbridge-577bb.firebasestorage.app',
    messagingSenderId: '606133422674',
    appId: '1:606133422674:web:771e842541ce6616c1ed8b',
    measurementId: 'G-M0XJSZ0THZ',
  },
  geminiApiKey: 'AIzaSyAmQL2w7PB4Cx_BCm-mTCUfOjC8Q7zEJgI',
  reCAPTCHAKey: '6Ldsxb8oAAAAAGyUZbyd0QruivPSudqAWFygR-4t',
  // Dev: empty string so relative paths like /spoken_text_to_signed_pose route through the Angular proxy
  signMtBase: '',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
