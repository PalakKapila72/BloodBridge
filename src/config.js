// Centralized API configuration for local development and cloud deployment
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
