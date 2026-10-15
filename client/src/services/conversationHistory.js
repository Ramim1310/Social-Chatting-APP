const storageKey = (userId) => `nexus:conversations:${userId}`;

export function getRecentConversations(userId) {
  if (!userId) return [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(saved)
      ? saved.filter(item => item && typeof item.room === 'string' && item.room && typeof item.name === 'string').slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

export function rememberConversation(userId, room, name) {
  const recent = [
    { room, name, openedAt: new Date().toISOString() },
    ...getRecentConversations(userId).filter(item => item.room !== room),
  ].slice(0, 6);
  try { localStorage.setItem(storageKey(userId), JSON.stringify(recent)); }
  catch { /* Keep chatting if browser storage is full or unavailable. */ }
  return recent;
}

export function getLandingTab(userId) {
  return getRecentConversations(userId).length ? 'chats' : 'home';
}
