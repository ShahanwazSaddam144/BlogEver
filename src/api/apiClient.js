// src/api/apiClient.js
import * as SecureStore from 'expo-secure-store';
import jwtDecode from 'jwt-decode';

// Flag to indicate if a token refresh request is in progress
let isRefreshing = false;

// List of functions waiting for the refreshed token
let waitingRequestsQueue = [];


function queueRequestWhileRefreshing(notifyRequest) {
  waitingRequestsQueue.push(notifyRequest);
}


function notifyQueuedRequests(newAccessToken) {
  waitingRequestsQueue.forEach(notifyRequest => notifyRequest(newAccessToken));
  waitingRequestsQueue = [];
}


function isTokenExpiring(accessToken, thresholdSeconds = 60) {
  if (!accessToken) return true;
  const { exp } = jwtDecode(accessToken);
  const now = Math.floor(Date.now() / 1000);
  return exp - now < thresholdSeconds;
}


export async function secureFetch(url, options = {}) {
  let accessToken = await SecureStore.getItemAsync('accessToken');

  // Check if token is about to expire
  if (accessToken && isTokenExpiring(accessToken)) {
    if (!isRefreshing) {
      isRefreshing = true;

      const refreshToken = await SecureStore.getItemAsync('refreshToken');

      // Call refresh endpoint
      const response = await fetch('https://api.example.com/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed — clear stored tokens
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        isRefreshing = false;
        notifyQueuedRequests(null);
        throw new Error('Refresh token failed');
      }

      const data = await response.json();
      accessToken = data.accessToken;
      await SecureStore.setItemAsync('accessToken', accessToken);

      isRefreshing = false;
      // Notify all queued requests
      notifyQueuedRequests(accessToken);
    } else {
      // Token is already refreshing, wait for it
      await new Promise(resolve =>
        queueRequestWhileRefreshing((newAccessToken) => {
          accessToken = newAccessToken;
          resolve();
        })
      );
    }
  }

  options.headers = {
    ...(options.headers || {}),
    Authorization: accessToken ? `Bearer ${accessToken}` : '',
    'Content-Type': 'application/json',
  };

  return fetch(url, options);
}
