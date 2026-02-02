import User from '../models/User.js';
import {ConflictError, BadRequestError} from '../utils/errors.js';
import {USER_TYPES, USER_TYPES_ARRAY} from '../constants/userTypes.js';
import {generateToken} from '../utils/jwt.js';

export const register = async (userData) => {
  const {name, email, password, userType, entityName, entityAddress, gender, phoneNumber} =
    userData;

  if (userType && !USER_TYPES_ARRAY.includes(userType)) {
    throw new BadRequestError(`Invalid user type. Must be one of: ${USER_TYPES_ARRAY.join(', ')}`);
  }

  const existingUser = await User.findOne({email});
  if (existingUser) {
    throw new ConflictError('User already exists with this email');
  }

  const user = await User.create({
    name,
    email,
    password,
    userType: userType || USER_TYPES.FARMER,
    entityName,
    entityAddress,
    gender,
    phoneNumber
  });

  // Populate avatar to get the File reference (if exists)
  await user.populate('avatar', '_id');

  const token = generateToken(user._id);

  // Convert avatar ObjectId to URL for frontend
  const userObj = user.toObject();
  const profilePic = userObj.avatar && userObj.avatar._id 
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
  const user = await User.findOne({email});
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
  const profilePic = userObj.avatar && userObj.avatar._id 
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
