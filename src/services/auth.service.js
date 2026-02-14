import User from '../models/User.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import {ConflictError, BadRequestError} from '../utils/errors.js';
import {USER_TYPES, USER_TYPES_ARRAY} from '../constants/userTypes.js';
import {generateToken, generatePasswordResetToken, verifyPasswordResetToken} from '../utils/jwt.js';
import {sendPasswordResetEmail} from './email.service.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const validateName = (name) => {
  if (!name || name.trim().length < 2) {
    throw new BadRequestError('Name must be at least 2 characters long');
  }
  // Only allow letters (including Unicode for international names), spaces, hyphens, apostrophes, and periods
  if (!/^[a-zA-Z\u00C0-\u024F\u0600-\u06FF\u0750-\u077F\s\-'.]+$/.test(name.trim())) {
    throw new BadRequestError('Name can only contain letters, spaces, hyphens, and apostrophes');
  }
};

const validateEmail = (email) => {
  if (!email) {
    throw new BadRequestError('Email is required');
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic length check
  if (trimmedEmail.length < 5) {
    throw new BadRequestError('Email is too short');
  }
  if (trimmedEmail.length > 254) {
    throw new BadRequestError('Email is too long');
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmedEmail)) {
    throw new BadRequestError('Please enter a valid email address');
  }

  // Additional checks
  if (
    trimmedEmail.startsWith('.') ||
    trimmedEmail.startsWith('@') ||
    trimmedEmail.startsWith('-')
  ) {
    throw new BadRequestError('Email cannot start with a dot, @, or hyphen');
  }

  if (trimmedEmail.includes('..')) {
    throw new BadRequestError('Email cannot contain consecutive dots');
  }

  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) {
    throw new BadRequestError('Email must contain exactly one @ symbol');
  }

  const [localPart, domain] = parts;

  if (localPart.length === 0 || localPart.length > 64) {
    throw new BadRequestError('Email local part is invalid');
  }

  if (domain.length === 0 || domain.length > 253) {
    throw new BadRequestError('Email domain is invalid');
  }

  if (!domain.includes('.')) {
    throw new BadRequestError('Email domain must contain at least one dot');
  }

  // Check for valid TLD (at least 2 characters)
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    throw new BadRequestError('Email must have a valid domain extension');
  }

  return trimmedEmail;
};

export const register = async (userData) => {
  const {
    name,
    email,
    password,
    userType,
    entityName,
    entityAddress,
    gender,
    phoneNumber,
    location,
    zipcode,
    latitude,
    longitude
  } = userData;

  // Name validation
  validateName(name);

  // Email validation
  const validatedEmail = validateEmail(email);

  // Phone number validation
  if (!phoneNumber || !/^\d{11}$/.test(phoneNumber)) {
    throw new BadRequestError('Phone number must be exactly 11 digits (numbers only)');
  }

  // Password strength validation
  if (!password || password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters long');
  }
  if (!/[a-z]/.test(password)) {
    throw new BadRequestError('Password must include at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestError('Password must include at least one uppercase letter');
  }
  if (!/\d/.test(password)) {
    throw new BadRequestError('Password must include at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    throw new BadRequestError('Password must include at least one special character');
  }

  if (userType && !USER_TYPES_ARRAY.includes(userType)) {
    throw new BadRequestError(`Invalid user type. Must be one of: ${USER_TYPES_ARRAY.join(', ')}`);
  }

  const existingUser = await User.findOne({email: validatedEmail});
  if (existingUser) {
    throw new ConflictError('User already exists with this email');
  }

  const createData = {
    name,
    email: validatedEmail,
    password,
    userType: userType || USER_TYPES.FARMER,
    entityName,
    entityAddress,
    gender,
    phoneNumber
  };

  // Add location fields if provided
  if (location) createData.location = location;
  if (zipcode) createData.zipcode = zipcode;
  if (latitude) createData.latitude = latitude;
  if (longitude) createData.longitude = longitude;

  const user = await User.create(createData);

  // Populate avatar to get the File reference (if exists)
  await user.populate('avatar', '_id');

  const token = generateToken(user._id);

  // Convert avatar ObjectId to URL for frontend
  const userObj = user.toObject();
  const profilePic =
    userObj.avatar && userObj.avatar._id
      ? `/api/files/${userObj.avatar._id.toString()}`
      : undefined;

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      entityName: user.entityName,
      entityAddress: user.entityAddress,
      gender: user.gender,
      phoneNumber: user.phoneNumber,
      profilePic,
      location: user.location,
      zipcode: user.zipcode,
      latitude: user.latitude,
      longitude: user.longitude
    },
    token
  };
};

export const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Validate email format
  const validatedEmail = validateEmail(email);

  const user = await User.findOne({email: validatedEmail});
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Check if user is blocked
  if (user.isBlocked) {
    throw new Error('Your account has been blocked. Please contact administrator.');
  }

  // Check if user is approved (unless admin)
  if (user.status !== 'approved' && user.userType !== 'admin') {
    throw new Error('Your account is pending approval. Please wait for administrator approval.');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Populate avatar to get the File reference
  await user.populate('avatar', '_id');

  const token = generateToken(user._id);

  // Convert avatar ObjectId to URL for frontend
  const userObj = user.toObject();
  const profilePic =
    userObj.avatar && userObj.avatar._id
      ? `/api/files/${userObj.avatar._id.toString()}`
      : undefined;

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      entityName: user.entityName,
      entityAddress: user.entityAddress,
      gender: user.gender,
      phoneNumber: user.phoneNumber,
      profilePic,
      location: user.location,
      zipcode: user.zipcode,
      latitude: user.latitude,
      longitude: user.longitude
    },
    token
  };
};

export const sendPasswordResetLink = async (email) => {
  // Validate email format
  const validatedEmail = validateEmail(email);

  const user = await User.findOne({email: validatedEmail});

  if (!user) {
    logger.info(`user not found for email: ${email}`);
    return;
  }

  if (!env.FRONT_URL) {
    throw new Error('FRONT_URL is not configured in environment variables');
  }

  const token = generatePasswordResetToken(user._id.toString(), user.email);

  await PasswordResetToken.createToken(user._id, token);

  const resetLink = `${env.FRONT_URL}/auth/reset-password?token=${token}`;

  await sendPasswordResetEmail(user.email, user.name, resetLink);
};

export const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new BadRequestError('Token is required');
  }

  if (!newPassword) {
    throw new BadRequestError('Password is required');
  }

  if (newPassword.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters long');
  }
  if (!/[a-z]/.test(newPassword)) {
    throw new BadRequestError('Password must include at least one lowercase letter');
  }
  if (!/[A-Z]/.test(newPassword)) {
    throw new BadRequestError('Password must include at least one uppercase letter');
  }
  if (!/\d/.test(newPassword)) {
    throw new BadRequestError('Password must include at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)) {
    throw new BadRequestError('Password must include at least one special character');
  }

  let decoded;
  try {
    decoded = verifyPasswordResetToken(token);
  } catch (error) {
    throw new BadRequestError(error.message || 'Invalid or expired token');
  }

  const tokenDoc = await PasswordResetToken.findValidToken(token);
  if (!tokenDoc) {
    throw new BadRequestError('Invalid or expired token');
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  if (user.email.toLowerCase() !== decoded.email.toLowerCase()) {
    throw new BadRequestError('Token email mismatch');
  }

  user.password = newPassword;
  await user.save();

  await PasswordResetToken.deleteOne({_id: tokenDoc._id});

  return {success: true};
};
