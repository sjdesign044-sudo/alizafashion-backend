import { db } from "./firebase.js";

import {
collection,
getDocs,
addDoc,
serverTimestamp,
deleteDoc,
updateDoc,
doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("ALIZAFASHION FINAL");

/* =========================
MENU
========================= */

const menuBtn =
document.querySelector(".menu-btn");

const mobileMenu =
document.querySelector(".mobile-menu");

const closeMenu =
document.querySelector(".close-menu");

if(menuBtn && mobileMenu){

menuBtn.onclick = () => {

mobileMenu.classList.add("show");

};

}

if(closeMenu && mobileMenu){

closeMenu.onclick = () => {

mobileMenu.classList.remove("show");

};

}

document
.querySelectorAll(".mobile-menu a")
.forEach((link) => {

link.onclick = () => {

mobileMenu.classList.remove("show");

};

});

/* =========================
SEARCH
========================= */

const searchBtn =
document.querySelector(".search-btn");

const searchBox =
document.querySelector(".search-box");

const closeSearch =
document.querySelector(".close-search");

const searchInput =
document.getElementById("searchInput");

if(searchBtn && searchBox){

searchBtn.onclick=()=>{

searchBox.classList.add("active");

searchInput.focus();

searchInput.select();

filterProducts();

};

}

if(closeSearch && searchBox){

closeSearch.onclick=()=>{

searchBox.classList.remove("active");

searchInput.value="";

document.getElementById(
"searchResults"
).innerHTML="";

filterProducts();

};

}

/* =========================
NAVBAR SHADOW
========================= */

window.addEventListener(
"scroll",
() => {

const navbar =
document.querySelector(".navbar");

if(!navbar) return;

if(window.scrollY > 50){

navbar.style.boxShadow =
"0 5px 20px rgba(0,0,0,.5)";

}else{

navbar.style.boxShadow =
"none";

}

}
);

/* =========================
LOCAL STORAGE
========================= */

let cart =
JSON.parse(
localStorage.getItem("cart")
) || [];

let wishlist =
JSON.parse(
localStorage.getItem("wishlist")
) || [];

let appliedCoupon = "";
let discountAmount = 0;

/* =========================
ICONS
========================= */

const cartIconBox =
document.querySelector(".cart-icon-box");

const wishlistBtn =
document.querySelector(".wishlist-btn");

const wishlistSidebar =
document.querySelector(".wishlist-sidebar");

/* =========================
CREATE CART SIDEBAR
========================= */

const cartSidebar =
document.createElement("div");

cartSidebar.className =
"cart-sidebar";

cartSidebar.innerHTML = `

<div class="cart-header">

<h2>Your Cart</h2>

<span class="close-cart">
&times;
</span>

</div>

<div class="cart-content"></div>

`;

document.body.appendChild(cartSidebar);

/* =========================
TOAST
========================= */

function showToast(message){

const toast =
document.createElement("div");

toast.className =
"toast";

toast.innerText =
message;

document.body.appendChild(toast);

setTimeout(() => {

toast.remove();

},2000);

}

/* =========================
COUNTS
========================= */

function updateCartCount(){

const cartCount =
document.getElementById("cart-count");

if(!cartCount) return;

const totalQty =
cart.reduce(
(total,item) =>
total + item.qty,
0
);

cartCount.innerText =
totalQty;

}

function updateWishlistCount(){

const wishlistCount =
document.getElementById(
"wishlist-count"
);

if(!wishlistCount) return;

wishlistCount.innerText =
wishlist.length;

}

updateCartCount();
updateWishlistCount();

/* =========================
SAVE
========================= */

function saveCart(){

localStorage.setItem(
"cart",
JSON.stringify(cart)
);

updateCartCount();

}

function saveWishlist(){

localStorage.setItem(
"wishlist",
JSON.stringify(wishlist)
);

updateWishlistCount();

}

/* =========================
ADD TO CART
========================= */

function addToCart(product){

  if(
Number(product.stock || 0) <= 0
){

showToast(
"Out Of Stock ❌"
);

return;

}

const existing =
cart.find((item) => item.id === product.id);

if(existing){

existing.qty += 1;

}else{

cart.push({
  id: product.id,
  name: product.name,
  price: product.price,
  image: product.image,
  qty: 1
});

}

saveCart();

renderCart();

cartSidebar.classList.add(
"active"
);

showToast(
"Product Added To Cart ✅"
);

}

/* =========================
BUY NOW
========================= */

function buyNow(product){

localStorage.setItem(
"checkoutProduct",
JSON.stringify({
id: product.id,
name: product.name,
price: product.price,
image: product.image,
qty: 1
})
);

window.location.href =
"checkout.html";

}

/* =========================
WISHLIST
========================= */

function toggleWishlist(product){

const exists =
wishlist.find(
(item) =>
item.id === product.id
);

if(exists){

wishlist =
wishlist.filter(
(item) =>
item.id !== product.id
);

showToast(
"Removed From Wishlist"
);

}else{

wishlist.push({
  id: product.id,
  name: product.name,
  price: product.price,
  image: product.image
});

showToast(
"Added To Wishlist ❤️"
);

}

saveWishlist();

renderWishlist();

loadProducts();

}

/* =========================
RENDER WISHLIST
========================= */

function renderWishlist(){

const wishlistContent =
document.querySelector(
".wishlist-content"
);

if(!wishlistContent) return;

if(wishlist.length === 0){

wishlistContent.innerHTML = `

<div class="empty-cart">

<i class="fa-regular fa-heart"></i>

<h3>
Wishlist Empty
</h3>

</div>

`;

return;

}

wishlistContent.innerHTML = "";

wishlist.forEach((item) => {

wishlistContent.innerHTML += `

<div class="cart-item">

<img src="${item.image}">

<div class="cart-item-info">

<h4>${item.name}</h4>

<p>${item.price}</p>

</div>

</div>

`;

});

}

/* =========================
RENDER CART
========================= */

function renderCart(){

const cartContent =
document.querySelector(
".cart-content"
);

if(!cartContent) return;

if(cart.length === 0){

cartContent.innerHTML = `

<div class="empty-cart">

<i class="fa-solid fa-bag-shopping"></i>

<h3>
Your Cart Is Empty
</h3>

</div>

`;

return;

}

let total = 0;

cartContent.innerHTML = "";

cart.forEach((item,index) => {

const itemPrice = Number(item.price) || 0;

total +=
itemPrice * item.qty;

cartContent.innerHTML += `

<div class="cart-item">

<img src="${item.image}">

<div class="cart-item-info">

<h4>${item.name}</h4>

<p>${item.price}</p>

<div class="qty-box">

<button
class="qty-btn"
onclick="decreaseQty(${index})"
>
-
</button>

<span>${item.qty}</span>

<button
class="qty-btn"
onclick="increaseQty(${index})"
>
+
</button>

</div>

<button
class="remove-btn"
onclick="removeItem(${index})"
>
Remove
</button>

</div>

</div>

`;

});

const finalTotal = total - discountAmount;

cartContent.innerHTML += `

<div class="cart-total">

<div class="coupon-box">

<input
type="text"
id="couponCode"
placeholder="Enter Coupon"
>

<button onclick="applyCoupon(${total})">
Apply
</button>

</div>

${discountAmount > 0 ? `
<div class="discount-row">
Discount: ₹${discountAmount}
</div>
` : ""}

<h3 class="final-total">
Total: ₹${finalTotal}
</h3>

<button class="checkout-btn">

Proceed To Checkout

</button>

</div>

`;

const checkoutBtn =
document.querySelector(".checkout-btn");

if(checkoutBtn){

checkoutBtn.onclick = () => {

if(cart.length === 0) return;

localStorage.setItem(
"checkoutProduct",
JSON.stringify(cart[0])
);

window.location.href =
"checkout.html";

};

}

}

/* =========================
QTY FUNCTIONS
========================= */

window.increaseQty =
(index) => {

cart[index].qty += 1;

saveCart();

renderCart();

};

window.decreaseQty =
(index) => {

if(cart[index].qty > 1){

cart[index].qty -= 1;

}else{

cart.splice(index,1);

}

saveCart();

renderCart();

};

window.applyCoupon = (total) => {

const code =
document.getElementById("couponCode")
.value
.trim()
.toUpperCase();

if(code === "ALIZA10"){

discountAmount =
Math.floor(total * 0.10);

appliedCoupon = code;

showToast(
"10% Discount Applied ✅"
);

}
else{

discountAmount = 0;

showToast(
"Invalid Coupon ❌"
);

}

renderCart();

};

window.removeItem =
(index) => {

cart.splice(index,1);

saveCart();

renderCart();

};

/* =========================
OPEN SIDEBARS
========================= */

if(cartIconBox){

cartIconBox.onclick = () => {

cartSidebar.classList.add(
"active"
);

renderCart();

};

}

if(wishlistBtn && wishlistSidebar){

wishlistBtn.onclick = () => {

wishlistSidebar.classList.toggle(
"active"
);

renderWishlist();

};

}

/* =========================
BUTTON EVENTS
========================= */

document.addEventListener(
"click",
(e) => {

const productCard =
e.target.closest(
".product-card"
);

if(!productCard) return;

const product = {

id:
productCard.dataset.id,

name:
productCard.querySelector("h3")
.innerText,

price:
Number(
productCard.querySelector("h4")
.innerText.replace("₹","")
),

image:
productCard.querySelector("img")
.src,

stock:
Number(
productCard.dataset.stock || 0
)

};

if(
e.target.classList.contains(
"cart-btn"
)
){

e.stopPropagation();

addToCart(product);

}

if(
e.target.classList.contains(
"buy-btn"
)
){

e.stopPropagation();

buyNow(product);

}

const wishlistButton =
e.target.closest(".wishlist-icon");

if(wishlistButton){

toggleWishlist(product);

}

}
);

/* =========================
LOAD PRODUCTS
========================= */

async function loadProducts(){

const productGrid =
document.querySelector(
".product-grid"
);

if(!productGrid) return;

try{

const snap =
await getDocs(
collection(db,"products")
);

console.log("STEP 1 - FUNCTION CALLED");
console.log("TOTAL DOCS:", snap.size);

productGrid.innerHTML = "";

if(snap.empty){

productGrid.innerHTML = `

<h3 style="
text-align:center;
grid-column:1/-1;
">

No Products Found

</h3>

`;

return;

}

snap.forEach((docItem) => {

const p =
docItem.data();

 const product = {
  id: docItem.id,
  name: p.name,
  price: p.price,
  image: p.image
};

const isWishlisted =
wishlist.find(
(item) =>
item.id === docItem.id
);

productGrid.innerHTML += `

<div class="product-card"
data-id="${docItem.id}"
data-stock="${p.stock || 0}"
onclick="openProduct('${docItem.id}')">

<div class="wishlist-icon
${isWishlisted ? "active" : ""}">

<i class="fa-solid fa-heart"></i>

</div>

<img src="${p.images?.[0] || p.image}">

<div class="product-info">

<h3>${p.name}</h3>

<h4>₹${p.price}</h4>

<div class="stars">
★★★★★
</div>

<div class="reviews">

<span>(4.8)</span>

<span class="review-count">
124 Reviews
</span>

</div>

<div class="product-buttons">

<button
class="cart-btn"
${Number(p.stock || 0) <= 0 ? "disabled" : ""}
>
${Number(p.stock || 0) <= 0 ? "OUT OF STOCK" : "ADD TO CART"}
</button>

<button
class="buy-btn"
${Number(p.stock || 0) <= 0 ? "disabled" : ""}
>
${Number(p.stock || 0) <= 0 ? "OUT OF STOCK" : "BUY NOW"}
</button>

</div>

</div>

</div>

`;

});

filterProducts();

}catch(error){

console.log(error);

}

}

/* =========================
START
========================= */

loadProducts();

renderCart();

renderWishlist();

function filterProducts(){

const value=
searchInput.value.trim().toLowerCase();

const cards=
document.querySelectorAll(".product-card");

const resultBox=
document.getElementById("searchResults");

if(resultBox){

resultBox.innerHTML="";

}

let found=0;

cards.forEach(card=>{

const name=
card.querySelector("h3")
.innerText
.toLowerCase();

const price=
card.querySelector("h4")
.innerText
.replace("₹","")
.toLowerCase();

if(

name.includes(value)

||

price.includes(value)

){

card.style.display="";

found++;

if(resultBox && value!=""){

resultBox.innerHTML+=`

<div
class="search-item"
onclick="openProduct('${card.dataset.id}')"
>

<img src="${
card.querySelector("img").src
}">

<div>

<h4>
${
card.querySelector("h3").innerText
}
</h4>

<p>
${
card.querySelector("h4").innerText
}
</p>

</div>

</div>

`;

}

}else{

card.style.display="none";

}

});

if(resultBox && value!="" && found===0){

resultBox.innerHTML=`

<div class="search-empty">

No Products Found

</div>

`;

}

if(resultBox && value===""){

resultBox.innerHTML="";

cards.forEach(card=>{

card.style.display="";

});

}

}

if(searchInput){

searchInput.addEventListener(
"input",
filterProducts
);

searchInput.addEventListener(
"keyup",
(e)=>{

if(e.key==="Enter"){

const first=
document.querySelector(".search-item");

if(first){

first.click();

}

}

});

}

/* =========================
PRODUCT DETAIL NAVIGATION
========================= */

window.openProduct = (id) => {

  if (!id) {
    console.error("Product ID missing");
    return;
  }

  window.location.href = "product.html?id=" + encodeURIComponent(id);
};

/* =========================
MOBILE MENU ACCORDION
========================= */

document
.querySelectorAll(".accordion-title")
.forEach((item)=>{

item.addEventListener("click",()=>{

item.parentElement.classList.toggle(
"active"
);

});

});