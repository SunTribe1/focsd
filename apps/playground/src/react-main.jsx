import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './base.js';
import { Button, Dialog, FloatingPanel, MultiSelect, Option, Select, Switch, Tab, TabPanel, Tabs, TextField } from '@focsd-dev/react';

function App() {
  const [name, setName] = useState('Untitled');
  const [visibility, setVisibility] = useState('private');
  const [tab, setTab] = useState(0);
  const [count, setCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogResult, setDialogResult] = useState('none');
  const [alerts, setAlerts] = useState(false);
  const [labels, setLabels] = useState('');
  const [panelClosed, setPanelClosed] = useState(0);

  return (
    <main id="react-ready">
      <section className="pg-stack">
        <h2>Controlled fields</h2>
        <TextField label="Project name" value={name} onInput={(e) => setName(e.target.value)} />
        <p>
          Name: <output id="react-name">{name}</output>
        </p>
        <Button onClick={() => setName('Untitled')}>Reset name</Button>
        <Select label="Visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <Option value="private">Private</Option>
          <Option value="internal">Internal</Option>
          <Option value="public">Public</Option>
        </Select>
        <p>
          Visibility: <output id="react-visibility">{visibility}</output>
        </p>
      </section>
      <section>
        <h2>Tabs and buttons</h2>
        <Tabs label="Project" onChange={(e) => setTab(e.target.selected)}>
          <Tab>Overview</Tab>
          <Tab>Activity</Tab>
          <TabPanel>
            <p>Project overview.</p>
          </TabPanel>
          <TabPanel>
            <p>Recent activity.</p>
          </TabPanel>
        </Tabs>
        <p>
          Tab: <output id="react-tab">{tab}</output>
        </p>
        <Button onClick={() => setCount((c) => c + 1)}>Count</Button>
        <p>
          Count: <output id="react-count">{count}</output>
        </p>
      </section>
      <section className="pg-stack">
        <h2>Every component is wrapped</h2>
        <Switch onChange={(e) => setAlerts(e.target.checked)}>Alerts</Switch>
        <p>
          Alerts: <output id="react-alerts">{String(alerts)}</output>
        </p>
        <MultiSelect label="Labels" onChange={(e) => setLabels(e.target.value)}>
          <Option value="bug">Bug</Option>
          <Option value="docs">Docs</Option>
        </MultiSelect>
        <p>
          Labels: <output id="react-labels">{labels}</output>
        </p>
        <Button id="react-panel-open">Notes</Button>
        <FloatingPanel label="Notes" trigger="react-panel-open" onClose={() => setPanelClosed((n) => n + 1)}>
          <p>Panel body.</p>
        </FloatingPanel>
        <p>
          Panel closed: <output id="react-panel">{panelClosed}</output>
        </p>
      </section>
      <section>
        <h2>Dialog</h2>
        <Button variant="critical" onClick={() => setDialogOpen(true)}>
          Archive project
        </Button>
        <p>
          Dialog: <output id="react-dialog">{dialogResult}</output>
        </p>
        <Dialog
          headline="Archive this project?"
          open={dialogOpen}
          onClose={(e) => {
            setDialogOpen(false);
            setDialogResult(e.target.returnValue || '(dismissed)');
          }}
        >
          <p>Archived projects are read-only and can be restored for 30 days.</p>
          <Button slot="actions" data-dialog-close value="cancel">
            Cancel
          </Button>
          <Button slot="actions" variant="critical" data-dialog-close value="archive">
            Archive
          </Button>
        </Dialog>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
