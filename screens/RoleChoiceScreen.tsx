import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function RoleChoiceScreen({ navigation }: any) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Continue as</Text>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => alert('Farm registration flow coming soon!')}
      >
        <Text style={styles.primaryText}>Farm Owner</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('Farmhouses')}
      >
        <Text style={styles.secondaryText}>Customer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' },
  title: { fontSize: 24, fontWeight: '700', color: '#000000', marginBottom: 24 },
  primaryBtn: { backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  primaryText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  secondaryBtn: { backgroundColor: '#ffffff', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  secondaryText: { color: '#000000', fontWeight: '600', fontSize: 16 },
});
