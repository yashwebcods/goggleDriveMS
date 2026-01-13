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
        enum: ['user', 'admin' , 'superadmin' , 'client'],
        default: 'user'
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