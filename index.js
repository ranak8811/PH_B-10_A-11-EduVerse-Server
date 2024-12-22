const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j5yqq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    //----------------------------------------------------------------
    const serviceCollection = client.db("eduVerseDB").collection("services");
    const bookingCollection = client.db("eduVerseDB").collection("bookings");

    app.post("/services", async (req, res) => {
      const newService = req.body;
      console.log("Adding new service to db: ", newService);

      const result = await serviceCollection.insertOne(newService);
      res.send(result);
    });

    app.get("/popularServices", async (req, res) => {
      const cursor = serviceCollection.find().limit(4);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/allServices", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/allServices/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      console.log("Adding newly booked service to db: ", newBooking);

      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    app.get("/myAddedService/:email", async (req, res) => {
      const email = req.params.email;
      // console.log("Provider email: ", email);
      const query = {
        providerEmail: email,
      };
      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/updateService/:id", async (req, res) => {
      const id = req.params.id;
      const service = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedService = {
        $set: service,
      };
      console.log(updatedService);
      const options = { upsert: true };
      const result = await serviceCollection.updateOne(
        query,
        updatedService,
        options
      );
      res.send(result);
    });

    app.get("/bookedService/:email", async (req, res) => {
      const email = req.params.email;
      // console.log("Provider email: ", email);
      const query = {
        purchasedUserEmail: email,
      };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    //----------------------------------------------------------------
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("EduVerse server is running...");
});

app.listen(port, () => {
  console.log(`EduVerse server is listening on port ${port}`);
});
