document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const messageDiv = document.getElementById('message');

    let db;
    const DB_NAME = 'FreefireTournamentDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'registrations';

    // Open (or create) the database
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.errorCode);
        messageDiv.textContent = 'Error opening database.';
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('IndexedDB opened successfully');
    };

    // This event is only triggered if the database is new or the version is updated
    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            objectStore.createIndex('email', 'email', { unique: true });
            objectStore.createIndex('number', 'number', { unique: true });
            console.log('Object store created');
        }
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const number = document.getElementById('number').value;

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        // Check for existing email or number
        const emailIndex = objectStore.index('email');
        const numberIndex = objectStore.index('number');

        const emailRequest = emailIndex.get(email);
        const numberRequest = numberIndex.get(number);

        let emailExists = false;
        let numberExists = false;

        emailRequest.onsuccess = () => {
            if (emailRequest.result) {
                emailExists = true;
            }
            checkIfBothExist();
        };

        numberRequest.onsuccess = () => {
            if (numberRequest.result) {
                numberExists = true;
            }
            checkIfBothExist();
        };

        function checkIfBothExist() {
            if (emailRequest.readyState === 'done' && numberRequest.readyState === 'done') {
                if (emailExists) {
                    messageDiv.textContent = 'Error: Email already registered.';
                    messageDiv.style.color = 'red';
                } else if (numberExists) {
                    messageDiv.textContent = 'Error: Phone number already registered.';
                    messageDiv.style.color = 'red';
                } else {
                    // Add new registration
                    const registration = { name, email, number, timestamp: new Date().toISOString() };
                    const addRequest = objectStore.add(registration);

                    addRequest.onsuccess = () => {
                        messageDiv.textContent = 'Registration successful! Saving data to server...';
                        messageDiv.style.color = 'green';
                        form.reset();
                        // Send data to server for CSV export
                        sendRegistrationsToServerForCsv();
                    };

                    addRequest.onerror = (e) => {
                        console.error('Error adding registration:', e.target.error);
                        messageDiv.textContent = 'Error during registration.';
                        messageDiv.style.color = 'red';
                    };
                }
            }
        }

        transaction.oncomplete = () => {
            console.log('Transaction completed');
        };

        transaction.onerror = (event) => {
            console.error('Transaction error:', event.target.error);
            messageDiv.textContent = 'Transaction failed.';
            messageDiv.style.color = 'red';
        };
    });

    async function sendRegistrationsToServerForCsv() {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const allRegistrations = [];

        objectStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                allRegistrations.push(cursor.value);
                cursor.continue();
            } else {
                // All data retrieved, send to server
                fetch('http://localhost:3000/api/export-csv', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(allRegistrations),
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        messageDiv.textContent = `Registration successful! ${data.message}`;
                        messageDiv.style.color = 'green';
                    } else {
                        messageDiv.textContent = 'Registration successful! Server response unknown.';
                        messageDiv.style.color = 'orange';
                    }
                })
                .catch(error => {
                    console.error('Error sending data to server:', error);
                    messageDiv.textContent = 'Registration successful, but failed to save CSV on server.';
                    messageDiv.style.color = 'red';
                });
            }
        };

        transaction.onerror = (event) => {
            console.error('IndexedDB read error for server export:', event.target.error);
            messageDiv.textContent = 'Error reading data for server export.';
            messageDiv.style.color = 'red';
        };
    }
});