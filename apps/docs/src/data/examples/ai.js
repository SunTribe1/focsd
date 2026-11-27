/** Examples and accessibility notes: the AI chat elements (`@focsd-dev/ai`). */
const NOW = 'Date.now()';

export default {
  'chat-thread': {
    summary: 'A conversation as a feed of messages that follows new text only while the reader is at the bottom.',
    html: `<focsd-chat-thread id="thread-demo" label="Conversation"></focsd-chat-thread>`,
    script: `const thread = document.getElementById('thread-demo');
thread.style.setProperty('--focsd-chat-thread-height', '18rem');
thread.messages = [
  { id: 'u1', role: 'user', status: 'done', createdAt: ${NOW} - 60000, parts: [{ type: 'text', text: 'How is a reply announced?' }] },
  { id: 'a1', role: 'assistant', status: 'done', createdAt: ${NOW}, parts: [{ type: 'text', text: 'Once, when it is **complete**. Never token by token.' }] },
];`,
    a11y: [
      'The thread is `role="feed"` named by `label` (default "Conversation"; until the first message it is a named group, because a feed must hold articles); each message is an `article` with `aria-posinset` and `aria-setsize`, and the one that is streaming has `aria-busy="true"`.',
      'There is no live region on the feed. When a reply finishes, the thread announces "Assistant replied:" and its text once, politely, cut at the last word before 300 characters. A stopped reply says "Response stopped"; a failed one says the error, assertively. History set all at once is silent.',
      'It follows new content only while the reader is at the bottom. Scrolled up, a "Jump to latest" button appears; it scrolls down and moves focus to the latest message.',
      'The feed is one tab stop (the last focused message, at first the latest). Page Down and Page Up move between messages; Ctrl+Home and Ctrl+End leave the feed, as the APG feed pattern describes.',
      'Give it a chat controller with `thread.chat = createChat({ transport })` and it shows and follows the controller; retry calls `chat.retry(id)` unless a listener cancels `focsd-retry`.',
    ],
    keyboard: [
      ['Page Down', 'Focus the next message'],
      ['Page Up', 'Focus the previous message'],
      ['Ctrl+Home', 'Focus the element before the feed'],
      ['Ctrl+End', 'Focus the element after the feed'],
      ['Tab', 'Leave the feed'],
    ],
  },
  'chat-message': {
    summary: 'One message as an article, named by its author and time, with its parts in order.',
    html: `<focsd-chat-message id="message-demo"></focsd-chat-message>`,
    script: `document.getElementById('message-demo').message = {
  id: 'a1',
  role: 'assistant',
  status: 'done',
  createdAt: ${NOW},
  parts: [
    { type: 'reasoning', text: 'The docs answer this, so search them first.' },
    { type: 'tool-call', id: 'c1', name: 'search_docs', input: { query: 'feed' }, status: 'done', output: { hits: 1 } },
    { type: 'text', text: 'A feed announces **one** reply at a time.' },
    { type: 'source', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/feed/', title: 'Feed pattern' },
  ],
};`,
    a11y: [
      'An `article` named "You, 9:05 AM" or "Assistant, 9:05 AM" (author and time). The parts render in order: text, reasoning, tool calls, sources and files.',
      'User text is shown as plain text; assistant text is markdown (see streaming text).',
      'A failed reply shows its error in the message. A stopped one notes "Response stopped". An assistant reply that is done shows its message actions.',
      'Retry and feedback from the actions are passed on as `focsd-retry` and `focsd-feedback`.',
    ],
  },
  'streaming-text': {
    summary: 'Markdown that grows while a reply streams. Raw HTML stays text, and links keep only safe schemes.',
    html: `<focsd-streaming-text id="text-demo" streaming></focsd-streaming-text>`,
    script: `document.getElementById('text-demo').text = 'Markdown is **built as it arrives**:\\n\\n- lists and \`inline code\`\\n- [links](https://focsd.dev) that are safe to follow\\n- <b>raw HTML</b> shown as text\\n\\n\`\`\`js\\nawait chat.send("Hello");\\n\`\`\`';`,
    a11y: [
      'The text is built with DOM calls only (never `innerHTML`), so it runs under a strict Content Security Policy with Trusted Types. Raw HTML, images and tables are shown as text.',
      'Links keep `https:`, `http:`, `mailto:` and relative URLs only (`javascript:`, `data:` and the rest become text) and get `rel="noopener noreferrer nofollow"`.',
      'Only the last block is rebuilt on each update, so a selection or focus inside finished blocks survives while text streams.',
      'The caret is hidden from assistive technology and stops pulsing under reduced motion. Each code block shows its language and has its own copy button. A code block that scrolls sideways is a named region in the tab order, so it scrolls by keyboard; one that fits adds no tab stop.',
      'Headings inside a reply are rendered from level 3 down, never as `h1` or `h2`, so they sit under the page’s own headings.',
      'On the server the text renders as plain text with its line breaks, so there is content before the script loads.',
    ],
  },
  'tool-call': {
    summary: 'A disclosure for one tool call: its name and status, with its input and output as text.',
    html: `<focsd-tool-call id="tool-demo" name="search_docs" status="done"></focsd-tool-call>`,
    script: `const tool = document.getElementById('tool-demo');
tool.input = { query: 'feed pattern', limit: 2 };
tool.output = { hits: 2 };`,
    a11y: [
      'A disclosure button named "search_docs, done": the status is a word as well as an icon (running, done or failed), never color alone.',
      'Input and output are shown in `pre` blocks as text (`JSON.stringify`, never HTML), so they cannot inject markup. A block that scrolls is a region named "Input" or "Output" in the tab order; one that fits adds no tab stop.',
      'It fires the `toggle` event when it opens or closes, like `<details>`, and does not bubble.',
      'The running ring does not spin under reduced motion.',
    ],
    keyboard: [['Enter / Space', 'Open or close the input and output']],
  },
  reasoning: {
    summary: 'A collapsed disclosure for the model’s reasoning, closed by default and never announced.',
    html: `<focsd-reasoning text="The question needs the docs, so search them first."></focsd-reasoning>`,
    a11y: [
      'A disclosure button named "Reasoning", or "Reasoning…" while it streams. It is collapsed by default.',
      'Its text is plain text and is never announced as it arrives.',
      'It fires the `toggle` event when it opens or closes, like `<details>`, and does not bubble.',
    ],
    keyboard: [['Enter / Space', 'Open or close the reasoning']],
  },
  'prompt-suggestions': {
    summary: 'Up to four suggested prompts as a list of buttons.',
    html: `<focsd-prompt-suggestions id="suggest-demo" label="Try asking"></focsd-prompt-suggestions>`,
    script: `const suggestions = document.getElementById('suggest-demo');
suggestions.suggestions = ['Explain streaming markdown', 'Show a tool call', 'Write a long answer'];
suggestions.addEventListener('focsd-suggestion-select', (event) => console.log(event.detail.text));`,
    a11y: [
      'A list named by `label` (default "Suggestions") of real buttons. Each button is its own tab stop; arrow keys are not used.',
      'Choosing one fires `focsd-suggestion-select` with `detail.text`; sending it is up to your app (`chat.send(text)`).',
      'At most four are shown, and the list wraps on narrow screens. An empty list renders nothing.',
    ],
    keyboard: [
      ['Tab', 'Move between suggestions'],
      ['Enter / Space', 'Choose the suggestion'],
    ],
  },
  'message-actions': {
    summary: 'A toolbar for one reply: copy, retry and good or bad response.',
    html: `<focsd-message-actions for="demo" text="A feed announces one reply at a time."></focsd-message-actions>`,
    a11y: [
      'A `role="toolbar"` named "Message actions" with one tab stop; the arrow keys, Home and End move between the actions (mirrored in right-to-left text).',
      'Copy is `focsd-copy-button` and says "Copied". Retry fires `focsd-retry` with the message id.',
      'The thumbs are toggle buttons with `aria-pressed`; choosing one announces "Marked as a good response" or "Marked as a bad response", and taking it back announces "Feedback removed". It fires `focsd-feedback` with `value` of `up`, `down` or null.',
    ],
    keyboard: [
      ['Arrow Left / Right', 'Move between the actions'],
      ['Home / End', 'First / last action'],
      ['Enter / Space', 'Use the action'],
    ],
  },
  composer: {
    summary: 'The message field: a growing textarea with attach, send and stop, and a drop zone for files.',
    html: `<focsd-composer id="composer-demo" placeholder="Ask anything" accept="image/*,.pdf,.txt"></focsd-composer>`,
    script: `const composer = document.getElementById('composer-demo');
composer.addEventListener('focsd-submit', (event) => console.log(event.detail.text, event.detail.files));`,
    a11y: [
      'A native `<textarea>` named by `label` (default "Message"). It grows to eight lines. Enter sends; Shift+Enter adds a line. Nothing is sent while an input method (IME) composes, so choosing a candidate with Enter never sends.',
      'While `busy`, the send button becomes Stop in the same place and keeps focus, so Tab from the field reaches it. It fires `focsd-stop`. Enter does nothing while busy.',
      'Send, stop, attach and remove are at least 44 by 44 px. Send is `aria-disabled` rather than `disabled` when there is nothing to send, so it keeps focus.',
      'Files can be attached with the button, pasted or dropped on the composer (an outline and "Drop files to attach" show while dragging). A rejected file (type, size or count) is announced assertively with the reason and also shown as text next to the field.',
      '`focsd-submit` is cancelable: cancel it to keep the text and files. It sends the text as typed, with `files` as `File` objects.',
    ],
    keyboard: [
      ['Enter', 'Send (not while composing text with an input method)'],
      ['Shift + Enter', 'New line'],
      ['Tab', 'Move to send or stop'],
    ],
  },
  'attachment-tile': {
    summary: 'One attached file as a list item with its name, size and type icon.',
    html: `<div role="list" aria-label="Attachments">
  <focsd-attachment-tile name="report.pdf" size="204800" media-type="application/pdf" removable></focsd-attachment-tile>
</div>`,
    a11y: [
      'A list item (`role="listitem"`) with the file name, its size (for example "200 KB") and an icon for its type that is hidden from assistive technology. Place tiles in a `role="list"`.',
      'The remove button is named "Remove report.pdf" and is at least 44 by 44 px; it fires `focsd-attachment-remove` with `detail.name`. The tile does not remove itself.',
      '`status` is `ready`, `uploading` or `error`; uploading and failed uploads say so in words, not by color alone.',
    ],
    keyboard: [['Enter / Space (remove button)', 'Fire `focsd-attachment-remove`']],
  },
  'source-chip': {
    summary: 'A numbered link to a source, with the host name beside it.',
    html: `<focsd-source-chip href="https://www.w3.org/WAI/ARIA/apg/patterns/feed/" label="Feed pattern" index="1"></focsd-source-chip>`,
    a11y: [
      'A real link named "[1] Feed pattern", underlined, with the host name in muted text.',
      'Only `https:`, `http:`, `mailto:` and relative URLs become links. Any other scheme (`javascript:`, `data:`) is shown as text, not a link. Links get `rel="noopener noreferrer nofollow"` and never set `target`.',
    ],
    keyboard: [['Enter', 'Follow the link']],
  },
  'file-changes': {
    summary: 'The files an agent changed, with status, line counts and a change bar; pick one to review it.',
    html: `<focsd-file-changes selected="src/lib/runs.ts" style="max-inline-size: 34rem"
  files='[{"path":"src/lib/runs.ts","status":"modified","additions":24,"deletions":9},{"path":"src/app/runs/page.tsx","status":"modified","additions":4,"deletions":2},{"path":"src/app/runs/load-more.tsx","status":"added","additions":36,"deletions":0},{"path":"src/app/api/projects/[projectId]/runs/route.ts","status":"added","additions":11,"deletions":0},{"path":"src/app/runs/run-row.tsx","status":"renamed","additions":1,"deletions":0},{"path":"src/lib/legacy-runs-cache.ts","status":"deleted","additions":0,"deletions":12}]'></focsd-file-changes>`,
    a11y: [
      'Each file is a button named in full ("src/lib/runs.ts, modified, 24 lines added, 9 removed"); the status letter, colors, counts and bar are hidden from assistive technology, so nothing depends on color.',
      'The chosen file has `aria-current="true"`. One file is in the tab order (the chosen one, or the first); arrow keys move between files.',
      'Long paths are cut at the start, so the file name stays visible; the full path is in the name.',
      'Choosing a file fires `focsd-file-select` with `detail: { path, file }`.',
    ],
    keyboard: [
      ['Up / Down', 'Previous / next file'],
      ['Home / End', 'First / last file'],
      ['Enter / Space', 'Choose the file'],
    ],
  },
};
