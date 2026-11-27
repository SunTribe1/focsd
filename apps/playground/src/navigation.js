import './base.js';
import '@focsd-dev/components';

document.getElementById('mb').addEventListener('focsd-select', (event) => {
  document.getElementById('mb-result').value = event.detail.value;
});

const pagination = document.getElementById('pg');

pagination.addEventListener('focsd-page-change', (event) => {
  pagination.page = event.detail.page;
  document.getElementById('pg-result').value = String(event.detail.page);
});
