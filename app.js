import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const PORT = 2806;

// Fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection details
const uri = "mongodb+srv://naveen:naveen@cluster0.gwp7bkz.mongodb.net/";
const client = new MongoClient(uri);
const dbName = "naveen-db";
const collectionName = "naveen-work";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.get("/", (req, res) => res.render("form"));

// Calendar view with leave requests
app.get("/calendar", (req, res) => res.render("calendar"));

// ✅ Save leave request
app.post("/naveen", async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const leaveData = {
      member: req.body.member,
      date: req.body.date,
      reason: req.body.reason || "",
    };

    await collection.insertOne(leaveData);
    res.redirect("/"); // after save redirect back to form page
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving leave request");
  }
});

// ✅ Get all leave requests (for calendar)
app.get("/leaves", async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const leaves = await collection.find().toArray();
    res.json(leaves);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching leave data");
  }
});


// Fetch all data
app.get("/getdata", async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  const result = await collection.find({}).toArray();
  res.render("page", { result });
});

app.get("/tree", async (req, res) => {
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  const result = await collection.find({}).toArray();
  res.json(result);
  
});

// Reduce offs for specific members in September 2025
app.post("/reduce-offs", async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const rosterCollection = db.collection("roster-data");

    // Define the reductions
    const reductions = {
      lokesh: 2,
      tharani: 2,
      haneesha: 1,
      sandhuja: 1
    };

    const year = 2025;
    const month = 8; // September (0-indexed)
    
    // Get or create September 2025 roster
    let roster = await rosterCollection.findOne({ year, month });
    
    if (!roster) {
      // Create initial roster for September 2025
      roster = {
        year,
        month,
        memberOffs: {
          lokesh: 8,
          tharani: 8,
          haneesha: 8,
          sandhuja: 8
        }
      };
    }

    // Apply reductions
    for (const [member, reduction] of Object.entries(reductions)) {
      if (roster.memberOffs[member]) {
        roster.memberOffs[member] = Math.max(0, roster.memberOffs[member] - reduction);
      }
    }

    // Save updated roster
    await rosterCollection.replaceOne(
      { year, month },
      roster,
      { upsert: true }
    );

    res.json({ 
      message: "Offs reduced successfully", 
      updatedOffs: roster.memberOffs 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error reducing offs");
  }
});

// Get roster data for a specific month/year
app.get("/roster/:year/:month", async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const rosterCollection = db.collection("roster-data");
    
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const roster = await rosterCollection.findOne({ year, month });
    res.json(roster || { year, month, memberOffs: {} });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching roster data");
  }
});

// Delete request
app.delete("/deleterequest/:id", async (req, res) => {
  const { id } = req.params;
  console.log("id received:", id);

  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  await collection.deleteOne({ _id: new ObjectId(id) });

  res.json({ message: "Deleted successfully" });
});

// Edit request
app.put("/editrequest/:id", async (req, res) => {
  const { id } = req.params;
  const { member, date, reason } = req.body;

  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { member, date, reason } }
  );

  res.json({ message: "Updated successfully" });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
