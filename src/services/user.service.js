import User from '../models/User.js';
import {NotFoundError} from '../utils/errors.js';
import * as fileService from './file.service.js';

export const getAllUsers = async () => {
  const users = await User.find().select('-password');
  return users;
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

export const updateUser = async (userId, updateData) => {
  const data = {...updateData};

  // If avatar is a base64 data URL, save it to File collection and store ObjectId
  if (data.avatar && typeof data.avatar === 'string' && data.avatar.startsWith('data:image')) {
    const file = await fileService.saveBase64Image(data.avatar, {
      createdBy: userId,
      purpose: 'profile',
    });

    // Store the File ObjectId in the avatar field
    data.avatar = file._id;
  } else if (data.avatar === '' || data.avatar === null) {
    // If avatar is empty string or null, remove it
    data.avatar = null;
  } else if (data.avatar && typeof data.avatar === 'string' && !data.avatar.startsWith('data:image')) {
    // If it's a URL (not base64), we don't process it - remove it from update
    delete data.avatar;
  }

  // Remove password from update data if present (should be handled separately)
  delete data.password;

  const user = await User.findByIdAndUpdate(
    userId,
    data,
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('avatar', '_id');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Convert avatar ObjectId to URL for frontend compatibility
  const userObj = user.toObject();
  if (userObj.avatar && userObj.avatar._id) {
    userObj.avatar = userObj.avatar._id.toString();
  }

  return userObj;
};
