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

  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      entityName: user.entityName,
      entityAddress: user.entityAddress,
      gender: user.gender,
      phoneNumber: user.phoneNumber
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

  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      entityName: user.entityName,
      entityAddress: user.entityAddress,
      gender: user.gender,
      phoneNumber: user.phoneNumber
    },
    token
  };
};
