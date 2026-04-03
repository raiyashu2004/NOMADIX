const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const destinations = require('../data/destinations.json');

async function seed() {
    if (!process.env.MONGO_URI) {
        console.error('Error: MONGO_URI environment variable is not set. Check your .env file.');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Destination.deleteMany({});
    console.log('Cleared existing destinations');

    const inserted = await Destination.insertMany(destinations);
    console.log(`Seeded ${inserted.length} destinations`);

    await mongoose.disconnect();
    console.log('Done');
}

seed().catch(console.error);
