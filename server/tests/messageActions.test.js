const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/config/db');
const prisma = { message: {}, user: {} };
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: prisma };
const { editMessage, deleteMessage, sendMessage } = require('../src/controllers/messageController');
let events;
beforeEach(() => { events = []; prisma.message = {}; prisma.user = {}; });

function request(userId = 1, body = {}, messageId = '10') {
  return { user: { userId }, body, params: { messageId }, app: { get: key => key === 'io' ? { to: room => ({ emit: (event, data) => events.push({ room, event, data }) }) } : undefined } };
}
function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, sendStatus(code) { this.code = code; return this; } };
}

test('only a message owner can persist an edit and broadcast its saved content', async () => {
  prisma.message.findUnique = async () => ({ id: 10, senderId: 1, room: 'global_forum' });
  prisma.message.update = async args => ({ id: 10, room: 'global_forum', content: args.data.content });
  const res = response();
  await editMessage(request(1, { content: '  Updated hello  ' }), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.content, 'Updated hello');
  assert.equal(events[0].event, 'message_updated');
  assert.equal(events[0].room, 'global_forum');
});

test('another user cannot edit or delete someone else’s message', async () => {
  prisma.message.findUnique = async () => ({ id: 10, senderId: 1, room: 'global_forum' });
  for (const handler of [editMessage, deleteMessage]) {
    const res = response();
    await handler(request(2, { content: 'An unauthorized edit' }), res);
    assert.equal(res.code, 403);
  }
  assert.equal(events.length, 0);
});

test('a deletion removes the saved message before broadcasting', async () => {
  let deleted = false;
  prisma.message.findUnique = async () => ({ id: 10, senderId: 1, room: '1-2' });
  prisma.message.delete = async ({ where }) => { assert.equal(where.id, 10); deleted = true; };
  const res = response();
  await deleteMessage(request(), res);
  assert.equal(res.code, 204);
  assert.equal(deleted, true);
  assert.deepEqual(events[0], { room: '1-2', event: 'message_deleted', data: { id: 10, room: '1-2' } });
});

test('empty edits and invalid message IDs are rejected without touching storage', async () => {
  for (const [content, id] of [['   ', '10'], ['hello', 'invalid']]) {
    const res = response();
    await editMessage(request(1, { content }, id), res);
    assert.equal(res.code, 400);
  }
});

test('sending uses the signed-in account instead of a supplied sender ID', async () => {
  prisma.user.findUnique = async ({ where }) => { assert.equal(where.id, 1); return { id: 1 }; };
  prisma.message.create = async ({ data }) => { assert.equal(data.senderId, 1); assert.equal(data.content, 'Hello'); return { ...data, id: 12 }; };
  const res = response();
  await sendMessage(request(1, { content: ' Hello ', room: 'global_forum', senderId: 999 }), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.senderId, 1);
});
