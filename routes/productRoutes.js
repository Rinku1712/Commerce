const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { ensureSeller, ensureAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const productsFilePath = path.join(__dirname, '../products.json');

// ✅ SEARCH FUNCTIONALITY
// Search with suggestions (like Amazon/Flipkart)
router.get('/search', (req, res) => {
    try {
        const query = req.query.q ? req.query.q.toLowerCase().trim() : '';
        
        if (!query) {
            return res.json({ products: [], suggestions: [] });
        }

        // Read all products
        if (!fs.existsSync(productsFilePath)) {
            fs.writeFileSync(productsFilePath, JSON.stringify([]));
        }
        const products = JSON.parse(fs.readFileSync(productsFilePath, 'utf8') || '[]');
        const searchResults = products.filter(product => 
            product.name.toLowerCase().includes(query) ||
            product.price.toString().includes(query)
        );

        // Generate suggestions from product names
        const allKeywords = new Set();
        products.forEach(product => {
            const words = product.name.toLowerCase().split(' ');
            words.forEach(word => {
                if (word.length > 2 && word.toLowerCase().includes(query)) {
                    allKeywords.add(word);
                }
            });
        });

        // Get exact product name matches for suggestions
        const productNameSuggestions = products
            .map(p => p.name)
            .filter(name => name.toLowerCase().includes(query))
            .slice(0, 5);

        const suggestions = [
            ...new Set([...productNameSuggestions, ...Array.from(allKeywords)])
        ].slice(0, 8);

        res.json({ 
            products: searchResults, 
            suggestions: suggestions 
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get suggestions only (for autocomplete)
router.get('/suggestions', (req, res) => {
    try {
        const query = req.query.q ? req.query.q.toLowerCase().trim() : '';
        
        if (!query || query.length < 2) {
            return res.json({ suggestions: [] });
        }

        if (!fs.existsSync(productsFilePath)) {
            fs.writeFileSync(productsFilePath, JSON.stringify([]));
        }
        const products = JSON.parse(fs.readFileSync(productsFilePath, 'utf8') || '[]');

        // Collect all keywords
        const keywordMap = new Map();
        products.forEach(product => {
            const words = product.name.toLowerCase().split(/[\s\-.,]/);
            words.forEach(word => {
                if (word.length > 1 && word.includes(query)) {
                    keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
                }
            });
        });

        // Get product name matches
        const productMatches = products
            .map(p => p.name)
            .filter(name => name.toLowerCase().includes(query));

        // Combine and sort by relevance
        const allSuggestions = [
            ...new Set([
                ...productMatches,
                ...Array.from(keywordMap.keys()).sort((a, b) => keywordMap.get(b) - keywordMap.get(a))
            ])
        ].slice(0, 10);

        res.json({ suggestions: allSuggestions });
    } catch (err) {
        console.error("Suggestions error:", err);
        res.status(500).json({ suggestions: [] });
    }
});

// Search results page
router.get('/results', (req, res) => {
    try {
        const query = req.query.q ? req.query.q.toLowerCase().trim() : '';
        
        if (!query) {
            return res.redirect('/dashboard');
        }

        if (!fs.existsSync(productsFilePath)) {
            fs.writeFileSync(productsFilePath, JSON.stringify([]));
        }
        const products = JSON.parse(fs.readFileSync(productsFilePath, 'utf8') || '[]');

        // Filter products
        const searchResults = products.filter(product => 
            product.name.toLowerCase().includes(query) ||
            product.price.toString().includes(query)
        );

        res.render('search-results', {
            products: searchResults,
            query: query,
            user: req.session.user || null
        });
    } catch (err) {
        console.error("Search results error:", err);
        res.status(500).send('Error loading search results');
    }
});

// Original routes
router.get('/add', ensureAuth, ensureSeller, (req, res) => {
    res.render('add-product');
});

router.post('/add', ensureAuth, ensureSeller, upload, (req, res) => {
    try {
        if (!req.file) return res.send("Please upload an image");
        
        if (!fs.existsSync(productsFilePath)) {
            fs.writeFileSync(productsFilePath, JSON.stringify([]));
        }
        const products = JSON.parse(fs.readFileSync(productsFilePath, 'utf8') || '[]');

        const newProduct = {
            id: Date.now().toString(),
            name: req.body.name,
            price: req.body.price,
            image: `/uploads/${req.file.filename}`,
            sellerId: req.session.user.id
        };

        products.push(newProduct);
        fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));

        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send('Error uploading product');
    }
});

module.exports = router;