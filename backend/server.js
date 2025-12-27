/**
 * Google Scholar Notifications Backend
 * 
 * This server handles:
 * 1. Google OAuth authentication
 * 2. Google Scholar profile scraping
 * 3. Citation and publication data retrieval
 */

const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const cheerio = require('cheerio');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json());

// Store user sessions (use Redis/DB in production)
const userSessions = new Map();

/**
 * Verify Google ID Token
 */
async function verifyGoogleToken(idToken) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Scrape Google Scholar profile by user ID or email
 */
async function scrapeScholarProfile(scholarId) {
  try {
    const url = `https://scholar.google.com/citations?user=${scholarId}&hl=en`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // Extract profile information
    const name = $('#gsc_prf_in').text().trim();
    const affiliation = $('.gsc_prf_il').first().text().trim();
    const profileImage = $('#gsc_prf_pup-img').attr('src');
    const interests = [];
    $('#gsc_prf_int a').each((i, el) => {
      interests.push($(el).text().trim());
    });

    // Extract citation metrics
    const citationStats = {};
    $('#gsc_rsb_st tbody tr').each((i, row) => {
      const cells = $(row).find('td');
      const label = $(cells[0]).text().trim().toLowerCase();
      const all = $(cells[1]).text().trim();
      const since = $(cells[2]).text().trim();
      
      if (label.includes('citations')) {
        citationStats.totalCitations = parseInt(all) || 0;
        citationStats.citationsSince = parseInt(since) || 0;
      } else if (label.includes('h-index')) {
        citationStats.hIndex = parseInt(all) || 0;
        citationStats.hIndexSince = parseInt(since) || 0;
      } else if (label.includes('i10-index')) {
        citationStats.i10Index = parseInt(all) || 0;
        citationStats.i10IndexSince = parseInt(since) || 0;
      }
    });

    // Extract citation history (graph data)
    const citationHistory = [];
    $('#gsc_rsb_cit .gsc_md_hist_b .gsc_g_a').each((i, el) => {
      const year = $(el).attr('href')?.match(/as_ylo=(\d+)/)?.[1];
      const count = parseInt($(el).find('.gsc_g_al').text()) || 0;
      if (year) {
        citationHistory.push({ year: parseInt(year), citations: count });
      }
    });

    // Extract publications
    const publications = [];
    $('#gsc_a_b .gsc_a_tr').each((i, row) => {
      const titleEl = $(row).find('.gsc_a_at');
      const title = titleEl.text().trim();
      const link = 'https://scholar.google.com' + titleEl.attr('href');
      const authors = $(row).find('.gs_gray').first().text().trim();
      const venue = $(row).find('.gs_gray').eq(1).text().trim();
      const citations = parseInt($(row).find('.gsc_a_ac').text()) || 0;
      const year = $(row).find('.gsc_a_y span').text().trim();

      if (title) {
        publications.push({
          title,
          link,
          authors,
          venue,
          citations,
          year,
        });
      }
    });

    // Extract co-authors
    const coAuthors = [];
    $('#gsc_rsb_co .gsc_rsb_a').each((i, el) => {
      const name = $(el).find('.gsc_rsb_a_desc a').text().trim();
      const affiliation = $(el).find('.gsc_rsb_a_ext').text().trim();
      const image = $(el).find('img').attr('src');
      const link = $(el).find('.gsc_rsb_a_desc a').attr('href');
      
      if (name) {
        coAuthors.push({
          name,
          affiliation,
          image: image?.startsWith('http') ? image : `https://scholar.google.com${image}`,
          link: link ? `https://scholar.google.com${link}` : null,
        });
      }
    });

    return {
      success: true,
      profile: {
        name,
        affiliation,
        profileImage: profileImage?.startsWith('http') ? profileImage : `https://scholar.google.com${profileImage}`,
        interests,
        scholarId,
        profileUrl: url,
      },
      stats: citationStats,
      citationHistory: citationHistory.sort((a, b) => a.year - b.year),
      publications: publications.slice(0, 20), // Top 20 publications
      coAuthors: coAuthors.slice(0, 10),
    };
  } catch (error) {
    console.error('Scholar scraping failed:', error.message);
    return {
      success: false,
      error: 'Failed to fetch Google Scholar data. Please check your Scholar ID.',
    };
  }
}

/**
 * Search for Scholar profile by name/email
 */
async function searchScholarProfile(query) {
  try {
    const searchUrl = `https://scholar.google.com/citations?view_op=search_authors&mauthors=${encodeURIComponent(query)}&hl=en`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const profiles = [];

    $('.gsc_1usr').each((i, el) => {
      const name = $(el).find('.gs_ai_name a').text().trim();
      const link = $(el).find('.gs_ai_name a').attr('href');
      const scholarId = link?.match(/user=([^&]+)/)?.[1];
      const affiliation = $(el).find('.gs_ai_aff').text().trim();
      const email = $(el).find('.gs_ai_eml').text().trim();
      const citations = $(el).find('.gs_ai_cby').text().replace('Cited by ', '').trim();
      const image = $(el).find('.gs_ai_pho img').attr('src');

      if (scholarId) {
        profiles.push({
          name,
          scholarId,
          affiliation,
          email,
          citations: parseInt(citations) || 0,
          image: image?.startsWith('http') ? image : `https://scholar.google.com${image}`,
        });
      }
    });

    return { success: true, profiles };
  } catch (error) {
    console.error('Scholar search failed:', error.message);
    return { success: false, profiles: [], error: error.message };
  }
}

// ============ API Routes ============

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Google OAuth login
 */
app.post('/api/auth/google', async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ error: 'ID token required' });
  }

  const payload = await verifyGoogleToken(idToken);
  
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    scholarId: null, // User needs to link their Scholar profile
  };

  // Store session
  userSessions.set(payload.sub, user);

  res.json({
    success: true,
    user,
  });
});

/**
 * Search for Scholar profiles
 */
app.get('/api/scholar/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  const results = await searchScholarProfile(query);
  res.json(results);
});

/**
 * Get Scholar profile data
 */
app.get('/api/scholar/profile/:scholarId', async (req, res) => {
  const { scholarId } = req.params;
  
  if (!scholarId) {
    return res.status(400).json({ error: 'Scholar ID required' });
  }

  const data = await scrapeScholarProfile(scholarId);
  res.json(data);
});

/**
 * Link Scholar profile to user account
 */
app.post('/api/user/link-scholar', async (req, res) => {
  const { userId, scholarId } = req.body;
  
  if (!userId || !scholarId) {
    return res.status(400).json({ error: 'User ID and Scholar ID required' });
  }

  const user = userSessions.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.scholarId = scholarId;
  userSessions.set(userId, user);

  res.json({ success: true, user });
});

/**
 * Get user's linked Scholar data
 */
app.get('/api/user/:userId/scholar', async (req, res) => {
  const { userId } = req.params;
  
  const user = userSessions.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.scholarId) {
    return res.status(400).json({ error: 'No Scholar profile linked' });
  }

  const data = await scrapeScholarProfile(user.scholarId);
  res.json(data);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Google Scholar API ready`);
});
