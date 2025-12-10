import User from '../models/User.js';
import { NotFoundError } from '../utils/errors.js';

export const getAllUsers = async () => {
  const users = await User.find().select('-password');
  return users;
};

export const getUserById = async userId => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};
