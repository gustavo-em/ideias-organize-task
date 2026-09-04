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
 * Both empty until the app is published. A button promising a download that
 * lands on a store error is worse than no button: the person came here to
 * accept an invite and leaves thinking the whole thing is broken. Until then
 * the page leads with the code, which is something they can still act on.
 *
 * `APPLE_APP_ID` is the numeric id from App Store Connect; it also drives
 * Safari's Smart App Banner, the one route iOS gives from a web page to the
 * store. `ANDROID_PACKAGE` is the Play listing's package name, kept as a name
 * rather than a URL because the Play link is built with the invite attached.
 */
const APPLE_APP_ID = '';
const ANDROID_PACKAGE = '';

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
    invitedBy:
      owner != null && typeof owner.name === 'string' ? owner.name : null,
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

/** Which store this browser should be sent to, from its own claim. */
function platformOf(userAgent) {
  const ua = String(userAgent ?? '');

  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/**
 * The Play link, with the invite riding along.
 *
 * Android is the one platform where the token can survive the install: Play
 * carries `referrer` through to the installed app, which reads it back once
 * with the Install Referrer API and can then open straight into the space.
 * Nothing equivalent exists on iOS, which is why the code on this page is not
 * a fallback but the actual mechanism there.
 */
function playUrl(token) {
  return (
    `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}` +
    `&referrer=${encodeURIComponent(`invite=${token}`)}`
  );
}

function appStoreUrl() {
  return `https://apps.apple.com/app/id${APPLE_APP_ID}`;
}

/**
 * The one big button, aimed at the phone that is reading.
 *
 * Reaching this page means the app is not installed — an iPhone or Android
 * that had it never got here, the link opened the app instead. So the page is
 * written for somebody who does not have it, and the download is the loudest
 * thing on it.
 */
function downloadButton(platform, token) {
  const ios = APPLE_APP_ID !== '';
  const android = ANDROID_PACKAGE !== '';

  if (platform === 'ios' && ios) {
    return `<a class="cta" href="${appStoreUrl()}">Baixar o Aluza</a>`;
  }
  if (platform === 'android' && android) {
    return `<a class="cta" href="${playUrl(token)}">Baixar o Aluza</a>`;
  }

  // A desktop browser, or a phone whose store is not open yet: offer what
  // there is, and nothing that would land on an error.
  const both = [
    ios ? `<a class="cta" href="${appStoreUrl()}">Baixar para iPhone</a>` : '',
    android
      ? `<a class="cta cta-soft" href="${playUrl(
          token,
        )}">Baixar para Android</a>`
      : '',
  ].join('');

  return both;
}

function page(preview, token, platform) {
  const name = escapeHtml(preview.name ?? 'um espaço');
  const who =
    preview.invitedBy == null ? 'Alguém' : escapeHtml(preview.invitedBy);
  const rows = preview.tasks
    .map(
      task =>
        `<li class="${task.done ? 'done' : ''}">${escapeHtml(task.title)}</li>`,
    )
    .join('');
  const download = downloadButton(platform, token);
  // The token is validated against `TOKEN` before anything is rendered, so it
  // is safe to drop into the script below without further escaping.
  const banner =
    APPLE_APP_ID === ''
      ? ''
      : `<meta name="apple-itunes-app" content="app-id=${APPLE_APP_ID}">`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${who} te chamou para ${name} · Aluza</title>
<meta property="og:title" content="${who} te chamou para o espaço ${name}">
<meta property="og:description" content="Vocês vão ver o mesmo dia: o que cada um levou e o que já fechou.">
${banner}
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
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
    background: #1B1710; color: #FFC63D; font-weight: 800; font-size: 18px;
    border-radius: 17px; padding: 20px; margin-bottom: 10px;
  }
  .cta-soft { background: #fff; color: #1B1710; }
  .steps {
    margin: 0 0 20px; padding: 0 0 0 22px;
    color: rgba(27,23,16,.82); font-size: 15px;
  }
  .steps li { padding: 3px 0; border-top: 0; }
  .steps b { font-weight: 700; }
  .copy {
    display: block; width: 100%; border: 0; cursor: pointer; font: inherit;
    background: #1B1710; border-radius: 17px; padding: 16px 14px;
    text-align: center; margin-bottom: 10px; -webkit-appearance: none;
  }
  .code-label {
    display: block; font-size: 11px; font-weight: 800; letter-spacing: 1.8px;
    text-transform: uppercase; color: #FFC63D; margin-bottom: 6px;
  }
  .copy code {
    display: block;
    font: 800 26px ui-monospace, Menlo, monospace; color: #FFFDF7;
    letter-spacing: 2px;
  }
  .copy-hint {
    display: block; margin-top: 8px; font-size: 12px; font-weight: 700;
    color: rgba(255,253,247,.72);
  }
  .note { text-align: center; font-size: 13px; color: rgba(27,23,16,.7); }
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
  <ol class="steps">
    <li>Instale o <b>Aluza</b>, um aplicativo de celular.</li>
    <li>Abra <b>Espaços</b> e toque em <b>Entrar com convite</b>.</li>
    <li>Cole o código abaixo.</li>
  </ol>
  ${download}
  <button class="copy" id="copy" type="button">
    <span class="code-label">Código do convite</span>
    <code id="code">${token}</code>
    <span class="copy-hint" id="hint">Toque para copiar</span>
  </button>
  ${
    download === ''
      ? '<p class="note">O Aluza ainda não está nas lojas. Guarde este código — ele continua valendo.</p>'
      : ''
  }
</main>
<script>
(function () {
  var button = document.getElementById('copy');
  var hint = document.getElementById('hint');
  var token = '${token}';
  var resting = hint.textContent;

  function say(text) {
    hint.textContent = text;
    setTimeout(function () { hint.textContent = resting; }, 2200);
  }

  // Selecting the code by hand on a phone is fiddly enough that people give
  // up on it, and the code is the only way in on iOS.
  function fallback() {
    var field = document.createElement('textarea');
    field.value = token;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, token.length);

    try {
      say(document.execCommand('copy') ? 'Copiado' : 'Copie o código acima');
    } catch (error) {
      say('Copie o código acima');
    }

    document.body.removeChild(field);
  }

  button.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(token).then(function () {
        say('Copiado');
      }, fallback);
      return;
    }

    fallback();
  });
})();
</script>
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

  // The page aims its download button at the phone reading it, so a cache in
  // front of this must not hand an iPhone the copy built for an Android.
  response.set('Vary', 'User-Agent');
  response
    .status(200)
    .send(page(preview, token, platformOf(request.get('user-agent'))));
});
