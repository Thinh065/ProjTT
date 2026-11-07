const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const crypto = require("crypto");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_FORMATS = ["jpg", "jpeg", "png", "gif", "webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const imageFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
  const err = new Error("Chỉ chấp nhận file ảnh");
  err.status = 400;
  cb(err);
};

const makeUploader = ({ folder, publicId, transformation }) =>
  multer({
    storage: new CloudinaryStorage({
      cloudinary,
      params: (req) => ({
        folder,
        allowed_formats: IMAGE_FORMATS,
        public_id: publicId(req),
        overwrite: true,
        ...(transformation && { transformation }),
      }),
    }),
    limits: { fileSize: MAX_SIZE },
    fileFilter: imageFilter,
  });

const randomId = () => crypto.randomUUID();

// Avatar của user: mỗi user một file, ghi đè khi đổi
const uploadUserAvatar = makeUploader({
  folder: "avatars",
  publicId: (req) => `user_${req.params.id}`,
  transformation: [{ width: 256, height: 256, crop: "limit" }],
});

// Ảnh dùng chung (avatar lúc đăng ký, ảnh bot): tên ngẫu nhiên
const uploadImage = makeUploader({
  folder: "avatars",
  publicId: () => randomId(),
  transformation: [{ width: 256, height: 256, crop: "limit" }],
});

// Ảnh gửi trong chat
const uploadChatImage = makeUploader({
  folder: "chat-images",
  publicId: (req) => `${req.user?.id || "anon"}_${randomId()}`,
});

module.exports = { cloudinary, uploadUserAvatar, uploadImage, uploadChatImage };
