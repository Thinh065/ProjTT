// Upload ảnh lên Cloudinary (SDK v2): multer giữ file trong bộ nhớ, kiểm tra loại/kích thước,
// rồi đẩy thẳng lên Cloudinary. Sau middleware, req.file.path là URL https của ảnh.
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const crypto = require("crypto");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const IMAGE_FORMATS = ["jpg", "jpeg", "png", "gif", "webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const httpError = (status, message) => Object.assign(new Error(message), { status });

const receive = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) =>
    file.mimetype?.startsWith("image/") ? cb(null, true) : cb(httpError(400, "Chỉ chấp nhận file ảnh")),
});

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (err, result) => (err ? reject(err) : resolve(result))).end(buffer);
  });
}

const makeUploader = ({ folder, publicId, transformation }) => ({
  single: (field) => [
    receive.single(field),
    async (req, res, next) => {
      if (!req.file) return next();
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return next(httpError(503, "Server chưa cấu hình Cloudinary nên chưa tải ảnh lên được."));
      }
      try {
        const result = await uploadBuffer(req.file.buffer, {
          folder,
          public_id: publicId(req),
          overwrite: true,
          resource_type: "image",
          allowed_formats: IMAGE_FORMATS,
          ...(transformation && { transformation }),
        });
        req.file.path = result.secure_url;
        req.file.buffer = undefined; // giải phóng bộ nhớ sớm
        next();
      } catch (err) {
        next(httpError(err.http_code === 400 ? 400 : 502, err.http_code === 400 ? err.message : "Không tải được ảnh lên Cloudinary"));
      }
    },
  ],
});

// Avatar của user: mỗi user một file, ghi đè khi đổi
const uploadUserAvatar = makeUploader({
  folder: "avatars",
  publicId: (req) => `user_${req.params.id}`,
  transformation: [{ width: 256, height: 256, crop: "limit" }],
});

// Ảnh dùng chung (avatar lúc đăng ký, ảnh bot): tên ngẫu nhiên
const uploadImage = makeUploader({
  folder: "avatars",
  publicId: () => crypto.randomUUID(),
  transformation: [{ width: 256, height: 256, crop: "limit" }],
});

module.exports = { uploadUserAvatar, uploadImage };
