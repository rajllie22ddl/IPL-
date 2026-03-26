const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const DB_FILE = path.join(__dirname, 'database.json');

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
            matches: [],
            predictions: [],
            transactions: [],
            paymentRequests: [],
            withdrawRequests: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Database created!');
    }
}

function readDB() {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function generateReferralCode(username) {
    const prefix = username.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return prefix + random;
}

// ==================== USER ROUTES ====================
app.get('/api/users', (req, res) => {
    const db = readDB();
    const users = db.users.filter(u => u.role === 'user');
    res.json(users);
});

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

app.put('/api/users/:id/wallet', (req, res) => {
    const db = readDB();
    const userId = req.params.id;
    const { walletBalance } = req.body;
    
    const index = db.users.findIndex(u => u.id === userId);
    if (index !== -1) {
        db.users[index].walletBalance = walletBalance;
        writeDB(db);
        res.json({ success: true, walletBalance });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

app.put('/api/users/:id/toggle-status', (req, res) => {
    const db = readDB();
    const userId = req.params.id;
    const index = db.users.findIndex(u => u.id === userId);
    if (index !== -1) {
        db.users[index].isActive = db.users[index].isActive === false ? true : false;
        writeDB(db);
        res.json({ success: true, isActive: db.users[index].isActive });
    } else {
        res.json({ success: false });
    }
});

app.get('/api/users/:userId/predictions', (req, res) => {
    const db = readDB();
    const predictions = db.predictions.filter(p => p.userId === req.params.userId);
    res.json(predictions);
});

app.get('/api/users/:userId/transactions', (req, res) => {
    const db = readDB();
    const transactions = db.transactions.filter(t => t.userId === req.params.userId);
    res.json(transactions);
});

// ==================== MATCH ROUTES ====================
app.get('/api/matches', (req, res) => {
    const db = readDB();
    res.json(db.matches);
});

app.post('/api/matches', (req, res) => {
    const db = readDB();
    const match = req.body;
    match.id = Date.now().toString();
    match.totalPool = match.totalPool || 0;
    match.result = null;
    match.createdAt = new Date().toISOString();
    db.matches.push(match);
    writeDB(db);
    res.json({ success: true, match });
});

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
        res.status(404).json({ success: false });
    }
});

app.delete('/api/matches/:id', (req, res) => {
    const db = readDB();
    const matchId = req.params.id;
    db.matches = db.matches.filter(m => m.id !== matchId);
    db.predictions = db.predictions.filter(p => p.matchId !== matchId);
    writeDB(db);
    res.json({ success: true });
});

// ==================== PREDICTION ROUTES ====================
app.get('/api/predictions', (req, res) => {
    const db = readDB();
    res.json(db.predictions);
});

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

app.put('/api/predictions/:id', (req, res) => {
    const db = readDB();
    const predictionId = req.params.id;
    const updateData = req.body;
    
    const index = db.predictions.findIndex(p => p.id === predictionId);
    if (index !== -1) {
        db.predictions[index] = { ...db.predictions[index], ...updateData };
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Prediction not found' });
    }
});

// ==================== TRANSACTION ROUTES ====================
app.get('/api/transactions', (req, res) => {
    const db = readDB();
    res.json(db.transactions || []);
});

app.post('/api/transactions', (req, res) => {
    const db = readDB();
    const transaction = req.body;
    transaction.id = Date.now().toString();
    transaction.createdAt = new Date().toISOString();
    
    if (!db.transactions) db.transactions = [];
    db.transactions.push(transaction);
    writeDB(db);
    res.json({ success: true, transaction });
});

// ==================== PAYMENT ROUTES ====================
app.get('/api/payment-requests', (req, res) => {
    const db = readDB();
    res.json(db.paymentRequests || []);
});

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
        
        if (!db.transactions) db.transactions = [];
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
        res.json({ success: false });
    }
});

app.put('/api/payment-requests/:id/reject', (req, res) => {
    const db = readDB();
    const paymentId = req.params.id;
    const payment = db.paymentRequests.find(p => p.id === paymentId);
    
    if (payment && payment.status === 'pending') {
        payment.status = 'rejected';
        payment.remarks = req.body.remarks || 'Rejected';
        writeDB(db);
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// ==================== WITHDRAWAL ROUTES ====================
app.get('/api/withdraw-requests', (req, res) => {
    const db = readDB();
    res.json(db.withdrawRequests || []);
});

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

app.put('/api/withdraw-requests/:id/approve', (req, res) => {
    const db = readDB();
    const withdrawId = req.params.id;
    const withdraw = db.withdrawRequests.find(w => w.id === withdrawId);
    
    if (withdraw && withdraw.status === 'pending') {
        withdraw.status = 'approved';
        withdraw.processedAt = new Date().toISOString();
        
        if (!db.transactions) db.transactions = [];
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
        res.json({ success: false });
    }
});

app.put('/api/withdraw-requests/:id/reject', (req, res) => {
    const db = readDB();
    const withdrawId = req.params.id;
    const withdraw = db.withdrawRequests.find(w => w.id === withdrawId);
    
    if (withdraw && withdraw.status === 'pending') {
        withdraw.status = 'rejected';
        withdraw.remarks = req.body.remarks || 'Rejected';
        
        const userIndex = db.users.findIndex(u => u.id === withdraw.userId);
        if (userIndex !== -1) {
            db.users[userIndex].walletBalance += withdraw.amount;
        }
        
        writeDB(db);
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// ==================== AUTH ROUTES ====================
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
        isActive: true,
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
    
    if (!db.transactions) db.transactions = [];
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
                isFirstUser: user.isFirstUser || false,
                password: user.password
            }
        });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

// ==================== STATS ROUTE ====================
app.get('/api/stats', (req, res) => {
    const db = readDB();
    const users = db.users.filter(u => u.role === 'user');
    const predictions = db.predictions;
    const transactions = db.transactions || [];
    
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

// ==================== START SERVER ====================
initDatabase();

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Database file: ${DB_FILE}`);
    console.log(`🔐 Admin Login: admin / admin123`);
});
