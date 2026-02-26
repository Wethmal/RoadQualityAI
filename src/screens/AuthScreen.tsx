import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { loginUser, registerUser } from '../services/authService';
import { User } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    if (mode === 'register') {
      if (!name.trim()) return setError('Name is required');
      if (password !== confirmPassword) return setError('Passwords do not match');
    }

    if (!email.trim() || !password.trim()) return setError('Email and password required');

    setLoading(true);
    try {
      const user =
        mode === 'register'
          ? await registerUser(name, email, password)
          : await loginUser(email, password);
      onAuthSuccess(user);
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Logo */}
        <Text style={styles.logo}>🛣️ SafeRouteAI</Text>
        <Text style={styles.tagline}>Drive Smart. Stay Safe.</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['login', 'register'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, mode === tab && styles.activeTab]}
              onPress={() => { setMode(tab); setError(''); }}
            >
              <Text style={[styles.tabText, mode === tab && styles.activeTabText]}>
                {tab === 'login' ? 'Login' : 'Register'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inputs */}
        <View style={styles.form}>
          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? 'Login' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { fontSize: 32, fontWeight: '800', color: '#f8fafc', textAlign: 'center' },
  tagline: { color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 32 },
  tabs: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 10, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#1a56db' },
  tabText: { color: '#64748b', fontWeight: '600' },
  activeTabText: { color: '#ffffff' },
  form: { gap: 12 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  error: { color: '#ef4444', textAlign: 'center', fontSize: 13 },
  primaryButton: {
    backgroundColor: '#1a56db',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});