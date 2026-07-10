const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.get('/signup', authController.getSignup);
router.post('/signup', authController.postSignup);
router.post('/verify-signup-otp', authController.postVerifySignupOtp);

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/verify-login-otp', authController.postVerifyLoginOtp);

router.get('/logout', authController.logout);

// FLIPKART / AMAZON STYLE DYNAMIC DASHBOARD
router.get('/dashboard', ensureAuth, (req, res) => {
    const productsFilePath = path.join(__dirname, '../products.json');
    let products = [];
    if (fs.existsSync(productsFilePath)) {
        products = JSON.parse(fs.readFileSync(productsFilePath, 'utf8') || '[]');
    }
    // Render Amazon grid layout passing users and real products
    res.render('dashboard', { user: req.session.user, products });
});

router.get('/', (req, res) => res.redirect('/login'));
module.exports = router;