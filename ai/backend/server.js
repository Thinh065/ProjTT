require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI, { dbName: "test" })
  .then(() => console.log("MongoDB connected"))

app.use("/api/auth", require("./routes/auth"))

const authMiddleware = require("./middleware/auth")
const usersRouter = require("./routes/users")
app.use("/api", usersRouter)
app.use("/api/apikeys", require("./routes/apikey"))
app.use("/api/upload", require("./routes/upload"))
app.use("/uploads", express.static("uploads"))
app.use("/api/chatbot", require("./routes/chatbot"))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))