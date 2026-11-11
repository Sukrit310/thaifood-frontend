import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService } from '../api/services';
import { getToken, setToken } from '../api/backend';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [sessionError, setSessionError] = useState(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const logout = useCallback(() => {
    generation.current += 1;
    setToken(null);
    setMember(null);
    setSessionError(null);
    setLoading(false);
  }, []);
  const retrySession = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const current = ++generation.current;
    let active = true;
    if (!getToken()) { setMember(null); setSessionError(null); setLoading(false); return undefined; }
    setLoading(true);
    setSessionError(null);
    authService.me().then(result => {
      if (active && current === generation.current) setMember(result);
    }).catch(error => {
      if (!active || current !== generation.current) return;
      if (error.status === 401) logout();
      else { setMember(null); setSessionError(error); }
    }).finally(() => { if (active && current === generation.current) setLoading(false); });
    return () => { active = false; };
  }, [revision, logout]);
  useEffect(() => {
    const onStorage = event => { if (event.key === 'thaifood.token') retrySession(); };
    window.addEventListener('thaifood:unauthorized', logout);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('thaifood:unauthorized', logout);
      window.removeEventListener('storage', onStorage);
    };
  }, [logout, retrySession]);
  const login = useCallback(async body => {
    const result = await authService.login(body);
    generation.current += 1;
    setToken(result.token);
    setMember(result.member);
    setSessionError(null);
    setLoading(false);
    return result.member;
  }, []);
  const register = useCallback(body => authService.register(body), []);
  const updateProfile = useCallback(async body => {
    const current = generation.current;
    const result = await authService.updateProfile(body);
    if (current === generation.current) setMember(result);
    return result;
  }, []);
  const value = useMemo(() => ({ member, loading, sessionError, retrySession, login, logout, register, updateProfile }),
    [member, loading, sessionError, retrySession, login, logout, register, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}
