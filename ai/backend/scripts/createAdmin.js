// Tạo tài khoản admin (mật khẩu được mã hóa bcrypt như khi đăng ký trên web).
// Đừng tạo user trực tiếp trên MongoDB Atlas: mật khẩu chữ thường sẽ không đăng nhập được.
//
//   npm run create-admin -- <email> [mật khẩu] [--reset]
//
// Không nhập mật khẩu thì script tự sinh một mật khẩu ngẫu nhiên và in ra một lần.
// --reset: email đã tồn tại thì đặt lại mật khẩu, cấp quyền admin và mở khóa.
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const [rawEmail, givenPassword] = args.filter((a) => a !== "--reset");
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Cách dùng: npm run create-admin -- <email> [mật khẩu] [--reset]");
  }
  const password = givenPassword || crypto.randomBytes(12).toString("base64url");
  if (password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
  if (!process.env.MONGO_URI) throw new Error("Thiếu MONGO_URI trong ai/backend/.env");

  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME });
  const hash = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ email }).collation({ locale: "en", strength: 2 });
  if (existing && !reset) {
    throw new Error(`Email ${email} đã tồn tại. Thêm --reset để đặt lại mật khẩu và cấp quyền admin.`);
  }
  if (existing) {
    Object.assign(existing, { email, password: hash, role: "admin", status: "active" });
    await existing.save();
  } else {
    await User.create({ name: "Admin", email, password: hash, role: "admin", status: "active" });
  }
  console.log(`${existing ? "Đã đặt lại" : "Đã tạo"} admin: ${email}`);
  if (!givenPassword) console.log(`Mật khẩu (chỉ hiện một lần, hãy đổi sau khi đăng nhập): ${password}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
