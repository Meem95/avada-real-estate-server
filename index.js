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
    const wishlistCollection = client.db("real-estate").collection("wishlists");
    const sellCollection = client.db("real-estate").collection("sells");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    // middlewares
    const verifyToken = (req, res, next) => {
       console.log('inside verify token', req.headers);
     
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // user related apis

    // users related api
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    /// Fraud routes
    app.patch(
      "/users/fraud/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "fraud",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    /// All agent routes
    app.patch(
      "/users/agent/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "agent",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    app.get("/users/agent/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isSeller = false;
      if (user) {
        isSeller = user?.role === "agent";
      }
      res.send({ isSeller });
    });

    //all property routes
    //get property

    app.get("/property", async (req, res) => {
      const cursor = propertyCollection.find();
      const property = await cursor.toArray();
      res.send(property);
    });
    //post property
    app.post("/property",verifyToken, async (req, res) => {
      const newProperty = req.body;
      //console.log(newProperty);
      const result = await propertyCollection.insertOne(newProperty);
      res.send(result);
    });

    app.patch("/property/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "verified",
        },
      };
      const result = await propertyCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch(
      "/property/reject/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: "rejected",
          },
        };
        const result = await propertyCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    app.patch("/advertise-property/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          type: "advertise",
        },
      };
      const result = await propertyCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.get("/property/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertyCollection.findOne(query);
      res.send(result);
    });

    app.delete("/property/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertyCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/property/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      //console.log(item,id)
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          title: item.title,
          location: item.location,
          second_price: item.second_price,
          first_price: item.first_price,
          image: item.image,
          description: item.description,
          agentName: item.agentName, 
          agentEmail: item.agentEmail, 
          agentImage: item.agentImage,
        },
      };
      const result = await propertyCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/offer-property/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.findOne(query);
      //console.log(id)
      res.send(result);
    });

    //all review routes
    //get review
    app.get("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const queary = { email: email };
      const result = await reviewCollection.find(queary).toArray();
      res.send(result);
    });
    // common route
    app.get("/get-reviews", async (req, res) => {
      //console.log("jgyfy")
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

    // delete reviews by user
    app.delete("/delete-reviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });
    ///// All WishList Route
    // Check if a property is already in the wishlist
    app.get("/wishlists/check/:email/:propertyId", async (req, res) => {
      const { email, propertyId } = req.params;
      try {
        const wishlistItem = await wishlistCollection.findOne({
          email,
          propertyId,
        });
        if (wishlistItem) {
          res.json({ exists: true });
        } else {
          res.json({ exists: false });
        }
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post("/wishlists", async (req, res) => {
      const wishlistsItem = req.body;
      const result = await wishlistCollection.insertOne(wishlistsItem);
      res.send(result);
    });


    app.get("/user-wishlists/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const queary = { email: email };
      const result = await wishlistCollection.find(queary).toArray();
      res.send(result);
    });

    // delete wishlist from user
    app.delete("/delete-wishlists/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    /// All selling routes
      //sell post 
      app.post("/sells", async (req, res) => {
        const newSells = req.body;
        const result = await sellCollection.insertOne(newSells);
        res.send(result);
      })

    // get post
    app.get("/get-sells/:email", async (req, res) => {
  const email = req.params.email;
  console.log(email)
  const query = { agentEmail: email };
  console.log(email);

  try {
    const result = await sellCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
});

app.patch("/accept-property-request/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      status: "accepted",
    },
  };
  const result = await sellCollection.updateOne(filter, updatedDoc);
  res.send(result);
});
app.patch("/reject-property-request/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      status: "rejected",
    },
  };
  const result = await sellCollection.updateOne(filter, updatedDoc);
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
