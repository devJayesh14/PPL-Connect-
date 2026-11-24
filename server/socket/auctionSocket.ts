import { Server as SocketServer, Socket } from 'socket.io';
import { auctionEngine } from '../services/auctionEngine.js';

export function setupAuctionSockets(io: SocketServer) {
  auctionEngine.setSocketServer(io);

  io.on('connection', (socket: Socket) => {
    // Join an auction room
    socket.on('JOIN_AUCTION', ({ auctionId, user }) => {
      socket.join(`auction:${auctionId}`);
      // Send current state immediately upon joining
      const state = auctionEngine.getRoomState(auctionId);
      socket.emit('AUCTION_STATE', state);
    });

    // Captain or Admin places a bid
    socket.on('PLACE_BID', ({ auctionId, teamId, captainId, customAmount }, callback) => {
      try {
        const result = auctionEngine.placeBid(auctionId, teamId, captainId, customAmount);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message || 'Error placing bid' });
      }
    });

    // Admin controls
    socket.on('CALL_PLAYER', ({ auctionId, playerId }, callback) => {
      try {
        const result = auctionEngine.callNextPlayer(auctionId, playerId);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('MARK_SOLD', ({ auctionId, teamId, amount }, callback) => {
      try {
        const result = auctionEngine.markSold(auctionId, teamId, amount);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('MARK_UNSOLD', ({ auctionId }, callback) => {
      try {
        const result = auctionEngine.markUnsold(auctionId);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('SKIP_PLAYER', ({ auctionId }, callback) => {
      try {
        const result = auctionEngine.skipPlayer(auctionId);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('REAUCTION_PLAYER', ({ auctionId, playerId }, callback) => {
      try {
        const result = auctionEngine.reauctionPlayer(auctionId, playerId);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('UNDO_LAST_BID', ({ auctionId }, callback) => {
      try {
        const result = auctionEngine.undoLastBid(auctionId);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('PAUSE_AUCTION', ({ auctionId }, callback) => {
      try {
        const result = auctionEngine.pauseAuction(auctionId);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('RESUME_AUCTION', ({ auctionId }, callback) => {
      try {
        const result = auctionEngine.resumeAuction(auctionId);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('END_AUCTION', ({ auctionId }, callback) => {
      try {
        const result = auctionEngine.endAuction(auctionId);
        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      // Clean leave
    });
  });
}
