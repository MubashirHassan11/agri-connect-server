import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Generate JWT token for a user
 * @param {string} userId - User ID
 * @param {string} userType - User type (farmer, buyer, admin, vendor)
 * @returns {string} JWT token
 */
export const generateToken = (userId, userType) => {
  return jwt.sign({ userId, userType }, env.JWT_SECRET, { 
    expiresIn: env.JWT_EXPIRES_IN 
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

