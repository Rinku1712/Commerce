const nodemailer = require('nodemailer');
require('dotenv').config();

const mailProvider = process.env.MAIL_PROVIDER || 'gmail';
const mailConfig = {
    gmail: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || ''
        }
    },
    mailtrap: {
        host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
        port: Number(process.env.MAILTRAP_PORT) || 2525,
        secure: false,
        auth: {
            user: process.env.MAILTRAP_USER || '',
            pass: process.env.MAILTRAP_PASS || ''
        }
    }
};

const transporter = nodemailer.createTransport(mailConfig[mailProvider] || mailConfig.gmail);

module.exports = transporter;