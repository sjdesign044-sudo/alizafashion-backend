import express from "express";
import cors from "cors";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import admin from "firebase-admin";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

dotenv.config();

const serviceAccount = JSON.parse(
  process.env.SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

const orderLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 10,

  message: {

    success: false,

    message: "Too many requests, try again later"

  }

});

const app = express();

app.use(cors({
origin:[
"https://alizafashion.in",
"https://www.alizafashion.in",
"https://alizafashion-40758.web.app"
],
methods:["GET","POST","OPTIONS"],
allowedHeaders:["Content-Type"]
}));

app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.get("/", (req, res) => {
  res.send("ALIZA BACKEND RUNNING 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// =========================
// 🟢 COD ORDER BLOCK
// =========================

app.post(
"/create-order",
orderLimiter,
async (req, res) => {

  try {
    
    console.log("CREATE ORDER HIT");

    const {

productId,

qty,

couponCode

} = req.body;

const productDoc = await firestore
.collection("products")
.doc(productId)
.get();

if (!productDoc.exists) {

return res.status(400).json({

error:"Product Not Found"

});

}

const product = productDoc.data();

if (
  !Number.isInteger(Number(qty)) ||
  Number(qty) < 1 ||
  Number(qty) > 10
) {

  return res.status(400).json({
    error: "Invalid Quantity"
  });

}

if (product.active === false) {

  return res.status(400).json({
    error: "Product unavailable"
  });

}

if(Number(product.stock) < Number(qty)){

return res.status(400).json({
error:"Out of Stock"
});

}

let finalDiscount = 0;

if (couponCode) {

const couponDoc = await firestore
.collection("coupons")
.doc(couponCode)
.get();

if (couponDoc.exists) {

const coupon = couponDoc.data();

if (
coupon.expiry &&
coupon.expiry.toDate() <= new Date()
){
return res.status(400).json({
error:"Coupon Expired"
});
}

if (
coupon.active &&
Number(coupon.discount) > 0
){

finalDiscount = Math.floor(
Number(product.price) *
Number(qty) *
(coupon.discount / 100)
);

}

}

}

const amount =
(Number(product.price) * Number(qty))
-
finalDiscount;

if (amount <= 0) {
  return res.status(400).json({
    error: "Invalid Amount"
  });
}

    console.time("razorpay");

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    console.timeEnd("razorpay");

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// 🔵 ONLINE PAYMENT ORDER 
// =========================

app.post(
  "/verify-payment",
  orderLimiter,
  async (req, res) => {

  try {

    const {
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  customerName,
  customerPhone,
  customerAddress,
  product,
  couponCode
} = req.body;

/* =========================
CUSTOMER VALIDATION
========================= */

if (
  !customerName ||
  !customerPhone ||
  !customerAddress
) {

  return res.status(400).json({
    success: false,
    message: "Invalid Customer Details"
  });

}

/* =========================
PHONE VALIDATION
========================= */

if (!/^[6-9]\d{9}$/.test(customerPhone)) {

  return res.status(400).json({
    success: false,
    message: "Invalid Phone Number"
  });

}

    if (!razorpay_order_id || !razorpay_payment_id) {
  return res.status(400).json({
    success: false,
    message: "Missing payment details"
  });
}

const body =
  razorpay_order_id + "|" + razorpay_payment_id;


      /* =========================
DUPLICATE PAYMENT CHECK
========================= */

      const existingOrder = await firestore
  .collection("orders")
  .where("razorpay_payment_id", "==", razorpay_payment_id)
  .limit(1)
  .get();

if (!existingOrder.empty) {

  return res.status(400).json({
    success: false,
    message: "Payment already used"
  });

}

/* =========================
SIGNATURE VERIFICATION
========================= */

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {

      return res.status(400).json({
        success: false,
        message: "Invalid Signature"
      });

    }

    /* =========================
FETCH PAYMENT FROM RAZORPAY
========================= */

    const payment = await razorpay.payments.fetch(
  razorpay_payment_id
);

if (payment.currency !== "INR") {

  return res.status(400).json({
    success: false,
    message: "Invalid Currency"
  });

}

if (
  payment.captured !== true ||
  payment.status !== "captured"
) {

  return res.status(400).json({
    success: false,
    message: "Payment not captured"
  });

}

if (payment.order_id !== razorpay_order_id) {

  return res.status(400).json({
    success: false,
    message: "Order mismatch"
  });

}

/* =========================
VERIFY PRODUCT
========================= */

/* VERIFY PRODUCT */

if (!product || !product.id || !product.qty) {
  return res.status(400).json({
    success: false,
    message: "Invalid Product Data"
  });
}

const productId = product.id;
const qty = product.qty;

const productDoc = await firestore
  .collection("products")
  .doc(productId)
  .get();

if (!productDoc.exists) {

  return res.status(400).json({
    success: false,
    message: "Product not found"
  });

}

const realProduct = productDoc.data();

if (
  !Number.isInteger(Number(qty)) ||
  Number(qty) < 1 ||
  Number(qty) > 10
) {

  return res.status(400).json({
    success: false,
    message: "Invalid Quantity"
  });

}

if (realProduct.active === false) {

  return res.status(400).json({
    success: false,
    message: "Product unavailable"
  });

}

if (Number(realProduct.stock) < Number(qty)) {

  return res.status(400).json({
    success: false,
    message: "Out of Stock"
  });

}

/* =========================
VERIFY COUPON
========================= */

let finalDiscount = 0;

if (couponCode) {

const couponDoc = await firestore
.collection("coupons")
.doc(couponCode)
.get();

if (couponDoc.exists) {

const coupon = couponDoc.data();

if (
coupon.expiry &&
coupon.expiry.toDate() <= new Date()
){
return res.status(400).json({
success:false,
message:"Coupon Expired"
});
}

if (
coupon.active &&
Number(coupon.discount) > 0
){

finalDiscount = Math.floor(
Number(realProduct.price) *
Number(product.qty) *
(coupon.discount / 100)
);

}

}

}

/* =========================
VERIFY PAYMENT AMOUNT
========================= */

const expectedAmount =

(Number(realProduct.price) *
Number(product.qty))

-

finalDiscount;

if (payment.amount !== expectedAmount * 100) {

  return res.status(400).json({

    success: false,

    message: "Amount mismatch"

  });

}

/* =========================
UPDATE PRODUCT STOCK
========================= */

await firestore.runTransaction(async (t) => {

  const ref = firestore.collection("products").doc(productId);
  const docSnap = await t.get(ref);

  if (!docSnap.exists) {
    throw new Error("Product not found");
  }

  const data = docSnap.data();

  if (Number(data.stock) < Number(qty)) {
    throw new Error("Out of Stock");
  }

  t.update(ref, {
    stock: admin.firestore.FieldValue.increment(-Number(qty))
  });

});

/* =========================
SAVE ORDER
========================= */

    const orderNumber = "ALZ" + Date.now();

    await firestore.collection("orders").add({

  invoiceNo: "INV" + Date.now(),

  orderDate: new Date().toLocaleDateString("en-IN"),

  customerName,
  customerPhone,
  customerAddress,

  items: [{

id: product.id,

name: realProduct.name,

image: realProduct.image,

price: realProduct.price,

qty: product.qty

}],

  total: expectedAmount,

  paymentMethod: "ONLINE",

  paymentStatus: "Paid",

  status: "Confirmed",

  razorpay_order_id,

  razorpay_payment_id,

  orderNumber,

  createdAt:
    admin.firestore.FieldValue.serverTimestamp()

});

    return res.json({
      success: true,
      orderNumber
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }

});

app.post(
"/create-cod-order",
orderLimiter,
async (req,res)=>{

try{

const {
customerName,
customerPhone,
customerAddress,
productId,
qty
} = req.body;

if(
!customerName ||
!customerPhone ||
!customerAddress
){
return res.status(400).json({
success:false,
message:"Invalid Details"
});
}

if (!/^[6-9]\d{9}$/.test(customerPhone)) {
return res.status(400).json({
success:false,
message:"Invalid Phone Number"
});
}

const recentOrders = await firestore
.collection("orders")
.where("customerPhone","==",customerPhone)
.where("paymentMethod","==","COD")
.get();

if (recentOrders.size >= 5) {

return res.status(400).json({
success:false,
message:"Too many COD orders"
});

}

const productDoc = await firestore
.collection("products")
.doc(productId)
.get();

if(!productDoc.exists){
return res.status(400).json({
success:false,
message:"Product not found"
});
}

const product = productDoc.data();

if (
!Number.isInteger(Number(qty)) ||
Number(qty) < 1 ||
Number(qty) > 10
){

return res.status(400).json({
success:false,
message:"Invalid Quantity"
});
}

if(product.active === false){
return res.status(400).json({
success:false,
message:"Product unavailable"
});
}
if(Number(product.stock) < Number(qty)){

return res.status(400).json({
success:false,
message:"Out of Stock"
});

}

/* =========================
UPDATE PRODUCT STOCK
========================= */

await firestore.runTransaction(async (t) => {
  const ref = firestore.collection("products").doc(productId);
  const docSnap = await t.get(ref);

  if (!docSnap.exists) {
    throw new Error("Product not found");
  }

  const data = docSnap.data();

  if (!data) {
    throw new Error("Product data missing");
  }

  if (data.active === false) {
    throw new Error("Product unavailable");
  }

  if (Number(data.stock) < Number(qty)) {
    throw new Error("Out of Stock");
  }

  t.update(ref, {
    stock: admin.firestore.FieldValue.increment(-Number(qty))
  });
});

/* =========================
SAVE ORDER
========================= */

const orderNumber =
"ALZ" + Date.now();


await firestore
.collection("orders")
.add({

invoiceNo:"INV"+Date.now(),

orderDate:
new Date().toLocaleDateString("en-IN"),

customerName,
customerPhone,
customerAddress,

items:[{
id:productId,
name:product.name,
image:product.image,
price:product.price,
qty:Number(qty)
}],

total:
Number(product.price) *
Number(qty),

paymentMethod:"COD",

paymentStatus:"Pending",

status:"Pending",

orderNumber,

createdAt:
admin.firestore.FieldValue.serverTimestamp()

});

return res.json({
success:true,
orderNumber
});

}catch(err){

return res.status(500).json({
success:false,
message:err.message
});

}

});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});