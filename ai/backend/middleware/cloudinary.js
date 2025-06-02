const cloudinary = require("cloudinary").v2

cloudinary.config({
  cloud_name: "***REMOVED***",
  api_key: "***REMOVED***",
  api_secret: "***REMOVED***"
})

module.exports = cloudinary