import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {USER_TYPES, USER_TYPES_ARRAY} from '../constants/userTypes.js';

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
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return false;
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(v)) return false;
          if (v.length < 5 || v.length > 254) return false;
          if (v.includes('..')) return false;
          const parts = v.split('@');
          if (parts.length !== 2) return false;
          const [local, domain] = parts;
          if (local.length === 0 || local.length > 64) return false;
          if (domain.length === 0 || domain.length > 253) return false;
          if (!domain.includes('.')) return false;
          const domainParts = domain.split('.');
          const tld = domainParts[domainParts.length - 1];
          return tld.length >= 2 && /^[a-zA-Z]+$/.test(tld);
        },
        message: 'Please enter a valid email address'
      }
    },
    entityName: {
      type: String,
      required: [true, 'Entity name is required'],
      trim: true
    },
    entityAddress: {
      type: String,
      required: [true, 'Entity address is required'],
      trim: true
    },
    gender: {
      type: String,
      required: [true, 'Gender is required']
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: function (v) {
          return (
            /[a-z]/.test(v) &&
            /[A-Z]/.test(v) &&
            /\d/.test(v) &&
            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(v)
          );
        },
        message:
          'Password must include at least one lowercase letter, one uppercase letter, one number, and one special character'
      }
    },
    userType: {
      type: String,
      enum: {
        values: USER_TYPES_ARRAY,
        message: 'User type must be one of: {VALUE}'
      },
      required: [true, 'User type is required'],
      default: USER_TYPES.FARMER
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date
    },
    avatar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    location: {
      type: String,
      trim: true
    },
    zipcode: {
      type: String,
      trim: true
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    paymentDetails: {
      accountNumber: {
        type: String,
        trim: true
      },
      accountTitle: {
        type: String,
        trim: true
      },
      bankName: {
        type: String,
        trim: true
      }
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
