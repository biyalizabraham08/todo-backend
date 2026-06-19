const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

exports.signup = async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.status(400).send("All fields required");

    let user = await User.findOne({ email });

    if (user)
        return res.status(400).send("User already exists");

    const salt = await bcrypt.genSalt(10);

    const hashedPassword =
        await bcrypt.hash(password, salt);

    user = new User({
        name,
        email,
        password: hashedPassword
    });

    await user.save();

    res.status(201).send("User registered");
};



exports.login = async (req, res) => {

    const user = await User.findOne({
        email: req.body.email
    });

    if (!user)
        return res.status(400).send("Invalid credentials");

    const validPassword =
        await bcrypt.compare(
            req.body.password,
            user.password
        );

    if (!validPassword)
        return res.status(400).send("Invalid credentials");

    const token = jwt.sign(
        {
            _id: user._id,
            email: user.email,
            name: user.name,
            plan: user.plan
        },
        process.env.JWT_SECRET
    );

    res.send({ token });
};

exports.forgotPassword = async (req, res) => {

    const user = await User.findOne({
        email: req.body.email
    });

    if (!user)
        return res.status(404).send("User not found");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetToken = otp;
    user.resetTokenExpiry =
        Date.now() + 3600000;

    await user.save();

    try {
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Password Reset Code</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
                <p>Please use the following 6-digit OTP code to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="background-color: #f4f4f4; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 24px; letter-spacing: 4px;">${otp}</span>
                </div>
                <p style="font-size: 12px; color: #777;">This code is valid for 1 hour.</p>
            </div>
        `;

        await sendEmail(
            user.email,
            "Reset Your Password",
            emailHtml
        );
        res.send("Reset email sent");
    } catch (error) {
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).send("Email could not be sent");
    }
};


exports.resetPassword = async (req, res) => {

    const user = await User.findOne({
        email: req.body.email,
        resetToken: req.body.otp,
        resetTokenExpiry: {
            $gt: Date.now()
        }
    });

    if (!user)
        return res.status(400).send("Invalid or expired OTP");

    const salt = await bcrypt.genSalt(10);

    user.password =
        await bcrypt.hash(
            req.body.password,
            salt
        );

    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.send("Password updated");
};