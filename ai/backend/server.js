require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

// Apply CORS BEFORE any other middleware
app.use(cors(corsOptions));

// Explicitly handle preflight requests
app.options("*", cors(corsOptions));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get("Origin")}`);
  next();
});

// Body parsing middleware AFTER CORS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "test",
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Health check endpoint (before other routes)
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes - FIXED: Remove duplicate route mounting
try {
  // Auth routes (public)
  app.use("/api/auth", require("./routes/auth"));

  // Protected routes
  app.use("/api/users", require("./routes/users"));
  app.use("/api/apikeys", require("./routes/apikey"));
  app.use("/api/upload", require("./routes/upload"));
  app.use("/api/chatbot", require("./routes/chatbot"));

  console.log("All routes loaded successfully");
} catch (error) {
  console.error("Error loading routes:", error);
  process.exit(1);
}

// Static files
app.use("/uploads", express.static("uploads"));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Initialize knowledge extraction (with error handling)
const initializeKnowledge = async () => {
  try {
    const { extractAndSaveDocs } = require("./models/KnowledgeChunk");
    await extractAndSaveDocs();
    console.log("Knowledge extraction completed");
  } catch (error) {
    console.error("Knowledge extraction error:", error);
    // Don't exit, just log the error
  }
};

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origins: ${corsOptions.origin.join(", ")}`);

  // Initialize knowledge extraction after server starts
  initializeKnowledge();
});
