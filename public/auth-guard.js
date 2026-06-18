import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMIN_UID = "rbSEWiqhoQWJBR8cpel02XmuAN43";

export function protectAdmin() {

  onAuthStateChanged(auth, (user) => {

    if (!user) {
      window.location.href = "login.html";
      return;
    }

    if (user.uid !== ADMIN_UID) {
      alert("❌ Access Denied: Admin Only");
      window.location.href = "login.html";
      return;
    }

    console.log("✅ Admin Verified");
  });

}