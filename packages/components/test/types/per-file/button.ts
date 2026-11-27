// Importing one component file (not the package index) still types its tag.
import '@focsd-dev/components/focsd-button.js';
import type { FocsdButton } from '@focsd-dev/components/focsd-button.js';

const button: FocsdButton = document.createElement('focsd-button');
button.variant = 'action';
void button;
