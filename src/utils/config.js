// src/utils/config.js
// Single source of truth for API configuration.
// Change API_BASE here — updates everywhere automatically.
// API_KEY comes from an EAS environment variable (app.config.js `extra.apiSecretKey`),
// not hardcoded here — see `eas env:list` on this project.

import Constants from 'expo-constants';

export const API_BASE = 'https://visco-api.onrender.com/api';
export const API_KEY  = Constants.expoConfig?.extra?.apiSecretKey || '';

// Axios default header — set once in App.js:
// import axios from 'axios';
// import { API_KEY } from './src/utils/config';
// axios.defaults.headers.common['x-api-key'] = API_KEY;