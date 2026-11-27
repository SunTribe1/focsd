import './base.js';
import * as focsd from '@focsd-dev/components';
import { icons as lucideIcons } from 'lucide';
import { fas } from '@fortawesome/free-solid-svg-icons';

const { registerIconLibrary, fromLucide, fromFontAwesome } = focsd;

registerIconLibrary('lucide', { resolve: fromLucide(lucideIcons) });

registerIconLibrary('fa', { resolve: fromFontAwesome(fas) });

registerIconLibrary('remote', { resolve: (name) => `/icons/${name}.svg` });

registerIconLibrary('sprite', { resolve: (name) => `/icons/sprite.svg#${name}` });

// Tests drive the registry from here.
window.focsd = focsd;
