const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const transporter = require('./config/nodemailer');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure Folders and JSON files exist so node never crashes
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const usersFile = path.join(__dirname, 'users.json');
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

const productsFile = path.join(__dirname, 'products.json');
if (!fs.existsSync(productsFile)) fs.writeFileSync(productsFile, JSON.stringify([]));

// Bulletproof Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey_998877',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Context Injection for Templates (Crash Avoidance)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Routes Link
app.use('/', require('./routes/authRoutes'));
app.use('/products', require('./routes/productRoutes'));

// Global Fail-Safe (Catch all crashes instantly)
app.use((err, req, res, next) => {
    console.error("🚨 Recovered from crash:", err.message);
    res.status(500).send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px;">
            <h2 style="color:#e11d48;">Oops! Error Occurred</h2>
            <p>${err.message}</p>
            <a href="/dashboard" style="background:#2563eb; color:white; padding:10px 20px; text-decoration:none; rounded:5px;">Go to Dashboard</a>
        </div>
    `);
});

const PORT = process.env.PORT || 5000;
transporter.verify()
    .then(() => {
        console.log('✅ Gmail SMTP connection verified.');
    })
    .catch((err) => {
        console.log('⚠️ Gmail SMTP connection failed:', err.message);
        console.log('👉 Use a Google App Password in .env for real OTP emails.');
    });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`🚀 SERVER IS LIVE AND FLYING SECURELY!`);
    console.log(`👉 OPEN THIS LINK: http://127.0.0.1:${PORT}`);
    console.log(`=========================================\n`);
});