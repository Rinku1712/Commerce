const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuth, ensureSeller } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const productsFilePath = path.join(__dirname, '../products.json');
const ordersFilePath = path.join(__dirname, '../orders.json');

// Helper Functions
const getData = (file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
};
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

router.get('/signup', authController.getSignup);
router.post('/signup', authController.postSignup);
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/verify-login-otp', authController.postVerifyLoginOtp);
router.get('/logout', authController.logout);

// MAIN DASHBOARD
router.get('/dashboard', ensureAuth, (req, res) => {
    const products = getData(productsFilePath);
    res.render('dashboard', { user: req.session.user, products });
});

// INSTANT BUY BACKUP ROUTE
router.post('/products/buy/:id', ensureAuth, (req, res) => {
    const productId = req.params.id;
    const products = getData(productsFilePath);
    const product = products.find(p => p.id === productId);

    if (!product) return res.send("Product not found");

    res.send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px; background:#f3f4f6; min-height:100vh;">
            <div style="background:white; max-width:400px; margin:0 auto; padding:30px; border-radius:10px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                <h2 style="color:#2874f0;">💳 Secure Gateway Checkout</h2>
                <hr style="border:1px solid #e5e7eb; margin:20px 0;">
                <p style="text-align:left;"><b>Item:</b> ${product.name}</p>
                <p style="text-align:left;"><b>Total Amount:</b> ₹${product.price}</p>
                <p style="text-align:left; color:#16a34a;"><b>Payment Method:</b> Mock UPI / Credit Card Linked</p>
                
                <form action="/products/order/confirm" method="POST" style="margin-top:30px;">
                    <input type="hidden" name="productId" value="${product.id}">
                    <button type="submit" style="background:#ff9f00; color:white; border:none; padding:12px 20px; font-weight:bold; width:100%; border-radius:5px; cursor:pointer;">Authorize & Pay Amount</button>
                </form>
                <a href="/dashboard" style="display:block; margin-top:15px; text-decoration:none; color:#6b7280; font-size:13px;">Cancel Transaction</a>
            </div>
        </div>
    `);
});

// ================= FIXED LOGISTICS TRACKER UPDATE ROUTE =================
router.post('/products/order/update-tracker', ensureAuth, ensureSeller, (req, res) => {
    try {
        const { orderId, status, currentLocation } = req.body;
        let orders = getData(ordersFilePath);
        
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
            order.status = status;
            order.currentLocation = currentLocation;
            saveData(ordersFilePath, orders);
            console.log(`📦 Tracker Updated: Order ${orderId} is now ${status} at ${currentLocation}`);
        } else {
            console.log(`❌ Order ID ${orderId} not found for tracking update.`);
        }
        res.redirect('/products/orders');
    } catch (err) {
        res.status(500).send("Error updating tracker logic: " + err.message);
    }
});

router.get('/', (req, res) => res.redirect('/login'));
module.exports = router;