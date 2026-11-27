/**
 * Polls `url` until it answers with a success status.
 * @param {string} url
 * @param {{ attempts?: number, delayMs?: number }} [options]
 * @throws {Error} when the server never answers: a later `page.goto` would fail with a vaguer error.
 */
export async function waitForServer(url, { attempts = 60, delayMs = 500 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`The preview server did not start at ${url} after ${attempts} attempts.`);
}
