const User = require('../Models/user.model');

const listUsers = async (req, res) => {
  try {
    const includeSelf = String(req.query?.includeSelf || '').toLowerCase() === 'true';

    const filter = { isActive: true };
    if (!includeSelf && req.user?._id) {
      filter._id = { $ne: req.user._id };
    }

    const users = await User.find(filter).select('_id username email role isActive').sort({ createdAt: -1 });

    return res.json({ success: true, data: { users } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listUsers,
};
