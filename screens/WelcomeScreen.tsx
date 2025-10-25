import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Image */}
      <ImageBackground
        source={require('../assets/farmhouse-bg.jpg')} // You'll need to add this image
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)']}
          style={styles.gradient}
        >
          {/* Top Section */}
          <View style={styles.topSection}>
            <Text style={styles.welcomeText}>WELCOME TO REROUTE</Text>
            <Text style={styles.premierText}>PREMIER ESCAPES</Text>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <View style={styles.contentCard}>
              <Text style={styles.tagline}>Discover Your Perfect Escape</Text>
              <Text style={styles.subTagline}>Luxury farmhouses, unforgettable experiences</Text>
              
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.9}
              >
                <Text style={styles.exploreButtonText}>Explore Unique Stays</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.signInText}>
                  Already have an account? <Text style={styles.signInLink}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#D4AF37',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  premierText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomSection: {
    paddingBottom: 50,
    paddingHorizontal: 24,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subTagline: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  arrow: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
  },
  signInText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  signInLink: {
    color: '#D4AF37',
    fontWeight: '600',
  },
});
