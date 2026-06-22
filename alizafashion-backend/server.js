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
"https://www.alizafashion.in"
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

let finalDiscount = 0;

if (couponCode === "ALIZA10") {

finalDiscount = Math.floor(

Number(product.price) *

Number(qty) *

0.10

);

}

const amount =

(Number(product.price) *

Number(qty))

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

if (!/^[6-9]\d{9}$/.test(customerPhone)) {

  return res.status(400).json({
    success: false,
    message: "Invalid Phone Number"
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

    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

      const existingOrder = await firestore
  .collection("orders")
  .where("razorpay_payment_id", "==", razorpay_payment_id)
  .get();

if (!existingOrder.empty) {

  return res.status(400).json({
    success: false,
    message: "Payment already used"
  });

}

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

const productDoc = await firestore
  .collection("products")
  .doc(product.id)
  .get();

if (!productDoc.exists) {

  return res.status(400).json({
    success: false,
    message: "Product not found"
  });

}

const realProduct = productDoc.data();

if (
  !Number.isInteger(Number(product.qty)) ||
  Number(product.qty) < 1 ||
  Number(product.qty) > 10
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

let finalDiscount = 0;

if (couponCode === "ALIZA10") {

finalDiscount = Math.floor(

Number(realProduct.price) *

Number(product.qty) *

0.10

);

}


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