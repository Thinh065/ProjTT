// Bọc route async để lỗi được chuyển tới error handler của Express
// thay vì thành unhandled rejection (Node sẽ tắt process).
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
