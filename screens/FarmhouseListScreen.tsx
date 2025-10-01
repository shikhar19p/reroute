import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useAuth } from '../authContext';

const { width } = Dimensions.get('window');

const farmhouses = [
  {
    id: 1,
    name: 'Green Valley Farm',
    location: 'Lonavala, Maharashtra',
    price: '₹8,000/night',
    rating: '4.8',
    image: '🌳',
    description: 'Peaceful retreat with valley views',
  },
  {
    id: 2,
    name: 'Sunset Villa',
    location: 'Alibaug, Maharashtra',
    price: '₹12,000/night',
    rating: '4.9',
    image: '🌅',
    description: 'Beachside luxury farmhouse',
  },
  {
    id: 3,
    name: 'Mountain Paradise',
    location: 'Karjat, Maharashtra',
    price: '₹6,500/night',
    rating: '4.7',
    image: '⛰️',
    description: 'Surrounded by lush mountains',
  },
  {
    id: 4,
    name: 'Lake View Cottage',
    location: 'Pawna, Maharashtra',
    price: '₹9,000/night',
    rating: '4.6',
    image: '🏞️',
    description: 'Lakeside tranquility',
  },
  {
    id: 5,
    name: 'Heritage Farmhouse',
    location: 'Nashik, Maharashtra',
    price: '₹10,500/night',
    rating: '4.8',
    image: '🏛️',
    description: 'Traditional farm experience',
  },
];

export default function FarmhouseListScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Find Farmhouses</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.email?.split('@')[0]}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {farmhouses.map((farmhouse) => (
          <View key={farmhouse.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.imageContainer}>
                <Text style={styles.image}>{farmhouse.image}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.farmhouseName}>{farmhouse.name}</Text>
                <Text style={styles.location}>📍 {farmhouse.location}</Text>
                <Text style={styles.description}>{farmhouse.description}</Text>
              </View>
            </View>
            
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.price}>{farmhouse.price}</Text>
                <Text style={styles.rating}>⭐ {farmhouse.rating}</Text>
              </View>
              <TouchableOpacity style={styles.bookButton}>
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>More farmhouses coming soon!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  imageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  image: {
    fontSize: 40,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  farmhouseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    color: '#999',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  rating: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 14,
  },
});
