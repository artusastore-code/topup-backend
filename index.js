require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const axios = require("axios");
const midtransClient = require("midtrans-client");

const app = express();
const db = require("./db");
const dbQuery = db.promise();

// ================== CONFIG ==================
if (!process.env.MIDTRANS_SERVER_KEY) {
  console.error("❌ MIDTRANS_SERVER_KEY belum diset");
  process.exit(1); // biar gak crash aneh
}

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY
});

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());

// ================== HELPER ==================
function generateInvoice() {
  return "INV-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function hitungHarga(modal) {
  return parseInt(modal) + 2000;
}

// ================== ROOT ==================
app.get("/", (req, res) => {
  res.send("API jalan 🚀");
});

// ================== PAYMENT ==================
app.post("/pay", async (req, res) => {
  try {
    const { invoice } = req.body;

    if (!invoice) {
      return res.status(400).json({
        success: false,
        message: "Invoice wajib diisi"
      });
    }

    const [rows] = await dbQuery.query(
      "SELECT * FROM orders WHERE invoice=?",
      [invoice]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan"
      });
    }

    const order = rows[0];

    // 🚨 prevent double payment
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Order sudah diproses"
      });
    }

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: order.invoice,
        gross_amount: order.harga_jual
      },
      customer_details: {
        first_name: "Customer"
      }
    });

    console.log("💳 CREATE PAYMENT:", order.invoice);

    res.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });

  } catch (err) {
    console.error("❌ MIDTRANS ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: "Gagal membuat pembayaran"
    });
  }
});

// ================== RUN ==================
const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server jalan di port ${PORT}`);
});