import Message from '../models/Message.js';
import User from '../models/User.js';

// Batch resolve display names for a list of from/to values
const batchResolveNames = async (values) => {
  const unique = [...new Set(values.filter(Boolean))];
  const objectIds = unique.filter(v => /^[a-f\d]{24}$/i.test(v));

  const users = objectIds.length
    ? await User.find({ _id: { $in: objectIds } })
        .select('_id firstName lastName username')
        .lean()
    : [];

  const userMap = {};
  users.forEach(u => {
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
    userMap[String(u._id)] = full || u.username || 'User';
  });

  const resolve = (v) => {
    if (!v) return 'Unknown';
    if (v === 'admin') return 'Admin';
    if (v === 'all')   return 'Everyone';
    return userMap[v] || v;
  };

  return resolve;
};

// @desc    Get messages for a user (Admin, Manager, or Recruiter)
// @route   GET /api/messages
export const getMessages = async (req, res) => {
  try {
    const { role, username, id } = req.user;
    let query;

    if (role === 'admin') {
      query = {
        $or: [
          { to: 'admin' },
          { from: 'admin' },
          { to: 'all' }
        ]
      };
    } else {
      query = {
        $or: [
          { to: id },
          { to: username },
          { to: 'all' },
          { from: id },
          { from: username }
        ]
      };
    }

    const messages = await Message.find(query).sort({ createdAt: -1 }).lean();

    const allValues = messages.flatMap(m => [m.from, m.to]);
    const resolve = await batchResolveNames(allValues);

    const enhancedMessages = messages.map(msg => ({
      ...msg,
      fromName: resolve(msg.from),
      toName:   resolve(msg.to),
    }));

    res.json(enhancedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/messages
export const sendMessage = async (req, res) => {
  try {
    const { to, subject, content } = req.body;
    const { role, id } = req.user;

    const from = role === 'admin' ? 'admin' : id;

    const message = await Message.create({ from, to, subject, content });

    const resolve = await batchResolveNames([from, to]);
    res.status(201).json({ ...message.toObject(), fromName: resolve(from), toName: resolve(to) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a message (subject, content, and/or read status)
// @route   PUT /api/messages/:id
export const updateMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Allow the recipient to mark as read, or the sender/admin to edit content
    const isAdmin   = req.user.role === 'admin';
    const isSender  = message.from === req.user.id || (isAdmin && message.from === 'admin');
    const isRecipient =
      message.to === req.user.id ||
      message.to === req.user.username ||
      (isAdmin && (message.to === 'admin' || message.to === 'all'));

    if (!isAdmin && !isSender && !isRecipient) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Allow recipients to mark as read
    if (typeof req.body.read === 'boolean' && isRecipient) {
      message.read = req.body.read;
    }

    // Allow sender/admin to edit content fields
    if (isSender || isAdmin) {
      if (req.body.subject !== undefined) message.subject = req.body.subject || message.subject;
      if (req.body.content !== undefined) message.content = req.body.content || message.content;
    }

    const updatedMessage = await message.save();
    res.json(updatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (req.user.role !== 'admin' && message.from !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await message.deleteOne();
    res.json({ message: 'Message removed', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};