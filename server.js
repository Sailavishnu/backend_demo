require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const routes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map(value => value.trim())
    : true
}));
app.use(express.json({ limit: "1mb" }));
app.get("/", (req, res) => res.json({ message: "CRUD API is running", health: "/health" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

async function start() {
  if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
    console.error("Set MONGODB_URI and DB_NAME in backend/.env.");
    process.exit(1);
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  app.use((req, res, next) => { req.db = db; next(); });
  app.use("/api", routes);
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: "Server error. Check backend logs." });
  });
  app.listen(PORT, () => console.log(`API listening on port ${PORT}; database ${process.env.DB_NAME}`));
}
start().catch(error => {
  console.error("MongoDB connection failed:", error.message);
  process.exit(1);
});
