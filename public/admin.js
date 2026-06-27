import {
db,
storage,
logout,
protectAdmin
} from "./firebase.js";

import {
collection,
addDoc,
getDocs,
getDoc,
deleteDoc,
doc,
serverTimestamp,
updateDoc,
setDoc,
query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
ref,
uploadBytes,
getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* =========================
ADMIN PROTECTION
========================= */

protectAdmin();

window.logout = logout;

/* =========================
MESSAGE
========================= */

function setMsg(text){

const msg =
document.getElementById("msg");

if(msg){

msg.innerText = text;

}

}

/* =========================
ADD PRODUCT
========================= */

async function addProduct(){

const nameInput =
document.getElementById("name");

const priceInput =
document.getElementById("price");

const descriptionInput =
document.getElementById("description");

const detailsInput =
document.getElementById("details");

const fabricInput =
document.getElementById("fabric");

const blouseTypeInput =
document.getElementById("blouseType");

const sareeLengthInput =
document.getElementById("sareeLength");

const shippingInput =
document.getElementById("shipping");

const returnPolicyInput =
document.getElementById("returnPolicy");

const stockInput =
document.getElementById("stock");

const categoryInput =
document.getElementById("category");

const imageInput =
document.getElementById("image");

const name =
nameInput.value.trim();

const price =
priceInput.value.trim();

const description =
descriptionInput.value.trim();

const details =
detailsInput ? detailsInput.value.trim() : "";

const fabric =
fabricInput ? fabricInput.value.trim() : "";

const blouseType =
blouseTypeInput ? blouseTypeInput.value.trim() : "";

const sareeLength =
sareeLengthInput ? sareeLengthInput.value.trim() : "";

const shipping =
shippingInput ? shippingInput.value.trim() : "";

const returnPolicy =
returnPolicyInput ? returnPolicyInput.value.trim() : "";

const stock =
stockInput.value.trim();

const category =
categoryInput.value;

const files =
imageInput.files;

if(
!name ||
!price ||
!description ||
!stock ||
!category
){
setMsg("❌ Please Fill All Fields");
return;
}

try{

  if(editingId){

let updateData = {
name,
price:Number(price),
description,
details,
fabric,
blouseType,
sareeLength,
shipping,
returnPolicy,
stock:Number(stock),
category
};

if(files.length > 0){

const imageUrls = [];

for(const file of files){

const imageRef = ref(
storage,
`products/${Date.now()}_${file.name}`
);

await uploadBytes(imageRef,file);

const url = await getDownloadURL(imageRef);

imageUrls.push(url);

}

updateData.image = imageUrls[0];
updateData.images = imageUrls;

}

await updateDoc(
doc(db,"products",editingId),
updateData
);

setMsg("✅ Product Updated");

editingId = null;

document.getElementById("addProductBtn").innerText =
"Add Product";

loadProducts();

return;

}

setMsg(
"📤 Uploading Product..."
);

const imageUrls = [];

for(const file of files){

const imageRef = ref(
storage,
`products/${Date.now()}_${file.name}`
);

await uploadBytes(
imageRef,
file
);

const url =
await getDownloadURL(imageRef);

imageUrls.push(url);

}

await addDoc(
collection(db,"products"),
{

name,
price:Number(price),

description,
details,
fabric,
blouseType,
sareeLength,

shipping,
returnPolicy,

stock:Number(stock),

category,

image:imageUrls[0],

images:imageUrls,

createdAt:
serverTimestamp()

}
);

setMsg(
"✅ Product Added Successfully"
);

nameInput.value = "";
priceInput.value = "";
descriptionInput.value = "";
stockInput.value = "";
categoryInput.value = "";
imageInput.value = "";
detailsInput.value = "";
fabricInput.value = "";
blouseTypeInput.value = "";
sareeLengthInput.value = "";
shippingInput.value = "";
returnPolicyInput.value = "";

loadProducts();

}catch(error){

console.log(error);

setMsg(
"❌ " + error.message
);

}

}

let editingId = null;

window.addProduct =
addProduct;

/* =========================
EDIT PRODUCT
========================= */

window.editProduct = async function(id){

const snap =
await getDoc(doc(db,"products",id));

const p = snap.data();

editingId = id;

document.getElementById("name").value =
p.name || "";

document.getElementById("price").value =
p.price || "";

document.getElementById("description").value =
p.description || "";

document.getElementById("details").value =
p.details || "";

document.getElementById("fabric").value =
p.fabric || "";

document.getElementById("blouseType").value =
p.blouseType || "";

document.getElementById("sareeLength").value =
p.sareeLength || "";

document.getElementById("shipping").value =
p.shipping || "";

document.getElementById("returnPolicy").value =
p.returnPolicy || "";

document.getElementById("stock").value =
p.stock || "";

document.getElementById("category").value =
p.category || "";

document.getElementById("addProductBtn").innerText =
"Update Product";

};

/* =========================
LOAD PRODUCTS
========================= */

async function loadProducts(){

  const productsBox =
  document.getElementById("products");

  if(!productsBox) return;

  try{

    const snap =
    await getDocs(collection(db,"products"));

    if(snap.empty){

      productsBox.innerHTML = `
        <p>No Products Found</p>
      `;

      return;
    }

    let totalProducts = 0;

productsBox.innerHTML = "";

snap.forEach((d) => {
  totalProducts++;

  const p = d.data();

  productsBox.innerHTML += `
    <div onclick="openProduct('${d.id}')"
    style="border:1px solid #444;padding:15px;margin-bottom:15px;background:#222;border-radius:8px;cursor:pointer;">

      <img src="${p.image}" width="120" style="border-radius:5px;margin-bottom:10px;">

      <h3>${p.name}</h3>

      <p>💰 Price: <b>₹${p.price}</b></p>

      <p>📦 Stock: <b>${p.stock || 0}</b></p>

      <p>🏷 Category: <b>${p.category || "-"}</b></p>

      <p>📝 Description:<br>${p.description || "-"}</p>

      <p>📋 Details:<br>${p.details || "-"}</p>

      <p>🧵 Fabric: <b>${p.fabric || "-"}</b></p>

      <p>🚚 Shipping:<br>${p.shipping || "-"}</p>

<p>↺ Return Policy:<br>${p.returnPolicy || "-"}</p>

      <br>

      <button onclick="event.stopPropagation(); editProduct('${d.id}')">
        Edit
      </button>

      <button onclick="event.stopPropagation(); deleteProduct('${d.id}')">
        Delete
      </button>

    </div>
  `;
});

const tp = document.getElementById("totalProducts");
if(tp) tp.innerText = totalProducts;

  }catch(error){

    console.log(error);
    setMsg("❌ " + error.message);

  }

}

/* =========================
LOAD CUSTOMERS
========================= */

async function loadCustomers(){

const customersBox =
document.getElementById("customers");

if(!customersBox) return;

try{

const snap =
await getDocs(collection(db,"orders"));

const customers = {};

snap.forEach((d)=>{

const o = d.data();

if(!o.customerPhone) return;

customers[o.customerPhone] = {
name:o.customerName || "N/A",
phone:o.customerPhone,
address:o.customerAddress || "-"
};

});

customersBox.innerHTML = "";

Object.values(customers).forEach((c)=>{

customersBox.innerHTML += `

<div style="
background:#222;
padding:15px;
margin-bottom:10px;
border-radius:8px;
">

<h3>${c.name}</h3>

<p>📞 ${c.phone}</p>

<p>📍 ${c.address}</p>

</div>

`;

});

}catch(error){

console.log(error);

}

}

/* =========================
LOAD RETURNS
========================= */

async function loadReturns(){

const returnsBox =
document.getElementById("returns");

if(!returnsBox) return;

returnsBox.innerHTML = `
<h3>No Returns Found</h3>
`;

}

/* =========================
LOAD ORDERS
========================= */

async function loadOrders(){

const ordersBox =
document.getElementById(
"orders"
);

if(!ordersBox) return;

try{

const snap =
await getDocs(
collection(db,"orders")
);

ordersBox.innerHTML = "";

if(snap.empty){

ordersBox.innerHTML = `

<p>
No Orders Found
</p>

`;

return;

}

let totalOrders = 0;

ordersBox.innerHTML = "";

snap.forEach((d) => {
  totalOrders++;

  const o = d.data();

  let itemsHTML = "";

  if (o.items) {
    o.items.forEach((item) => {
      itemsHTML += `
        <div style="display:flex;gap:10px;align-items:center;margin-top:10px;border-bottom:1px solid #333;padding-bottom:10px;">

          <img src="${item.image}" width="60" height="70" style="object-fit:cover;border-radius:5px;">

          <div>
            <b>${item.name}</b><br>
            ₹${item.price}<br>
            Qty: ${item.qty}
          </div>

        </div>
      `;
    });
  }

  ordersBox.innerHTML += `
    <div style="border:1px solid #444;padding:15px;margin-bottom:15px;background:#222;border-radius:8px;">

      <h3>👤 ${o.customerName || "N/A"}</h3>
      <p><b>Invoice No:</b> ${o.invoiceNo || "-"}</p>
      <p><b>Date:</b> ${o.orderDate || "-"}</p>
      <p>📞 ${o.customerPhone || "N/A"}</p>
      <p>📍 ${o.customerAddress || "N/A"}</p>

      <hr style="margin:10px 0;">

      ${itemsHTML}

      <hr style="margin:10px 0;">

      <h4>💰 Total: ₹${o.total || 0}</h4>

      <p>📦 Status: <b>${o.status || "Pending"}</b></p>

      <button onclick="updateStatus('${d.id}','Pending')">Pending</button>
      <button onclick="updateStatus('${d.id}','Shipped')">Shipped</button>
      <button onclick="updateStatus('${d.id}','Delivered')">Delivered</button>
      <button onclick="printInvoice('${d.id}')">
Print Invoice
</button>

<button onclick="downloadInvoice('${d.id}')">
Download PDF
</button>

<button onclick="sendWhatsapp('${d.id}')">
WhatsApp
</button>

<button onclick="deleteOrder('${d.id}')">
Delete
</button>

    </div>
  `;
});

const to = document.getElementById("totalOrders");
if(to) to.innerText = totalOrders;

}catch(error){

console.log(error);

setMsg(
"❌ " + error.message
);

}

}
/* =========================
DELETE PRODUCT
========================= */

window.deleteProduct =
async function(id){

const ok =
confirm(
"Delete Product?"
);

if(!ok) return;

try{

await deleteDoc(
doc(
db,
"products",
id
)
);

setMsg(
"✅ Product Deleted"
);

loadProducts();

}catch(error){

console.log(error);

setMsg(
"❌ " +
error.message
);

}

};

/* =========================
UPDATE ORDER STATUS
========================= */

window.updateStatus = async function(id, status) {

  try {

    await updateDoc(
      doc(db, "orders", id),
      { status }
    );

    setMsg("✅ Status Updated");
    loadOrders();

  } catch (error) {
    console.log(error);
    setMsg("❌ " + error.message);
  }

};


/* =========================
DELETE ORDER
========================= */

window.deleteOrder = async function(id) {

  const ok = confirm("Delete Order?");
  if (!ok) return;

  try {

    await deleteDoc(doc(db, "orders", id));

    setMsg("✅ Order Deleted");
    loadOrders();

  } catch (error) {

    console.log(error);
    setMsg("❌ " + error.message);

  }

};

/* =========================
START
========================= */

window.addEventListener("DOMContentLoaded", async () => {

  await loadProducts();

  await loadOrders();

  await loadReturns();

  await loadCustomers();  
  
  await loadCoupons();

  await loadAnalytics();

  await updateDashboard();

});

/* =========================
OPEN PRODUCT
========================= */

window.openProduct = (id) => {
  window.location.href = "product.html?id=" + id;
};

/* =========================
EXPORTS
========================= */

window.searchProducts = async function () {

  try {

    const value = document.getElementById("searchProduct").value.toLowerCase();
    const productsBox = document.getElementById("products");

    if (!productsBox) return;

    const snap = await getDocs(collection(db, "products"));

    productsBox.innerHTML = "";

    snap.forEach((d) => {

      const p = d.data();

      const name = (p.name || "").toLowerCase();

      if (!name.includes(value)) return;

      productsBox.innerHTML += `
        <div onclick="openProduct('${d.id}')"
        style="border:1px solid #444;padding:15px;margin-bottom:15px;background:#222;border-radius:8px;cursor:pointer;">

          <img src="${p.image}" width="120" style="border-radius:5px;margin-bottom:10px;">

          <h3>${p.name}</h3>

          <p>💰 Price: <b>₹${p.price}</b></p>
          <p>📦 Stock: <b>${p.stock || 0}</b></p>
          <p>🏷 Category: <b>${p.category || "-"}</b></p>

          <button onclick="event.stopPropagation(); editProduct('${d.id}')">Edit</button>
          <button onclick="event.stopPropagation(); deleteProduct('${d.id}')">Delete</button>

        </div>
      `;

    });

  } catch (error) {
    console.log(error);
    setMsg("❌ " + error.message);
  }

};

window.filterByCategory = async function () {

  try {

    const value = document.getElementById("filterCategory").value;
    const productsBox = document.getElementById("products");

    if (!productsBox) return;

    const snap = await getDocs(collection(db, "products"));

    productsBox.innerHTML = "";

    snap.forEach((d) => {

      const p = d.data();

      if (value && p.category !== value) return;

      productsBox.innerHTML += `
        <div onclick="openProduct('${d.id}')"
        style="border:1px solid #444;padding:15px;margin-bottom:15px;background:#222;border-radius:8px;cursor:pointer;">

          <img src="${p.image}" width="120" style="border-radius:5px;margin-bottom:10px;">

          <h3>${p.name}</h3>

          <p>💰 Price: <b>₹${p.price}</b></p>
          <p>📦 Stock: <b>${p.stock || 0}</b></p>
          <p>🏷 Category: <b>${p.category || "-"}</b></p>

          <button onclick="event.stopPropagation(); editProduct('${d.id}')">Edit</button>
          <button onclick="event.stopPropagation(); deleteProduct('${d.id}')">Delete</button>

        </div>
      `;

    });

  } catch (error) {
    console.log(error);
    setMsg("❌ " + error.message);
  }

};

window.printInvoice = async function(id){

const snap = await getDoc(doc(db,"orders",id));
const o = snap.data();

const invoiceNo = o.invoiceNo || ("INV" + id.substring(0,6).toUpperCase());
const orderDate = o.orderDate || new Date().toLocaleDateString("en-IN");

let items = "";

o.items.forEach(item=>{

items += `
<tr>
<td>${item.name}</td>
<td style="text-align:center;">${item.qty}</td>
<td style="text-align:right;">₹${item.price}</td>
<td style="text-align:right;">₹${item.qty * item.price}</td>
</tr>
`;

});

const w = window.open("","","width=900,height=700");

w.document.write(`
<!DOCTYPE html>
<html>

<head>

<title>Invoice</title>

<style>

@page{
size:A4;
margin:10mm;
}

body{
font-family:Arial,sans-serif;
margin:0;
padding:0;
color:#222;
font-size:13px;
}

.container{
padding:20px;
}

.header{
text-align:center;
border-bottom:3px solid #b8860b;
padding-bottom:15px;
margin-bottom:20px;
}

.header h1{
margin:0;
font-size:34px;
letter-spacing:5px;
color:#b8860b;
}

.header p{
margin:4px 0;
color:#666;
}

.info p{
margin:5px 0;
}

table{
width:100%;
border-collapse:collapse;
margin-top:20px;
}

th{
background:#b8860b;
color:#fff;
padding:10px;
border:1px solid #ddd;
}

td{
padding:8px;
border:1px solid #ddd;
}

.total{
margin-top:20px;
text-align:right;
font-size:22px;
font-weight:bold;
color:#b8860b;
}

.sign{
display:flex;
justify-content:space-between;
margin-top:50px;
}

.footer{
margin-top:40px;
background:#b8860b;
color:white;
padding:18px;
border-radius:8px;
text-align:center;
}

.footer p{
margin:8px 0;
font-size:14px;
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>ALIZAFASHION</h1>

<p>Premium Ethnic Wear Collection</p>

<p>Surat, Gujarat • India</p>

</div>

<div class="info">

<p><b>Invoice No :</b> ${invoiceNo}</p>

<p><b>Date :</b> ${orderDate}</p>

<p><b>Customer :</b> ${o.customerName}</p>

<p><b>Phone :</b> ${o.customerPhone}</p>

<p><b>Address :</b> ${o.customerAddress}</p>

</div>

<table>

<tr>

<th>Product</th>

<th>Qty</th>

<th>Price</th>

<th>Total</th>

</tr>

${items}

</table>

<div class="total">

Grand Total : ₹${o.total}

</div>

<hr>

<h3>Terms & Conditions</h3>

<ul>

<li>Goods once sold are not returnable.</li>

<li>Exchange available as per company policy.</li>

<li>Please keep this invoice for future reference.</li>

</ul>

<div class="sign">

<div>

_____________________

<br><br>

<b>Customer Signature</b>

</div>

<div style="text-align:center;">

<b style="font-size:28px;color:#b8860b;font-family:cursive;">

Aliza

</b>

<br>

Authorized Signature

</div>

</div>

<div class="footer">

<h2 style="margin:0;">❤️ THANK YOU ❤️</h2>

<p>

Thank you for choosing <b>ALIZAFASHION</b>.

</p>

<p>

We truly appreciate your trust and look forward to serving you again.

</p>

</div>

</div>

</body>

</html>
`);

w.document.close();

setTimeout(()=>{

w.focus();

w.print();

w.onafterprint=()=>{

w.close();

};

},500);

};


window.downloadInvoice = function(id){

window.printInvoice(id);

};

window.sendWhatsapp = async function(id){

const snap = await getDoc(doc(db,"orders",id));

const o = snap.data();

const msg =
`🛍️ ALIZAFASHION

Invoice : ${o.invoiceNo}

Name : ${o.customerName}

Total : ₹${o.total}

Thank you for shopping with us ❤️`;

window.open(
`https://wa.me/91${o.customerPhone}?text=${encodeURIComponent(msg)}`,
"_blank"
);

};

async function updateDashboard(){

const productSnap =
await getDocs(
collection(db,"products")
);

document.getElementById(
"dashProducts"
).innerText =
productSnap.size;

const orderSnap =
await getDocs(
collection(db,"orders")
);

document.getElementById(
"dashOrders"
).innerText =
orderSnap.size;

let revenue = 0;

const customers = new Set();

orderSnap.forEach(docu=>{

const o = docu.data();

revenue += Number(
o.total || 0
);

if(o.customerPhone){

customers.add(
o.customerPhone
);

}

});

document.getElementById(
"dashRevenue"
).innerText =
"₹" + revenue;

document.getElementById(
"dashCustomers"
).innerText =
customers.size;

}

window.updateDashboard = updateDashboard;

async function loadCoupons(){

const couponsBox =
document.getElementById("coupons");

if(!couponsBox) return;

const snap =
await getDocs(collection(db,"coupons"));

couponsBox.innerHTML="";

if(snap.empty){

couponsBox.innerHTML="<h3>No Coupons</h3>";

return;

}

snap.forEach(d=>{

const c=d.data();

couponsBox.innerHTML+=`

<div style="
background:#222;
padding:15px;
margin-bottom:10px;
border-radius:8px;
">

<h3>${c.code}</h3>

<p>

Discount :
<b>${c.discount}%</b>

</p>

<p>

Status :
<b>${c.active ? "✅ Active":"❌ Disabled"}</b>

</p>

<button
onclick="toggleCoupon('${d.id}',${c.active})"
>

${c.active ? "Disable":"Enable"}

</button>

<button
onclick="deleteCoupon('${d.id}')"
>

Delete

</button>

</div>

`;

});

}

window.addCoupon = async function(){

const code =
document.getElementById("couponName")
.value
.trim()
.toUpperCase();

const discount =
Number(
document.getElementById("couponDiscount").value
);

if(!code || !discount){

alert("Fill Coupon Details");

return;

}

await setDoc(

doc(db,"coupons",code),

{

code,

discount,

active:true,

createdAt:serverTimestamp()

}

);

document.getElementById("couponName").value="";

document.getElementById("couponDiscount").value="";

loadCoupons();

};

window.toggleCoupon = async function(id,current){

await updateDoc(

doc(db,"coupons",id),

{

active:!current

}

);

loadCoupons();

};

window.deleteCoupon = async function(id){

if(!confirm("Delete Coupon?")) return;

await deleteDoc(

doc(db,"coupons",id)

);

loadCoupons();

};

async function loadAnalytics(){

const analyticsBox =
document.getElementById("analytics");

if(!analyticsBox) return;

const orderSnap =
await getDocs(collection(db,"orders"));

let revenue = 0;

orderSnap.forEach(d=>{

const o = d.data();

revenue += Number(o.total || 0);

});

analyticsBox.innerHTML = `

<h3>Total Revenue</h3>

<h1>₹${revenue}</h1>

`;

}

export {
  addProduct,
  logout
};