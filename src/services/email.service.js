import {Resend} from 'resend';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const resend = new Resend(env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email, name, resetLink) => {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!resetLink) {
    throw new Error('Reset link is required');
  }

  try {
    const {data, error} = await resend.emails.send({
      from: 'AgriConnect <noreply@agri-connect.store>',
      to: email,
      template: {
        id: 'password-reset-1',
        variables: {
          link: resetLink,
          name
        }
      }
    });

    if (error) {
      logger.error('Resend email error', error);
    }

    logger.info('Password reset email sent successfully', {email, messageId: data?.id});
    return data;
  } catch (error) {
    logger.error('Error sending password reset email', {error: error.message, email});
    throw error;
  }
};
