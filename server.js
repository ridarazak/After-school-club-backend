// Import necessary modules for Express and MongoDB
const express = require('express');  // Express framework for building the web server
const { MongoClient } = require('mongodb');  // MongoDB client for connecting to the database
const { ObjectId } = require('mongodb');  // ObjectId to handle MongoDB document IDs
const path = require('path');  // Path module to handle file paths

// Create an Express.js application instance
const app = express();

// Configuring Express to handle JSON requests
app.use(express.json());

// Setting the port for the Express server to run
app.set('port', 3000);

// Middleware to enable CORS (Cross-Origin Resource Sharing)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');  // Allow requests from any origin
    res.setHeader('Access-Control-Allow-Credentials', 'true');  // Allow credentials (cookies) to be sent
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');  // Allow specific HTTP methods
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers'); // Allow specific headers
    next();  // Pass the request to the next middleware
});

// MongoDB connection URI and initialization of database collections
const uri = 'mongodb+srv://ridarazak24:rida1234@cluster1.2zwas.mongodb.net/';
let db, ordersCollection, productsCollection;

// MongoDB connection setup and Express server start
MongoClient.connect(uri, { connectTimeoutMS: 10000 })  // Connect to MongoDB with a 10-second timeout
    .then(client => {
        db = client.db('webstore');  // Reference to the 'webstore' database
        ordersCollection = db.collection('orders');  // Reference to the 'orders' collection
        productsCollection = db.collection('products');  // Reference to the 'products' collection
        console.log('Connected to MongoDB successfully');

        // Start the Express server only after successfully connecting to the database
        app.listen(app.get('port'), () => {
            console.log(`Express.js server running at http://localhost:${app.get('port')}`);
        });
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1);  // Exit if the database connection fails
    });

app.use(express.static(path.join(__dirname, '../AfterSchoolClub-frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../AfterSchoolClub-frontend/afterschool.html')); // Serve a default index.html file
    
});
    
    // Logger Middleware to log HTTP requests with timestamps
app.use((req, res, next) => {
    const now = new Date().toISOString();  // Get the current timestamp
    console.log(`[${now}] ${req.method} ${req.url}`);  // Log the method and URL of the request
    next();  // Pass the request to the next middleware
});

// Static file middleware to serve images from the 'public/images' directory
app.use('/images', express.static(path.join(__dirname, 'public/images'), {
    fallthrough: true  // Allows further handling if the image isn't found
}));

// Handle 404 errors for missing image files
app.use('/images', (req, res) => {
    res.status(404).json({ error: 'Image file not found' });
});

// Middleware to ensure the database connection is available
app.use((req, res, next) => {
    if (!db) {
        return res.status(500).send('Database connection not established');  // Respond with an error if no DB connection
    }
    req.collection = db.collection('products');  // Attach the products collection to the request object
    next();  // Pass the request to the next middleware
});

// Route to retrieve all products from the 'products' collection
app.get('/products', (req, res, next) => {
    req.collection
        .find({})  // Fetch all documents from the collection
        .toArray()  // Convert the MongoDB cursor into an array
        .then(results => res.send(results))  // Send the result as JSON response
        .catch(err => next(err));  // Pass any error to the next error handler
});

// Route to create a new order in the 'orders' collection
app.post('/orders', async (req, res) => {
    const { firstName, lastName, phone, cart } = req.body;

    // Validate request body
    if (!firstName || !lastName || !phone || !cart || !Array.isArray(cart)) {
        return res.status(400).json({ error: 'Invalid request body' });  // Return error if required fields are missing or invalid
    }

    try {
        // Prepare the order object
        const order = {
            firstName,
            lastName,
            phone,
            items: cart,  // Store the cart items (array of product IDs)
            orderDate: new Date()  // Store the current date and time of the order
        };

        // Insert the order into the 'orders' collection
        const orderResult = await ordersCollection.insertOne(order);

        // Respond with success and the inserted order ID
        res.json({ success: true, orderId: orderResult.insertedId });
    } catch (error) {
        console.error(error);  // Log the error
        res.status(500).json({ error: 'Failed to process the order' });  // Respond with error if something goes wrong
    }
});

// PUT route to update a product in the 'products' collection by ID
app.put('/products/:id', async (req, res) => {
    const productId = req.params.id;  // Get the product ID from the URL parameter
    const updates = req.body;  // Get the updates (fields to change) from the request body

    // Validate product ID and updates
    if (!ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });  // Return error if ID is invalid
    }

    if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No update data provided' });  // Return error if no updates are provided
    }

    try {
        // Update the product document with the new data
        const result = await productsCollection.updateOne(
            { _id: new ObjectId(productId) },  // Match the product by its ObjectId
            { $set: updates }  // Update the specified fields using $set
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });  // Return error if the product doesn't exist
        }

        res.json({ success: true, updatedCount: result.modifiedCount });  // Respond with success and number of updated documents
    } catch (error) {
        console.error(error);  // Log the error
        res.status(500).json({ error: 'Failed to update the product' });  // Return error if the update fails
    }
});

// Route for searching products by multiple fields
app.get('/search', async (req, res) => {
    const { query } = req.query;  // Extract the search query from the query string

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });  // Return error if no query is provided
    }

    try {
        // Perform a case-insensitive search on multiple product fields
        const regex = new RegExp(query, 'i');  // Create a regex for case-insensitive search

        const searchResults = await productsCollection.find({
            $or: [  // Search in multiple fields
                { subject: { $regex: regex } },
                { Location: { $regex: regex } },
                { price: { $regex: regex } },
                { rating: { $regex: regex } },
                { availableInventory: { $regex: regex } }
            ]
        }).toArray();  // Convert the cursor into an array

        res.json(searchResults);  // Send the search results as a JSON response
    } catch (err) {
        console.error('Error searching products:', err);  // Log the error
        res.status(500).json({ error: 'Failed to perform search' });  // Respond with error if the search fails
    }
});

// Error handler middleware for catching any uncaught errors
app.use((err, req, res, next) => {
    console.error(err.stack);  // Log the full error stack
    res.status(500).send({ error: 'Internal Server Error' });  // Send a generic error response
});
