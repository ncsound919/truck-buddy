import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { loadDispatchSession, signInForDispatch, signOutDispatch } from '@/services/dispatch-session';

/**
 * Email/password sign-in for live dispatch sending. Live sending needs a real
 * user JWT — the anonymous key is only accepted when the function is
 * explicitly relaxed for local development.
 */
export function SignInForDispatch() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void loadDispatchSession().then((s) => {
      if (active && s) setSignedInAs(s.email);
    });
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await signInForDispatch(email.trim(), password);
      setSignedInAs(s.email);
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    void signOutDispatch();
    setSignedInAs(null);
  };

  if (signedInAs) {
    return (
      <View style={styles.box}>
        <Text style={styles.ok}>Signed in as {signedInAs}. Live sending will use this session.</Text>
        <Pressable onPress={signOut} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.hint}>Sign in with your Truck Buddy account to enable live sending.</Text>
      <TextInput
        style={styles.input}
        placeholder="you@carrier.com"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
      />
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <Pressable onPress={submit} disabled={busy || !email || !password} style={[styles.button, busy && styles.buttonBusy]}>
        <Text style={styles.buttonText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 8, gap: 8 },
  hint: { color: '#94a3b8', fontSize: 12 },
  ok: { color: '#4ade80', fontSize: 12 },
  error: { color: '#f87171', fontSize: 12 },
  input: {
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#e2e8f0',
  },
  button: {
    borderRadius: 8,
    backgroundColor: Brand.accent,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: '#0f172a', fontWeight: '600', fontSize: 13 },
});
