// Import dependencies modules:
const express = require('express');
const { MongoClient } = require('mongodb');

// Create an Express.js instance:
const app = express();

// Config Express.js
app.use(express.json());
app.set('port', 3000);

// Enable CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers'
    );
    next();
});

// MongoDB connection details
const uri = 'mongodb+srv://ridarazak24:rida1234@cluster1.2zwas.mongodb.net/';
let db;

// Connect to MongoDB and start the server
MongoClient.connect(uri, { connectTimeoutMS: 10000 })
    .then(client => {
        db = client.db('webstore');
        console.log('Connected to MongoDB successfully');

        // Start the server only after DB connection is ready
        app.listen(app.get('port'), () => {
            console.log(`Express.js server running at http://localhost:${app.get('port')}`);
        });
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1); // Exit if the connection fails
    });

// Display a message for root path to show that API is working
app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /products');
});

// Middleware to ensure database connection
app.use((req, res, next) => {
    if (!db) {
        return res.status(500).send('Database connection not established');
    }
    req.collection = db.collection('products');
    next();
});

// Retrieve all the objects from the 'products' collection
app.get('/products', (req, res, next) => {
    req.collection
        .find({})
        .toArray()
        .then(results => res.send(results))
        .catch(err => next(err));
});

// Route: POST /order
// Add a new order to the 'order' collection
app.post('/orders', (req, res, next) => {
    const newOrder = req.body;
    db.collection('orders')
        .insertOne(newOrder)
        .then(result => res.status(201).json({ success: true, orderId: result.insertedId }))
        .catch(err => next(err));
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Internal Server Error' });
});