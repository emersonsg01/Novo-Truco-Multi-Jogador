const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { TrucoGame } = require('./game/TrucoGame');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

const rooms = {}; // roomId -> TrucoGame instance
const playerSockets = {}; // socketId -> roomId

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  const emitGameState = (roomId) => {
    const game = rooms[roomId];
    if (!game) return;
    game.players.forEach(p => {
      if (p.id !== 'bot') {
        io.to(p.id).emit('game_state', game.getStateForPlayer(p.id));
      }
    });
  };

  const checkBotTurn = (roomId) => {
    const game = rooms[roomId];
    if (!game || !game.isSinglePlayer || game.state !== 'playing') return;

    const currentTurnPlayer = game.players[game.currentTurnIndex];
    if (currentTurnPlayer.id === 'bot') {
      setTimeout(() => {
        // Se o estado mudou ou não é mais a vez do bot, cancela
        if (game.state !== 'playing' || game.players[game.currentTurnIndex].id !== 'bot') return;
        
        const botHand = game.players[game.currentTurnIndex].hand;
        if (botHand.length > 0) {
          handlePlayCardLogic(roomId, 'bot', 0);
        }
      }, 1500);
    }
  };

  const handleBotTrucoResponse = (roomId) => {
    const game = rooms[roomId];
    if (!game || !game.isSinglePlayer || game.state !== 'truco_requested') return;

    const currentTurnPlayer = game.players[game.trucoRequesterIndex === 0 ? 1 : 0];
    if (currentTurnPlayer.id === 'bot') {
      setTimeout(() => {
        if (game.state !== 'truco_requested') return;
        
        const accept = Math.random() > 0.3; 
        const res = game.respondTruco('bot', accept ? 'accept' : 'reject');
        emitGameState(roomId);
        if (res === 'accepted') {
           checkBotTurn(roomId);
        } else if (res === 'rejected') {
           handleHandFinished(roomId);
        }
      }, 2000);
    }
  };

  const handleHandFinished = (roomId) => {
    const game = rooms[roomId];
    if (!game) return;
    if (game.state === 'hand_finished') {
       setTimeout(() => {
         if (!rooms[roomId]) return;
         game.prepareNextHand();
         emitGameState(roomId);
         // set ready for bot immediately
         if (game.isSinglePlayer) {
           game.setPlayerReady('bot');
         }
       }, 3000);
    }
  };

  const handlePlayCardLogic = (roomId, playerId, cardIndex) => {
    const game = rooms[roomId];
    if (!game) return;

    const action = game.playCard(playerId, cardIndex);
    if (!action) return; // Invalid move

    emitGameState(roomId);

    if (action === 'hand_finished') {
      handleHandFinished(roomId);
    } else if (action === 'trick_finished') {
       setTimeout(() => {
         if (!rooms[roomId]) return;
         emitGameState(roomId);
         checkBotTurn(roomId);
       }, 1500);
    } else {
       checkBotTurn(roomId);
    }
  };

  socket.on('create_room', ({ isSinglePlayer, playerName }, callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const game = new TrucoGame(roomId, isSinglePlayer);
    game.addPlayer(socket.id, playerName || 'Jogador 1');
    
    if (isSinglePlayer) {
      game.addPlayer('bot', 'Bot (IA)');
    }

    rooms[roomId] = game;
    playerSockets[socket.id] = roomId;
    socket.join(roomId);
    
    if (callback) callback({ roomId });
    emitGameState(roomId);
  });

  socket.on('join_room', ({ roomId, playerName }, callback) => {
    const game = rooms[roomId];
    if (!game) {
      if (callback) callback({ error: 'Sala não encontrada' });
      return;
    }
    
    if (game.addPlayer(socket.id, playerName || 'Jogador 2')) {
      playerSockets[socket.id] = roomId;
      socket.join(roomId);
      if (callback) callback({ success: true });
      emitGameState(roomId);
    } else {
      if (callback) callback({ error: 'Sala cheia' });
    }
  });

  socket.on('set_ready', () => {
    const roomId = playerSockets[socket.id];
    const game = rooms[roomId];
    if (game) {
      game.setPlayerReady(socket.id);
      if (game.isSinglePlayer) {
        game.setPlayerReady('bot');
      }
      emitGameState(roomId);
      checkBotTurn(roomId);
    }
  });

  socket.on('play_card', (cardIndex) => {
    const roomId = playerSockets[socket.id];
    handlePlayCardLogic(roomId, socket.id, cardIndex);
  });

  socket.on('request_truco', () => {
    const roomId = playerSockets[socket.id];
    const game = rooms[roomId];
    if (game && game.requestTruco(socket.id)) {
      emitGameState(roomId);
      if (game.isSinglePlayer) {
         handleBotTrucoResponse(roomId);
      }
    }
  });

  socket.on('respond_truco', (response) => {
    const roomId = playerSockets[socket.id];
    const game = rooms[roomId];
    if (!game) return;
    
    const res = game.respondTruco(socket.id, response);
    if (res) {
      emitGameState(roomId);
      if (res === 'accepted') {
         checkBotTurn(roomId);
      } else if (res === 'rejected') {
         handleHandFinished(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = playerSockets[socket.id];
    if (roomId) {
      const game = rooms[roomId];
      if (game) {
        game.removePlayer(socket.id);
        if (game.players.length === 0 || (game.players.length === 1 && game.players[0].id === 'bot')) {
          delete rooms[roomId];
        } else {
          emitGameState(roomId);
        }
      }
      delete playerSockets[socket.id];
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
