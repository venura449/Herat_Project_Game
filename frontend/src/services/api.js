// services/api.js - Centralised Axios HTTP client
// Demonstrates Low Coupling: all components use this single instance, so
// the base URL and auth settings can be changed in one place.
// Interoperability: Axios handles JSON serialisation/deserialisation and
// sends the HTTP-only cookie automatically via { withCredentials: true }.
// Reference: https://axios-http.com/ - Axios HTTP client documentation

import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true, // Sends the JWT cookie with every cross-origin request
});

export default api;
