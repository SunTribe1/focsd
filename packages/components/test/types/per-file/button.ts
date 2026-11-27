// Importing one component file (not the package index) still types its tag.
import '@focsd/components/focsd-button.js';
import type { FocsdButton } from '@focsd/components/focsd-button.js';

const button: FocsdButton = document.createElement('focsd-button');
button.variant = 'action';
void button;
