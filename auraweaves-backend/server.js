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

// =========================
// 🚚 SHIPROCKET
// =========================

let shiprocketToken = null;
let shiprocketTokenTime = 0;

async function getShiprocketToken() {

  const now = Date.now();

  // Token 9 days tak reuse
  if (
    shiprocketToken &&
    now - shiprocketTokenTime < 9 * 24 * 60 * 60 * 1000
  ) {
    return shiprocketToken;
  }

  const response = await fetch(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD
      })
    }
  );

  const data = await response.json();

  if (!response.ok || !data.token) {
    console.error("SHIPROCKET LOGIN ERROR:", data);

    throw new Error(
      "Shiprocket authentication failed"
    );
  }

  shiprocketToken = data.token;
  shiprocketTokenTime = now;

  return shiprocketToken;
}


async function createShiprocketOrder({
  orderNumber,
  customerName,
  customerPhone,
  customerAddress,
  customerCity,
  customerState,
  customerPincode,
  items,
  total,
  paymentMethod
}) {

  const token =
    await getShiprocketToken();

  const nameParts =
    customerName.trim().split(/\s+/);

  const firstName =
    nameParts.shift() || "Customer";

  const lastName =
    nameParts.join(" ") || "Customer";

  const orderItems =
    items.map(item => ({
      name: item.name,
      sku: item.id,
      units: Number(item.qty),
      selling_price: Number(item.price),
      discount: 0,
      tax: 0,
      hsn: ""
    }));

  const quantity =
    items.reduce(
      (sum, item) =>
        sum + Number(item.qty),
      0
    );

  const packageWeight =
    Math.max(
      0.7 * quantity,
      0.5
    );

  const payload = {

    order_id: orderNumber,

    order_date:
      new Date().toISOString(),

    pickup_location:
      process.env.SHIPROCKET_PICKUP_LOCATION,

    channel_id:
      "",

    comment:
      "AURAWEAVES Website Order",

    billing_customer_name:
      firstName,

    billing_last_name:
      lastName,

    billing_address:
      customerAddress,

    billing_city:
      customerCity,

    billing_pincode:
      customerPincode,

    billing_state:
      customerState,

    billing_country:
      "India",

    billing_email:
      process.env.SHIPROCKET_EMAIL,

    billing_phone:
      customerPhone,

    shipping_is_billing:
      true,

    shipping_customer_name:
      firstName,

    shipping_last_name:
      lastName,

    shipping_address:
      customerAddress,

    shipping_city:
      customerCity,

    shipping_pincode:
      customerPincode,

    shipping_country:
      "India",

    shipping_state:
      customerState,

    shipping_email:
      process.env.SHIPROCKET_EMAIL,

    shipping_phone:
      customerPhone,

    order_items:
      orderItems,

    payment_method:
      paymentMethod === "COD"
        ? "COD"
        : "Prepaid",

    sub_total:
      Number(total),

    length: 30,

    breadth: 25,

    height: 5,

    weight:
      packageWeight

  };

  const response =
    await fetch(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${token}`
        },

        body:
          JSON.stringify(payload)
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    console.error(
      "SHIPROCKET ORDER ERROR:",
      data
    );

    throw new Error(
      "Shiprocket order creation failed"
    );
  }

  console.log(
    "SHIPROCKET ORDER CREATED:",
    data
  );

  return data;
}

const orderLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 10,

  message: {

    success: false,

    message: "Too many requests, try again later"

  }

});

const app = express();

app.set("trust proxy", 1);

app.use(cors({
  origin: [
    "https://auraweaves.co",
    "https://www.auraweaves.co"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.get("/", (req, res) => {
  res.send("AURA BACKEND RUNNING 🚀");
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
  items,
  couponCode
} = req.body;

if (!Array.isArray(items) || !items.length) {
  return res.status(400).json({
    error: "Cart is empty"
  });
}

let finalDiscount = 0;
let subtotal = 0;
const verifiedItems = [];

for (const item of items) {

  const productDoc = await firestore
    .collection("products")
    .doc(item.id)
    .get();

  if (!productDoc.exists) {
    return res.status(400).json({
      error: "Product Not Found"
    });
  }

  const product = productDoc.data();
  const qty = Number(item.qty);

  if (
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > 10
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

  if (Number(product.stock) < qty) {
    return res.status(400).json({
      error: `${product.name} is Out of Stock`
    });
  }

  subtotal += Number(product.price) * qty;

  verifiedItems.push({
    id: item.id,
    name: product.name,
    image: product.image || product.images?.[0] || "",
    price: Number(product.price),
    qty: qty
  });
}

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
    ) {
      return res.status(400).json({
        error: "Coupon Expired"
      });
    }

    if (
      coupon.active &&
      Number(coupon.discount) > 0
    ) {
      finalDiscount = Math.floor(
        subtotal * (Number(coupon.discount) / 100)
      );
    }
  }
}

const amount = subtotal - finalDiscount;

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

app.get("/orders-by-number", async (req, res) => {
  try {

    const orderNumber = req.query.order;

    const snap = await firestore
      .collection("orders")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(snap.docs[0].data());

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// ❌ ORDER CANCELLATION SYSTEM
// =========================

app.post("/cancel-order", orderLimiter, async (req, res) => {
  try {
    const {
orderNumber,
cancellationCode,
reason
} = req.body;

    if (
!orderNumber ||
!cancellationCode
) {
      return res.status(400).json({
        success: false,
        message: "Order number required"
      });
    }

    const orderSnap = await firestore
      .collection("orders")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (orderSnap.empty) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const orderRef = orderSnap.docs[0].ref;
    const order = orderSnap.docs[0].data();

    if (
  !order.cancellationCode ||
  order.cancellationCode.toUpperCase() !== cancellationCode.toUpperCase()
) {

  return res.status(400).json({
    success: false,
    message: "Invalid Cancellation Code"
  });

}

    if (order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Already cancelled"
      });
    }

    if (["Delivered", "Cancelled"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel shipped order"
      });
    }

    // RESTOCK

    for (const item of order.items || []) {
  await firestore
    .collection("products")
    .doc(item.id)
    .update({
      stock: admin.firestore.FieldValue.increment(item.qty)
    });
}

    // UPDATE ORDER

    await orderRef.update({
  status: "Cancelled",
  paymentStatus: "Refund Pending",
  cancelReason: reason || "No reason",
  cancelledAt: admin.firestore.FieldValue.serverTimestamp()
});

    return res.json({
      success: true,
      message: "Order cancelled successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
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
  customerCity,
  customerState,
  customerPincode,
  items,
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
VERIFY PRODUCTS
========================= */

if (!Array.isArray(items) || !items.length) {
  return res.status(400).json({
    success: false,
    message: "Invalid Items"
  });
}

let subtotal = 0;
const verifiedItems = [];

for (const item of items) {

  const productDoc = await firestore
    .collection("products")
    .doc(item.id)
    .get();

  if (!productDoc.exists) {
    return res.status(400).json({
      success: false,
      message: "Product not found"
    });
  }

  const realProduct = productDoc.data();
  const qty = Number(item.qty);

  if (
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > 10
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

  if (Number(realProduct.stock) < qty) {
    return res.status(400).json({
      success: false,
      message: `${realProduct.name} is Out of Stock`
    });
  }

  subtotal += Number(realProduct.price) * qty;

  verifiedItems.push({
    id: item.id,
    name: realProduct.name,
    image: realProduct.image || realProduct.images?.[0] || "",
    price: Number(realProduct.price),
    qty
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
    ) {
      return res.status(400).json({
        success: false,
        message: "Coupon Expired"
      });
    }

    if (
      coupon.active &&
      Number(coupon.discount) > 0
    ) {
      finalDiscount = Math.floor(
        subtotal * (Number(coupon.discount) / 100)
      );
    }
  }
}

/* =========================
VERIFY PAYMENT AMOUNT
========================= */

const expectedAmount =
  subtotal - finalDiscount;

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

  for (const item of verifiedItems) {

    const ref = firestore
      .collection("products")
      .doc(item.id);

    const docSnap = await t.get(ref);

    if (!docSnap.exists) {
      throw new Error("Product not found");
    }

    const data = docSnap.data();

    if (Number(data.stock) < Number(item.qty)) {
      throw new Error(`${data.name} is Out of Stock`);
    }

    t.update(ref, {
      stock: admin.firestore.FieldValue.increment(
        -Number(item.qty)
      )
    });
  }

});

/* =========================
SAVE ORDER
========================= */

    const orderNumber = "AURA" + Date.now();

    const cancellationCode =
crypto.randomBytes(4).toString("hex").toUpperCase();

const savedOrder =
await firestore
.collection("orders")
.add({

invoiceNo:
"INV" + Date.now(),

orderDate:
new Date().toLocaleDateString("en-IN"),

customerName,

customerPhone,

customerAddress,

customerCity: customerCity || "",

customerState: customerState || "",

customerPincode: customerPincode || "",

items:
verifiedItems,

total:
expectedAmount,

paymentMethod:
"ONLINE",

paymentStatus:
"Paid",

status:
"Confirmed",

razorpay_order_id,

razorpay_payment_id,

orderNumber,

cancellationCode,

createdAt:
admin.firestore.FieldValue.serverTimestamp()

});


// =========================
// 🚚 CREATE SHIPROCKET ORDER
// =========================

try {

  const shiprocketOrder =
    await createShiprocketOrder({

      orderNumber,

      customerName,

      customerPhone,

      customerAddress,

      customerCity,

      customerState,

      customerPincode,

      items: verifiedItems,

      total: expectedAmount,

      paymentMethod: "ONLINE"

    });

  await savedOrder.update({

    shiprocketOrderId:
      shiprocketOrder.order_id || null,

    shiprocketShipmentId:
      shiprocketOrder.shipment_id || null,

    shiprocketStatus:
      "Created"

  });

} catch (shiprocketError) {

  console.error(
    "SHIPROCKET ERROR:",
    shiprocketError
  );

  await savedOrder.update({

    shiprocketStatus:
      "Failed",

    shiprocketError:
      shiprocketError.message

  });

}

    return res.json({
      success: true,
      orderNumber,
      cancellationCode
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
customerCity,
customerState,
customerPincode,
items
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

if (!Array.isArray(items) || !items.length) {
return res.status(400).json({
success:false,
message:"Cart is empty"
});
}

const verifiedItems = [];
let total = 0;

/* =========================
VERIFY PRODUCTS
========================= */

for (const item of items) {

const productDoc = await firestore
.collection("products")
.doc(item.id)
.get();

if(!productDoc.exists){
return res.status(400).json({
success:false,
message:"Product not found"
});
}

const product = productDoc.data();
const qty = Number(item.qty);

if (
!Number.isInteger(qty) ||
qty < 1 ||
qty > 10
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

if(Number(product.stock) < qty){
return res.status(400).json({
success:false,
message:`${product.name} is Out of Stock`
});
}

total += Number(product.price) * qty;

verifiedItems.push({
id:item.id,
name:product.name,
image:product.image || product.images?.[0] || "",
price:Number(product.price),
qty:qty
});

}

/* =========================
UPDATE PRODUCT STOCK
========================= */

await firestore.runTransaction(async (t) => {

for (const item of verifiedItems) {

const ref = firestore
.collection("products")
.doc(item.id);

const docSnap = await t.get(ref);

if (!docSnap.exists) {
throw new Error("Product not found");
}

const data = docSnap.data();

if (Number(data.stock) < Number(item.qty)) {
throw new Error(`${data.name} is Out of Stock`);
}

t.update(ref, {
stock: admin.firestore.FieldValue.increment(
-Number(item.qty)
)
});

}

});

/* =========================
SAVE ORDER
========================= */

const orderNumber =
"AURA" + Date.now();

const cancellationCode =
crypto.randomBytes(4)
.toString("hex")
.toUpperCase();

await firestore
.collection("orders")
.add({

invoiceNo:"INV"+Date.now(),

orderDate:
new Date().toLocaleDateString("en-IN"),

customerName,
customerPhone,
customerAddress,
customerCity: customerCity || "",
customerState: customerState || "",
customerPincode: customerPincode || "",

items:verifiedItems,

total:total,

paymentMethod:"COD",

paymentStatus:"Pending",

status:"Pending",

orderNumber,

cancellationCode,

createdAt:
admin.firestore.FieldValue.serverTimestamp()

});

return res.json({
success:true,
orderNumber,
cancellationCode
});

}catch(err){

console.log(err);

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