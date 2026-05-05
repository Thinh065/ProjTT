const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    // Log để debug
    console.log("Headers:", req.headers);
    
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log("No token found");
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("Decoded user:", decoded);
    
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;