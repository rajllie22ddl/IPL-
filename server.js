const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database file path
const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database
function initDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [
                {
                    id: '1',
                    username: 'admin',
                    email: 'admin@ipl.com',
                    password: 'admin123',
                    role: 'admin',
                    walletBalance: 0,
                    deviceId: 'admin_device',
                    referralCode: 'ADMIN123',
                    referredBy: null,
                    referrals: [],
                    referralBonus: 0,
                    referralCount: 0,
                    isFirstUser: false,
                    createdAt: new Date().toISOString()
                }
            ],
            matches: [
                {
                    id: '1',
                    matchNumber: 1,
                    team1: 'Mumbai Indians',
                    team2: 'Chennai Super Kings',
                    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    time: '7:30 PM',
                    venue: 'Wankhede Stadium, Mumbai',
                    status: 'upcoming',
                    questions: [
                        { id: 'q1', text: '🏏 मैच कौन जीतेगा?', options: ['CSK', 'MI'] },
                        { id: 'q2', text: '🎯 सबसे ज्यादा विकेट कौन लेगा?', options: ['Rashkeeper', 'Mohit', 'Kuldeep', 'Other'] },
                        { id: 'q3', text: '🏆 प्लेयर ऑफ द मैच कौन होगा?', options: ['Virat Kohli', 'Rohit Sharma', 'MS Dhoni', 'Other'] },
                        { id: 'q4', text: '📊 कुल रन कितने होंगे?', options: ['Under 300', '300-350', '350-400', 'Over 400'] },
                        { id: 'q5', text: '💪 सबसे ज्यादा छक्के कौन लगाएगा?', options: ['CSK', 'MI', 'Equal', 'None'] }
                    ],
                    totalPool: 0,
                    result: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    matchNumber: 2,
                    team1: 'Royal Challengers Bangalore',
                    team2: 'Kolkata Knight Riders',
                    date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
                    time: '7:30 PM',
                    venue: 'M.Chinnaswamy Stadium, Bangalore',
                    status: 'upcoming',
                    questions: [
                        { id: 'q1', text: '🏏 मैच कौन जीतेगा?', options: ['RCB', 'KKR'] },
                        { id: 'q2', text: '🎯 सबसे ज्यादा विकेट कौन लेगा?', options: ['Rashkeeper', 'Mohit', 'Kuldeep', 'Other'] },
                        { id: 'q3', text: '🏆 प्लेयर ऑफ द मैच कौन होगा?', options: ['Virat Kohli', 'Rohit Sharma', 'MS Dhoni', 'Other'] },
                        { id: 'q4', text: '📊 कुल रन कितने होंगे?', options: ['Under 300', '300-350', '350-400', 'Over 400'] },
                        { id: 'q5', text: '💪 सबसे ज्यादा छक्के कौन लगाएगा?', options: ['RCB', 'KKR', 'Equal', 'None'] }
                    ],
                    totalPool: 0,
                    result: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '3',
                    matchNumber: 3,
                    team1: 'Delhi Capitals',
                    team2: 'Rajasthan Royals',
                    date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
                    time: '3:30 PM',
                    venue: 'Arun Jaitley Stadium, Delhi',
                    status: 'upcoming',
                    questions: [
                        { id: 'q1', text: '🏏 मैच कौन जीतेगा?', options: ['DC', 'RR'] },
                        { id: 'q2', text: '🎯 सबसे ज्यादा विकेट कौन लेगा?', options: ['Rashkeeper', 'Mohit', 'Kuldeep', 'Other'] },
                        { id: 'q3', text: '🏆 प्लेयर ऑफ द मैच कौन होगा?', options: ['Virat Kohli', 'Rohit Sharma', 'MS Dhoni', 'Other'] },
                        { id: 'q4', text: '📊 कुल रन कितने होंगे?', options: ['Under 300', '300-350', '350-400', 'Over 400'] },
                        { id: 'q5', text: '💪 सबसे ज्यादा छक्के कौन लगाएगा?', options: ['DC', 'RR', 'Equal', 'None'] }
                    ],
                    totalPool: 0,
                    result: null,
                    createdAt: new Date().toISOString()
                }
            ],
            predictions: [],
            transactions: [],
            paymentRequests: [],
            withdrawRequests: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Database created!');
    }
}

// Read database
function readDB() {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

// Write database
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generate referral code
function generateReferralCode(username) {
    const prefix = username.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return prefix + random;
}

// ==================== API ROUTES ====================

// Get all users
app.get('/api/users', (req, res) => {
    const db = readDB();
    const users = db.users.filter(u => u.role === 'user');
    res.json(users);
});

// Get all matches
app.get('/api/matches', (req, res) => {
    const db = readDB();
    res.json(db.matches);
});

// Add match
app.post('/api/matches', (req, res) => {
    const db = readDB();
    const match = req.body;
    match.id = Date.now().toString();
    match.totalPool = 0;
    match.result = null;
    match.createdAt = new Date().toISOString();
    db.matches.push(match);
    writeDB(db);
    res.json({ success: true, match });
});

// Update match
app.put('/api/matches/:id', (req, res) => {
    const db = readDB();
    const matchId = req.params.id;
    const updatedMatch = req.body;
    const index = db.matches.findIndex(m => m.id === matchId);
    if (index !== -1) {
        db.matches[index] = { ...db.matches[index], ...updatedMatch };
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Match not found' });
    }
});

// Delete match
app.delete('/api/matches/:id', (req, res) => {
    const db = readDB();
    const matchId = req.params.id;
    db.matches = db.matches.filter(m => m.id !== matchId);
    db.predictions = db.predictions.filter(p => p.matchId !== matchId);
    writeDB(db);
    res.json({ success: true });
});

// Get all predictions
app.get('/api/predictions', (req, res) => {
    const db = readDB();
    res.json(db.predictions);
});

// Make prediction
app.post('/api/predictions', (req, res) => {
    const db = readDB();
    const prediction = req.body;
    prediction.id = Date.now().toString();
    prediction.status = 'pending';
    prediction.createdAt = new Date().toISOString();
    
    const matchIndex = db.matches.findIndex(m => m.id === prediction.matchId);
    if (matchIndex !== -1) {
        db.matches[matchIndex].totalPool = (db.matches[matchIndex].totalPool || 0) + prediction.betAmount;
    }
    
    db.predictions.push(prediction);
    
    const userIndex = db.users.findIndex(u => u.id === prediction.userId);
    if (userIndex !== -1) {
        db.users[userIndex].walletBalance -= prediction.betAmount;
    }
    
    writeDB(db);
    res.json({ success: true, prediction });
});

// Register user
app.post('/api/register', (req, res) => {
    const db = readDB();
    const { username, email, password, referralCode } = req.body;
    
    const existingUser = db.users.find(u => u.username === username || u.email === email);
    if (existingUser) {
        return res.json({ success: false, message: 'Username or email already exists' });
    }
    
    const existingUsers = db.users.filter(u => u.role === 'user');
    const isFirstUser = existingUsers.length === 0;
    
    let referrer = null;
    let referralBonus = 0;
    if (referralCode && !isFirstUser) {
        referrer = db.users.find(u => u.referralCode === referralCode && u.role === 'user');
        if (referrer) {
            referralBonus = 5;
        }
    }
    
    const WELCOME_BONUS = 5;
    const FIRST_USER_BONUS = 10;
    let totalBonus = WELCOME_BONUS + referralBonus;
    if (isFirstUser) {
        totalBonus += FIRST_USER_BONUS;
    }
    
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password,
        role: 'user',
        walletBalance: totalBonus,
        deviceId: req.headers['user-agent'] || 'unknown',
        referralCode: generateReferralCode(username),
        referredBy: referrer ? referrer.id : null,
        referrals: [],
        referralBonus: 0,
        referralCount: 0,
        isFirstUser: isFirstUser,
        createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    
    if (referrer) {
        const referrerIndex = db.users.findIndex(u => u.id === referrer.id);
        if (referrerIndex !== -1) {
            db.users[referrerIndex].walletBalance += 5;
            db.users[referrerIndex].referralBonus += 5;
            db.users[referrerIndex].referralCount += 1;
            if (!db.users[referrerIndex].referrals) db.users[referrerIndex].referrals = [];
            db.users[referrerIndex].referrals.push({
                userId: newUser.id,
                username: newUser.username,
                bonus: 5,
                date: new Date().toISOString()
            });
        }
    }
    
    db.transactions.push({
        id: Date.now().toString(),
        userId: newUser.id,
        type: 'bonus',
        amount: totalBonus,
        description: `Welcome Bonus ₹${WELCOME_BONUS}${referralBonus ? ' + Referral ₹5' : ''}${isFirstUser ? ' + First User ₹10' : ''}`,
        status: 'completed',
        createdAt: new Date().toISOString()
    });
    
    if (referrer) {
        db.transactions.push({
            id: Date.now().toString(),
            userId: referrer.id,
            type: 'referral_bonus',
            amount: 5,
            description: `Referral bonus for inviting ${username}`,
            status: 'completed',
            createdAt: new Date().toISOString()
        });
    }
    
    writeDB(db);
    
    res.json({
        success: true,
        message: 'Registration successful!',
        user: { id: newUser.id, username: newUser.username, role: newUser.role },
        bonus: totalBonus,
        referralCode: newUser.referralCode,
        isFirstUser: isFirstUser
    });
});

// Login user
app.post('/api/login', (req, res) => {
    const db = readDB();
    const { username, password } = req.body;
    
    const user = db.users.find(u => (u.username === username || u.email === username) && u.password === password);
    
    if (user) {
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                walletBalance: user.walletBalance,
                referralCode: user.referralCode,
                referrals: user.referrals || [],
                referralBonus: user.referralBonus || 0,
                referralCount: user.referralCount || 0,
                isFirstUser: user.isFirstUser || false
            }
        });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

// Get user by id
app.get('/api/users/:id', (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (user) {
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            walletBalance: user.walletBalance,
            referralCode: user.referralCode,
            referrals: user.referrals || [],
            referralBonus: user.referralBonus || 0,
            referralCount: user.referralCount || 0
        });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Get user predictions
app.get('/api/users/:userId/predictions', (req, res) => {
    const db = readDB();
    const predictions = db.predictions.filter(p => p.userId === req.params.userId);
    res.json(predictions);
});

// Get payment requests
app.get('/api/payment-requests', (req, res) => {
    const db = readDB();
    res.json(db.paymentRequests || []);
});

// Add payment request
app.post('/api/payment-requests', (req, res) => {
    const db = readDB();
    const request = req.body;
    request.id = Date.now().toString();
    request.status = 'pending';
    request.createdAt = new Date().toISOString();
    
    if (!db.paymentRequests) db.paymentRequests = [];
    db.paymentRequests.push(request);
    writeDB(db);
    res.json({ success: true, request });
});

// Approve payment
app.put('/api/payment-requests/:id/approve', (req, res) => {
    const db = readDB();
    const paymentId = req.params.id;
    const payment = db.paymentRequests.find(p => p.id === paymentId);
    
    if (payment && payment.status === 'pending') {
        payment.status = 'approved';
        payment.approvedAt = new Date().toISOString();
        
        const userIndex = db.users.findIndex(u => u.id === payment.userId);
        if (userIndex !== -1) {
            db.users[userIndex].walletBalance += payment.amount;
        }
        
        db.transactions.push({
            id: Date.now().toString(),
            userId: payment.userId,
            type: 'deposit',
            amount: payment.amount,
            description: `Deposit via UTR: ${payment.utrNumber}`,
            status: 'completed',
            createdAt: new Date().toISOString()
        });
        
        writeDB(db);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Payment not found' });
    }
});

// Reject payment
app.put('/api/payment-requests/:id/reject', (req, res) => {
    const db = readDB();
    const paymentId = req.params.id;
    const payment = db.paymentRequests.find(p => p.id === paymentId);
    
    if (payment && payment.status === 'pending') {
        payment.status = 'rejected';
        payment.remarks = req.body.remarks || 'Rejected by admin';
        writeDB(db);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Payment not found' });
    }
});

// Get withdraw requests
app.get('/api/withdraw-requests', (req, res) => {
    const db = readDB();
    res.json(db.withdrawRequests || []);
});

// Add withdraw request
app.post('/api/withdraw-requests', (req, res) => {
    const db = readDB();
    const request = req.body;
    request.id = Date.now().toString();
    request.status = 'pending';
    request.createdAt = new Date().toISOString();
    
    if (!db.withdrawRequests) db.withdrawRequests = [];
    db.withdrawRequests.push(request);
    
    const userIndex = db.users.findIndex(u => u.id === request.userId);
    if (userIndex !== -1) {
        db.users[userIndex].walletBalance -= request.amount;
    }
    
    writeDB(db);
    res.json({ success: true, request });
});

// Approve withdrawal
app.put('/api/withdraw-requests/:id/approve', (req, res) => {
    const db = readDB();
    const withdrawId = req.params.id;
    const withdraw = db.withdrawRequests.find(w => w.id === withdrawId);
    
    if (withdraw && withdraw.status === 'pending') {
        withdraw.status = 'approved';
        withdraw.processedAt = new Date().toISOString();
        
        db.transactions.push({
            id: Date.now().toString(),
            userId: withdraw.userId,
            type: 'withdrawal',
            amount: -withdraw.amount,
            description: `Withdrawal to UPI: ${withdraw.upiId}`,
            status: 'completed',
            createdAt: new Date().toISOString()
        });
        
        writeDB(db);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Withdrawal not found' });
    }
});

// Reject withdrawal
app.put('/api/withdraw-requests/:id/reject', (req, res) => {
    const db = readDB();
    const withdrawId = req.params.id;
    const withdraw = db.withdrawRequests.find(w => w.id === withdrawId);
    
    if (withdraw && withdraw.status === 'pending') {
        withdraw.status = 'rejected';
        withdraw.remarks = req.body.remarks || 'Rejected by admin';
        
        const userIndex = db.users.findIndex(u => u.id === withdraw.userId);
        if (userIndex !== -1) {
            db.users[userIndex].walletBalance += withdraw.amount;
        }
        
        writeDB(db);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Withdrawal not found' });
    }
});

// Get user transactions
app.get('/api/users/:userId/transactions', (req, res) => {
    const db = readDB();
    const transactions = db.transactions.filter(t => t.userId === req.params.userId);
    res.json(transactions);
});

// Get all transactions
app.get('/api/transactions', (req, res) => {
    const db = readDB();
    res.json(db.transactions || []);
});

// Update user status
app.put('/api/users/:id/toggle-status', (req, res) => {
    const db = readDB();
    const userId = req.params.id;
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        db.users[userIndex].isActive = db.users[userIndex].isActive === false ? true : false;
        writeDB(db);
        res.json({ success: true, isActive: db.users[userIndex].isActive });
    } else {
        res.json({ success: false, message: 'User not found' });
    }
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    const db = readDB();
    const users = db.users.filter(u => u.role === 'user');
    const predictions = db.predictions;
    const transactions = db.transactions;
    
    const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalBetAmount = predictions.reduce((sum, p) => sum + (p.betAmount || 0), 0);
    const totalCommission = predictions.reduce((sum, p) => sum + (p.platformCommission || 0), 0);
    
    res.json({
        totalUsers: users.length,
        totalPredictions: predictions.length,
        totalDeposits,
        totalWithdrawals,
        totalBetAmount,
        totalCommission,
        pendingPayments: (db.paymentRequests || []).filter(p => p.status === 'pending').length,
        pendingWithdrawals: (db.withdrawRequests || []).filter(w => w.status === 'pending').length
    });
});

// CORS handler for frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Start server
initDatabase();
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Database file: ${DB_FILE}`);
    console.log(`🔐 Admin Login: admin / admin123`);
});