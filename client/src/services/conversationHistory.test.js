import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getLandingTab, getRecentConversations, rememberConversation } from './conversationHistory.js';

const stored = new Map();
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: key => stored.delete(key),
};
beforeEach(() => stored.clear());

test('new accounts land on Home, including browsers with legacy Public Square state', () => {
  localStorage.setItem('activeRoom', 'global_forum');
  assert.equal(getLandingTab(1), 'home');
  assert.deepEqual(getRecentConversations(1), []);
});

test('conversation history survives logout and remains separate for each account', () => {
  rememberConversation(1, '1-2', 'Alex');
  localStorage.setItem('user', '{}');
  localStorage.setItem('token', 'test');
  for (const key of ['user', 'token', 'activeRoom', 'activeChatName']) localStorage.removeItem(key);
  assert.equal(getLandingTab(1), 'chats');
  assert.equal(getRecentConversations(1)[0].room, '1-2');
  assert.equal(getLandingTab(2), 'home');
  rememberConversation(2, 'global_forum', 'Public Square');
  assert.equal(getRecentConversations(1)[0].name, 'Alex');
});

test('reopening a chat moves it to the front without duplicates and limits history', () => {
  for (let i = 0; i < 8; i++) rememberConversation(1, `group-${i}`, `Group ${i}`);
  const recent = rememberConversation(1, 'group-4', 'Renamed group');
  assert.equal(recent.length, 6);
  assert.equal(recent[0].name, 'Renamed group');
  assert.equal(recent.filter(item => item.room === 'group-4').length, 1);
  assert.equal(recent.some(item => item.room === 'group-0'), false);
});

test('corrupt or invalid saved history falls back to Home', () => {
  for (const value of ['broken json', '{}', 'null', '[null, {"room": 1}, {"room":"","name":"Empty"}]']) {
    localStorage.setItem('nexus:conversations:1', value);
    assert.equal(getLandingTab(1), 'home');
  }
});
