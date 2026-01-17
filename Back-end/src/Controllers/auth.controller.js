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

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'username, email and password are required'
            });
        }

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
            role: role || 'client'
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
        if (error?.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }

        return res.status(500).json({
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

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'email and password are required'
            });
        }

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
        console.error('loginUser error:', error);
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
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

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
        const OTP_RESEND_SECONDS = 2 * 60;
        const OTP_SEND_LIMIT = 3;
        const OTP_LOCK_MS = 60 * 60 * 1000;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'email is required'
            });
        }

        // Check for user email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.otpSendLockedUntil && user.otpSendLockedUntil.getTime() > Date.now()) {
            const secondsLeft = Math.ceil((user.otpSendLockedUntil.getTime() - Date.now()) / 1000);
            return res.status(429).json({
                success: false,
                message: 'After sending the OTP, wait one hour.',
                data: {
                    retryAfterSeconds: secondsLeft,
                    lockedUntil: user.otpSendLockedUntil
                }
            });
        }

        if (user.otpSendLockedUntil && user.otpSendLockedUntil.getTime() <= Date.now()) {
            user.otpSendLockedUntil = null;
            user.otpSendCount = 0;
        }

        if (user.otp && user.otpExpiresAt && user.otpExpiresAt.getTime() > Date.now()) {
            const secondsLeft = Math.ceil((user.otpExpiresAt.getTime() - Date.now()) / 1000);
            return res.status(429).json({
                success: false,
                message: `Please wait ${secondsLeft} seconds before resending OTP`,
                data: {
                    retryAfterSeconds: secondsLeft,
                    otpExpiresAt: user.otpExpiresAt
                }
            });
        }

        if ((user.otpSendCount || 0) >= OTP_SEND_LIMIT) {
            user.otpSendLockedUntil = new Date(Date.now() + OTP_LOCK_MS);
            await user.save();
            return res.status(429).json({
                success: false,
                message: 'After sending the OTP, wait one hour.',
                data: {
                    retryAfterSeconds: Math.ceil(OTP_LOCK_MS / 1000),
                    lockedUntil: user.otpSendLockedUntil
                }
            });
        }
        if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.MAIL_FROM) {
            return res.status(500).json({
                success: false,
                message: 'Email service is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM)'
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationLink = `${frontendUrl}/otp?email=${encodeURIComponent(email)}`;

        // hash otp
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Save OTP to user
        user.otp = hashedOtp;
        user.otpExpiresAt = new Date(Date.now() + OTP_RESEND_SECONDS * 1000);
        user.isValidOtp = false;

        user.otpSendCount = (user.otpSendCount || 0) + 1;
        user.otpVerifyAttempts = 0;
        user.otpVerifyLockedUntil = null;
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

                                        <div style="text-align:center; margin: 16px 0 24px;">
                                            <a href="${verificationLink}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:6px; font-weight:600;">
                                                Open verification page
                                            </a>
                                        </div>

                                        <p style="word-break:break-all; color:#6b7280; font-size:12px; text-align:center;">
                                            If the button doesn't work, copy this link:<br/>
                                            ${verificationLink}
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
            message: 'OTP sent to your email',
            data: {
                otpExpiresAt: user.otpExpiresAt,
                expiresInSeconds: OTP_RESEND_SECONDS,
                otpSendCount: user.otpSendCount,
                otpSendLimit: OTP_SEND_LIMIT
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

const createMember = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const creatorRole = (req.user.role || '').toString();
        const canCreate = ['admin', 'superadmin', 'manager'].includes(creatorRole);
        if (!canCreate) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create members'
            });
        }

        const { username, email, password, role, managerEmail } = req.body || {};

        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: 'Request body is required'
            });
        }

        if (!username || !email || !password || (!role && creatorRole !== 'manager')) {
            return res.status(400).json({
                success: false,
                message: creatorRole === 'manager'
                    ? 'username, email and password are required'
                    : 'username, email, password and role are required'
            });
        }

        const allowedRoles = ['manager', 'admin', 'superadmin', 'client'];
        let normalizedRole = (role || '').toString();
        if (creatorRole === 'manager') {
            normalizedRole = 'client';
        }
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        if (creatorRole === 'manager' && normalizedRole !== 'client') {
            return res.status(403).json({
                success: false,
                message: 'Managers can only add clients'
            });
        }

        if (creatorRole === 'admin' && normalizedRole === 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Admins cannot add super admins'
            });
        }

        if (normalizedRole === 'superadmin' && creatorRole !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create super admins'
            });
        }

        const normalizedEmail = email.toString().trim().toLowerCase();
        const normalizedUsername = username.toString().trim();
        const rawPassword = password.toString();

        const userExists = await User.findOne({
            $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
        });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }

        let user;
        let createdBy = req.user.id;

        if (normalizedRole === 'client') {
            if (creatorRole === 'manager') {
                createdBy = req.user.id;
            } else {
                if (!managerEmail) {
                    return res.status(400).json({
                        success: false,
                        message: 'managerEmail is required when admin/superadmin creates a client'
                    });
                }

                const managerUser = await User.findOne({
                    email: managerEmail.toString().trim().toLowerCase(),
                    role: 'manager'
                });
                if (!managerUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'Manager not found for provided managerEmail'
                    });
                }

                if (creatorRole === 'admin' && (managerUser.createdBy || '').toString() !== req.user.id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Admins can only assign clients to managers they created'
                    });
                }

                createdBy = managerUser._id;
            }
        }

        try {
            user = await User.create({
                username: normalizedUsername,
                email: normalizedEmail,
                password: rawPassword,
                role: normalizedRole,
                createdBy,
            });
        } catch (createError) {
            if (createError?.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email or username'
                });
            }

            if (createError?.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: createError.message
                });
            }

            return res.status(500).json({
                success: false,
                message: createError?.message || 'Server Error'
            });
        }

        if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.MAIL_FROM) {
            return res.status(201).json({
                success: true,
                message: 'Member created, but email service is not configured'
            });
        }

        try {
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
                to: normalizedEmail,
                subject: 'Welcome to GDMS',
                html: `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8" />
                    <title>Welcome to GDMS</title>
                </head>
                <body style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center" style="padding: 30px 0;">
                                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                                    <tr>
                                        <td style="background:#2563eb; padding:20px; text-align:center;">
                                            <h1 style="color:#ffffff; margin:0;">GDMS</h1>
                                            <p style="color:#dbeafe; margin:5px 0 0;">Google Drive Management System</p>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding:30px; color:#333333;">
                                            <h2 style="margin-top:0;">Your account has been created</h2>
                                            <p>Hello ${normalizedUsername},</p>
                                            <p>Here are your login details:</p>
                                            <table cellpadding="0" cellspacing="0" style="margin:16px 0; width:100%; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
                                                <tr>
                                                    <td style="padding:10px 12px; background:#f9fafb; font-weight:bold; width:160px;">Email</td>
                                                    <td style="padding:10px 12px;">${normalizedEmail}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:10px 12px; background:#f9fafb; font-weight:bold; width:160px;">Password</td>
                                                    <td style="padding:10px 12px;">${rawPassword}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:10px 12px; background:#f9fafb; font-weight:bold; width:160px;">Role</td>
                                                    <td style="padding:10px 12px;">${normalizedRole}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:10px 12px; background:#f9fafb; font-weight:bold; width:160px;">Added By</td>
                                                    <td style="padding:10px 12px;">${(req.user?.email || '').toString()}</td>
                                                </tr>
                                            </table>

                                            <p style="margin-top:20px;">Please keep this information secure.</p>
                                            <p style="margin-top:30px;">Regards,<br/><strong>GDMS Team</strong></p>
                                        </td>
                                    </tr>

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
                </html>`
            });
        } catch (mailError) {
            return res.status(201).json({
                success: true,
                message: 'Member created successfully, but failed to send email'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Member created successfully'
        });
    } catch (error) {
        console.error('createMember error:', error);
        return res.status(500).json({
            success: false,
            message: error?.message || 'Server Error'
        });
    }
}

const getTeamOverview = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const requesterRole = (req.user.role || '').toString();
        const allowed = ['admin', 'superadmin', 'manager', 'client'].includes(requesterRole);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (requesterRole === 'superadmin') {
            const [admins, managers, clients, superadmins] = await Promise.all([
                User.find({ role: 'admin' }).select('username email role createdAt isActive createdBy').populate('createdBy', 'username email role'),
                User.find({ role: 'manager' }).select('username email role createdAt isActive createdBy').populate('createdBy', 'username email role'),
                User.find({ role: 'client' }).select('username email role createdAt isActive createdBy').populate('createdBy', 'username email role'),
                User.find({ role: 'superadmin' }).select('username email role createdAt isActive')
            ]);

            const counts = {
                superadmins: superadmins.length,
                admins: admins.length,
                managers: managers.length,
                clients: clients.length
            };

            const groups = admins.map((a) => {
                const adminManagers = managers.filter((m) => (m.createdBy?._id || m.createdBy || '').toString() === a._id.toString());
                const managerIdSet = new Set(adminManagers.map((m) => m._id.toString()));
                const adminClients = clients.filter((c) => managerIdSet.has((c.createdBy?._id || c.createdBy || '').toString()));

                const managerGroups = adminManagers.map((m) => {
                    const mClients = clients.filter((c) => (c.createdBy?._id || c.createdBy || '').toString() === m._id.toString());
                    return { manager: m, clients: mClients };
                });

                return {
                    admin: a,
                    managers: managerGroups,
                    clients: adminClients
                };
            });

            return res.status(200).json({
                success: true,
                data: {
                    counts,
                    superadmins,
                    admins,
                    managers,
                    clients,
                    groups
                }
            });
        }

        if (requesterRole === 'admin') {
            const currentAdmin = await User.findById(req.user.id)
                .select('username email role createdAt isActive createdBy')
                .populate('createdBy', 'username email role');

            const managers = await User.find({ role: 'manager', createdBy: req.user.id })
                .select('username email role createdAt isActive createdBy')
                .populate('createdBy', 'username email role');

            const managerIds = managers.map((m) => m._id);
            const clients = await User.find({ role: 'client', createdBy: { $in: managerIds } })
                .select('username email role createdAt isActive createdBy')
                .populate('createdBy', 'username email role');

            const counts = {
                admins: 1,
                managers: managers.length,
                clients: clients.length
            };

            const groups = managers.map((m) => {
                const mClients = clients.filter((c) => (c.createdBy?._id || c.createdBy || '').toString() === m._id.toString());
                return { manager: m, clients: mClients };
            });

            return res.status(200).json({
                success: true,
                data: {
                    counts,
                    superadmin: currentAdmin?.createdBy || null,
                    admin: currentAdmin,
                    managers,
                    clients,
                    groups
                }
            });
        }

        if (requesterRole === 'manager') {
            const currentManager = await User.findById(req.user.id)
                .select('username email role createdAt isActive createdBy')
                .populate('createdBy', 'username email role');

            const clients = await User.find({ role: 'client', createdBy: req.user.id })
                .select('username email role createdAt isActive createdBy')
                .populate('createdBy', 'username email role');

            return res.status(200).json({
                success: true,
                data: {
                    admin: currentManager?.createdBy || null,
                    manager: currentManager,
                    clients
                }
            });
        }

        const currentClient = await User.findById(req.user.id)
            .select('username email role createdAt isActive createdBy')
            .populate('createdBy', 'username email role');

        const managerId = currentClient?.createdBy?._id || currentClient?.createdBy || null;
        const team = managerId
            ? await User.find({ role: 'client', createdBy: managerId })
                .select('username email role createdAt isActive createdBy')
                .populate('createdBy', 'username email role')
            : [];

        return res.status(200).json({
            success: true,
            data: {
                manager: currentClient?.createdBy || null,
                client: currentClient,
                team
            }
        });
    } catch (error) {
        console.error('getTeamOverview error:', error);
        return res.status(500).json({
            success: false,
            message: error?.message || 'Server Error'
        });
    }
}

const getAdminSummary = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const requesterRole = (req.user.role || '').toString();
        const allowed = ['admin', 'superadmin'].includes(requesterRole);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const [adminsCount, managersCount, clientsCount, superAdminsCount] = await Promise.all([
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'manager' }),
            User.countDocuments({ role: 'client' }),
            User.countDocuments({ role: 'superadmin' })
        ]);

        const [admins, managers, clients, superadmins] = await Promise.all([
            User.find({ role: 'admin' }).select('username email role createdAt isActive createdBy').populate('createdBy', 'username email role'),
            User.find({ role: 'manager' }).select('username email role createdAt isActive createdBy').populate('createdBy', 'username email role'),
            User.find({ role: 'client' }).select('username email role createdAt isActive createdBy').populate('createdBy', 'username email role'),
            User.find({ role: 'superadmin' }).select('username email role createdAt isActive')
        ]);

        return res.status(200).json({
            success: true,
            data: {
                counts: {
                    admins: adminsCount,
                    managers: managersCount,
                    clients: clientsCount,
                    superadmins: superAdminsCount
                },
                users: {
                    admins,
                    managers,
                    clients,
                    superadmins
                }
            }
        });
    } catch (error) {
        console.error('getAdminSummary error:', error);
        return res.status(500).json({
            success: false,
            message: error?.message || 'Server Error'
        });
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const OTP_VERIFY_LIMIT = 3;
        const OTP_VERIFY_LOCK_MS = 60 * 60 * 1000;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'email and otp are required'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.otpVerifyLockedUntil && user.otpVerifyLockedUntil.getTime() > Date.now()) {
            const secondsLeft = Math.ceil((user.otpVerifyLockedUntil.getTime() - Date.now()) / 1000);
            return res.status(429).json({
                success: false,
                message: 'Verify the OTP after 1 hour.',
                data: {
                    retryAfterSeconds: secondsLeft,
                    lockedUntil: user.otpVerifyLockedUntil
                }
            });
        }

        if (user.otpVerifyLockedUntil && user.otpVerifyLockedUntil.getTime() <= Date.now()) {
            user.otpVerifyLockedUntil = null;
            user.otpVerifyAttempts = 0;
        }

        if ((user.otpVerifyAttempts || 0) >= OTP_VERIFY_LIMIT) {
            user.otpVerifyLockedUntil = new Date(Date.now() + OTP_VERIFY_LOCK_MS);
            await user.save();
            return res.status(429).json({
                success: false,
                message: 'Verify the OTP after 1 hour.',
                data: {
                    retryAfterSeconds: Math.ceil(OTP_VERIFY_LOCK_MS / 1000),
                    lockedUntil: user.otpVerifyLockedUntil
                }
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
            user.otpVerifyAttempts = 0;
            user.otpVerifyLockedUntil = null;
            await user.save();
            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully'
            });
        } else {
            user.otpVerifyAttempts = (user.otpVerifyAttempts || 0) + 1;
            if (user.otpVerifyAttempts >= OTP_VERIFY_LIMIT) {
                user.otpVerifyLockedUntil = new Date(Date.now() + OTP_VERIFY_LOCK_MS);
            }
            await user.save();
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
        const { email, newPassword, ConfirmPassword } = req.body;

        if (!email || !newPassword || !ConfirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'email, newPassword and ConfirmPassword are required'
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
    forgetPassword,
    createMember,
    getTeamOverview,
    getAdminSummary
};

