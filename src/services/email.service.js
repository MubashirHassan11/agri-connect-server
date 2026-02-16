import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import {getApprovedTemplate} from '../template/approved.js';
import {forgetPassTempl} from '../template/forgetPass.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS
  }
});

export const sendEmail = async ({to, subject, html, text}) => {
  try {
    const info = await transporter.sendMail({
      from: `"AgriConnect" <${env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    logger.info('Email sent successfully', {messageId: info.messageId, to});
    return info;
  } catch (error) {
    logger.error('Error sending email', {error: error.message, to, subject});
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, name, resetLink) => {
  if (!resetLink) {
    throw new Error('Reset link is required');
  }

  try {
    const subject = 'Reset Your AgriConnect Password';
    const html = forgetPassTempl(name, resetLink);

    const info = await transporter.sendMail({
      from: `"AgriConnect" <${env.EMAIL_USER}>`,
      to: email,
      subject,
      html
    });

    logger.info('Password reset email sent successfully', {email, messageId: info.messageId});
    return info;
  } catch (error) {
    logger.error('Error sending password reset email', {error: error.message, email});
    throw error;
  }
};

export const sendOnboardingEmail = async (email, name) => {
  if (!email) {
    logger.warn('Email not provided for notification');
    return;
  }

  try {
    const subject = 'Welcome to AgriConnect - Your Account is Approved!';
    const html = getApprovedTemplate(name);

    const info = await transporter.sendMail({
      from: `"AgriConnect" <${env.EMAIL_USER}>`,
      to: email,
      subject,
      html
    });

    logger.info('Onboarding email sent successfully', {email, messageId: info.messageId});
    return info;
  } catch (error) {
    logger.error('Error sending onboarding email', {error: error.message, email});
    throw error;
  }
};
