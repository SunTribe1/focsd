import { FloatingPanel, Select, Switch } from '@focsd/react';

export const ok = (
  <>
    <Select label="Region" value="eu" onChange={(event) => void event} />
    <Switch checked onChange={() => {}} />
    <FloatingPanel label="Notes" onClose={() => {}} />
  </>
);
// @ts-expect-error: not a property of focsd-switch
export const bad = <Switch notAProp />;

import { DatePicker } from '@focsd/react/date-picker';
export const single = <DatePicker label="When" onChange={() => {}} />;
