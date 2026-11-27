// @focsd-dev/ai entry: defines the chat elements and exports the controller, transports and markdown helpers.
import './terms.js';

export { terms } from './terms.js';

export * from './markdown/index.js';

export * from './chat/index.js';

export { FocsdAttachmentTile } from './attachment-tile.js';

export { FocsdChatMessage } from './chat-message.js';

export { FocsdChatThread } from './chat-thread.js';

export { FocsdComposer } from './composer.js';

export { FocsdFileChanges } from './file-changes.js';

export { FocsdMessageActions } from './message-actions.js';

export { FocsdPromptSuggestions } from './prompt-suggestions.js';

export { FocsdReasoning } from './reasoning.js';

export { FocsdSourceChip } from './source-chip.js';

export { FocsdStreamingText } from './streaming-text.js';

export { FocsdToolCall } from './tool-call.js';

/**
 * @typedef {import('./attachment-tile.js').AttachmentRemoveDetail} AttachmentRemoveDetail
 * @typedef {import('./attachment-tile.js').AttachmentStatus} AttachmentStatus
 * @typedef {import('./composer.js').ComposerSubmitDetail} ComposerSubmitDetail
 * @typedef {import('./file-changes.js').FileChange} FileChange
 * @typedef {import('./file-changes.js').FileSelectDetail} FileSelectDetail
 * @typedef {import('./message-actions.js').FeedbackDetail} FeedbackDetail
 * @typedef {import('./message-actions.js').FeedbackValue} FeedbackValue
 * @typedef {import('./message-actions.js').RetryDetail} RetryDetail
 * @typedef {import('./prompt-suggestions.js').SuggestionSelectDetail} SuggestionSelectDetail
 * @typedef {import('./tool-call.js').ToolStatus} ToolStatus
 */
