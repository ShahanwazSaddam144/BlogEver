// src/api/apiClient.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
let isRefreshing = false;


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
export const API_BASE_URL = 'http://localhost:3000';

export async function secureFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  let accessToken = await AsyncStorage.getItem('accessToken');

  if (accessToken && isTokenExpiring(accessToken)) {
    if (!isRefreshing) {
      isRefreshing = true;

      const refreshToken = await AsyncStorage.getItem('refreshToken');
      console.log(refreshToken)
      const response = await fetch(`${API_BASE_URL}/api/authrefresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        isRefreshing = false;
        notifyQueuedRequests(null);
        throw new Error('Refresh token failed');
      }

      const data = await response.json();
      accessToken = data.accessToken;
      await AsyncStorage.setItem('accessToken', accessToken);

      isRefreshing = false;
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