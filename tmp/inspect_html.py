import urllib.request

req = urllib.request.Request(
    'https://www.iplt20.com/news',
    headers={'User-Agent': 'Mozilla/5.0'}
)
with urllib.request.urlopen(req, timeout=30) as r:
    html = r.read().decode('utf-8', errors='ignore')
print(html[:4000])
print('---FOUND---')
for term in ['<article', 'class="news', 'window.', 'JSON.parse', 'script', 'data-']:
    print(term, term in html)
