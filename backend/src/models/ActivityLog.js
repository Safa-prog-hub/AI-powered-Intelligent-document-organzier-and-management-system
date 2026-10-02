const mongoose = require('mongoose');
const { Schema } = mongoose;

const activityLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        'upload',
        'rename',
        'preview',
        'download',
        'delete',
      ],
      trim: true,
    },

    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      index: true,
    },

    documentName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 255,
    },

    details: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);