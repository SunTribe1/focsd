// Every English term the AI elements show or announce, registered under `ai.*` keys. A
// translation adds a table with the same keys: registerTranslation({ $code: 'de', 'ai.send': … }).
import { registerTranslation } from '@focsd/primitives/utils';

export const terms = {
  $code: 'en',

  // Thread and messages
  'ai.conversation': 'Conversation',
  'ai.jumpToLatest': 'Jump to latest',
  'ai.you': 'You',
  'ai.assistant': 'Assistant',
  'ai.system': 'System',
  'ai.tool': 'Tool',
  /** @param {string} author @param {string} time */
  'ai.messageLabel': (author, time) => (time ? `${author}, ${time}` : author),
  /** @param {string} text */
  'ai.assistantReplied': (text) => `Assistant replied: ${text}`,
  'ai.assistantRepliedWithoutText': 'Assistant replied without text.',
  'ai.messageContinues': 'Message continues in the conversation.',
  'ai.responseStopped': 'Response stopped',
  'ai.errorTooLong': 'The response was too long and was stopped.',
  'ai.errorTooLarge': 'The response was too large and was stopped.',
  'ai.errorNetwork': 'The response could not be loaded.',
  /** @param {string} status */
  'ai.errorHttp': (status) => `The server returned an error: ${status}.`,

  // Streaming text and code
  'ai.copyCode': 'Copy code',
  'ai.code': 'Code',
  /** @param {string} language */
  'ai.codeLanguage': (language) => `${language} code`,

  // Tool calls and reasoning
  /** @param {string} name @param {string} status */
  'ai.toolCall': (name, status) => `${name}, ${status}`,
  'ai.toolRunning': 'running',
  'ai.toolDone': 'done',
  'ai.toolError': 'failed',
  'ai.toolInput': 'Input',
  'ai.toolOutput': 'Output',
  'ai.reasoning': 'Reasoning',
  'ai.reasoningStreaming': 'Reasoning…',

  // Message actions and sources
  'ai.messageActions': 'Message actions',
  'ai.copy': 'Copy',
  'ai.retry': 'Retry',
  'ai.goodResponse': 'Good response',
  'ai.badResponse': 'Bad response',
  'ai.feedbackUp': 'Marked as a good response',
  'ai.feedbackDown': 'Marked as a bad response',
  'ai.feedbackCleared': 'Feedback removed',
  'ai.sources': 'Sources',
  /** @param {number} index @param {string} title */
  'ai.sourceLabel': (index, title) => `[${index}] ${title}`,

  // Composer, attachments and suggestions
  'ai.message': 'Message',
  'ai.send': 'Send',
  'ai.stop': 'Stop',
  'ai.attach': 'Attach files',
  'ai.attachments': 'Attachments',
  'ai.dropFiles': 'Drop files to attach',
  /** @param {string} name */
  'ai.removeFile': (name) => `Remove ${name}`,
  /** @param {string} name @param {string} reason */
  'ai.fileRejected': (name, reason) => `${name} was not attached: ${reason}`,
  'ai.fileTooLarge': 'the file is too large',
  'ai.fileWrongType': 'this file type is not accepted',
  /** @param {number} max */
  'ai.tooManyFiles': (max) => `at most ${max} files can be attached`,
  'ai.uploading': 'Uploading',
  'ai.uploadFailed': 'Upload failed',
  'ai.suggestions': 'Suggestions',

  // File changes
  'ai.fileChanges': 'Review changes',
  /** @param {number} n */
  'ai.fileCount': (n) => (n === 1 ? '1 file' : `${n} files`),
  /** @param {number} add @param {number} del */
  'ai.fileTotals': (add, del) => `${add} lines added, ${del} removed`,
  /** @param {string} path @param {string} status @param {number} add @param {number} del */
  'ai.fileChange': (path, status, add, del) => `${path}, ${status}, ${add} lines added, ${del} removed`,
  'ai.fileAdded': 'added',
  'ai.fileModified': 'modified',
  'ai.fileDeleted': 'deleted',
  'ai.fileRenamed': 'renamed',
};

registerTranslation(terms);
