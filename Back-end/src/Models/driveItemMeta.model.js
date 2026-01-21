const mongoose = require('mongoose');

const driveItemMetaSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    uploadedByEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    uploadedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    autoSharedAt: {
      type: Date,
      default: null,
    },
    sharedWithUserIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DriveItemMeta', driveItemMetaSchema);
