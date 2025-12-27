import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

// Configuration - Replace with your values
const CONFIG = {
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  GOOGLE_IOS_CLIENT_ID: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  GOOGLE_ANDROID_CLIENT_ID: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  BACKEND_URL: 'http://localhost:3001', // Change to your deployed backend URL
};

// ============ COMPONENTS ============

const GradientBackground = ({ children }) => (
  <LinearGradient
    colors={['#0f0c29', '#302b63', '#24243e']}
    style={styles.gradient}
  >
    {children}
  </LinearGradient>
);

const StatCard = ({ icon, label, value, subValue, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statIconContainer}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value?.toLocaleString() || '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subValue && (
        <Text style={styles.statSubValue}>+{subValue} (5 years)</Text>
      )}
    </View>
  </View>
);

const PublicationCard = ({ publication, index }) => (
  <TouchableOpacity 
    style={styles.publicationCard}
    onPress={() => Linking.openURL(publication.link)}
    activeOpacity={0.7}
  >
    <View style={styles.publicationRank}>
      <Text style={styles.publicationRankText}>{index + 1}</Text>
    </View>
    <View style={styles.publicationContent}>
      <Text style={styles.publicationTitle} numberOfLines={2}>
        {publication.title}
      </Text>
      <Text style={styles.publicationAuthors} numberOfLines={1}>
        {publication.authors}
      </Text>
      <View style={styles.publicationMeta}>
        <Text style={styles.publicationVenue} numberOfLines={1}>
          {publication.venue || 'Unknown venue'}
        </Text>
        <View style={styles.citationBadge}>
          <Ionicons name="bookmark" size={12} color="#ffd700" />
          <Text style={styles.citationCount}>{publication.citations}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const CoAuthorCard = ({ coAuthor }) => (
  <TouchableOpacity 
    style={styles.coAuthorCard}
    onPress={() => coAuthor.link && Linking.openURL(coAuthor.link)}
    activeOpacity={0.7}
  >
    <Image
      source={{ uri: coAuthor.image || 'https://via.placeholder.com/60' }}
      style={styles.coAuthorImage}
    />
    <Text style={styles.coAuthorName} numberOfLines={1}>{coAuthor.name}</Text>
    <Text style={styles.coAuthorAffiliation} numberOfLines={2}>{coAuthor.affiliation}</Text>
  </TouchableOpacity>
);

const CitationGraph = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const maxCitations = Math.max(...data.map(d => d.citations));
  
  return (
    <View style={styles.graphContainer}>
      <Text style={styles.sectionTitle}>Citation History</Text>
      <View style={styles.graph}>
        {data.slice(-10).map((item, index) => (
          <View key={item.year} style={styles.graphBar}>
            <View 
              style={[
                styles.graphBarFill,
                { 
                  height: `${(item.citations / maxCitations) * 100}%`,
                  backgroundColor: `hsl(${200 + index * 10}, 70%, 60%)`,
                }
              ]}
            />
            <Text style={styles.graphLabel}>{item.year.toString().slice(-2)}</Text>
            <Text style={styles.graphValue}>{item.citations}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ SCREENS ============

const LoginScreen = ({ onLogin, loading }) => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: CONFIG.GOOGLE_CLIENT_ID,
    iosClientId: CONFIG.GOOGLE_IOS_CLIENT_ID,
    androidClientId: CONFIG.GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      onLogin(authentication);
    }
  }, [response]);

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <View style={styles.loginContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={60} color="#fff" />
          </View>
          <Text style={styles.appTitle}>Scholar Hub</Text>
          <Text style={styles.appSubtitle}>
            Track your academic impact
          </Text>
        </View>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="stats-chart" size={24} color="#4fc3f7" />
            <Text style={styles.featureText}>Citation metrics & h-index</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="documents" size={24} color="#81c784" />
            <Text style={styles.featureText}>Publication tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="notifications" size={24} color="#ffb74d" />
            <Text style={styles.featureText}>New citation alerts</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={() => promptAsync()}
          disabled={!request || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#333" />
          ) : (
            <>
              <Image
                source={{ uri: 'https://www.google.com/favicon.ico' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>
                Sign in with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          We only access your basic Google profile.{'\n'}
          Your Scholar data is fetched separately.
        </Text>
      </View>
    </GradientBackground>
  );
};

const ScholarLinkScreen = ({ user, onLink, loading }) => {
  const [scholarId, setScholarId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchScholar = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await fetch(
        `${CONFIG.BACKEND_URL}/api/scholar/search?query=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setSearchResults(data.profiles || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setSearching(false);
  };

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.linkContainer} contentContainerStyle={styles.linkContent}>
        <View style={styles.userHeader}>
          <Image source={{ uri: user.picture }} style={styles.userAvatar} />
          <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
        </View>

        <Text style={styles.linkTitle}>Link Your Google Scholar</Text>
        <Text style={styles.linkSubtitle}>
          Search for your profile or enter your Scholar ID directly
        </Text>

        {/* Search by name */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchScholar}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={searchScholar} style={styles.searchButton}>
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <Text style={styles.resultsTitle}>Found Profiles:</Text>
            {searchResults.map((profile) => (
              <TouchableOpacity
                key={profile.scholarId}
                style={styles.resultItem}
                onPress={() => onLink(profile.scholarId)}
              >
                <Image
                  source={{ uri: profile.image || 'https://via.placeholder.com/50' }}
                  style={styles.resultImage}
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{profile.name}</Text>
                  <Text style={styles.resultAffiliation}>{profile.affiliation}</Text>
                  <Text style={styles.resultCitations}>
                    {profile.citations.toLocaleString()} citations
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Direct ID entry */}
        <View style={styles.orDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.idLabel}>Enter Scholar ID directly:</Text>
        <View style={styles.idInputContainer}>
          <TextInput
            style={styles.idInput}
            placeholder="e.g., ABC123xyz"
            placeholderTextColor="#666"
            value={scholarId}
            onChangeText={setScholarId}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.linkButton, !scholarId && styles.linkButtonDisabled]}
            onPress={() => scholarId && onLink(scholarId)}
            disabled={!scholarId || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.linkButtonText}>Link</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.helpText}>
          Find your Scholar ID in your profile URL:{'\n'}
          scholar.google.com/citations?user=<Text style={styles.highlight}>YOUR_ID</Text>
        </Text>
      </ScrollView>
    </GradientBackground>
  );
};

const DashboardScreen = ({ user, scholarData, onRefresh, onLogout, loading }) => {
  const { profile, stats, citationHistory, publications, coAuthors } = scholarData || {};

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        style={styles.dashboard}
        contentContainerStyle={styles.dashboardContent}
        refreshing={loading}
        onRefresh={onRefresh}
      >
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: profile?.profileImage || user.picture }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || user.name}</Text>
            <Text style={styles.profileAffiliation}>{profile?.affiliation}</Text>
            <View style={styles.interestsContainer}>
              {profile?.interests?.slice(0, 3).map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="bookmark"
            label="Total Citations"
            value={stats?.totalCitations}
            subValue={stats?.citationsSince}
            color="#4fc3f7"
          />
          <StatCard
            icon="trending-up"
            label="h-index"
            value={stats?.hIndex}
            subValue={stats?.hIndexSince}
            color="#81c784"
          />
          <StatCard
            icon="star"
            label="i10-index"
            value={stats?.i10Index}
            subValue={stats?.i10IndexSince}
            color="#ffb74d"
          />
        </View>

        {/* Citation History Graph */}
        <CitationGraph data={citationHistory} />

        {/* Publications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Publications</Text>
          {publications?.map((pub, index) => (
            <PublicationCard key={index} publication={pub} index={index} />
          ))}
        </View>

        {/* Co-Authors */}
        {coAuthors && coAuthors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Co-Authors</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {coAuthors.map((coAuthor, index) => (
                <CoAuthorCard key={index} coAuthor={coAuthor} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Fetching your Scholar data...</Text>
        </View>
      )}
    </GradientBackground>
  );
};

// ============ MAIN APP ============

export default function App() {
  const [user, setUser] = useState(null);
  const [scholarId, setScholarId] = useState(null);
  const [scholarData, setScholarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState('login'); // login, link, dashboard

  const handleLogin = async (authentication) => {
    setLoading(true);
    try {
      // Get user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${authentication.accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      
      setUser({
        id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
      });
      
      setScreen('link');
    } catch (error) {
      console.error('Login failed:', error);
    }
    setLoading(false);
  };

  const handleLinkScholar = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/scholar/profile/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setScholarId(id);
        setScholarData(data);
        setScreen('dashboard');
      } else {
        alert(data.error || 'Failed to fetch Scholar profile');
      }
    } catch (error) {
      console.error('Link failed:', error);
      alert('Failed to connect to server. Make sure backend is running.');
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (!scholarId) return;
    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/scholar/profile/${scholarId}`);
      const data = await response.json();
      if (data.success) {
        setScholarData(data);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    setScholarId(null);
    setScholarData(null);
    setScreen('login');
  };

  switch (screen) {
    case 'login':
      return <LoginScreen onLogin={handleLogin} loading={loading} />;
    case 'link':
      return <ScholarLinkScreen user={user} onLink={handleLinkScholar} loading={loading} />;
    case 'dashboard':
      return (
        <DashboardScreen
          user={user}
          scholarData={scholarData}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
          loading={loading}
        />
      );
    default:
      return <LoginScreen onLogin={handleLogin} loading={loading} />;
  }
}

// ============ STYLES ============

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  
  // Login Screen
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  featureList: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  disclaimer: {
    marginTop: 30,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 18,
  },

  // Link Screen
  linkContainer: {
    flex: 1,
  },
  linkContent: {
    padding: 20,
    paddingTop: 60,
  },
  userHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 15,
  },
  linkTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  linkSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 25,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 15,
  },
  searchButton: {
    backgroundColor: '#4fc3f7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchResults: {
    marginBottom: 20,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 15,
  },
  resultName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultAffiliation: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  resultCitations: {
    color: '#4fc3f7',
    fontSize: 12,
    marginTop: 4,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  orText: {
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 15,
    fontSize: 14,
  },
  idLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  idInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
  },
  linkButton: {
    backgroundColor: '#81c784',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
  },
  linkButtonDisabled: {
    opacity: 0.5,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  highlight: {
    color: '#4fc3f7',
    fontWeight: '600',
  },

  // Dashboard
  dashboard: {
    flex: 1,
  },
  dashboardContent: {
    padding: 20,
    paddingTop: 50,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoutButton: {
    padding: 10,
  },
  refreshButton: {
    padding: 10,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#4fc3f7',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  profileAffiliation: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  interestTag: {
    backgroundColor: 'rgba(79,195,247,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginTop: 4,
  },
  interestText: {
    color: '#4fc3f7',
    fontSize: 11,
  },

  // Stats
  statsGrid: {
    marginBottom: 20,
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
    marginLeft: 15,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  statSubValue: {
    color: '#81c784',
    fontSize: 12,
    marginTop: 2,
  },

  // Citation Graph
  graphContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  graph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    marginTop: 15,
  },
  graphBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  graphBarFill: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  graphLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 5,
  },
  graphValue: {
    color: '#fff',
    fontSize: 9,
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },

  // Publications
  publicationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  publicationRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publicationRankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  publicationContent: {
    flex: 1,
    marginLeft: 12,
  },
  publicationTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  publicationAuthors: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  publicationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  publicationVenue: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  citationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  citationCount: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Co-Authors
  coAuthorCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 15,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  coAuthorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  coAuthorName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  coAuthorAffiliation: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },

  // Loading
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
  },

  bottomPadding: {
    height: 50,
  },
});
