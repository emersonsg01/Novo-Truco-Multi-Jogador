import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import { Menu } from './components/Menu';
import { GameTable } from './components/GameTable';

function App() {
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('game_state', (state) => {
      console.log('Received game state:', state);
      setGameState(state);
    });

    socket.on('error_join', (err) => {
      alert(err.message);
    });

    socket.on('player_disconnected', (msg) => {
      alert(msg.message);
      setGameState(null);
    });

    return () => {
      socket.off('connect');
      socket.off('game_state');
      socket.off('error_join');
      socket.off('player_disconnected');
    };
  }, []);

  return (
    <div className="app-container">
      {!gameState ? (
        <Menu setGameState={setGameState} setPlayerId={setPlayerId} />
      ) : (
        <GameTable gameState={gameState} playerId={playerId} />
      )}
    </div>
  );
}

export default App;
