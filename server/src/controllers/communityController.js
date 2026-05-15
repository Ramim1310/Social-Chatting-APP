const prisma = require('../config/db');

// In-memory likes cache
const postLikes = new Map();

const getPosts = async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
            include: {
                author: { select: { name: true, image: true } },
                community: true,
                comments: {
                    include: { author: { select: { name: true, image: true } } },
                    orderBy: { createdAt: 'asc' }
                },
                aiInsight: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch posts" });
    }
};

const createPost = async (req, res) => {
    const { title, content, communityName } = req.body;

    if (!title || !content || !communityName) {
        return res.status(400).json({ error: "Title, content, and communityName are required" });
    }

    try {
        let community = await prisma.community.findUnique({ where: { name: communityName } });

        if (!community) {
            community = await prisma.community.create({
                data: {
                    name: communityName,
                    description: `The ${communityName} community`,
                    creatorId: req.user.userId || req.user.id
                }
            });
        }

        const post = await prisma.post.create({
            data: {
                title,
                content,
                authorId: req.user.userId || req.user.id,
                communityId: community.id
            }
        });

        res.json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create post" });
    }
};

const createComment = async (req, res) => {
    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!content) return res.status(400).json({ error: "Content is required" });

    try {
        const comment = await prisma.threaded_Comment.create({
            data: {
                content,
                authorId: req.user.userId || req.user.id,
                postId: parseInt(postId),
                ...(parentId ? { parentId: parseInt(parentId) } : {})
            },
            include: { author: { select: { name: true, image: true } } }
        });
        res.json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add comment" });
    }
};

const togglePostLike = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId;
    const key = parseInt(postId);
    if (!postLikes.has(key)) postLikes.set(key, new Set());
    const likers = postLikes.get(key);
    const liked = likers.has(userId);
    if (liked) likers.delete(userId); else likers.add(userId);
    res.json({ liked: !liked, count: likers.size });
};

const getPostLikes = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId;
    const likers = postLikes.get(parseInt(postId)) || new Set();
    res.json({ liked: likers.has(userId), count: likers.size });
};

const getLiveNews = async (req, res) => {
    const { extended } = req.query;
    try {
        const since = extended === 'true'
            ? new Date(Date.now() - 3 * 60 * 60 * 1000)
            : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const news = await prisma.newsArticle.findMany({
            where: { pubDate: { gte: since } },
            orderBy: { pubDate: 'desc' },
            take: extended === 'true' ? 50 : 20
        });
        res.json(news);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch news" });
    }
};

const getCategoryNews = async (req, res) => {
    const { category } = req.params;
    try {
        const news = await prisma.newsArticle.findMany({
            where: { category },
            orderBy: { pubDate: 'desc' },
            take: 20
        });
        res.json(news);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch news" });
    }
};

module.exports = {
    getPosts, createPost, createComment, togglePostLike, getPostLikes,
    getLiveNews, getCategoryNews
};
