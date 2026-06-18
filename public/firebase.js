import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  enableIndexedDbPersistence,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
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

if(err.code === "failed-precondition"){

console.log(
"Multiple Tabs Open"
);

}

if(err.code === "unimplemented"){

console.log(
"Browser Not Supported"
);

}

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

window.currentUser = null;

onAuthStateChanged(
auth,
(user) => {

currentUser = user || null;

window.currentUser = currentUser;

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

localStorage.removeItem("cart");

localStorage.removeItem("wishlist");

localStorage.removeItem("checkoutProduct");

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

function protectAdmin() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    if (user.uid !== "rbSEWiqhoQWJBR8cpel02XmuAN43") {
      alert("Access Denied ❌");
      signOut(auth);
      window.location.href = "login.html";
    }
  });
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

  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,

  ref,
  uploadBytes,
  getDownloadURL,

  requireAuth,
  logout,
  getUser,
  protectAdmin
};

console.log(
"🔥 FIREBASE CONNECTED SUCCESSFULLY"
);