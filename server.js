const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ahiwarrahul3781.db_user:Q4Rr2KYhS9PsljzZ@cluster0.p431dub.mongodb.net/iplpredictor';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Error:', err.message));

// ==================== SCHEMAS ====================

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    role: { type: String, default: 'user' },
    walletBalance: { type: Number, default: 0 },
    deviceId: String,
    referralCode: String,
    referredBy: String,
    referrals: { type: Array, default: [] },
    referralBonus: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },
    isFirstUser: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const matchSchema = new mongoose.Schema({
    matchNumber: Number,
    team1: String,
    team2: String,
    date: Date,
    time: String,
    venue: String,
    status: { type: String, default: 'upcoming' },
    questions: Array,
    totalPool: { type: Number, default: 0 },
    result: Object,
    createdAt: { type: Date, default: Date.now }
});

const predictionSchema = new mongoose.Schema({
    userId: String,
    matchId: String,
    matchName: String,
    predictions: Array,
    betAmount: Number,
    status: { type: String, default: 'pending' },
    points: Number,
    winningPercent: Number,
    winningAmount: Number,
    platformCommission: Number,
    createdAt: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
    userId: String,
    type: String,
    amount: Number,
    description: String,
    status: { type: String, default: 'completed' },
    createdAt: { type: Date, default: Date.now }
});

const paymentRequestSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    utrNumber: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const withdrawRequestSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    upiId: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Match = mongoose.model('Match', matchSchema);
const Prediction = mongoose.model('Prediction', predictionSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);
const WithdrawRequest = mongoose.model('WithdrawRequest', withdrawRequestSchema);

function generateReferralCode(username) {
    return username.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==================== USER ROUTES ====================

app.get('/api/users', async (req, res) => {
    const users = await User.find({ role: 'user' });
    res.json(users);
});

app.get('/api/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user);
});

app.put('/api/users/:id/wallet', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { walletBalance: req.body.walletBalance });
    res.json({ success: true });
});

app.put('/api/users/:id/toggle-status', async (req, res) => {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true });
});

app.get('/api/users/:userId/predictions', async (req, res) => {
    const predictions = await Prediction.find({ userId: req.params.userId });
    res.json(predictions);
});

app.get('/api/users/:userId/transactions', async (req, res) => {
    const transactions = await Transaction.find({ userId: req.params.userId });
    res.json(transactions);
});

// ==================== MATCH ROUTES ====================

app.get('/api/matches', async (req, res) => {
    const matches = await Match.find();
    res.json(matches);
});

app.post('/api/matches', async (req, res) => {
    const match = new Match(req.body);
    await match.save();
    res.json({ success: true, match });
});

app.put('/api/matches/:id', async (req, res) => {
    await Match.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});

app.delete('/api/matches/:id', async (req, res) => {
    await Match.findByIdAndDelete(req.params.id);
    await Prediction.deleteMany({ matchId: req.params.id });
    res.json({ success: true });
});

// ==================== PREDICTION ROUTES ====================

app.get('/api/predictions', async (req, res) => {
    const predictions = await Prediction.find();
    res.json(predictions);
});

app.post('/api/predictions', async (req, res) => {
    const prediction = new Prediction(req.body);
    await prediction.save();
    
    const user = await User.findById(prediction.userId);
    if (user) {
        user.walletBalance -= prediction.betAmount;
        await user.save();
    }
    
    const match = await Match.findById(prediction.matchId);
    if (match) {
        match.totalPool = (match.totalPool || 0) + prediction.betAmount;
        await match.save();
    }
    
    res.json({ success: true, prediction });
});

app.put('/api/predictions/:id', async (req, res) => {
    await Prediction.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});

// ==================== TRANSACTION ROUTES ====================

app.get('/api/transactions', async (req, res) => {
    const transactions = await Transaction.find();
    res.json(transactions);
});

app.post('/api/transactions', async (req, res) => {
    const transaction = new Transaction(req.body);
    await transaction.save();
    res.json({ success: true });
});

// ==================== PAYMENT ROUTES ====================

app.get('/api/payment-requests', async (req, res) => {
    const requests = await PaymentRequest.find();
    res.json(requests);
});

app.post('/api/payment-requests', async (req, res) => {
    const request = new PaymentRequest(req.body);
    await request.save();
    res.json({ success: true });
});

app.put('/api/payment-requests/:id/approve', async (req, res) => {
    const payment = await PaymentRequest.findById(req.params.id);
    if (payment && payment.status === 'pending') {
        payment.status = 'approved';
        await payment.save();
        
        const user = await User.findById(payment.userId);
        if (user) {
            user.walletBalance += payment.amount;
            await user.save();
        }
        
        const transaction = new Transaction({
            userId: payment.userId,
            type: 'deposit',
            amount: payment.amount,
            description: `Deposit via UTR: ${payment.utrNumber}`,
            status: 'completed'
        });
        await transaction.save();
        
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.put('/api/payment-requests/:id/reject', async (req, res) => {
    const payment = await PaymentRequest.findById(req.params.id);
    if (payment && payment.status === 'pending') {
        payment.status = 'rejected';
        await payment.save();
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// ==================== WITHDRAWAL ROUTES ====================

app.get('/api/withdraw-requests', async (req, res) => {
    const requests = await WithdrawRequest.find();
    res.json(requests);
});

app.post('/api/withdraw-requests', async (req, res) => {
    const request = new WithdrawRequest(req.body);
    await request.save();
    
    const user = await User.findById(request.userId);
    if (user) {
        user.walletBalance -= request.amount;
        await user.save();
    }
    
    res.json({ success: true });
});

app.put('/api/withdraw-requests/:id/approve', async (req, res) => {
    const withdraw = await WithdrawRequest.findById(req.params.id);
    if (withdraw && withdraw.status === 'pending') {
        withdraw.status = 'approved';
        await withdraw.save();
        
        const transaction = new Transaction({
            userId: withdraw.userId,
            type: 'withdrawal',
            amount: -withdraw.amount,
            description: `Withdrawal to UPI: ${withdraw.upiId}`,
            status: 'completed'
        });
        await transaction.save();
        
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.put('/api/withdraw-requests/:id/reject', async (req, res) => {
    const withdraw = await WithdrawRequest.findById(req.params.id);
    if (withdraw && withdraw.status === 'pending') {
        withdraw.status = 'rejected';
        await withdraw.save();
        
        const user = await User.findById(withdraw.userId);
        if (user) {
            user.walletBalance += withdraw.amount;
            await user.save();
        }
        
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// ==================== AUTH ROUTES ====================

app.post('/api/register', async (req, res) => {
    const { username, email, password, referralCode, deviceId } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
        return res.json({ success: false, message: 'Username or email exists' });
    }
    
    if (deviceId) {
        const existingDevice = await User.findOne({ deviceId, role: 'user' });
        if (existingDevice) {
            return res.json({ success: false, message: 'This device already has an account!' });
        }
    }
    
    const userCount = await User.countDocuments({ role: 'user' });
    const isFirstUser = userCount === 0;
    
    let referrer = null;
    let referralBonus = 0;
    if (referralCode && !isFirstUser) {
        referrer = await User.findOne({ referralCode });
        if (referrer) {
            referralBonus = 5;
        }
    }
    
    const WELCOME_BONUS = 5;
    const FIRST_USER_BONUS = 10;
    let totalBonus = WELCOME_BONUS + referralBonus;
    if (isFirstUser) totalBonus += FIRST_USER_BONUS;
    
    const newUser = new User({
        username,
        email,
        password,
        role: 'user',
        walletBalance: totalBonus,
        deviceId: deviceId || 'unknown',
        referralCode: generateReferralCode(username),
        referredBy: referrer ? referrer.id : null,
        isFirstUser: isFirstUser,
        isActive: true
    });
    
    await newUser.save();
    
    if (referrer) {
        referrer.walletBalance += 5;
        referrer.referralBonus += 5;
        referrer.referralCount += 1;
        if (!referrer.referrals) referrer.referrals = [];
        referrer.referrals.push({ userId: newUser.id, username: newUser.username, bonus: 5, date: new Date() });
        await referrer.save();
        
        const refTransaction = new Transaction({
            userId: referrer.id,
            type: 'referral_bonus',
            amount: 5,
            description: `Referral bonus for inviting ${username}`,
            status: 'completed'
        });
        await refTransaction.save();
    }
    
    const welcomeTransaction = new Transaction({
        userId: newUser.id,
        type: 'bonus',
        amount: totalBonus,
        description: `Welcome Bonus ₹${WELCOME_BONUS}${referralBonus ? ' + Referral ₹5' : ''}${isFirstUser ? ' + First User ₹10' : ''}`,
        status: 'completed'
    });
    await welcomeTransaction.save();
    
    res.json({
        success: true,
        bonus: totalBonus,
        referralCode: newUser.referralCode,
        isFirstUser: isFirstUser
    });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ $or: [{ username }, { email: username }], password });
    
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
                password: user.password,
                deviceId: user.deviceId
            }
        });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/stats', async (req, res) => {
    const users = await User.countDocuments({ role: 'user' });
    const predictions = await Prediction.countDocuments();
    const predictionsList = await Prediction.find();
    const transactions = await Transaction.find();
    
    const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalBetAmount = predictionsList.reduce((s, p) => s + (p.betAmount || 0), 0);
    const totalCommission = predictionsList.reduce((s, p) => s + (p.platformCommission || 0), 0);
    const pendingPayments = await PaymentRequest.countDocuments({ status: 'pending' });
    const pendingWithdrawals = await WithdrawRequest.countDocuments({ status: 'pending' });
    
    res.json({
        totalUsers: users,
        totalPredictions: predictions,
        totalDeposits,
        totalWithdrawals,
        totalBetAmount,
        totalCommission,
        pendingPayments,
        pendingWithdrawals
    });
});

// ==================== INIT DATA ====================
async function initData() {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
        const admin = new User({
            username: 'admin',
            email: 'admin@ipl.com',
            password: 'admin123',
            role: 'admin',
            walletBalance: 0,
            deviceId: 'admin_device',
            referralCode: 'ADMIN123',
            isActive: true
        });
        await admin.save();
        console.log('✅ Admin created');
    }
    
    const matchCount = await Match.countDocuments();
    if (matchCount === 0) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        
        const defaultMatch = new Match({
            matchNumber: 1,
            team1: 'Mumbai Indians',
            team2: 'Chennai Super Kings',
            date: futureDate,
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
            totalPool: 0
        });
        await defaultMatch.save();
        console.log('✅ Default match created');
    }
}

app.listen(PORT, async () => {
    console.log(`🚀 Server on port ${PORT}`);
    await initData();
    console.log(`🔐 Admin: admin / admin123`);
});:id/approve', (req, res) => {
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