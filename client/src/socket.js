import { io } from 'socket.io-client';

// Change URL if deployed
export const socket = io('http://localhost:3001');
