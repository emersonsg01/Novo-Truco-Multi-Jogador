import React from 'react';
import { socket } from '../socket';
import { Card } from './Card';

export const GameTable = ({ gameState, playerId }) => {
  if (!gameState || !gameState.players) return null;

  const me = gameState.players.find(p => p.id === playerId) || gameState.players[0];
  const opponent = gameState.players.find(p => p.id !== playerId) || gameState.players[1] || null;

  const isMyTurn = gameState.players[gameState.currentTurnIndex]?.id === playerId && gameState.state === 'playing';

  const handlePlayCard = (index) => {
    if (!isMyTurn) return;
    socket.emit('play_card', index);
  };

  const handleRequestTruco = () => {
    socket.emit('request_truco');
  };

  const handleRespondTruco = (res) => {
    socket.emit('respond_truco', res);
  };

  const renderTrucoOverlay = () => {
    if (gameState.state !== 'truco_requested') return null;
    
    const requesterId = gameState.players[gameState.trucoRequesterIndex].id;
    if (requesterId === playerId) {
      return (
        <div className="truco-overlay">
          <div className="glass truco-box">
            <h2>Aguardando resposta...</h2>
            <p>Você pediu Truco ({gameState.handValue} pontos)</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="truco-overlay">
          <div className="glass truco-box">
            <h2>TRUCO!</h2>
            <p>O oponente pediu Truco. ({gameState.handValue} pontos)</p>
            <div className="truco-actions">
              <button className="btn" onClick={() => handleRespondTruco('accept')}>Aceitar</button>
              <button className="btn btn-secondary" onClick={() => handleRespondTruco('raise')}>Pedir Mais</button>
              <button className="btn btn-danger" onClick={() => handleRespondTruco('reject')}>Correr</button>
            </div>
          </div>
        </div>
      );
    }
  };

  if (gameState.state === 'waiting' || gameState.state === 'finished') {
    return (
      <div className="glass menu-container" style={{ maxWidth: 600 }}>
        <h2 className="title">{gameState.state === 'finished' ? 'Fim de Jogo!' : 'Aguardando Jogadores'}</h2>
        <p>Sala: <strong>{gameState.roomId}</strong></p>
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
          <div>
            <h3>{me?.name}</h3>
            <p style={{ fontSize: '2rem', color: 'var(--accent-gold)' }}>{me?.score}</p>
          </div>
          <div>
            <h3>{opponent?.name || 'Aguardando...'}</h3>
            <p style={{ fontSize: '2rem', color: 'var(--accent-gold)' }}>{opponent?.score || 0}</p>
          </div>
        </div>
        
        {gameState.state !== 'finished' && (!opponent || !me.ready) && (
          <button className="btn" onClick={() => socket.emit('set_ready')}>
            Estou Pronto
          </button>
        )}
        
        {gameState.state === 'finished' && (
          <p style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
             O jogo acabou. {me.score >= 12 ? 'Você Venceu!' : 'Você Perdeu.'}
          </p>
        )}
      </div>
    );
  }

  // Find played cards for the trick
  const myTrickCard = gameState.trickCards.find(tc => tc.playerId === me.id)?.card;
  const oppTrickCard = gameState.trickCards.find(tc => tc.playerId === opponent?.id)?.card;

  return (
    <div className="game-table">
      {renderTrucoOverlay()}
      
      {/* Opponent Area */}
      <div className="opponent-area">
        {opponent && opponent.hand.map((card, i) => (
           <Card key={`opp-${i}`} hidden={card === null} card={card} disabled />
        ))}
      </div>

      {/* Info Panel */}
      <div className="glass info-panel">
        <div className="score-row">
          <span>{me.name}</span>
          <span>{me.score}</span>
        </div>
        <div className="score-row">
          <span>{opponent?.name || '---'}</span>
          <span>{opponent?.score || 0}</span>
        </div>
        <div className="hand-value">
          Vale {gameState.handValue}
        </div>
      </div>

      {/* Center Area */}
      <div className="center-area">
        {gameState.vira && (
          <div className="vira-container">
            <span className="vira-label">Vira</span>
            <Card card={gameState.vira} disabled />
          </div>
        )}
        <div className="trick-cards">
           {oppTrickCard && <div className="played-card"><Card card={oppTrickCard} disabled /></div>}
           {myTrickCard && <div className="played-card"><Card card={myTrickCard} disabled /></div>}
        </div>
      </div>

      {/* Player Area */}
      <div className="player-area">
        {me.hand.map((card, i) => (
          <Card 
            key={`me-${i}`} 
            card={card} 
            disabled={!isMyTurn || gameState.state !== 'playing'}
            onClick={() => handlePlayCard(i)}
          />
        ))}
      </div>

      {/* Controls Area */}
      {isMyTurn && gameState.state === 'playing' && (
        <div className="controls-area">
          <button className="btn" onClick={handleRequestTruco}>TRUCO!</button>
        </div>
      )}
      
      {!isMyTurn && gameState.state === 'playing' && (
         <div className="controls-area">
           <span style={{ color: 'var(--text-secondary)' }}>Aguardando oponente...</span>
         </div>
      )}
    </div>
  );
};
