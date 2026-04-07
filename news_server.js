import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeNews } from './scrape_news.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get('/api/news', async (req, res) => {
  try {
    const news = await scrapeNews();
    res.json({ source: 'iplt20.com', fetchedAt: new Date().toISOString(), news });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch IPL news' });
  }
});

app.listen(PORT, () => {
  console.log(`IPL news scraper API listening at http://localhost:${PORT}/api/news`);
  console.log(`Serve static files from ${__dirname}`);
});
