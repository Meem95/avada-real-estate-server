const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      // 'https://h-food-396f7.web.app',
      //'https://h-food-396f7.firebaseapp.com'
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.52gi70p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("real-estate").collection("user");
    const propertyCollection = client.db("real-estate").collection("property");
    const reviewCollection = client.db("real-estate").collection("reviews");

    // user related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, cookieOptions).send({
        success: true,
      });
    });
    //all property routes
    //get property

    app.get("/property", async (req, res) => {
      const cursor = propertyCollection.find();
      const property = await cursor.toArray();
      res.send(property);
    });
    //post property
    app.post("/property", async (req, res) => {
      const newProperty = req.body;
      console.log(newProperty);
      const result = await propertyCollection.insertOne(newProperty);
      res.send(result);
    });

    //all review routes
    //get review
    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find();
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    //post reviews
    app.post("/reviews", async (req, res) => {
      const newReviews = req.body;
      console.log(newReviews);
      const result = await reviewCollection.insertOne(newReviews);
      res.send(result);
    });

    ///Logout
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.get("/user", async (req, res) => {
      const cursor = userCollection.find();
      const users = await cursor.toArray();
      res.send(users);
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/user", async (req, res) => {
      const user = req.body;
      const filter = {
        email: user.email,
      };
      const updateDoc = {
        $set: {
          lastLoggedAt: user.lastLoggedAt,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({
      ping: 1,
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Real state server is running");
});

app.listen(port, () => {
  console.log(`Real state is running on port: ${port}`);
});
