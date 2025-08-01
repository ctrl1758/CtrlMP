const admin = require("firebase-admin");

var serviceAccount = require("./credCtrlMp.json");

const {
  getFirestore,

} = require("firebase-admin/firestore");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore();


module.exports = {
  db,
};