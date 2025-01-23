const express = require("express");

const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8zp6c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const petsCollection = client.db("petsaveDB").collection("pets");
    const fosterCollection = client.db("petsaveDB").collection("fosterPet");
    const lostPetCollection = client.db("petsaveDB").collection("lostPet");
    const userCollection = client.db("petsaveDB").collection("users");

    // jwt related API's
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
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

    //pets related API's
    app.get("/pets", async (req, res) => {
      const result = await petsCollection.find().toArray();
      res.send(result);
    });

    app.get("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });

    // user related API's

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };

      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await userCollection.findOne(query);

      res.send({ userDetails: result });
    });

    app.get("/users/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);

      res.send(result);
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

    app.patch("/users/:id", verifyToken, async (req, res) => {
      const user = req.body;
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: user.name,
          nickName: user.nickName,
          gender: user.gender,
          country: user.country,
          language: user.language,
          image: user.image,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // profile related

    // foster related apis
    app.get("/user/fosterPost/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await fosterCollection.find(query).toArray();

      res.send(result);
    });

    app.post("/user/fosterPost", async (req, res) => {
      const foster = req.body;
      const fosterResult = await fosterCollection.insertOne(foster);
      res.send(fosterResult);
    });

    app.delete("/user/fosterPost/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await fosterCollection.deleteOne(query);
      res.send(result);
    });

    // lost pet related API's

    app.get("/user/lostPost/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await lostPetCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/user/lostPost", async (req, res) => {
      const lostPet = req.body;
      const result = await lostPetCollection.insertOne(lostPet);
      res.send(result);
    });

    app.delete("/user/lostPost/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lostPetCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
  res.send("pet server is running");
});

app.listen(port, () => {
  console.log("running on port");
});
