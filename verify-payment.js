import crypto from "crypto";

// In-memory token store (works fine for low traffic)
// For high traffic, replace with Redis or a DB
const tokenStore = new Map();

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id) {
    return res.status(400).json({ success: false, message: "Missing payment ID" });
  }

  try {
    // Verify Razorpay signature (proves payment is real, not faked)
    if (razorpay_order_id && razorpay_signature) {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }
    }

    // Generate a one-time download token (expires in 5 minutes)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min

    tokenStore.set(token, {
      paymentId: razorpay_payment_id,
      expiresAt,
      used: false,
    });

    // Clean up old tokens
    for (const [key, val] of tokenStore.entries()) {
      if (val.expiresAt < Date.now()) tokenStore.delete(key);
    }

    return res.status(200).json({ success: true, token });

  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Export tokenStore so download.js can access it
export { tokenStore };
