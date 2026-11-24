import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET audit logs for an auction
router.get('/:auctionId', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE auction_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `).all(req.params.auctionId);

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
