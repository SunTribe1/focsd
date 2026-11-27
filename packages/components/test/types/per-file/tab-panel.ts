// One module per element (B11): a part's own module types its tag, and so does its parent's.
import '@focsd/components/focsd-tab-panel.js';
import type { FocsdTabPanel } from '@focsd/components/focsd-tab-panel.js';
import type { FocsdTabs } from '@focsd/components/focsd-tabs.js';

const panel: FocsdTabPanel = document.createElement('focsd-tab-panel');
const tabs: FocsdTabs = document.createElement('focsd-tabs');
void panel;
void tabs;
