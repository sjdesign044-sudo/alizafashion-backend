import express from "express";
import cors from "cors";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import admin from "firebase-admin";
import crypto from "crypto";

dotenv.config();

const serviceAccount = JSON.parse(
  process.env.SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

const app = express();

app.use(cors());
app.use(express.json());

console.log("KEY_ID =", process.env.RAZORPAY_KEY_ID);
console.log("SECRET =", process.env.RAZORPAY_KEY_SECRET ? "FOUND" : "NOT FOUND");
console.log("TEST =", process.env.TEST);
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

app.post("/create-order", async (req, res) => {
  try {
    
    console.log("CREATE ORDER HIT");
console.log(req.body);

    const { amount } = req.body;

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

app.post("/verify-payment", async (req, res) => {

  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerName,
      customerPhone,
      customerAddress,
      product,
      discountAmount
    } = req.body;

    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

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

    const orderNumber = "ALZ" + Date.now();

    await firestore.collection("orders").add({

      invoiceNo: "INV" + Date.now(),

      orderDate: new Date().toLocaleDateString("en-IN"),

      customerName,
      customerPhone,
      customerAddress,

      items: [{
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        qty: product.qty
      }],

      total:
        (Number(product.price) * Number(product.qty))
        - Number(discountAmount || 0),

      paymentMethod: "ONLINE",
      paymentStatus: "Paid",
      status: "Confirmed",
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

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});