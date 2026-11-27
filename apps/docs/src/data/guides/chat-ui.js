/** Live example for the chat UI guide (src/content/docs/guides/chat-ui.mdx). */

export const examples = [
  {
    id: 'scripted',
    title: 'A chat with no server',
    lead: 'The scripted transport replays canned replies, so this chat needs no server and no API key. Try a suggestion, press Stop while it types, or attach a file.',
    html: `<div class="stack">
  <focsd-chat-thread id="chat-demo-thread" label="Conversation"></focsd-chat-thread>
  <focsd-prompt-suggestions id="chat-demo-suggestions" label="Try asking"></focsd-prompt-suggestions>
  <focsd-composer id="chat-demo-composer" placeholder="Ask anything" accept="image/*,.pdf,.txt"></focsd-composer>
</div>`,
    script: `const reply = (messages) => {
  const said = messages.findLast((m) => m.role === 'user')?.parts.map((p) => p.text ?? '').join(' ') ?? '';

  if (/tool/i.test(said)) {
    return [
      { type: 'tool-call', id: 'call-1', name: 'search_docs', input: { query: 'server-sent events' } },
      { type: 'tool-result', id: 'call-1', output: { hits: 2 }, status: 'done' },
      { type: 'source', url: 'https://developer.mozilla.org/docs/Web/API/Server-sent_events', title: 'Server-sent events' },
      { type: 'text-delta', id: 'text', delta: 'I found **two** sources.' },
      { type: 'finish' },
    ];
  }

  return 'Replies are **markdown**, built as they stream:\\n\\n- one announcement when a reply is complete\\n- a Stop button that keeps focus\\n\\n\`\`\`js\\nawait chat.send("Hello");\\n\`\`\`';
};

const chat = createChat({ transport: scriptedTransport(reply, { delay: 30 }) });
const thread = document.getElementById('chat-demo-thread');
const suggestions = document.getElementById('chat-demo-suggestions');
const composer = document.getElementById('chat-demo-composer');

thread.style.setProperty('--focsd-chat-thread-height', '20rem');
thread.chat = chat;
suggestions.suggestions = ['Explain streaming markdown', 'Show a tool call'];
suggestions.addEventListener('focsd-suggestion-select', (event) => chat.send(event.detail.text));
composer.addEventListener('focsd-submit', ({ detail }) =>
  chat.send(detail.text, detail.files.map((f) => ({ name: f.name, mediaType: f.type, size: f.size }))),
);
composer.addEventListener('focsd-stop', () => chat.stop());
chat.subscribe(({ status }) => (composer.busy = status === 'streaming'));`,
    imports: [{ names: ['createChat', 'scriptedTransport'], from: '@focsd/ai' }],
  },
];
