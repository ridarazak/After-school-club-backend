// Import dependencies modules:
const express = require('express');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

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
let db, ordersCollection, productsCollection;

// Connect to MongoDB and start the server
MongoClient.connect(uri, { connectTimeoutMS: 10000 })
    .then(client => {
        db = client.db('webstore');
        ordersCollection = db.collection('orders'); // Reference the orders collection
        productsCollection = db.collection('products'); // Reference the products collection
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


app.post('/orders', async (req, res) => {
    const { firstName, lastName, phone, cart } = req.body;

    // Validate request body
    if (!firstName || !lastName || !phone || !cart || !Array.isArray(cart)) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    try {
        // Prepare the order object
        const order = {
            firstName,
            lastName,
            phone,
            items: cart, // Array of product IDs
            orderDate: new Date()
        };

        // Insert order into "orders" collection
        const orderResult = await ordersCollection.insertOne(order);

        res.json({ success: true, orderId: orderResult.insertedId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process the order' });
    }
});


// PUT /lessons/:id route
app.put('/products/:id', async (req, res) => {
    const productId = req.params.id; // Extract product ID from URL
    const updates = req.body; // Expect updates as key-value pairs in the request body

    // Validate ID and updates
    if (!ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No update data provided' });
    }

    try {
        // Update the document with the new fields
        const result = await productsCollection.updateOne(
            { _id: new ObjectId(productId) }, // Match the product by ID
            { $set: updates } // Use $set to update only specified fields
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ success: true, updatedCount: result.modifiedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update the product' });
    }
});



// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Internal Server Error' });
});