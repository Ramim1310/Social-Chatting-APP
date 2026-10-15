import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import NexusLogo from './NexusLogo';

const cardClass = 'home-card rounded-2xl border border-[var(--color-outline-variant)]/25 bg-[var(--color-surface-container-lowest)]';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]';

export default function Home({ user, recentConversations, groups, onNavigate, onOpenConversation, onStartPrivateChat }) {
  const { data: requests = [], isPending, isError } = useQuery({
    queryKey: ['pendingRequests', user.id],
    queryFn: async () => (await api.get(`/api/users/friend-request/pending/${user.id}`)).data,
  });
  const friends = user.friends || [];
  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';

  return (
    <main className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto p-5 sm:p-8 lg:p-12 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-[var(--color-primary)] mb-2">A little more connected</p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Your corner of Nexus</h1>
          </div>
          <button onClick={() => onNavigate('settings')} aria-label="Open your profile settings" className="w-11 h-11 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-primary)] font-bold shrink-0 overflow-hidden">
            {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : firstName[0].toUpperCase()}
          </button>
        </header>

        <section className="home-hero relative overflow-hidden rounded-3xl bg-[var(--color-primary)] text-[var(--color-on-primary)] p-6 sm:p-9">
          <NexusLogo variant="watermark" className="absolute -right-6 -bottom-10 w-64 h-64 opacity-10 rotate-12 pointer-events-none text-white" />
          <div className="relative max-w-xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">{recentConversations.length ? 'Welcome back' : 'Welcome'}, {firstName}.</h2>
            <p className="text-sm sm:text-base opacity-90 leading-relaxed">{recentConversations.length ? 'Pick up a conversation, catch up with your community, or find someone new.' : 'Make yourself at home. Find your people, explore the Forum, or say hello in Public Square.'}</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => recentConversations[0] ? onOpenConversation(recentConversations[0]) : onNavigate('search')} className={`${buttonClass} bg-[var(--color-on-primary)] text-[var(--color-primary)] hover:opacity-90`}>
                <span aria-hidden="true" className="material-symbols-outlined text-xl">{recentConversations.length ? 'chat_bubble' : 'person_add'}</span>
                {recentConversations.length ? 'Continue chatting' : 'Find friends'}
              </button>
              <button onClick={() => onNavigate('community')} className={`${buttonClass} border border-current hover:bg-white/10`}>
                Explore Forum <span aria-hidden="true" className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
          <div className="space-y-6 min-w-0">
            <section className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="font-display text-lg font-bold">Recent conversations</h2>
                <button onClick={() => onNavigate('chats')} className="text-sm font-bold text-[var(--color-primary)] hover:underline">All messages</button>
              </div>
              {recentConversations.length ? (
                <ul className="space-y-1">
                  {recentConversations.map(conversation => (
                    <li key={conversation.room}>
                      <button onClick={() => onOpenConversation(conversation)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-[var(--color-surface-container-low)] transition-colors">
                        <span aria-hidden="true" className="material-symbols-outlined w-11 h-11 rounded-xl bg-[var(--color-surface-container-low)] text-[var(--color-primary)] flex items-center justify-center shrink-0">{conversation.room === 'global_forum' ? 'groups' : conversation.room.startsWith('group-') ? 'workspaces' : 'chat_bubble'}</span>
                        <span className="flex-1 min-w-0"><span className="block font-bold text-sm truncate">{conversation.name}</span><span className="block text-xs text-[var(--color-on-surface-variant)] mt-1">Open conversation</span></span>
                        <span aria-hidden="true" className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-xl">arrow_forward</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-7 text-center">
                  <span aria-hidden="true" className="material-symbols-outlined text-4xl text-[var(--color-primary)] mb-3">waving_hand</span>
                  <h3 className="font-bold mb-2">Your next conversation starts here</h3>
                  <p className="text-sm text-[var(--color-on-surface-variant)] max-w-sm mx-auto">Open a chat with a friend or join Public Square. Your recent conversations will appear here.</p>
                  <button onClick={() => onNavigate('chats')} className={`${buttonClass} mt-4 text-[var(--color-primary)] bg-[var(--color-surface-container-low)]`}>Browse messages</button>
                </div>
              )}
            </section>

            {friends.length > 0 && (
              <section className={`${cardClass} p-5 sm:p-6`}>
                <h2 className="font-display text-lg font-bold mb-4">Start a conversation</h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {friends.slice(0, 6).map(friend => (
                    <button key={friend.id} onClick={() => onStartPrivateChat(friend)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-container-low)] text-left min-w-0">
                      <span className="w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center font-bold shrink-0 overflow-hidden">{friend.image ? <img src={friend.image} alt="" className="w-full h-full object-cover" /> : friend.name?.[0]?.toUpperCase()}</span>
                      <span className="font-semibold text-sm truncate">{friend.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {groups.length > 0 && (
              <section className={`${cardClass} p-5 sm:p-6`}>
                <h2 className="font-display text-lg font-bold mb-4">Your groups</h2>
                <div className="flex flex-wrap gap-2">
                  {groups.map(group => <button key={group.id} onClick={() => onOpenConversation({ room: `group-${group.id}`, name: group.name })} className={`${buttonClass} max-w-full bg-[var(--color-surface-container-low)] text-[var(--color-primary)]`}><span aria-hidden="true" className="material-symbols-outlined text-xl">workspaces</span><span className="truncate">{group.name}</span></button>)}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className={`${cardClass} p-6`}>
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-[var(--color-secondary)] mb-4">groups</span>
              <h2 className="font-display text-lg font-bold mb-2">Public Square</h2>
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-5">An open conversation for everyone. Drop in whenever you feel like connecting.</p>
              <button onClick={() => onOpenConversation({ room: 'global_forum', name: 'Public Square' })} className={`${buttonClass} w-full bg-[var(--color-surface-container-low)] text-[var(--color-primary)]`}>Join the conversation</button>
            </section>
            <section className={`${cardClass} p-6`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-display text-lg font-bold">Friend requests</h2>
                {!isPending && !isError && <span className="rounded-full px-2.5 py-1 text-xs font-bold bg-[var(--color-surface-container-low)] text-[var(--color-primary)]">{requests.length}</span>}
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-4" role="status">{isPending ? 'Checking for requests...' : isError ? 'Requests are unavailable right now.' : requests.length ? `${requests[0].sender?.name || 'Someone'}${requests.length > 1 ? ` and ${requests.length - 1} more` : ''} would like to connect.` : 'You’re all caught up. Find friends to grow your circle.'}</p>
              <button onClick={() => onNavigate('requests')} className="text-sm font-bold text-[var(--color-primary)] hover:underline">View requests <span aria-hidden="true">→</span></button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
