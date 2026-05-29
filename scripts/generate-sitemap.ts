import fs from 'fs';

const BASE_URL = 'https://ajjs1ajjs.github.io/Sales/';
const SITEMAP_PATH = 'public/sitemap.xml';

function generateSitemap() {
  const urls: string[] = [
    BASE_URL,
  ];

  const uniqueUrls = [...new Set(urls)];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls
  .map(
    (url, i) => `  <url>
    <loc>${escapeXml(url)}</loc>
    <changefreq>${i === 0 ? 'hourly' : 'daily'}</changefreq>
    <priority>${i === 0 ? '1.0' : '0.5'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8');
  console.log(`Sitemap generated with ${uniqueUrls.length} URLs at ${SITEMAP_PATH}`);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

generateSitemap();
