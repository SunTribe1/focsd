# @focsd-dev/react

React wrappers for every Focsd element, with typed props and React-style event handlers: `onChange`, `onInput`, and `onFocsd*` for custom events, with a typed `event.detail` (`<Menu onFocsdSelect={(event) => event.detail.value}>`).

```sh
npm install @focsd-dev/react @focsd-dev/tokens
```

```jsx
import { Select, Option } from '@focsd-dev/react';
// or one element per import path:
import { DatePicker } from '@focsd-dev/react/date-picker';

<Select label="Region" value="eu" onChange={(event) => setRegion(event.target.value)}>
  <Option value="eu">Europe</Option>
  <Option value="us">United States</Option>
</Select>;
```

The data grid, chart and rich-text editor wrappers live on their own paths only, and need their package installed (an optional peer dependency):

```jsx
import { DataGrid } from '@focsd-dev/react/data-grid'; // npm install @focsd-dev/data-grid
import { Chart } from '@focsd-dev/react/chart'; // npm install @focsd-dev/charts
import { RichText } from '@focsd-dev/react/rich-text'; // npm install @focsd-dev/editor
```

Only the components you use end up in your bundle: the package has no side effects of its own, and each element (`@focsd-dev/react/<tag without focsd->`) loads only the component that defines it.

Documentation: [focsd.dev](https://focsd.dev) · Part of [Focsd](https://github.com/SunTribe1/focsd), MIT licensed.
