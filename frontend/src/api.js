// API helper functions to connect the React frontend to Express backend
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get user authentication token from local storage
function getToken() {
  return localStorage.getItem('token');
}

// Common wrapper for fetch calls to avoid repeating headers and error handling
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// User sign up and login endpoints
export const register = (name, email, password) =>
  apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });

export const login = (email, password) =>
  apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

// Get all auctions with optional query filters (status, search)
export const getAuctions = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/auctions${query ? '?' + query : ''}`);
};

// Get details for a single auction by ID
export const getAuction = (id) => apiFetch(`/auctions/${id}`);

// Admin only: create a new bike auction listing
export const createAuction = (data) =>
  apiFetch('/auctions', { method: 'POST', body: JSON.stringify(data) });

// Admin only: update upcoming auction details
export const updateAuction = (id, data) =>
  apiFetch(`/auctions/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Admin only: close an active auction early
export const closeAuction = (id) =>
  apiFetch(`/auctions/${id}/close`, { method: 'POST' });

// Admin only: delete a bike auction
export const deleteAuction = (id) =>
  apiFetch(`/auctions/${id}`, { method: 'DELETE' });

// Place a new bid on an active auction
export const placeBid = (auctionId, amount) =>
  apiFetch(`/auctions/${auctionId}/bids`, { method: 'POST', body: JSON.stringify({ amount }) });

// Fetch the bid history list for a specific auction
export const getBids = (auctionId) => apiFetch(`/auctions/${auctionId}/bids`);

// Get current logged-in user profile details and their bids
export const getMe = () => apiFetch('/users/me');

// Upload a bike image file to Cloudinary
export const uploadImage = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
};
