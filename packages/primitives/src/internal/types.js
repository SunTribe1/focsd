/**
 * Shared JSDoc types (quality Q9). Type-only: nothing here runs. The manifest plugin
 * (custom-elements-manifest.config.mjs) writes each one out as its union, so the API docs and
 * editor data still list the values.
 */

/** @typedef {'neutral' | 'info' | 'positive' | 'caution' | 'critical'} Tone The status color of alerts, badges, tags and timeline markers. */
/** @typedef {'top' | 'bottom' | 'left' | 'right'} Placement The side of a target a panel opens on. */
/** @typedef {'top' | 'bottom'} BlockPlacement A side above or below the target (tooltips, popovers, hover cards). */

export {};
