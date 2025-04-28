const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { count } = require("console");
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

    // verify admin
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

    app.post("/pets", async (req, res) => {
      const pets = req.body;
      const result = await petsCollection.insertOne(pets);
      res.send(result);
    });

    app.patch("/pet/:id", async (req, res) => {
      const id = req.params.id;
      const pet = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: pet.name,
          type: pet.petType,
          breed: pet.typeofBreed,
          age: pet.petAge,
          category: pet.category,
          friendly: pet.friendly,
          Nature: pet.petsNature,
          childFriendly: pet.childFriendly,
          catFriendly: pet.catFriendly,
          pottyTrained: pet.pottyTrained,
          location: pet.location,
          medicalNotes: {
            desexed: pet.desexed,
            vaccinated: pet.vaccinated,
            microChipped: pet.microChipped,
            allWormed: pet.allWormed,
            fleaTreated: pet.fleaTreated,
            heartWormTreated: pet.heartWormTreated,
          },
          description: pet.description,
          images: pet.images,
        },
      };
      const result = await petsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/pet/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.deleteOne(query);
      res.send(result);
    });

    // user related API's

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
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

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

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

    app.get("/user/lostPost", async (req, res) => {
      const result = await lostPetCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/lostPet/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lostPetCollection.findOne(query);
      res.send(result);
    });

    app.post("/user/lostPost", async (req, res) => {
      const lostPet = req.body;
      const result = await lostPetCollection.insertOne(lostPet);

      res.send(result);
    });

    app.patch("/user/lostPost/:id", verifyToken, async (req, res) => {
      const lostPet = req.params.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          firstName: lostPet.firstName,
          lastName: lostPet.lastName,
          category: lostPet.category,
          address: lostPet.address,
          petAge: lostPet.petAge,
          typeofPet: lostPet.typeofPet,
          typeofBreed: lostPet.typeofBreed,
          petName: lostPet.petName,
          PetNature: lostPet.PetNature,
          respondsToName: lostPet.respondsToName,
          vaccinated: lostPet.vaccinated,
          reward: lostPet.reward,
          image: lostPet.image,
        },
      };
      const result = await lostPetCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    app.delete("/user/lostPost/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lostPetCollection.deleteOne(query);

      res.send(result);
    });

    // admin related API's

    app.get("/pending/lostpets", verifyToken, verifyAdmin, async (req, res) => {
      const pendingLostPets = await lostPetCollection
        .find({ status: "pending" })
        .toArray();
      res.send(pendingLostPets);
    });

    app.get(
      "/pending/fosterpets",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const pendingFosterPets = await fosterCollection
          .find({
            status: "pending",
          })
          .toArray();
        res.send(pendingFosterPets);
      }
    );

    app.patch("/lostPets/:id"),
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const LostPostId = req.params.id;

        const id = { _id: new ObjectId(LostPostId) };
        const lostPost = await lostPetCollection.findOne(id);
        if (!lostPost) {
          return res.status(404).send({ message: "Lost post not found" });
        }

        const result = await lostPetCollection.updateOne(
          { _id: new ObjectId(LostPostId) },
          {
            $set: { status: "approved", approvedAt: new Date() },
          }
        );
        if (result.modifiedCount > 0) {
          const lostPetData = {
            ...lostPost,
            status: "approved",
            category: "lost pet",
            approvedAt: new Date(),
          };

          const sendAllPet = await all.insertOne(lostPetData);

          res.send({ result, sendAllPet });
        }
      };
    app.patch("/fosterPets/:id"),
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const FosterPostId = req.params.id;

        const fosterPost = await fosterCollection.findOne({
          _id: new ObjectId(FosterPostId),
        });

        const result = await fosterCollection.updateOne(
          { _id: new ObjectId(FosterPostId) },
          {
            $set: { status: "approved", approvedAt: new Date() },
          }
        );
        const lostPetData = {
          ...fosterPost,
          status: "approved",
          category: "fostering home",
          approvedAt: new Date(),
        };
        const sendAllPet = await all.insertOne(lostPetData);

        res.send({ result, sendAllPet });
      };

    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const allPets = await petsCollection.estimatedDocumentCount();
      const pendingFosterPets = await fosterCollection.countDocuments({
        status: "pending",
      });
      const pendingLostPets = await lostPetCollection.countDocuments({
        status: "pending",
      });

      res.send({ users, allPets, pendingFosterPets, pendingLostPets });
    });

    app.get("/chart-stats", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const categoryStats = await petsCollection
          .aggregate([
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        res.send(categoryStats);
      } catch (error) {
        res.status(500).json({ message: "Error fetching chart status", error });
      }
    });

    app.get("/vs-chart", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const approvedFosterCount = await fosterCollection.countDocuments({
          status: "approved",
        });

        const approvedLostCount = await lostPetCollection.countDocuments({
          status: "approved",
        });

        const fosterData = {
          approved: approvedFosterCount === 0 ? 0 : pendingFosterCount,
        };
        const lostData = {
          approved: approvedLostCount === 0 ? 0 : approvedFosterCount,
        };

        return res.send({ fosterPetData: fosterData, lostPetData: lostData });
      } catch (err) {
        return res.status(500).json({ message: "Internal server Error" });
      }
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
