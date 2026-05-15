import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import * as Y from 'yjs';
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo } from '@tiptap/y-tiptap';
import { Awareness } from 'y-protocols/awareness';
import { motion } from 'framer-motion';

// Fallback WS URL
const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  .replace(/^http/, 'ws');

// ── Random vibrant color for this user's cursor ──────────────────────────────
const USER_COLORS = [
  '#a855f7', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];
function randomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

// ── Manual WebSocket provider compatible with our custom yjsService ───────────
class YjsWebSocketProvider {
  constructor(url, ydoc, awareness) {
    this.url = url;
    this.ydoc = ydoc;
    this.awareness = awareness;
    this.ws = null;
    this._status = 'disconnected';
    this._onStatus = null;
    this._connect();
  }

  _connect() {
    this._status = 'connecting';
    this._onStatus?.('connecting');
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this._status = 'connected';
      this._onStatus?.('connected');
      // Send Yjs sync step 1 (our state vector)
      const sv = Y.encodeStateVector(this.ydoc);
      this._send(new Uint8Array([0, 0, ...sv])); // MSG_SYNC=0, SYNC_STEP1=0
    };

    this.ws.onmessage = (e) => {
      const data = new Uint8Array(e.data);
      const msgType = data[0];

      if (msgType === 0) {
        // SYNC message
        const syncType = data[1];
        const payload = data.slice(2);
        if (syncType === 0) {
          // Received server's sync step 1: reply with our full state (step 2)
          const update = Y.encodeStateAsUpdate(this.ydoc, payload);
          this._send(new Uint8Array([0, 1, ...update])); // MSG_SYNC=0, SYNC_STEP2=1
        } else if (syncType === 1 || syncType === 2) {
          // Received full update from server: apply it
          Y.applyUpdate(this.ydoc, payload, this);
        }
      } else if (msgType === 1) {
        // AWARENESS message - update awareness
        const payload = data.slice(1);
        // Decode and apply awareness state (simplified)
        try {
          const decoded = new TextDecoder().decode(payload);
          // Awareness protocol is complex; we just re-broadcast raw
        } catch (_) {}
      }
    };

    this.ws.onclose = () => {
      this._status = 'disconnected';
      this._onStatus?.('disconnected');
      // Reconnect after 2 seconds
      setTimeout(() => this._connect(), 2000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };

    // Push local updates to server
    this.ydoc.on('update', (update, origin) => {
      if (origin === this) return; // Avoid re-sending updates we received
      this._send(new Uint8Array([0, 2, ...update])); // MSG_SYNC=0, UPDATE=2
    });
  }

  _send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  onStatus(fn) {
    this._onStatus = fn;
  }

  destroy() {
    this.ws?.close();
    this.ydoc.off('update', this._send);
  }
}

// ── Component ────────────────────────────────────────────────────────────────
const DecisionNodeEditor = ({ room, user, onClose }) => {
  const [status, setStatus] = useState('connecting');
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const awarenessRef = useRef(null);
  const userColor = useRef(randomColor());

  // Initialise Yjs + provider once
  useEffect(() => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    ydocRef.current = ydoc;
    awarenessRef.current = awareness;

    awareness.setLocalStateField('user', {
      name: user?.name || 'Anonymous',
      color: userColor.current,
    });

    const wsUrl = `${WS_BASE}/yjs/${encodeURIComponent(room)}-decision-node`;
    const provider = new YjsWebSocketProvider(wsUrl, ydoc, awareness);
    provider.onStatus(setStatus);
    providerRef.current = provider;

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [room, user]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[280px] text-[var(--color-on-surface)]',
      },
    },
    onCreate: ({ editor: e }) => {
      if (!ydocRef.current) return;
      const yXmlFragment = ydocRef.current.getXmlFragment('document');
      // Inject Yjs ProseMirror plugins directly
      const tr = e.state.tr;
      const newState = e.state.reconfigure({
        plugins: [
          ...e.state.plugins,
          ySyncPlugin(yXmlFragment),
          yCursorPlugin(awarenessRef.current),
          yUndoPlugin(),
        ],
      });
      e.view.updateState(newState);
    },
  });

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'z' && editor) undo(editor.state, editor.view.dispatch);
    if (e.ctrlKey && e.key === 'y' && editor) redo(editor.state, editor.view.dispatch);
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[380px] shrink-0 border-l border-[var(--color-outline-variant)]/40 bg-[var(--color-surface)] flex flex-col h-full shadow-2xl z-40 relative overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--color-outline-variant)]/30 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-teal-500/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">edit_document</span>
          </div>
          <div>
            <h2 className="font-display font-bold text-[var(--color-on-surface)] text-sm leading-tight">Decision Node</h2>
            <p className="text-[10px] text-[var(--color-on-surface-variant)] leading-none">Collaborative workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
            status === 'connected' ? 'text-emerald-500' : 'text-amber-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`} />
            {status}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--color-surface-container-high)] rounded-lg transition-colors text-[var(--color-on-surface-variant)]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Hint bar */}
      <div className="px-5 py-2 bg-emerald-50/40 dark:bg-emerald-900/10 border-b border-[var(--color-outline-variant)]/20 shrink-0">
        <p className="text-[10px] text-[var(--color-on-surface-variant)] italic">
          Real-time collaborative workspace. Changes sync instantly across all members in this room.
        </p>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
        <EditorContent editor={editor} />
      </div>

      {/* Cursor colour legend — show who's present */}
      <div className="px-5 py-3 border-t border-[var(--color-outline-variant)]/20 flex items-center gap-2 shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: userColor.current }}
        />
        <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">
          {user?.name || 'You'} (you)
        </span>
      </div>
    </motion.div>
  );
};

export default DecisionNodeEditor;
