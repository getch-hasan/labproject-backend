const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { response } = require('express');
const cors = require('cors')
require('dotenv').config()
const { json } = require('express/lib/response');
const port = process.env.PORT || 8000;
const stripe = require("stripe")('sk_test_51NaP9YIRxjIz7Efm3pMpaHNCPtacDG69uz6U68SNtEwU8Am5D8w7SaaeCd82wWlGTjmQUVij0IP6gdrn7rUWt2YX003mm3CMom');
app.use(express.json())
app.use(cors())
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


function verifyJWT(req, res, next) { //kew email er maddome jno amr data dekhte na pare
    const authHeaders = req.headers.authorization
    if (!authHeaders) {
        return res.status(404).send({ message: 'unAuthorized access' })
    }
    const token = authHeaders.split(' ')[1];
    jwt.verify(token, bca1304ea80cbce68e8ead9fc28eab3604fd1dde90402602062d2af71f8c5aa9739e165f75c91dca39839ebe17fe9d3ea873bd651e9ccbda46d871e2a50f96cc, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}
async function run() {
    try {

        await client.connect();

        const productCollections = client.db("productCollections").collection('products');
        const addedProduct = client.db("productCollections").collection('cart');
        const usersCollection = client.db("productCollections").collection('user');
        const orderCollection = client.db("productCollections").collection('order');


        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email //requester hocche j onno ekjon user k admin diccee
            const requesterAccount = await usersCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next()
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }

        }
        app.get('/user', async (req, res) => {
            const users = await usersCollection.find().toArray();//sob user der find korar jonno
            res.send(users)
        })


        app.get('/product', async (req, res) => {
            const query = {}
            console.log(req.query)
            const cursor = productCollections.find(query)
            const products = await cursor.toArray()
            res.send(products)

        });





        app.post('/cart', async (req, res) => {

            const cart = req.body;
            const query = { name: cart.name, img: cart.img, price: cart.price, stock: cart.stock, _id: cart._id }
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
            const email = req.params;
            const user = req.body;

            const filter = { email: email }
            const options = { upsert: true };//user thakle data base e add korbena,na thakle add korbe
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
            console.log(filter);

        });




        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await addedProduct.deleteOne(query)
            res.send(result)

        });

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send({ success: true, result });

        });
        app.get('/order', async (req, res) => {
            const { email } = req.query
            const orders = await orderCollection.find({ email }).toArray();
            res.send(orders);
        })
        // get single product or update single order product 
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const order = await orderCollection.findOne(query)
            res.send(order);
        })
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: {
                    role: 'admin'
                },

            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send({ result })
        });
        app.put('/user/removeadmin/:email', async (req, res) => { //for remove admin
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: {
                    role: 'client'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send({ result })
        });

        app.post("/create-payment-intent", async (req, res) => {
            const { items } = req.body;
            const price = items.totalPrice
            const amount = price * 100
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card'],
                // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
                automatic_payment_methods: {
                    enabled: true,
                },

            });
            console.log(paymentIntent)


            res.send({
                clientSecret: paymentIntent.client_secret
            });
        });

        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id
            const payment = req.body
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedBooking = await orderCollection.updateOne(filter, updateDoc);
            //const result=await paymentsCollection.insertOne(payment)
            res.send(updateDoc)
        })
    }

    finally {
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(` baby shop listening on port ${port}`)
})

