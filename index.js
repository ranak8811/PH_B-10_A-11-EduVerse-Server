const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 4000;

const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  optionalSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j5yqq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  // console.log("its me to verify");
  const token = req.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
  });
  next();
};

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

    // generating jwt
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      // token creation
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "300d",
      });

      // console.log(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // logout or clear cookie from browser
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/services", verifyToken, async (req, res) => {
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
      const { searchParams } = req.query;
      let option = {};
      if (searchParams) {
        option = {
          name: { $regex: searchParams, $options: "i" },
        };
      }
      const cursor = serviceCollection.find(option);
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

    app.get("/myAddedService/:email", verifyToken, async (req, res) => {
      const decodedEmail = req?.user?.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      // console.log("Email from token: ", decodedEmail); //aita main user
      // console.log("Email from params: ", email); // aikhane kew jdi mail change kore entry neyer try kore tahole different email show korbe

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

    app.put("/updateService/:id", verifyToken, async (req, res) => {
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

    app.get("/bookedService/:email", verifyToken, async (req, res) => {
      // const email = req.params.email;
      const decodedEmail = req?.user?.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = {
        purchasedUserEmail: email,
      };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/service-to-do/:email", verifyToken, async (req, res) => {
      // const email = req.params.email;
      const decodedEmail = req?.user?.email;
      const email = req.params.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = {
        providerEmail: email,
      };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/status-update/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updated = {
        $set: { serviceStatus: status },
      };

      const result = await bookingCollection.updateOne(filter, updated);
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
