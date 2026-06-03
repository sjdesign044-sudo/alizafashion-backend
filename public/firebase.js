import { initializeApp }

from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {

getFirestore,
enableIndexedDbPersistence

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {

getAuth,
onAuthStateChanged,
signOut

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {

getStorage

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* =========================
FIREBASE CONFIG
========================= */

const firebaseConfig = {

apiKey:
"AIzaSyDGpTZtglp_RVvHYNigN11IlxA3KAuldCA",

authDomain:
"alizafashion-40758.firebaseapp.com",

projectId:
"alizafashion-40758",

storageBucket:
"alizafashion-40758.firebasestorage.app",

messagingSenderId:
"105714332272",

appId:
"1:105714332272:web:a3376665faf47e9d0d3ab5"

};

/* =========================
INIT FIREBASE
========================= */

const app =
initializeApp(firebaseConfig);

/* =========================
SERVICES
========================= */

const db =
getFirestore(app);

const auth =
getAuth(app);

const storage =
getStorage(app);

/* =========================
ENABLE CACHE
========================= */

try{

enableIndexedDbPersistence(db)
.catch((err) => {

console.log(
"Firestore Cache Error:",
err.code
);

});

}catch(error){

console.log(
"Persistence Error:",
error
);

}

/* =========================
CURRENT USER
========================= */

let currentUser = null;

onAuthStateChanged(
auth,
(user) => {

currentUser = user || null;

}
);

/* =========================
AUTH CHECK
========================= */

function requireAuth(
redirectUrl = "login.html"
){

onAuthStateChanged(
auth,
(user) => {

if(!user){

window.location.href =
redirectUrl;

}

}
);

}

/* =========================
LOGOUT
========================= */

async function logout(){

try{

await signOut(auth);

localStorage.clear();

sessionStorage.clear();

window.location.href =
"login.html";

}catch(error){

console.log(error);

alert(
"Logout Failed"
);

}

}

/* =========================
GET USER
========================= */

function getUser(){

return currentUser;

}

/* =========================
EXPORTS
========================= */

export {

db,

auth,

storage,

requireAuth,

logout,

getUser

};

console.log(
"🔥 FIREBASE CONNECTED SUCCESSFULLY"
);