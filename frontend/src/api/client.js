/**
 * api/client.js — Centralised Axios instance (Phase 7)
 *
 * Attaches the JWT bearer token to every request and normalizes error
 * responses into a consistent shape for UI state machines.
 */

import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 180000, // AI processing can take a while (OCR + embeddings)
});

// Request interceptor — inject the bearer token when present.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('doc_organizer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — surface a readable error message everywhere.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      (error.code === 'ECONNABORTED' ? 'Request timed out. Please retry.' : error.message);
    return Promise.reject(new Error(message));
  }
);

/** Register a new account and store the returned JWT. */
export async function registerUser(payload) {
  const { data } = await API.post('/auth/register', payload);
  localStorage.setItem('doc_organizer_token', data.token);
  return data.user;
}

/** Log in and store the returned JWT. */
export async function loginUser(payload) {
  const { data } = await API.post('/auth/login', payload);
  localStorage.setItem('doc_organizer_token', data.token);
  return data.user;
}

/** Fetch documents — optional `search` triggers the MongoDB text index. */
export async function fetchDocuments({ search, category } = {}) {
  const { data } = await API.get('/documents', {
    params: { search: search || undefined, category: category || undefined },
  });
  return data.documents;
}

/** Fetch documents expiring within the 30-day alert window. */
export async function fetchExpiring() {
  const { data } = await API.get('/documents/expiring');
  return data.documents;
}
/** Fetch one document by ID. */
export async function getDocument(id) {
  const { data } = await API.get(`/documents/${id}`);
  return data.document;
}

/**
 * Upload a document with upload-progress tracking.
 *
 * @param {File} file
 * @param {(pct: number) => void} onProgress - 0..100 while streaming to the gateway.
 * @returns {Promise<object>} The persisted, AI-enriched document.
 */
/**
 * Upload multiple documents with upload-progress tracking.
 *
 * @param {File[]} files
 * @param {(pct: number) => void} onProgress - 0..100 while streaming to the gateway.
 * @returns {Promise<object[]>} The persisted documents.
 */
export async function uploadDocument(files, onProgress) {
  const form = new FormData();

  for (const file of files) {
    form.append('file', file);
  }

  const { data } = await API.post('/documents/upload', form, {
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return data.documents;
}

/** Delete a document. */
export async function deleteDocument(id) {
  await API.delete(`/documents/${id}`);
}
export async function renameDocument(id, name) {
  const { data } = await API.patch(`/documents/${id}/rename`, {
    name,
  });

  return data.document;
}
export async function getDocumentFile(id) {
  const response = await API.get(`/documents/${id}/file`, {
    responseType: 'blob',
  });

  return response.data;
}
export default API;
