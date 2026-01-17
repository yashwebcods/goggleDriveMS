const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['manager', 'admin' , 'superadmin' , 'client'],
        default: 'client'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    otp: {
        type: String,
        default: null
    },
    otpExpiresAt: {
        type: Date,
        default: null
    },
    isValidOtp: {
        type: Boolean,
        default: false
    },
    otpSendCount: {
        type: Number,
        default: 0
    },
    otpSendLockedUntil: {
        type: Date,
        default: null
    },
    otpVerifyAttempts: {
        type: Number,
        default: 0
    },
    otpVerifyLockedUntil: {
        type: Date,
        default: null
    },
    google: {
        drive: {
            connected: {
                type: Boolean,
                default: false
            },
            accessToken: {
                type: String,
                default: null
            },
            refreshToken: {
                type: String,
                default: null
            },
            expiryDate: {
                type: Number,
                default: null
            },
            scope: {
                type: String,
                default: null
            },
            tokenType: {
                type: String,
                default: null
            }
        }
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);