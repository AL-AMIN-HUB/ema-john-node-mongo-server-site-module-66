const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
var admin = require("firebase-admin");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

// firebase admin initialization

var serviceAccount = require("./ema-john-simple-auth-88e5a-firebase-adminsdk-m49pu-db032d238d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware use
app.use(cors());
app.use(express.json());

// connected database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o4xkh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// verify authorization

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];

    try {
      const decodedUser = await admin.auth().verifyToken(idToken);
      req.decodedUserEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();

    const database = client.db("online_Shop");
    const productCollection = database.collection("products");
    const orderCollection = database.collection("orders");

    // get Products Api
    app.get("/products", async (req, res) => {
      const cursor = productCollection.find({});
      const page = req.query.page;
      const size = parseInt(req.query.size);
      let products;
      const count = await cursor.count();

      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }

      res.send({
        count,
        products,
      });
    });

    // use POST to get data by keys
    app.post("/products/byKeys", async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      const products = await productCollection.find(query).toArray();
      res.json(products);
    });

    //add orders Api
    app.get("/orders", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.decodedUserEmail === email) {
        const query = { email: email };
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.json(orders);
      } else {
        res.status(401).json({ message: "User not Authorized" });
      }
    });

    //
    app.post("/orders", async (req, res) => {
      const order = req.body;
      order.createdAt = new Date();
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// default check
app.get("/", (req, res) => {
  res.send("Welcome to Ema John Node JS. adfasdf");
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
