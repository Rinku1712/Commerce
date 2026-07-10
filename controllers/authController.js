const fs = require('fs');
const path = require('path');
const transporter = require('../config/nodemailer');

const usersFilePath = path.join(__dirname, '../users.json');

const readUsersFromFile = () => {
    if (!fs.existsSync(usersFilePath)) {
        fs.writeFileSync(usersFilePath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(usersFilePath, 'utf8') || '[]');
};

const writeUsersToFile = (users) => {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const isPlaceholderCredential = (value) => !value || /your-gmail|app-password|example/i.test(value);

const sendOtpMail = async (to, name, otp, purpose) => {
    if (isPlaceholderCredential(process.env.EMAIL_USER) || isPlaceholderCredential(process.env.EMAIL_PASS)) {
        console.log('OTP email not sent: set real Gmail credentials in .env and use a Google App Password, not your normal password.');
        return false;
    }

    const subject = purpose === 'signup'
        ? 'Verify your account on Commerce'
        : 'Secure Login Verification Code';
    const text = purpose === 'signup'
        ? `Hello ${name},\n\nYour signup verification OTP is: ${otp}\n\nPlease enter it to complete your account registration.`
        : `Hello ${name},\n\nYour 6-digit secure login OTP is: ${otp}\n\nDo not share this code.`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (err) {
        console.log('OTP email not sent:', err.message);
        return false;
    }
};

exports.getSignup = (req, res) => res.render('signup');
exports.getLogin = (req, res) => res.render('login');

exports.postSignup = async (req, res) => {
    const { name, email, password, role, phone, address, bio } = req.body;
    try {
        const users = readUsersFromFile();
        if (users.find(u => u.email === email)) {
            return res.send("Email already registered! <a href='/signup'>Try again</a>");
        }

        const otp = generateOtp();
        req.session.tempSignupUser = {
            name,
            email,
            password,
            role,
            phone,
            address,
            bio,
            otp
        };

        console.log(`🔥 [SIGNUP OTP] Sent to ${email}: ${otp}`);

        let emailSent = true;
        try {
            emailSent = await sendOtpMail(email, name, otp, 'signup');
        } catch (e) {
            emailSent = false;
            console.log('Signup Email simulation active.');
        }

        return res.render('verify-otp', {
            mode: 'signup',
            email,
            action: '/verify-signup-otp',
            otpPreview: emailSent ? null : otp,
            emailSent
        });
    } catch (err) {
        res.status(500).send('Signup Error: ' + err.message);
    }
};

exports.postVerifySignupOtp = (req, res) => {
    const { otp } = req.body;
    const tempSignupUser = req.session.tempSignupUser;

    if (!tempSignupUser) {
        return res.send('Session expired. Please <a href="/signup">Sign up again</a>');
    }

    if (otp === tempSignupUser.otp) {
        const newUser = {
            id: Date.now().toString(),
            name: tempSignupUser.name,
            email: tempSignupUser.email,
            password: tempSignupUser.password,
            role: tempSignupUser.role,
            phone: tempSignupUser.phone || '',
            address: tempSignupUser.address || '',
            bio: tempSignupUser.bio || '',
            createdAt: new Date().toISOString()
        };

        const users = readUsersFromFile();
        users.push(newUser);
        writeUsersToFile(users);

        delete req.session.tempSignupUser;

        return req.session.save(() => {
            res.redirect('/login');
        });
    }

    return res.send('❌ Invalid Signup OTP! <a href="/signup">Try again</a>');
};

exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const users = readUsersFromFile();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            const loginOtp = generateOtp();
            console.log(`🔥 [LOGIN OTP] Sent to ${email}: ${loginOtp}`);

            req.session.tempLoginUser = { id: user.id, name: user.name, role: user.role, otp: loginOtp };

            let emailSent = true;
            try {
                emailSent = await sendOtpMail(email, user.name, loginOtp, 'login');
            } catch (e) {
                emailSent = false;
                console.log('Login Email simulation active.');
            }

            return res.render('verify-otp', {
                mode: 'login',
                email,
                action: '/verify-login-otp',
                otpPreview: emailSent ? null : loginOtp,
                emailSent
            });
        }
        res.send('Invalid Credentials. <a href="/login">Try Again</a>');
    } catch (err) {
        res.status(500).send('Login Error');
    }
};

exports.postVerifyLoginOtp = (req, res) => {
    const { otp } = req.body;
    const tempLoginUser = req.session.tempLoginUser;

    if (!tempLoginUser) {
        return res.send('Session expired. Please <a href="/login">Login again</a>');
    }

    if (otp === tempLoginUser.otp) {
        req.session.user = {
            id: tempLoginUser.id,
            name: tempLoginUser.name,
            role: tempLoginUser.role
        };

        delete req.session.tempLoginUser;

        return req.session.save(() => {
            res.redirect('/dashboard');
        });
    } else {
        res.send('❌ Invalid Login OTP! <a href="/login">Try Login again</a>');
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
};