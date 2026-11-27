import { css, html, nothing } from 'lit';
import { FocsdElement } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './terms.js';

/**
 * @typedef {'added' | 'modified' | 'deleted' | 'renamed'} FileChangeStatus
 * @typedef {object} FileChange
 * @property {string} path The file's path; the last segment is shown in full, the folders muted.
 * @property {FileChangeStatus} [status] Default `modified`.
 * @property {number} [additions] Lines added.
 * @property {number} [deletions] Lines removed.
 * @typedef {{ path: string, file: FileChange }} FileSelectDetail
 */

/**
 * Letter, tone and spoken word (a localize key) of each status, as version control shows them.
 * @type {Readonly<Record<FileChangeStatus, { letter: string, tone: import('@focsd-dev/primitives').Tone, term: string }>>}
 */
const STATUS = Object.freeze({
  added: { letter: 'A', tone: 'positive', term: 'ai.fileAdded' },
  modified: { letter: 'M', tone: 'caution', term: 'ai.fileModified' },
  deleted: { letter: 'D', tone: 'critical', term: 'ai.fileDeleted' },
  renamed: { letter: 'R', tone: 'info', term: 'ai.fileRenamed' },
});

/** Blocks in the change bar. */
const BLOCKS = 5;

/** @param {unknown} n */
const count = (n) => Math.max(0, Math.trunc(Number(n)) || 0);

/**
 * The change bar: BLOCKS squares, green for the share of added lines, red for removed ones.
 * @param {number} add
 * @param {number} del
 */
function changeBar(add, del) {
  const total = add + del;

  if (!total) return html`<span part="bar" aria-hidden="true"></span>`;
  const added = Math.round((BLOCKS * add) / total);

  return html`<span part="bar" aria-hidden="true"
    >${Array.from({ length: BLOCKS }, (_, i) => html`<span part="block ${i < added ? 'block-added' : 'block-deleted'}"></span>`)}</span
  >`;
}

/**
 * File changes: the files an agent (or a commit) changed, each with its status (added, modified,
 * deleted, renamed), its path and its added and removed line counts, plus totals. Pick a file to
 * review it: the list is a set of buttons with arrow-key movement, and fires `focsd-file-select`.
 *
 * Each button is named in full ("src/lib/runs.ts, modified, 24 lines added, 9 removed"), so the
 * letters, colors and bar are decoration.
 *
 * @fires {CustomEvent<FileSelectDetail>} focsd-file-select - A file was chosen. `detail` has `path` and `file`.
 * @csspart header - The title and totals row.
 * @csspart title - The title.
 * @csspart count - The number of files.
 * @csspart totals - The total added and removed lines.
 * @csspart list - The list of files.
 * @csspart file - A file's button; also `selected` on the chosen one.
 * @csspart status - A file's status letter.
 * @csspart path - A file's path; `dir` is the folders, `name` the file name.
 * @csspart added - A count of added lines.
 * @csspart deleted - A count of removed lines.
 * @csspart bar - A file's change bar; `block`, `block-added`, `block-deleted` are its squares.
 */
export class FocsdFileChanges extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host {
        --_added: var(--focsd-positive);
        --_deleted: var(--focsd-critical);
        display: block;
        padding: var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
        font-size: var(--focsd-text-small-size);
      }
      [part~='header'] {
        display: flex;
        align-items: baseline;
        gap: var(--focsd-space-2);
        padding: var(--focsd-space-1) var(--focsd-space-2) var(--focsd-space-2);
      }
      [part~='title'] {
        margin: 0;
        font-size: var(--focsd-text-body-size);
        font-weight: var(--focsd-text-subheading-weight);
      }
      [part~='count'] {
        color: var(--focsd-ink-muted);
      }
      [part~='totals'] {
        margin-inline-start: auto;
      }
      [part~='totals'],
      [part~='file'] {
        font-family: var(--focsd-font-mono);
        font-variant-numeric: tabular-nums;
      }
      [part~='added'] {
        color: var(--_added);
      }
      [part~='deleted'] {
        color: var(--_deleted);
      }
      [part~='list'] {
        display: grid;
        gap: 2px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      [part~='file'] {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        align-items: center;
        gap: var(--focsd-space-3);
        inline-size: 100%;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-2);
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink);
        font-size: inherit;
        text-align: start;
        cursor: pointer;
      }
      /* An ink tint lifts the row in both light and dark themes. */
      [part~='file']:hover,
      [part~='selected'] {
        background: color-mix(in oklab, var(--focsd-ink) 8%, transparent);
      }
      [part~='status'] {
        display: inline-grid;
        place-items: center;
        inline-size: 1.4em;
        block-size: 1.4em;
        border: var(--focsd-border-width) solid var(--_tone);
        border-radius: var(--focsd-radius-tag);
        background: color-mix(in oklab, var(--_tone) 16%, transparent);
        /* A fifth of the way toward the ink, for 4.5:1 on the tinted fill in every preset. */
        color: color-mix(in oklab, var(--_tone) 80%, var(--focsd-ink));
        font-weight: var(--focsd-text-label-weight);
      }
      [data-tone='positive'] { --_tone: var(--focsd-positive); }
      [data-tone='caution'] { --_tone: var(--focsd-caution); }
      [data-tone='critical'] { --_tone: var(--focsd-critical); }
      [data-tone='info'] { --_tone: var(--focsd-info, var(--focsd-route)); }
      [part~='path'] {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        /* Cut long paths at the start so the file name stays: rtl moves the ellipsis to the start; a
           path is always left-to-right text, so it stays left-aligned. */
        direction: rtl;
        text-align: left; /* physical: a path is always left-to-right text, even on right-to-left pages */
      }
      [part~='path'] > bdi {
        direction: ltr;
      }
      [part~='dir'] {
        color: var(--focsd-ink-muted);
      }
      [part~='counts'] {
        display: inline-flex;
        gap: var(--focsd-space-1);
        white-space: nowrap;
      }
      [part~='bar'] {
        display: inline-flex;
        gap: 2px;
        min-inline-size: calc(5 * 0.6em + 8px);
      }
      [part~='block'] {
        inline-size: 0.6em;
        block-size: 0.6em;
        border-radius: 2px;
      }
      [part~='block-added'] { background: var(--_added); }
      [part~='block-deleted'] { background: var(--_deleted); }
      @media (forced-colors: active) {
        [part~='status'] { border-color: CanvasText; color: CanvasText; background: none; }
        [part~='block'] { forced-color-adjust: none; background: CanvasText; }
        [part~='block-deleted'] { background: GrayText; }
        [part~='selected'] { outline: 2px solid Highlight; }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    files: { type: Array },
    selected: { reflect: true },
    heading: {},
  };

  constructor() {
    super();
    /** @type {FileChange[]} The changed files: `{ path, status?, additions?, deletions? }`, as JSON in the attribute or an array in JS. */
    this.files = [];
    /** The path of the chosen file. */
    this.selected = '';
    /** The title; defaults to "Review changes" in the page's language. */
    this.heading = '';
  }

  /**
   * The files as given (JSON or JS, so any shape): each parsed to a path string; entries without a
   * path are dropped.
   * @returns {FileChange[]}
   */
  get #files() {
    return (Array.isArray(this.files) ? this.files : []).flatMap((f) => {
      const path = String(f?.path ?? '');

      return path ? [{ ...f, path }] : [];
    });
  }

  /** @param {FileChange} file */
  #choose(file) {
    this.selected = file.path;
    /** @type {FileSelectDetail} */
    const detail = { path: file.path, file };

    this.dispatchEvent(new CustomEvent('focsd-file-select', { detail, bubbles: true }));
  }

  /** Up and Down (and Home and End) move between files. @param {KeyboardEvent} event */
  #onKeyDown(event) {
    const buttons = [...this.renderRoot.querySelectorAll('button')];
    // The listener is on the list inside the shadow root, so the target is the focused file button.
    const at = event.target instanceof HTMLButtonElement ? buttons.indexOf(event.target) : -1;
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: buttons.length - 1 }[event.key];

    if (to === undefined || at < 0) return;
    event.preventDefault();
    buttons[Math.min(Math.max(to, 0), buttons.length - 1)]?.focus();
  }

  /** @param {FileChange} file @param {number} index @param {boolean} hasSelected whether `selected` names one of the files */
  #renderFile(file, index, hasSelected) {
    const status = STATUS[file.status ?? 'modified'] ?? STATUS.modified;
    const add = count(file.additions);
    const del = count(file.deletions);
    const cut = file.path.lastIndexOf('/') + 1;
    const selected = file.path === this.selected;
    const word = this.localize.term(status.term);
    // One file is in the tab order: the chosen one, or the first when none (or a stale path) is chosen.
    const roving = hasSelected ? selected : index === 0;

    return html`<li>
      <button
        part="file ${selected ? 'selected' : ''}"
        type="button"
        aria-current=${selected ? 'true' : nothing}
        aria-label=${this.localize.term('ai.fileChange', file.path, word, add, del)}
        tabindex=${roving ? '0' : '-1'}
        @click=${() => this.#choose(file)}
      >
        <span part="status" data-tone=${status.tone} aria-hidden="true">${status.letter}</span>
        <span part="path" aria-hidden="true"
          ><bdi><span part="dir">${file.path.slice(0, cut)}</span><span part="name">${file.path.slice(cut)}</span></bdi></span
        >
        <span part="counts" aria-hidden="true"><span part="added">+${add}</span><span part="deleted">−${del}</span></span>
        ${changeBar(add, del)}
      </button>
    </li>`;
  }

  /** @override */
  render() {
    const files = this.#files;
    const add = files.reduce((sum, f) => sum + count(f.additions), 0);
    const del = files.reduce((sum, f) => sum + count(f.deletions), 0);
    const hasSelected = files.some((f) => f.path === this.selected);

    return html`<div part="header">
        <h3 part="title">${this.heading || this.localize.term('ai.fileChanges')}</h3>
        <span part="count">${this.localize.term('ai.fileCount', files.length)}</span>
        <span part="totals"
          ><span part="added" aria-hidden="true">+${add}</span> <span part="deleted" aria-hidden="true">−${del}</span
          ><span class="focsd-visually-hidden">${this.localize.term('ai.fileTotals', add, del)}</span></span
        >
      </div>
      ${
        files.length
          ? html`<ul part="list" @keydown=${this.#onKeyDown}>${files.map((f, i) => this.#renderFile(f, i, hasSelected))}</ul>`
          : nothing
      }`;
  }
}

defineElement('focsd-file-changes', FocsdFileChanges);
