const express = require('express');
const { MasterData } = require('./sql-master');
const { BillData, getBilltoIds } = require('./sql-billto');
const cors = require('cors');
const { executeQuery } = require('./db');
const app = express();

app.use(cors());

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API endpoint to fetch Oracle data based on master account ID
app.get('/api/masterdata', async (req, res) => {
    const { ids } = req.query;
    console.log('Received MASTER ID:', ids); // Log received IDs

    if (!ids) {
        return res.status(400).json({ error: 'No IDs provided' });
    }

    const masterAccountIds = ids.split(',');
    try {
        const data = await MasterData(masterAccountIds);
        res.json(data);
    } catch (error) {
        console.error('Error fetching Master data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API endpoint to fetch Bill data based on master account ID and selected Bill ID
app.get('/api/billdata', async (req, res) => {
    const { masterAccountId, billtoId } = req.query;
    console.log('Received MASTER ID for Bill Data:', masterAccountId); // Log received master account ID

    if (!masterAccountId) {
        return res.status(400).json({ error: 'No master account ID provided' });
    }
    try {
        const result = await BillData(masterAccountId, billtoId);
        res.json(result);
    } catch (error) {
        console.error('Error fetching Bill ID data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// API endpoint to fetch account IDs
app.get('/api/billtoids', async (req, res) => {
    const { masterAccountId } = req.query;
    console.log('Received MASTER ID to retrieve BillTo IDs:', masterAccountId); // Log received IDs

    if (!masterAccountId) {
        return res.status(400).json({ error: 'No IDs provided' });
    }

    try {
        const billtoIDs = await getBilltoIds(masterAccountId);
        console.log('Fetched billto IDs:', billtoIDs);
        res.json(billtoIDs);
    } catch (error) {
        console.error('Error fetching BIll Accounts:', error);
        res.status(500).json({ error: 'Error fetching billto ids' });
    }
});


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
