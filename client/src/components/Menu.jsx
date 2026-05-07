import React, { useState } from 'react';
import { socket } from '../socket';
import { Play, Users, Hash } from 'lucide-react';

export const Menu = ({ setGameState, setPlayerId }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleCreateSinglePlayer = () => {
    socket.emit('create_room', { isSinglePlayer: true, playerName }, (res) => {
      setPlayerId(socket.id);
      console.log('Created SP room', res.roomId);
    });
  };

  const handleCreateMultiplayer = () => {
    socket.emit('create_room', { isSinglePlayer: false, playerName }, (res) => {
      setPlayerId(socket.id);
      console.log('Created MP room', res.roomId);
    });
  };

  const handleJoinRoom = () => {
    if (!roomCode) return;
    socket.emit('join_room', { roomId: roomCode.toUpperCase(), playerName }, (res) => {
      if (res.error) {
        alert(res.error);
      } else {
        setPlayerId(socket.id);
      }
    });
  };

  return (
    <div className="glass menu-container">
      <h1 className="title">TRUCO</h1>
      <p style={{ color: 'var(--text-secondary)' }}>O clássico jogo de cartas online</p>

      <div style={{ marginTop: 20 }}>
        <input 
          className="input-field" 
          placeholder="Seu Nome" 
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ width: '100%', marginBottom: 20 }}
        />
      </div>

      <button className="btn" onClick={handleCreateSinglePlayer}>
        <Play size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
        Jogar contra IA
      </button>

      <button className="btn btn-secondary" onClick={handleCreateMultiplayer}>
        <Users size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
        Criar Sala Multiplayer
      </button>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <input 
          className="input-field" 
          placeholder="Código da Sala" 
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          style={{ flex: 1, textTransform: 'uppercase' }}
        />
        <button className="btn" onClick={handleJoinRoom}>
          Entrar
        </button>
      </div>
    </div>
  );
};
