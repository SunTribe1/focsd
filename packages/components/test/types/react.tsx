import type {} from '@focsd/components/react';

export const ok = (
  <focsd-button variant="action" disabled>
    Save
  </focsd-button>
);
export const field = <focsd-text-field label="Email" required hint="We never share it" />;
// @ts-expect-error: unknown attribute on a Focsd element
export const bad = <focsd-button notAProp="x" />;
