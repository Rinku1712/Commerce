module.exports = {
    ensureAuth: function (req, res, next) {
        if (req.session.user) {
            return next();
        }
        res.redirect('/login');
    },
    ensureSeller: function (req, res, next) {
        if (req.session.user && req.session.user.role === 'seller') {
            return next();
        }
        res.status(403).send('Access Denied: Only Sellers allowed!');
    }
};