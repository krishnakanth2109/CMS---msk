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

    // Enhance messages with usernames
    const enhancedMessages = await Promise.all(messages.map(async (msg) => {
      let fromName = msg.from;
      let toName = msg.to;

      // Resolve Sender Username
      if (msg.from === 'admin') {
        fromName = 'Admin';
      } else if (msg.from.length === 24) {
        // Fetch ONLY the username field
        const user = await User.findById(msg.from).select('username');
        if (user) fromName = user.username;
      }

      // Resolve Recipient Username
      if (msg.to === 'admin') {
        toName = 'Admin';
      } else if (msg.to === 'all') {
        toName = 'Everyone';
      } else if (msg.to.length === 24) {
        // Fetch ONLY the username field
        const user = await User.findById(msg.to).select('username');
        if (user) toName = user.username;
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
    
    // 1. Resolve Sender Username
    let fromName = from;
    if (from === 'admin') {
      fromName = 'Admin';
    } else {
      const user = await User.findById(from).select('username');
      if (user) fromName = user.username;
    }

    // 2. Resolve Recipient Username
    let toName = to;
    if (to === 'admin') {
      toName = 'Admin';
    } else if (to === 'all') {
      toName = 'Everyone';
    } else if (to.length === 24) {
      const user = await User.findById(to).select('username');
      if (user) toName = user.username;
    }

    // Return full object with usernames so UI updates immediately
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
    if (req.user.role !== 'admin' && message.from !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await message.deleteOne();
    res.json({ message: 'Message removed', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};