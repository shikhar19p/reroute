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
import { ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Image */}
      <ImageBackground
        source={require('../assets/farmhouse-bg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']}
          style={styles.gradient}
        >
          {/* Top Section - 60% */}
          <View style={styles.topSection}>
            <View style={styles.headerContainer}>
              <Text style={styles.welcomeText}>REROUTE ADVENTURES</Text>
              <Text style={styles.premierText}>PREMIER ESCAPES</Text>
            </View>
          </View>

          {/* Bottom Section - 40% */}
          <View style={styles.bottomSection}>
            <View style={styles.contentCard}>
              <Text style={styles.tagline}>Find your perfect retreat.</Text>
              
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.9}
              >
                <Text style={styles.exploreButtonText}>Explore Unique Stays</Text>
                <ChevronRight size={20} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.signInText}>
                  Already have or account? <Text style={styles.signInLink}>Sign in</Text>
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
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1.5, // 60% of screen
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  headerContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: 'Seasons-Regular',
    fontSize: 26,
    fontWeight: '400',
    color: '#D4AF37',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  premierText: {
    fontFamily: 'Seasons-Light',
    fontSize: 13,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomSection: {
    flex: 1, // 40% of screen
    justifyContent: 'flex-end',
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  tagline: {
    fontFamily: 'Seasons-Regular',
    fontSize: 20,
    fontWeight: '400',
    color: '#000',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  exploreButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exploreButtonText: {
    //fontFamily: 'Seasons-Regular',
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 6,
    letterSpacing: 0.5,
  },

  signInText: {
    //fontFamily: 'Seasons-Light',
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  signInLink: {
    //fontFamily: 'Seasons-Regular',
    color: '#D4AF37',
    fontWeight: '500',
  },
});