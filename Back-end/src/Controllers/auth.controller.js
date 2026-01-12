const User = require('../Models/user.model.js');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your_secret_key', {
        expiresIn: '10d'
    });
};

// Register User
const registerUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user exists
        const userExists = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password,
            role: role || 'user'
        });

        if (user) {
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid user data'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// Login User
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// Get User Profile
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (user) {
            res.json({
                success: true,
                data: user
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        // Check for user email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        req.session.resetEmail = email;
        if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.MAIL_FROM) {
            return res.status(500).json({
                success: false,
                message: 'Email service is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM)'
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // hash otp
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Save OTP to user (expires in 10 minutes)
        user.otp = hashedOtp;
        user.otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
        user.isValidOtp = false;
        await user.save();

        // Send OTP to user
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: email,
            subject: 'GDMS Password Reset OTP',
            html: `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <title>GDMS Password Reset</title>
            </head>
            <body style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="padding: 30px 0;">
                            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="background:#2563eb; padding:20px; text-align:center;">
                                        <h1 style="color:#ffffff; margin:0;">GDMS</h1>
                                        <p style="color:#dbeafe; margin:5px 0 0;">Google Drive Management System</p>
                                    </td>
                                </tr>

                                <!-- Body -->
                                <tr>
                                    <td style="padding:30px; color:#333333;">
                                        <h2 style="margin-top:0;">Password Reset Request</h2>
                                        <p>Hello,</p>

                                        <p>
                                            We received a request to reset your GDMS account password.
                                            Please use the OTP below to proceed:
                                        </p>

                                        <div style="text-align:center; margin:30px 0;">
                                            <span style="display:inline-block; background:#f1f5f9; color:#111827; font-size:28px; letter-spacing:4px; padding:15px 30px; border-radius:6px; font-weight:bold;">
                                                ${otp}
                                            </span>
                                        </div>

                                        <p style="text-align:center; color:#6b7280;">
                                            This OTP is valid for <strong>2 minutes</strong>.
                                        </p>

                                        <p>
                                            If you did not request a password reset, please ignore this email.
                                            Your account remains secure.
                                        </p>

                                        <p style="margin-top:30px;">
                                            Regards,<br/>
                                            <strong>GDMS Team</strong>
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background:#f9fafb; padding:15px; text-align:center; font-size:12px; color:#6b7280;">
                                        © 2026 GDMS. All rights reserved.
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `
        });

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your email'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const email = req.session.resetEmail;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Session expired. Please request OTP again.'
            });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.otp || !user.otpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please resend OTP.'
            });
        }

        if (user.otpExpiresAt.getTime() < Date.now()) {
            user.otp = null;
            user.otpExpiresAt = null;
            user.isValidOtp = false;
            await user.save();
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please resend OTP.'
            });
        }

        let isOtpValid = await bcrypt.compare(otp, user.otp);
        if (isOtpValid) {
            user.isValidOtp = true;
            user.otp = null;
            user.otpExpiresAt = null;
            await user.save();
            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully'
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid OTP'
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message
        })
    }
}

const forgetPassword = async (req, res) => {
    try {
        const { newPassword, ConfirmPassword } = req.body;
        const email = req.session.resetEmail
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Session expired. Please request OTP again.'
            });
        }
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            })
        }

        if (!user.isValidOtp) {
            return res.status(401).json({
                success: false,
                message: 'OTP not verified. Please verify OTP first.'
            })
        }

        if (newPassword !== ConfirmPassword) {
            return res.status(401).json({
                success: false,
                message: 'Passwords do not match'
            })
        }

        user.password = newPassword;
        user.isValidOtp = false;
        user.otp = null;
        user.otpExpiresAt = null;
        await user.save();
        req.session.resetEmail = null;

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message
        })
    }
}
module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    sendOtp,
    verifyOtp,
    forgetPassword
};

