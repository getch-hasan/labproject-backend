const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { response } = require('express');
const cors = require('cors')
require('dotenv').config()
const { json } = require('express/lib/response');
const port = process.env.PORT || 8000;



app.use(express.json())
app.get('/', (req, res) => {
    res.send('Hello World!')
})



const uri = `mongodb+srv://mhsrabon017:5FDT4L838x0LnDkR@cluster0.km8qaft.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const productCollections = client.db("productCollections").collection('products');
        const addedProduct = client.db("productCollections").collection('cart');
        const usersCollection = client.db("productCollections").collection('user');

        app.get('/product', async (req, res) => {
            const query = {}
            console.log(req.query)
            const cursor = productCollections.find(query)
            const products = await cursor.toArray()
            res.send(products)


        });

        app.post('/cart', async (req, res) => {

            const cart = req.body;
            const query = { name: cart.name,  img: cart.img, price: cart.price, stock: cart.stock, _id: cart._id  }
            const exist = await addedProduct.findOne(query)
            if (exist) {
                return res.send({ success: false, cart: exist })
            }
            const result = await addedProduct.insertOne(cart);
            res.send({ success: true, result });

        });
        app.get('/cart', async (req, res) => {
            const { email } = req.query

            const products = await addedProduct.find({ email }).toArray();
            res.send(products);

        });
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;

            const filter = { email: email }
            const options = { upsert: true };//user thakle data base e add korbena,na thakle add korbe
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email })
            res.send({ result, token });
            console.log(filter);

        });
        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await addedProduct.deleteOne(query)
            res.send(result)


        });

    }
    finally {
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(` baby shop listening on port ${port}`)
})