const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.')); // Serve static files

// Store contacts in a simple JSON file
const CONTACTS_FILE = 'contacts.json';

// Ensure contacts file exists
if (!fs.existsSync(CONTACTS_FILE)) {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify([], null, 2));
}

// API endpoint to handle form submissions
app.post('/api/contact', (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email, and message are required' 
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide a valid email address' 
            });
        }
        
        // Read existing contacts
        let contacts = [];
        try {
            const data = fs.readFileSync(CONTACTS_FILE, 'utf8');
            contacts = JSON.parse(data);
        } catch (err) {
            console.log('Creating new contacts file');
        }
        
        // Add new contact
        const newContact = {
            id: Date.now(),
            name,
            email,
            subject: subject || 'No subject',
            message,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress
        };
        
        contacts.push(newContact);
        
        // Save to file
        fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
        
        console.log('New contact received:', newContact);
        
        res.json({ 
            success: true, 
            message: 'Message sent successfully! I\'ll get back to you soon.',
            data: newContact
        });
        
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error. Please try again later.' 
        });
    }
});

// API endpoint to get all contacts (for admin purposes)
app.get('/api/contacts', (req, res) => {
    try {
        const data = fs.readFileSync(CONTACTS_FILE, 'utf8');
        const contacts = JSON.parse(data);
        res.json({ success: true, contacts });
    } catch (error) {
        console.error('Error reading contacts:', error);
        res.status(500).json({ success: false, message: 'Error reading contacts' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Contact form submissions will be saved to contacts.json');
});

module.exports = app;