import './base.js';
import '@focsd/components';

document.getElementById('menu').addEventListener('focsd-select', (event) => {
  document.getElementById('menu-result').value = event.detail.value;
});

document.getElementById('ctx').addEventListener('focsd-select', (event) => {
  document.getElementById('ctx-result').value = event.detail.value;
});

const ad = document.getElementById('ad');

document.getElementById('ad-open').addEventListener('click', (event) => ad.show(event.currentTarget));

ad.addEventListener('close', () => {
  document.getElementById('ad-result').value = ad.returnValue || '(dismissed)';
});

const dr = document.getElementById('dr');

document.getElementById('dr-open').addEventListener('click', (event) => dr.show(event.currentTarget));

const toaster = document.getElementById('toaster');

document.getElementById('toast-btn').addEventListener('click', () => {
  toaster.show({
    message: 'Draft saved',
    tone: 'positive',
    action: { label: 'Undo', onClick: () => toaster.show({ message: 'Draft restored' }) },
  });
});

document.getElementById('toast-sticky').addEventListener('click', () => {
  toaster.show({ message: 'Sync paused while offline', tone: 'caution', duration: 0 });
});
