import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('resqnet_token');
      if (token) {
        try {
          const data = await api.getMe();
          setUser(data.user);
        } catch {
          localStorage.removeItem('resqnet_token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('resqnet_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('resqnet_token');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'operator';
  const isHospitalStaff = user?.role === 'hospital_staff';
  const isCitizen = user?.role === 'citizen';
  const isEvaluator = user?.role === 'evaluator';
  const hospitalId = user?.hospitalId || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isOperator,
        isHospitalStaff,
        isCitizen,
        isEvaluator,
        hospitalId
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
