const express = require("express")
const multer = require("multer")
const uploadCloud = require("../middleware/cloudinary")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("../middleware/cloudinary")
const auth = require("../middleware/auth")
const router = express.Router()

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 256, height: 256, crop: "limit" }]
  }
})

const upload = multer({ storage })

router.post("/avatar", upload.single("image"), (req, res) => {
  res.json({ url: req.file.path })
})

router.post("/chat-image", auth, uploadCloud.single("image"), (req, res) => {
  if (!req.file?.path) return res.status(400).json({ message: "Không có file" })
  res.json({ url: req.file.path })
})

module.exports = router