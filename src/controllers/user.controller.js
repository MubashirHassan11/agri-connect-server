import * as userService from '../services/user.service.js';
import {sendSuccess, sendError} from '../utils/response.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return sendSuccess(res, users, 'Users fetched successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getUserById = async (req, res) => {
  try {
    const {id} = req.params;
    const user = await userService.getUserById(id);
    return sendSuccess(res, user, 'User fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 404);
  }
};
