import fs from 'fs';

const BASE_URL = 'https://ajjs1ajjs.github.io/Sales/';
const SITEMAP_PATH = 'public/sitemap.xml';

function generateSitemap() {
  // Single URL: crawlers ignore the #fragment, so a #/history entry would be
  // a dead listing (the app is one hash-routed page).
  const urlMeta: [string, string, string][] = [
    [BASE_URL, 'hourly', '1.0'],
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlMeta
  .map(
    ([url, freq, prio]) => `  <url>
    <loc>${escapeXml(url)}</loc>
    <changefreq>${freq}</changefreq>
    <priority>${prio}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8');
  console.log(`Sitemap generated with ${urlMeta.length} URLs at ${SITEMAP_PATH}`);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

generateSitemap();
