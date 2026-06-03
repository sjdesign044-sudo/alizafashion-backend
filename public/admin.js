import {
db,
storage,
requireAuth,
logout
} from "./firebase.js";

import {
collection,
addDoc,
getDocs,
deleteDoc,
doc,
serverTimestamp,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
ref,
uploadBytes,
getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* =========================
AUTH CHECK
========================= */

requireAuth();

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

const stockInput =
document.getElementById("stock");

const categoryInput =
document.getElementById("category");

const imageInput =
document.getElementById("image");

const preview =
document.getElementById("preview");

imageInput.addEventListener("change",()=>{

const file = imageInput.files[0];

if(!file) return;

preview.src = URL.createObjectURL(file);

preview.style.display = "block";

});

const name =
nameInput.value.trim();

const price =
priceInput.value.trim();

const description =
descriptionInput.value.trim();

const details =
detailsInput?.value.trim() || "";

const fabric =
fabricInput?.value.trim() || "";

const stock =
stockInput.value.trim();

const category =
categoryInput.value;

const file =
imageInput.files[0];

if(
!name ||
!price ||
!description ||
!stock ||
!category ||
!file
){

setMsg(
"❌ Please Fill All Fields"
);

return;

}

try{

setMsg(
"📤 Uploading Product..."
);

const imageRef = ref(
storage,
`products/${Date.now()}_${file.name}`
);

await uploadBytes(
imageRef,
file
);

const imageURL =
await getDownloadURL(
imageRef
);

await addDoc(
collection(db,"products"),
{

name,
price:Number(price),

description,
details,
fabric,

stock:Number(stock),

category,

image:imageURL,

images:[imageURL],

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

loadProducts();

}catch(error){

console.log(error);

setMsg(
"❌ " + error.message
);

}

}

window.addProduct =
addProduct;

/* =========================
EDIT PRODUCT
========================= */

window.editProduct =
async function(id){

try{

const newName =
prompt(
"Enter Product Name"
);

if(newName === null) return;

const newPrice =
prompt(
"Enter Product Price"
);

if(newPrice === null) return;

const newDescription =
prompt(
"Enter Description"
);

if(newDescription === null) return;

const newDetails =
prompt(
"Enter Product Details"
);

if(newDetails === null) return;

const newFabric =
prompt(
"Enter Fabric"
);

if(newFabric === null) return;

const newStock =
prompt(
"Enter Stock Quantity"
);

if(newStock === null) return;

const newCategory =
prompt(
"Enter Category"
);

if(newCategory === null) return;

await updateDoc(
doc(db,"products",id),
{

name:newName,

price:Number(newPrice),

description:newDescription,

details:newDetails,

fabric:newFabric,

stock:Number(newStock),

category:newCategory

}
);

setMsg(
"✅ Product Updated Successfully"
);

loadProducts();

}catch(error){

console.log(error);

setMsg(
"❌ " + error.message
);

}

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

    productsBox.innerHTML = "";

    if(snap.empty){

      productsBox.innerHTML = `
        <p>No Products Found</p>
      `;

      return;
    }

    let totalProducts = 0;

    snap.forEach((d)=>{

      const p = d.data();
      totalProducts++;

      productsBox.innerHTML += `
        <div onclick="openProduct('${d.id}')"
        style="
          border:1px solid #444;
          padding:15px;
          margin-bottom:15px;
          background:#222;
          border-radius:8px;
          cursor:pointer;
        ">

          <img
            src="${p.image}"
            width="120"
            style="border-radius:5px;margin-bottom:10px;"
          >

          <h3>${p.name}</h3>

          <p>💰 Price: <b>₹${p.price}</b></p>

          <p>📦 Stock: <b>${p.stock || 0}</b></p>

          <p>🏷 Category: <b>${p.category || "-"}</b></p>

          <p>📝 Description:<br>${p.description || "-"}</p>

          <p>📋 Details:<br>${p.details || "-"}</p>

          <p>🧵 Fabric: <b>${p.fabric || "-"}</b></p>

          <br>

          <button onclick="event.stopPropagation(); editProduct('${d.id}')"
          style="margin-right:10px;">
            Edit
          </button>

          <button onclick="event.stopPropagation(); deleteProduct('${d.id}')">
            Delete
          </button>

        </div>
      `;

    });

    productsBox.innerHTML =
    `<h3 style="color:gold;margin-bottom:15px;">
      Total Products: ${totalProducts}
    </h3>` + productsBox.innerHTML;

  }catch(error){

    console.log(error);
    setMsg("❌ " + error.message);

  }

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

snap.forEach((d)=>{

totalOrders++;

const o = d.data();

let itemsHTML = "";

if(o.items){

o.items.forEach((item)=>{

itemsHTML += `

<div style="
display:flex;
gap:10px;
align-items:center;
margin-top:10px;
border-bottom:1px solid #333;
padding-bottom:10px;
">

<img
src="${item.image}"
width="60"
height="70"
style="
object-fit:cover;
border-radius:5px;
">

<div>

<b>
${item.name}
</b>

<br>

₹${item.price}

<br>

Qty:
${item.qty}

</div>

</div>

`;

});

}

ordersBox.innerHTML += `

<div style="
border:1px solid #444;
padding:15px;
margin-bottom:15px;
background:#222;
border-radius:8px;
">

<h3>
👤 ${o.customerName || "N/A"}
</h3>

<p>
📞 ${o.customerPhone || "N/A"}
</p>

<p>
📍 ${o.customerAddress || "N/A"}
</p>

<hr style="margin:15px 0;">

${itemsHTML}

<hr style="margin:15px 0;">

<h4>
💰 Total:
₹${o.total || 0}
</h4>

<p>

📦 Status:

<b style="
color:gold;
">

${o.status || "Pending"}

</b>

</p>

<br>

<button
onclick="updateStatus('${d.id}','Pending')">

Pending

</button>

<button
onclick="updateStatus('${d.id}','Shipped')">

Shipped

</button>

<button
onclick="updateStatus('${d.id}','Delivered')">

Delivered

</button>

<button
onclick="deleteOrder('${d.id}')">

Delete

</button>

</div>

`;

});

ordersBox.innerHTML = `

<h3 style="
color:gold;
margin-bottom:15px;
">

Total Orders:
${totalOrders}

</h3>

` + ordersBox.innerHTML;

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

window.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadOrders();
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

export {
  addProduct,
  logout
};