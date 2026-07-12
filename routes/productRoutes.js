const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { ensureSeller, ensureAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const productsFilePath = path.join(__dirname, '../products.json');
const ordersFilePath = path.join(__dirname, '../orders.json');
const wishlistFilePath = path.join(__dirname, '../wishlist.json');
const cartFilePath = path.join(__dirname, '../cart.json');

// Helper Functions
const getData = (file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
};
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Seller Add Product Page
router.get('/add', ensureAuth, ensureSeller, (req, res) => {
    res.render('add-product');
});

// Seller Post Product
router.post('/add', ensureAuth, ensureSeller, upload, (req, res) => {
    try {
        if (!req.file) return res.send("Please upload an image");
        const products = getData(productsFilePath);

        const newProduct = {
            id: Date.now().toString(),
            name: req.body.name,
            price: req.body.price,
            image: `/uploads/${req.file.filename}`,
            sellerId: req.session.user.id
        };
        products.push(newProduct);
        saveData(productsFilePath, products);
        res.redirect('/dashboard');
    } catch (err) { res.status(500).send('Error uploading product'); }
});

// WISHLIST FUNCTIONALITY
router.post('/wishlist/add/:id', ensureAuth, (req, res) => {
    const wishlists = getData(wishlistFilePath);
    const productId = req.params.id;
    const userId = req.session.user.id;

    if (!wishlists.find(w => w.userId === userId && w.productId === productId)) {
        wishlists.push({ id: Date.now().toString(), userId, productId });
        saveData(wishlistFilePath, wishlists);
    }
    res.redirect('/dashboard');
});

router.get('/wishlist', ensureAuth, (req, res) => {
    const wishlists = getData(wishlistFilePath).filter(w => w.userId === req.session.user.id);
    const allProducts = getData(productsFilePath);
    const userWishlist = wishlists.map(w => allProducts.find(p => p.id === w.productId)).filter(Boolean);
    res.render('wishlist', { products: userWishlist, user: req.session.user });
});

// INSTANT BUY ROUTE
router.post('/buy/:id', ensureAuth, (req, res) => {
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

// CONFIRM SINGLE PRODUCT ORDER
router.post('/order/confirm', ensureAuth, (req, res) => {
    const { productId } = req.body;
    const products = getData(productsFilePath);
    const orders = getData(ordersFilePath);
    const product = products.find(p => p.id === productId);

    const newOrder = {
        orderId: "OD" + Math.floor(100000 + Math.random() * 900000),
        userId: req.session.user.id,
        userName: req.session.user.name,
        productId: product.id,
        productName: product.name,
        price: product.price,
        image: product.image,
        sellerId: product.sellerId,
        status: "Ordered", // Ordered -> Dispatched -> Out for Delivery -> Delivered
        currentLocation: "Seller Warehouse", // Default location controlled by seller
        date: new Date().toLocaleDateString()
    };

    orders.push(newOrder);
    saveData(ordersFilePath, orders);

    res.send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px;">
            <h1 style="color:#388e3c;">🎉 Order Placed Successfully!</h1>
            <p>Your Payment Transaction has been processed by Flipkart secure layer.</p>
            <p>Order ID: <b>${newOrder.orderId}</b></p>
            <br>
            <a href="/products/orders" style="background:#2874f0; color:white; padding:10px 20px; text-decoration:none; border-radius:4px;">View Order Status</a>
        </div>
    `);
});

// ================= TRACKER UPDATE ROUTE FOR SELLER =================
router.post('/order/update-tracker', ensureAuth, ensureSeller, (req, res) => {
    const { orderId, status, currentLocation } = req.body;
    let orders = getData(ordersFilePath);
    
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
        order.status = status;
        order.currentLocation = currentLocation;
        saveData(ordersFilePath, orders);
    }
    res.redirect('/products/orders');
});

// SHOPPING CART SYSTEM ROUTES
router.post('/cart/add/:id', ensureAuth, (req, res) => {
    const carts = getData(cartFilePath);
    const productId = req.params.id;
    const userId = req.session.user.id;

    const existingItem = carts.find(c => c.userId === userId && c.productId === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        carts.push({ id: Date.now().toString(), userId, productId, quantity: 1 });
    }
    
    saveData(cartFilePath, carts);
    res.redirect('/products/cart');
});

router.get('/cart', ensureAuth, (req, res) => {
    const carts = getData(cartFilePath).filter(c => c.userId === req.session.user.id);
    const allProducts = getData(productsFilePath);

    let cartItems = [];
    let totalPrice = 0;

    carts.forEach(item => {
        const prod = allProducts.find(p => p.id === item.productId);
        if (prod) {
            const itemTotal = parseInt(prod.price) * item.quantity;
            totalPrice += itemTotal;
            cartItems.push({ ...prod, quantity: item.quantity, cartItemId: item.id });
        }
    });

    res.render('cart', { 
        products: cartItems, 
        totalPrice, 
        discount: Math.round(totalPrice * 0.1),
        delivery: totalPrice > 500 || totalPrice === 0 ? 0 : 40,
        user: req.session.user 
    });
});

router.post('/cart/update/:id/:action', ensureAuth, (req, res) => {
    let carts = getData(cartFilePath);
    const cartItemId = req.params.id;
    const action = req.params.action;

    const item = carts.find(c => c.id === cartItemId);
    if (item) {
        if (action === 'inc') item.quantity += 1;
        else if (action === 'dec') {
            item.quantity -= 1;
            if (item.quantity <= 0) carts = carts.filter(c => c.id !== cartItemId);
        }
    }
    saveData(cartFilePath, carts);
    res.redirect('/products/cart');
});

router.post('/cart/checkout', ensureAuth, (req, res) => {
    let carts = getData(cartFilePath);
    const userCart = carts.filter(c => c.userId === req.session.user.id);
    const allProducts = getData(productsFilePath);
    const orders = getData(ordersFilePath);

    if (userCart.length === 0) return res.send("Cart is empty");

    userCart.forEach(item => {
        const prod = allProducts.find(p => p.id === item.productId);
        if (prod) {
            orders.push({
                orderId: "OD" + Math.floor(100000 + Math.random() * 900000),
                userId: req.session.user.id,
                userName: req.session.user.name,
                productId: prod.id,
                productName: prod.name,
                price: prod.price * item.quantity,
                image: prod.image,
                sellerId: prod.sellerId,
                status: "Ordered",
                currentLocation: "Seller Warehouse",
                date: new Date().toLocaleDateString()
            });
        }
    });

    const updatedCarts = carts.filter(c => c.userId !== req.session.user.id);
    saveData(cartFilePath, updatedCarts);
    saveData(ordersFilePath, orders);

    res.send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px;">
            <h1 style="color:#388e3c;">🎉 All Cart Items Placed Successfully!</h1>
            <p>Your Flipkart Plus simulation payment was authorized safely.</p>
            <br>
            <a href="/products/orders" style="background:#2874f0; color:white; padding:10px 20px; text-decoration:none; border-radius:4px;">View Orders Status</a>
        </div>
    `);
});

router.get('/orders', ensureAuth, (req, res) => {
    const allOrders = getData(ordersFilePath);
    let filteredOrders = [];

    if (req.session.user.role === 'seller') {
        filteredOrders = allOrders.filter(o => o.sellerId === req.session.user.id);
    } else {
        filteredOrders = allOrders.filter(o => o.userId === req.session.user.id);
    }
    res.render('orders', { orders: filteredOrders, user: req.session.user });
});

module.exports = router;