import { app } from 'electron';

const isDev = !app.isPackaged;

export const API_BASE_URL = isDev 
  ? `http://localhost:${process.env.API_PORT || 3001}` 
  : (process.env.API_URL || 'https://gamevault-j05d.onrender.com');

export const WEB_BASE_URL = isDev 
  ? `http://localhost:${process.env.WEB_PORT || 3000}` 
  : (process.env.WEB_URL || 'https://gamevault-web-lejg.vercel.app');
