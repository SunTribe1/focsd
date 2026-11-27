import actions from './actions.js';
import forms from './forms.js';
import inputs from './inputs.js';
import overlays from './overlays.js';
import navigation from './navigation.js';
import data from './data.js';
import display from './display.js';
import ai from './ai.js';
import charts from './charts.js';

/**
 * @typedef {{ id: string, title: string, summary: string, html: string, script?: string, frame?: boolean,
 *   a11y: string[], keyboard?: [string, string][] }} MoreExample A further example on the same page
 *   (an opt-in mode), shown under its own heading with its own notes.
 * @typedef {{ summary: string, html: string, script?: string, frame?: boolean,
 *   props?: { name: string, type: string, description: string }[],
 *   methods?: { name: string, description: string }[],
 *   a11y: string[], keyboard?: [string, string][], more?: MoreExample[] }} Example
 * @type {Record<string, Example>}
 */
export const examples = { ...actions, ...forms, ...inputs, ...overlays, ...navigation, ...data, ...display, ...ai, ...charts };
