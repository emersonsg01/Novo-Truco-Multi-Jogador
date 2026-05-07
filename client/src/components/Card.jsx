import React from 'react';

const suitSymbols = {
  hearts: '♥',
  diamonds: '♦',
  spades: '♠',
  clubs: '♣'
};

const suitColors = {
  hearts: 'red',
  diamonds: 'red',
  spades: 'black',
  clubs: 'black'
};

export const Card = ({ card, hidden, onClick, disabled }) => {
  if (hidden) {
    return <div className="card-back"></div>;
  }

  if (!card) return null;

  return (
    <div 
      className={`playing-card ${suitColors[card.suit]} ${disabled ? 'disabled' : ''}`}
      onClick={() => { if (!disabled && onClick) onClick(); }}
    >
      <div className="card-value">{card.value}</div>
      <div className="card-suit">{suitSymbols[card.suit]}</div>
      <div className="card-value-bottom">{card.value}</div>
    </div>
  );
};
