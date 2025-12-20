const jwt = require('../utils/jwt');

module.exports = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: 'No token' });

    const token = auth.split(' ')[1];
    const decoded = jwt.verifyToken(token);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
