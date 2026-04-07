import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs/promises';

const NEWS_API = 'https://www.iplt20.com/newslistshow?page=1';
const NEWS_BASE = 'https://www.iplt20.com';

export function guessTag(text) {
  const t = text.toLowerCase();
  if (t.includes('transfer') || t.includes('auction') || t.includes('sign') || t.includes('retain')) return 'transfer';
  if (t.includes('ipl') || t.includes('indian premier') || t.includes('matchday') || t.includes('schedule')) return 'ipl';
  if (t.includes('vs') || t.includes('beat') || t.includes('won') || t.includes('match') || t.includes('wicket') || t.includes('runs')) return 'match';
  return 'player';
}

export function guessCategory(text) {
  return guessTag(text);
}

function parseNewsHtml(html) {
  const $ = load(html);
  const items = [];
  const seen = new Set();
  const anchors = $('a[onclick*="click_tile"], a[href^="/news/"], a[href^="https://www.iplt20.com/news/"]');

  anchors.each((_, element) => {
    const el = $(element);
    const link = (el.attr('href') || '').trim();
    if (!link || link.startsWith('javascript:') || link.includes('wa.me') || link.includes('facebook.com') || link.includes('twitter.com')) return;
    if (!link.startsWith('/news/') && !link.startsWith('https://www.iplt20.com/news/')) return;

    const title = (el.attr('data-title') || el.find('.textTwoLine').text() || el.find('.latest-slider-main-bottom-white .textTwoLine').text() || el.text()).trim();
    if (!title || title.length < 8) return;

    const resolvedLink = link.startsWith('/') ? new URL(link, NEWS_BASE).href : link;
    const date = (el.find('.type-date-time span').first().text().trim() || '').replace(/\s+/g, ' ').trim();
    const description = el.attr('data-title') || el.find('p, .description, .summary').first().text().trim() || title;
    const key = `${resolvedLink}`;
    if (seen.has(key)) return;
    seen.add(key);

    items.push({
      title,
      description,
      link: resolvedLink,
      date: date || new Date().toISOString().split('T')[0],
      source: 'IPLT20 Official',
      tag: guessTag(`${title} ${description}`),
      category: guessCategory(`${title} ${description}`)
    });
  });

  return items;
}

export async function scrapeNews() {
  const response = await axios.get(NEWS_API, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Accept: 'application/json'
    },
    timeout: 20000
  });

  const payload = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  if (!payload || !payload.status || !payload.news_data) {
    throw new Error('Official IPL news endpoint did not return valid data.');
  }

  const items = parseNewsHtml(payload.news_data);
  if (!items.length) {
    throw new Error('No news items were found in the official IPL news payload.');
  }

  return items.slice(0, 15);
}

export async function saveNewsJson(filename = 'news_feed.json') {
  const news = await scrapeNews();
  await fs.writeFile(filename, JSON.stringify(news, null, 2), 'utf8');
  return news;
}

if (process.argv.includes('--write')) {
  saveNewsJson().then(news => {
    console.log(`Saved ${news.length} news items to news_feed.json`);
  }).catch(error => {
    console.error('Scrape failed:', error.message);
    process.exit(1);
  });
}
