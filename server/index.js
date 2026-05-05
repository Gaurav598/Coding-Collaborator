require("dotenv").config(); // Remove custom path, use default .env in server/
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const ACTIONS = require("./Actions");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://coding-collaborator-ai-compiler.vercel.app" // No trailing slash
];

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("CORS blocked for origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

// Explicitly handle OPTIONS preflight
app.options("*", cors());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(express.json());

const userSocketMap = {};
const mongoURI = process.env.MONGO_URI;
let db;
let isConnected = false;

// Mask MONGO_URI for logging
const maskMongoURI = (uri) => {
  if (!uri) return "undefined";
  return uri.replace(/:\/\/[^@]+@/, "://****@");
};
console.log("MONGO_URI:", maskMongoURI(mongoURI));

if (!mongoURI) {
  console.error("MONGO_URI is not defined in environment variables");
  process.exit(1); // Exit if MONGO_URI is missing
}

const client = new MongoClient(mongoURI, {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true
  }
});

const connectToMongo = async () => {
  try {
    await client.connect();
    db = client.db("CodeCollab");
    isConnected = true;
    console.log("Connected to MongoDB");
    await db.collection("SavedCodes").createIndex(
      { userEmail: 1, codeName: 1 },
      { unique: true }
    );
    console.log("Unique index created on SavedCodes");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1); // Exit on connection failure
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  if (isConnected && db) {
    res.status(200).json({ status: "OK", mongoConnected: true });
  } else {
    res.status(503).json({ status: "ERROR", mongoConnected: false });
  }
});

// Database middleware
app.use((req, res, next) => {
  if (!isConnected || !db) {
    console.error("Database not connected for request:", req.path);
    return res.status(503).json({ error: "Database not connected" });
  }
  req.db = db; // Attach db to request for routes
  next();
});

// Start MongoDB connection
connectToMongo();

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
    const user = userSocketMap[socketId];
    return {
      socketId,
      username: user?.username || "Unknown",
      photoURL: user?.photoURL || "",
      email: user?.email || ""
    };
  });
};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username, photoURL, email }) => {
    console.log("Received JOIN:", { roomId, username, photoURL, email });
    userSocketMap[socket.id] = { username, photoURL, email };
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    console.log("Broadcasting JOINED with clients:", clients);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    console.log("Socket disconnecting:", socket.id);
    const user = userSocketMap[socket.id];
    if (user) {
      const rooms = [...socket.rooms];
      rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
            socketId: socket.id,
            username: user.username
          });
        }
      });
      delete userSocketMap[socket.id];
    } else {
      console.log("No user data found for disconnecting socket:", socket.id);
    }
  });
});

app.post("/api/save-code", async (req, res) => {
  const { userEmail, codeName, code, language } = req.body;
  console.log("Received save-code request:", { userEmail, codeName, language, codeLength: code?.length });

  if (!userEmail || !codeName || !code || !language) {
    const missingFields = [];
    if (!userEmail) missingFields.push("userEmail");
    if (!codeName) missingFields.push("codeName");
    if (!code) missingFields.push("code");
    if (!language) missingFields.push("language");
    console.log("Missing required fields:", missingFields);
    return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  if (typeof userEmail !== "string" || typeof codeName !== "string" || 
      typeof code !== "string" || typeof language !== "string") {
    console.log("Invalid field types:", { userEmail, codeName, language });
    return res.status(400).json({ error: "All fields must be strings" });
  }

  try {
    const savedCodes = req.db.collection("SavedCodes");
    await savedCodes.insertOne({
      userEmail: userEmail.trim(),
      codeName: codeName.trim(),
      code: code.trim(),
      language: language.trim(),
      createdAt: new Date()
    });
    console.log("Code saved successfully for user:", userEmail);
    res.status(200).json({ message: "Code saved successfully" });
  } catch (error) {
    console.error("Error saving code:", error.message);
    console.error("Stack:", error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ error: `Code name '${codeName}' already exists for user '${userEmail}'` });
    }
    return res.status(500).json({ error: `Failed to save code: ${error.message}` });
  }
});

app.get("/api/saved-codes/:userEmail", async (req, res) => {
  const { userEmail } = req.params;
  console.log("Fetching saved codes for:", userEmail);
  if (!userEmail || typeof userEmail !== "string") {
    console.log("Invalid userEmail:", userEmail);
    return res.status(400).json({ error: "Valid userEmail is required" });
  }
  try {
    const savedCodes = req.db.collection("SavedCodes");
    const codes = await savedCodes.find({ userEmail: userEmail.trim() }).toArray();
    console.log("Fetched codes:", codes.length);
    res.status(200).json(codes);
  } catch (error) {
    console.error("Error fetching saved codes:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ error: `Failed to fetch saved codes: ${error.message}` });
  }
});

app.delete("/api/delete-code/:id", async (req, res) => {
  const { id } = req.params;
  console.log("Deleting code with ID:", id);
  try {
    const savedCodes = req.db.collection("SavedCodes");
    const result = await savedCodes.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      console.log("Code deleted successfully:", id);
      res.status(200).json({ message: "Code deleted successfully" });
    } else {
      console.log("Code not found:", id);
      return res.status(404).json({ error: "Code not found" });
    }
  } catch (error) {
    console.error("Error deleting code:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ error: `Failed to delete code: ${error.message}` });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

//self polling code to avoid cold start

const axios = require("axios");

const SELF_PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
const SELF_URL = "https://coding-collaborator-ai-compiler.onrender.com/health";

setInterval(async () => {
  try {
    const res = await axios.get(SELF_URL);
    console.log("Self-ping successful:", res.data);
  } catch (err) {
    console.error("Self-ping failed:", err.message);
  }
}, SELF_PING_INTERVAL);
