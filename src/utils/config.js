// src/utils/config.js
// Single source of truth for API configuration.
// Change API_BASE or API_KEY here — updates everywhere automatically.

export const API_BASE = 'https://visco-api.onrender.com/api';
export const API_KEY  = 'ViscoApp_SuperSecretKey_2026';

// Axios default header — set once in App.js:
// import axios from 'axios';
// import { API_KEY } from './src/utils/config';
// axios.defaults.headers.common['x-api-key'] = API_KEY;