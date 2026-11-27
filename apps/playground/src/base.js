// What every playground page starts from: fonts, tokens, the playground stylesheet and <pg-header>.
// Each page's entry module imports this first, then the components it demonstrates.
import '@focsd/tokens/fonts.css';
import '@focsd/tokens/tokens.css';
import './playground.css';

/**
 * The page header: the title (the page's only h1) and a way back to the foundation page. Any
 * children replace the way back, for example the theme and density switches on the home page.
 *
 *   <pg-header heading="Charts"></pg-header>
 */
class PgHeader extends HTMLElement {
  connectedCallback() {
    if (this.querySelector(':scope > header')) return;

    const header = document.createElement('header');
    const title = document.createElement('h1');
    header.className = 'pg-header';
    title.textContent = this.getAttribute('heading') ?? document.title;

    const extras = [...this.childNodes];
    header.append(title, ...(extras.length ? extras : [backNav()]));
    this.replaceChildren(header);
  }
}

function backNav() {
  const nav = document.createElement('nav');
  const link = document.createElement('focsd-link');
  nav.setAttribute('aria-label', 'Playground pages');
  link.setAttribute('href', '/');
  link.textContent = 'Foundation';
  nav.append(link);

  return nav;
}

if (!customElements.get('pg-header')) customElements.define('pg-header', PgHeader);
