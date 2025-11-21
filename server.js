const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Use the mysql2/promise library
const fs = require('fs'); // Import the file system module
const path = require('path'); // Import the path module

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- MySQL Database Connection ---
// !!! FILL IN YOUR 5 MYSQL CREDENTIALS HERE !!!
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Welcome123', // <-- Your MySQL password
    database: 'attendance_db',
    port: 3306
};

// Create a connection pool (best practice for managing connections)
const pool = mysql.createPool(dbConfig);

// Function to set up the database tables
async function setupDatabase() {
    try {
        // SQL for creating the students table (MySQL syntax)
        const createStudentsTable = `
            CREATE TABLE IF NOT EXISTS students (
                roll VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                class VARCHAR(100)
            )
        `;
        // SQL for creating the attendance table (MySQL syntax)
        const createAttendanceTable = `
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                roll VARCHAR(50) NOT NULL,
                name VARCHAR(255),
                class VARCHAR(100),
                ts BIGINT NOT NULL,
                date DATE NOT NULL,
                UNIQUE KEY unique_attendance (roll, date)
            )
        `;

        await pool.query(createStudentsTable);
        await pool.query(createAttendanceTable);
        console.log('Database tables are ready.');
    } catch (err) {
        console.error('Error setting up database:', err);
        // Exit the process if we can't set up the database
        process.exit(1);
    }
}


// --- API ENDPOINTS (Updated for MySQL) ---

// GET all students
app.get('/api/students', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM students ORDER BY roll ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add or Update a student
app.post('/api/students', async (req, res) => {
    const { roll, name, class: className } = req.body;
    // MySQL's "INSERT ... ON DUPLICATE KEY UPDATE" is perfect for this
    const sql = `
        INSERT INTO students (roll, name, class) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name), class = VALUES(class)
    `;
    try {
        await pool.query(sql, [roll, name, className]);
        res.status(201).json({ roll, name, class: className });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET all attendance records
app.get('/api/attendance', async (req, res) => {
    try {
        // Formatting the date for better readability if needed
        const sql = "SELECT id, roll, name, class, ts, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM attendance ORDER BY ts DESC";
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET attendance for a specific student
app.get('/api/attendance/:roll', async (req, res) => {
    try {
        const sql = "SELECT id, roll, name, class, ts, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM attendance WHERE roll = ? ORDER BY ts DESC";
        const [rows] = await pool.query(sql, [req.params.roll]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a new attendance record
app.post('/api/attendance', async (req, res) => {
    const { roll, name, class: className, ts, date } = req.body;
    const sql = 'INSERT INTO attendance (roll, name, class, ts, date) VALUES (?, ?, ?, ?, ?)';
    try {
        const [result] = await pool.query(sql, [roll, name, className, ts, date]);
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        // Check for the duplicate entry error code from MySQL
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Attendance already marked for this student today.' });
        }
        res.status(400).json({ message: err.message });
    }
});

// New endpoint to export all registrations to CSV
app.post('/api/export-csv', async (req, res) => {
    const registrations = req.body; // Expecting an array of registration objects

    if (!registrations || registrations.length === 0) {
        return res.status(400).json({ message: 'No registration data provided for CSV export.' });
    }

    try {
        const headers = Object.keys(registrations[0]);
        const csvRows = [];
        csvRows.push(headers.join(',')); // Add headers

        for (const row of registrations) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const filePath = path.join(__dirname, 'freefire_registrations.csv');

        fs.writeFileSync(filePath, csvString, 'utf8');
        console.log(`CSV data saved to ${filePath}`);
        res.status(200).json({ message: 'CSV data saved successfully to server.' });
    } catch (err) {
        console.error('Error saving CSV file:', err);
        res.status(500).json({ message: 'Failed to save CSV file on server.', error: err.message });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Set up the database tables when the server starts
    setupDatabase();
});