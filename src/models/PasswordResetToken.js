import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 60 * 1000) 
    }
  },
  {
    timestamps: true
  }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetTokenSchema.statics.createToken = async function (userId, token) {
  await this.deleteMany({ user: userId });

  const tokenDoc = await this.create({
    token,
    user: userId,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  });

  return tokenDoc;
};

passwordResetTokenSchema.statics.findValidToken = async function (token) {
  const tokenDoc = await this.findOne({ token }).populate('user');

  if (!tokenDoc) {
    return null;
  }

  if (tokenDoc.expiresAt < new Date()) {
    await this.deleteOne({ _id: tokenDoc._id });
    return null;
  }

  return tokenDoc;
};

export default mongoose.model('PasswordResetToken', passwordResetTokenSchema);

