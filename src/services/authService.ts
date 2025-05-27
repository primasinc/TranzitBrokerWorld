import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';
import { User, LoginCredentials, RegisterCredentials } from '../types/user';

const functions = getFunctions(app);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const setUserRole = async (role: 'shipper' | 'carrier') => {
  try {
    const setRole = httpsCallable(functions, 'setUserRole');
    const result = await setRole({ role });
    return result.data;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
};

export const getUserRole = async () => {
  try {
    const getRole = httpsCallable(functions, 'getUserRole');
    const result = await getRole();
    return result.data;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const authService = {
  async register(credentials: RegisterCredentials): Promise<User> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    return data.user;
  },

  async login(credentials: LoginCredentials): Promise<User> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data.user;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token');
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem('token');
      return null;
    }

    const data = await response.json();
    return data.user;
  },
}; 