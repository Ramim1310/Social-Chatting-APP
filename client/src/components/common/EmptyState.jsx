const states = {
  search: { icon: 'travel_explore', title: 'Your people are out there.', description: 'Search for a familiar face or make a new connection. A good conversation starts with a hello.' },
  requests: { icon: 'person_add', title: 'Good company starts here.', description: 'Review your friend requests and make room for your next great conversation.' },
  noChat: { icon: 'chat_bubble', title: 'A little hello. A lot of possibilities.', description: 'Pick a friend, gather your group, or drop into Public Square. Your next conversation is just a click away.' },
};
export default function EmptyState({ type = 'noChat' }) {
  const state = states[type] || states.noChat;
  return <div className="h-full flex items-center justify-center p-8 text-center"><div className="max-w-sm animate-fade-in"><div className="empty-illustration"><span aria-hidden="true" className="material-symbols-outlined">{state.icon}</span></div><p className="eyebrow mb-4">Stay a little. Say hello.</p><h2 className="font-display font-extrabold text-2xl tracking-tight mb-4">{state.title}</h2><p className="text-sm leading-relaxed text-[var(--color-on-surface-variant)]">{state.description}</p><div aria-hidden="true" className="flex justify-center gap-2 mt-6"><span className="w-2 h-2 rounded-full bg-[var(--color-primary)]/40"/><span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]/40"/><span className="w-2 h-2 rounded-full bg-[var(--color-primary-container)]/50"/></div></div></div>;
}
