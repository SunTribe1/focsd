import { describe, expect, it } from 'vitest';
import { termFor } from '../src/internal/localize.js';

/** @param {string} key @param {...unknown} args */
const term = (key, ...args) => termFor('en', key, ...args);

describe('wave 21 terms (scaffold 21.0)', () => {
  it('segmented control', () => {
    expect(term('segmentedControl')).toBe('Options');
  });

  it('lightbox', () => {
    expect(term('lightbox')).toBe('Image viewer');
    expect(term('lightboxCounter', 3, 8)).toBe('Image 3 of 8');
    expect(term('previousImage')).toBe('Previous image');
    expect(term('nextImage')).toBe('Next image');
    expect(term('closeViewer')).toBe('Close image viewer');
  });

  it('image compare', () => {
    expect(term('imageCompare')).toBe('Compare images');
    expect(term('comparePosition', 60)).toBe('60% before image');
  });

  it('signature pad', () => {
    expect(term('signatureSigned', 'Signature')).toBe('Signature, signed');
    expect(term('signatureEmpty', 'Signature')).toBe('Signature, empty');
    expect(term('signatureTypeInstead')).toBe('Type instead');
    expect(term('signatureDrawInstead')).toBe('Draw instead');
    expect(term('signatureTypedLabel', 'Signature')).toBe('Type your name for Signature');
  });

  it('bottom navigation', () => {
    expect(term('bottomNav')).toBe('Main');
    expect(term('bottomNavBadge', 'Inbox', '3')).toBe('Inbox, 3 new');
  });

  it('notification center', () => {
    expect(term('notifications')).toBe('Notifications');
    expect(term('notificationsUnread', 3)).toBe('Notifications, 3 unread');
    expect(term('notificationsUnread', 3, 'Alerts')).toBe('Alerts, 3 unread');
    expect(term('notificationUnread')).toBe('Unread');
    expect(term('markAllRead')).toBe('Mark all as read');
    expect(term('dismissNotificationNamed', 'Build done')).toBe('Dismiss Build done');
    expect(term('notificationsEmpty')).toBe("You're all caught up");
    expect(term('notificationsNew', 2)).toBe('2 new notifications');
  });
});
