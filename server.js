const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

console.log('📁 Using Local File System Storage (No MongoDB Needed!)');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const ordersFilePath = path.join(__dirname, 'orders.json');
if (!fs.existsSync(ordersFilePath)) fs.writeFileSync(ordersFilePath, JSON.stringify([]));
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey_998877',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});
app.post('/products/order/update-tracker', (req, res) => {
    try {
        const { orderId, status, currentLocation } = req.body;
        
        let orders = [];
        if (fs.existsSync(ordersFilePath)) {
            orders = JSON.parse(fs.readFileSync(ordersFilePath, 'utf8') || '[]');
        }
        
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
            order.status = status;
            order.currentLocation = currentLocation;
            fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
            console.log(`🎯 Universal Tracker Success: ${orderId} -> ${status} at ${currentLocation}`);
        }
        
        res.redirect('/products/orders');
    } catch (err) {
        res.status(500).send("Tracker intercept failed: " + err.message);
    }
});
app.use('/', require('./routes/authRoutes'));
app.use('/products', require('./routes/productRoutes'));
app.use((err, req, res, next) => {
    console.error("🚨 Recovered from crash:", err.message);
    res.status(500).send("Something went wrong, but server is alive!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`🚀 SERVER ACTIVE ON: http://127.0.0.1:${PORT}`);
    console.log(`=========================================\n`);
});