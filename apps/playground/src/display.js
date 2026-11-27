import './base.js';
import '@focsd/components';

document.getElementById('tag-design').addEventListener('focsd-remove', (event) => {
  document.getElementById('tag-removed').value = event.target.textContent.trim();
  event.target.remove();
});
