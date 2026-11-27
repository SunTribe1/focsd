// The chat controller, transports and markdown helpers are typed from the package entry.
import { createChat, fetchSseTransport, parse, safeHref, scriptedTransport } from '@focsd/ai';
import type { Chat, Chunk, Message, Transport } from '@focsd/ai';

const transport: Transport = scriptedTransport(['Hello'], { delay: 0 });
const chat: Chat = createChat({ transport, onChange: (state) => void state.status });
const first: Message | undefined = chat.messages[0];
const chunk: Chunk = { type: 'text-delta', id: 't', delta: 'x' };
const sse: Transport = fetchSseTransport({ url: '/api/chat', body: (messages) => ({ messages }) });
const href: string | null = safeHref('https://focsd.dev');
const kind: string | undefined = parse('# Hi')[0]?.type;

void chat.send('hi', [{ name: 'a.txt', mediaType: 'text/plain', size: 1 }]);
void [first, chunk, sse, href, kind];
