import { io } from 'socket.io-client';
import process from 'node:process';
const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('request_live_thread_updates');
});

socket.on('live_thread_update', (data) => {
    console.log('RECEIVED UPDATE FOR:', data.community);
});

setTimeout(() => {
    console.log('Ending test...');
    process.exit(0);
}, 3000);
