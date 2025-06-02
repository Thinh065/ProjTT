const express = require("express")
const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("../middleware/cloudinary")
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

module.exports = router