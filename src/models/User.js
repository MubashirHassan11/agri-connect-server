import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_TYPES, USER_TYPES_ARRAY } from '../constants/userTypes.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    userType: {
      type: String,
      enum: {
        values: USER_TYPES_ARRAY,
        message: 'User type must be one of: {VALUE}'
      },
      required: [true, 'User type is required'],
      default: USER_TYPES.FARMER
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
