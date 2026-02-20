import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Get messages for a user (either Admin or Recruiter)
// @route   GET /api/messages
export const getMessages = async (req, res) => {
  try {
    const { role, username, id } = req.user;
    let query;

    if (role === 'admin') {
      query = {
        $or: [
          { to: 'admin' },
          { from: 'admin' }
        ]
      };
    } else {
      // For recruiters, match by ID or Username or Broadcasts
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

    const messages = await Message.find(query).sort({ createdAt: -1 });

    // Enhance messages with names
    const enhancedMessages = await Promise.all(messages.map(async (msg) => {
      let fromName = msg.from;
      let toName = msg.to;

      // Resolve Sender Name
      if (msg.from !== 'admin' && msg.from.length === 24) {
        const user = await User.findById(msg.from).select('name');
        if (user) fromName = user.name;
      } else if (msg.from === 'admin') {
        fromName = 'Admin';
      }

      // Resolve Recipient Name
      if (msg.to !== 'admin' && msg.to !== 'all' && msg.to.length === 24) {
        const user = await User.findById(msg.to).select('name');
        if (user) toName = user.name;
      } else if (msg.to === 'admin') {
        toName = 'Admin';
      } else if (msg.to === 'all') {
        toName = 'Everyone';
      }

      return {
        ...msg.toObject(),
        fromName: fromName || msg.from,
        toName: toName || msg.to
      };
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
    // If admin, sender is 'admin', else user ID
    const from = req.user.role === 'admin' ? 'admin' : req.user.id;

    const message = await Message.create({
      from,
      to,
      subject,
      content
    });
    
    // 1. Resolve Sender Name
    let fromName = from;
    if (from === 'admin') {
      fromName = 'Admin';
    } else {
      const user = await User.findById(from).select('name');
      if (user) fromName = user.name;
    }

    // 2. Resolve Recipient Name (Fix: Added this logic)
    let toName = to;
    if (to === 'admin') {
      toName = 'Admin';
    } else if (to === 'all') {
      toName = 'Everyone';
    } else if (to.length === 24) {
      const user = await User.findById(to).select('name');
      if (user) toName = user.name;
    }

    // Return full object with names so UI updates immediately
    res.status(201).json({ 
      ...message.toObject(), 
      fromName,
      toName 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a message
// @route   PUT /api/messages/:id
export const updateMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only Admin or Sender can edit
    if (req.user.role !== 'admin' && message.from !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    message.subject = req.body.subject || message.subject;
    message.content = req.body.content || message.content;

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

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only Admin or Sender can delete
    // Note: Recipient cannot delete message from DB, only Sender/Admin
    if (req.user.role !== 'admin' && message.from !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await message.deleteOne();
    res.json({ message: 'Message removed', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};