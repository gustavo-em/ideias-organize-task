/**
 * The public face of an invite link.
 *
 * `aluza.app/e/<token>` has to answer to three different arrivals, and only
 * one of them is the app:
 *
 * 1. An iPhone with the app installed never reaches here — iOS matches the
 *    URL against `/.well-known/apple-app-site-association` and opens the app
 *    directly. Same for Android with `assetlinks.json`.
 * 2. A phone without the app, or a desktop browser, gets the page below: who
 *    invited, which space, and what is in it. Proof before the ask — nobody
 *    should have to install an app to find out what they were invited to.
 * 3. The app itself, asking for the same thing as data, with `?format=json`.
 *
 * It reads with the Admin SDK, so the security rules do not apply and the
 * space stays closed to everyone else. What it hands out is deliberately thin:
 * the space's name, who owns it, how many are in it, and the titles of at most
 * three tasks. Never the members' names, never a task's assignee, never the
 * whole list — a link that leaked would leak a poster, not a workspace.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');

/** Same shape the app's own parser accepts. */
const TOKEN = /^[a-z0-9]{4,24}$/i;

/**
 * Where to send somebody who does not have the app yet.
 *
 * Empty while the app is not published. A button that promises a download and
 * lands on a store error is worse than no button: the person came here to
 * accept an invite and leaves thinking the whole thing is broken. Until there
 * is a store page, the invite shows the code instead, which is something the
 * person who sent it can act on.
 */
const STORES = {
  ios: '',
  android: '',
};

/** Enough to recognise the space, not enough to be a copy of it. */
const PREVIEW_TASKS = 3;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The document, reduced to what a stranger may see. */
function previewOf(data) {
  const members = Array.isArray(data.members) ? data.members : [];
  const owner = members.find(member => member.role === 'owner') ?? null;
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];

  return {
    name: typeof data.name === 'string' ? data.name : null,
    color: typeof data.color === 'string' ? data.color : 'sun',
    icon: typeof data.icon === 'string' ? data.icon : 'home',
    invitedBy: owner != null && typeof owner.name === 'string' ? owner.name : null,
    memberCount: members.length,
    openCount: tasks.filter(task => task != null && task.completedAtMs == null)
      .length,
    tasks: tasks
      .filter(task => task != null && typeof task.title === 'string')
      .slice(0, PREVIEW_TASKS)
      .map(task => ({
        title: task.title,
        done: task.completedAtMs != null,
      })),
  };
}

function storeLinks() {
  const links = [];

  if (STORES.ios !== '') {
    links.push(`<a class="cta" href="${STORES.ios}">Baixar para iPhone</a>`);
  }
  if (STORES.android !== '') {
    links.push(`<a class="cta" href="${STORES.android}">Baixar para Android</a>`);
  }

  return links.join('');
}

function page(preview, token) {
  const name = escapeHtml(preview.name ?? 'um espaço');
  const who = preview.invitedBy == null ? 'Alguém' : escapeHtml(preview.invitedBy);
  const rows = preview.tasks
    .map(
      task =>
        `<li class="${task.done ? 'done' : ''}">${escapeHtml(task.title)}</li>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${who} te chamou para ${name} · Aluza</title>
<meta property="og:title" content="${who} te chamou para o espaço ${name}">
<meta property="og:description" content="Vocês vão ver o mesmo dia: o que cada um levou e o que já fechou.">
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; min-height: 100vh; background: #FFC63D; color: #1B1710;
    font: 400 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  main { width: 100%; max-width: 420px; }
  h1 { font-size: 34px; line-height: 1.05; letter-spacing: -1.4px; margin: 0 0 14px; }
  p.lede { margin: 0 0 24px; color: rgba(27,23,16,.78); }
  .card { background: #fff; border-radius: 20px; padding: 16px; margin-bottom: 24px; }
  .card h2 { font-size: 15px; letter-spacing: -.3px; margin: 0 0 12px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { padding: 8px 0; border-top: 1px solid #ECEAE4; }
  li:first-child { border-top: 0; }
  li.done { color: #6F6656; text-decoration: line-through; }
  .cta {
    display: block; text-align: center; text-decoration: none;
    background: #1B1710; color: #FFC63D; font-weight: 800;
    border-radius: 15px; padding: 17px; margin-bottom: 10px;
  }
  .note { text-align: center; font-size: 13px; color: rgba(27,23,16,.7); }
  .code {
    background: #1B1710; border-radius: 15px; padding: 14px;
    text-align: center; margin-bottom: 10px;
  }
  .code-label {
    display: block; font-size: 11px; font-weight: 800; letter-spacing: 1.8px;
    text-transform: uppercase; color: #FFC63D; margin-bottom: 6px;
  }
  .code code {
    font: 800 26px ui-monospace, Menlo, monospace; color: #FFFDF7;
    letter-spacing: 2px;
  }
</style>
</head>
<body>
<main>
  <h1>${who} te chamou para o espaço ${name}.</h1>
  <p class="lede">Vocês dois vão ver o mesmo dia: o que cada um levou e o que já fechou.</p>
  ${
    preview.tasks.length === 0
      ? ''
      : `<div class="card"><h2>Hoje, no combinado</h2><ul>${rows}</ul></div>`
  }
  ${storeLinks()}
  <div class="code">
    <span class="code-label">Código do convite</span>
    <code>${escapeHtml(token)}</code>
  </div>
  <p class="note">Abra o Aluza, toque em <b>Espaços</b> e depois em <b>Entrar com convite</b>.</p>
</main>
</body>
</html>`;
}

exports.invite = onRequest({ cors: true }, async (request, response) => {
  const token = request.path.split('/').filter(Boolean).pop() ?? '';

  if (!TOKEN.test(token)) {
    response.status(404).send('Convite não encontrado.');
    return;
  }

  const snapshot = await getFirestore()
    .collection('sharedLists')
    .doc(token)
    .get();

  if (!snapshot.exists) {
    response.status(404).send('Este convite expirou ou não existe mais.');
    return;
  }

  const preview = previewOf(snapshot.data() ?? {});

  // A preview is cheap to serve and changes rarely; a minute of caching keeps
  // a link pasted into a group chat from hitting the database once per person
  // who happens to open it.
  response.set('Cache-Control', 'public, max-age=60');

  if (request.query.format === 'json') {
    response.json({ token, ...preview });
    return;
  }

  response.status(200).send(page(preview, token));
});
