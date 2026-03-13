const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../database/db');

// GET /api/messages/:pantryId - Get messages for a pantry (supports type filter via ?type=wishlist|note)
router.get('/:pantryId', async (req, res) => {
  try {
    const { type } = req.query;
    let messages;
    if (type) {
      messages = await allQuery('SELECT * FROM messages WHERE pantry_id = ? AND type = ? ORDER BY created_at DESC LIMIT 50', [req.params.pantryId, type]);
    } else {
      messages = await allQuery('SELECT * FROM messages WHERE pantry_id = ? ORDER BY created_at DESC LIMIT 50', [req.params.pantryId]);
    }

    const formatted = messages.map(msg => ({
      id: msg.id,
      pantryId: msg.pantry_id,
      userName: msg.user_name,
      userAvatar: msg.user_avatar,
      content: msg.content,
      photos: msg.photos ? (typeof msg.photos === 'object' ? msg.photos : JSON.parse(msg.photos)) : [],
      createdAt: msg.created_at
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages', message: error.message });
  }
});

// POST /api/messages - Create new message (wishlist/note)
router.post('/', async (req, res) => {
  try {
    const { pantryId, type = 'note', userName, userAvatar, content, photos } = req.body;

    const result = await runQuery(
      `INSERT INTO messages (pantry_id, type, user_name, user_avatar, content, photos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        pantryId,
        type,
        userName || 'Anonymous',
        userAvatar || null,
        content,
        JSON.stringify(photos || [])
      ]
    );

    const message = await getQuery('SELECT * FROM messages WHERE id = ?', [result.id]);
    res.status(201).json({
      id: message.id,
      pantryId: message.pantry_id,
      userName: message.user_name,
      userAvatar: message.user_avatar,
      content: message.content,
      photos: message.photos ? JSON.parse(message.photos) : [],
      createdAt: message.created_at
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message', message: error.message });
  }
});

module.exports = router;


