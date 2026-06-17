const prisma = require('./src/config/db');

async function main() {
  const extended = 'false'; // default behavior
  const since = extended === 'true'
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 3 * 60 * 60 * 1000);
  console.log("Current Date.now():", new Date());
  console.log("Query 'since':", since);

  const totalCount = await prisma.newsArticle.count();
  const news = await prisma.newsArticle.findMany({
      where: { pubDate: { gte: since } },
      orderBy: { pubDate: 'desc' },
      take: extended === 'true' ? 50 : 20
  });
  console.log("Total articles in DB:", totalCount);
  console.log("Query returned news count:", news.length);
  if (news.length > 0) {
    console.log("News item sample:", news[0]);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
