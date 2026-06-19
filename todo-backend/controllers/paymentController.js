const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
    try {
        const options = {
            amount: 9900, // amount in the smallest currency unit (₹99.00 = 9900 paise)
            currency: "INR",
            receipt: "receipt_order_" + req.user._id,
        };
        const order = await razorpay.orders.create(options);
        if (!order) {
            return res.status(500).send("Some error occured");
        }
        res.json(order);
    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        res.status(500).json({ error: error.message || error });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update user plan to premium
            const user = await User.findById(req.user._id);
            if (!user) return res.status(404).send("User not found");

            user.plan = 'premium';
            await user.save();

            // Generate a new token with updated plan
            const token = jwt.sign(
                {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    plan: user.plan
                },
                process.env.JWT_SECRET
            );

            res.send({ message: "Payment verified successfully", token });
        } else {
            res.status(400).send({ message: "Invalid payment signature" });
        }
    } catch (error) {
        res.status(500).send("Database Error: " + error.message);
    }
};
