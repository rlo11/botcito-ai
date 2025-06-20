// utils/email.js
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Create reusable transporter
const createTransporter = () => {
  // For development, we'll use a simple configuration
  // In production, you'd use real SMTP settings
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'noreply@botcito.ai',
        pass: process.env.EMAIL_PASS || 'your_app_password'
      },
      // Skip verification in development
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Production configuration
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const templates = {
  verification: (data) => ({
    subject: data.subject || 'Verify Your Email - Botcito.ai',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f8f9fa; padding: 30px; margin-top: 20px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Botcito.ai!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName || 'there'},</h2>
            <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
            <a href="${data.verificationLink}" class="button">Verify Email</a>
            <p style="margin-top: 20px;">Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #6366f1;">${data.verificationLink}</p>
            <p style="margin-top: 30px;">If you didn't sign up for Botcito.ai, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Botcito.ai. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Reset Your Password - Botcito.ai',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f8f9fa; padding: 30px; margin-top: 20px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName || 'there'},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${data.resetLink}" class="button">Reset Password</a>
            <p style="margin-top: 20px;">This link will expire in 1 hour for security reasons.</p>
            <p style="margin-top: 20px;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Botcito.ai. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  welcome: (data) => ({
    subject: 'Welcome to Botcito.ai!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f8f9fa; padding: 30px; margin-top: 20px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Botcito.ai!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName || 'there'},</h2>
            <p>Your email has been verified and your account is now active!</p>
            <p>Here's what you can do next:</p>
            <ul>
              <li>Create your first AI bot</li>
              <li>Explore our templates</li>
              <li>Join our community</li>
            </ul>
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 Botcito.ai. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const transporter = createTransporter();
    
    // Get template or use custom content
    const emailContent = template && templates[template] 
      ? templates[template](data)
      : { subject, html: data.html || data.text };

    // Send email
    const info = await transporter.sendMail({
      from: `"Botcito.ai" <${process.env.EMAIL_USER || 'noreply@botcito.ai'}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    });

    logger.info('Email sent successfully', { 
      messageId: info.messageId,
      to,
      subject: emailContent.subject
    });

    return info;
  } catch (error) {
    logger.error('Email sending failed', { error: error.message, to, subject });
    
    // In development, don't throw error to prevent app crashes
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Email not sent (development mode)', { to, subject });
      return { messageId: 'dev-mode-no-email' };
    }
    
    throw error;
  }
};

module.exports = {
  sendEmail
};