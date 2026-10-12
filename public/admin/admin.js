import { createAssetWorkspace } from './assets.js';
const loginPanel = document.querySelector('#login-panel');
const catalogPanel = document.querySelector('#catalog-panel');
const loginForm = document.querySelector('#login-form');
const gameForm = document.querySelector('#game-form');
const message = document.querySelector('#message');
let selected = null;
let busy = false;
const errors = {
  unauthorized: 'Sign in with an approved administrator account.',
  admin_forbidden: 'This account does not have administrator access.',
  rate_limited: 'Too many sign-in attempts. Wait one minute and try again.',
  edit_conflict: 'This title changed since you opened it. Reload the list before saving.',
  publication_requires_review: 'Publishing requires an approved primary translation.',
  invalid_request: 'Check the fields and try again.',
  invalid_origin: 'The request could not be verified. Reload this page.',
  invalid_asset: 'The file is not a valid PNG, JPEG or supported ICO.',
  invalid_asset_dimensions: 'The image dimensions do not match the selected role.',
  invalid_logo: 'Logos require transparency, no transparent border, and a visible side of at least 1280 pixels.',
  rights_required: 'Publishing requires a distribution rights reference.',
  duplicate_asset: 'This original is already registered for the same title, role and language.',
  upload_not_found: 'The upload is missing or expired. Start a new upload.',
  storage_budget_reached: 'The development storage budget is full. Contact the maintainer.',
};
async function api(path, body) {
  const response = await fetch(`/admin/api/v1/admin/${path}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-KnownGDB-Action': 'admin' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) showLogin();
    throw new Error(errors[data.error] ?? 'The service is temporarily unavailable. Try again later.');
  }
  return data;
}
function showLogin() { loginPanel.hidden = false; catalogPanel.hidden = true; document.querySelector('#assets-panel').hidden = true; selected = null; assetWorkspace.clear(); }
function resetEditor() {
  selected = null; gameForm.reset();
  document.querySelector('#editor-heading').textContent = 'New title';
  document.querySelector('#game-id').textContent = '';
}
function edit(game, localization) {
  selected = game; gameForm.reset();
  document.querySelector('#editor-heading').textContent = 'Edit title';
  document.querySelector('#game-id').textContent = `Title ID: ${game.id}`;
  for (const field of ['language','title','description','source_reference','confidence']) {
    gameForm.elements.namedItem(field).value = localization[field] ?? '';
  }
  gameForm.elements.namedItem('status').value = game.status;
  gameForm.elements.namedItem('is_primary').checked = localization.is_primary;
  gameForm.elements.namedItem('approved').checked = localization.moderation_status === 'approved';
}
async function load() {
  const { data } = await api('games');
  const list = document.querySelector('#games'); list.replaceChildren();
  if (!data.length) { const item = document.createElement('li'); item.textContent = 'No titles yet.'; list.append(item); }
  for (const game of data) for (const localization of game.localizations) {
    const item = document.createElement('li'); const button = document.createElement('button');
    button.type = 'button'; button.textContent = `${localization.title} · ${localization.language} · ${game.status}`;
    button.addEventListener('click', () => { if (!busy) edit(game, localization); }); item.append(button); list.append(item);
  }
  loginPanel.hidden = true; catalogPanel.hidden = false;
  document.querySelector('#assets-panel').hidden = false;
  const picker=document.querySelector('#asset-game');const previous=picker.value;
  picker.replaceChildren(new Option('Choose a title',''));
  for(const game of data){const name=game.localizations.find(l=>l.is_primary)?.title ?? game.id;picker.add(new Option(name,game.id));}
  if(previous&&[...picker.options].some(option=>option.value===previous))picker.value=previous;
  else if(data.length===1)picker.value=data[0].id;
  assetWorkspace.setGames(data);
  await assetWorkspace.load();
}
async function action(work, feedback=message) {
  if (busy) return; busy = true; message.textContent = ''; feedback.textContent='';
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  try { await work(); } catch (error) {
    const text=error instanceof Error ? error.message : 'The request failed.';
    message.textContent=text;feedback.textContent=text;
    if(feedback!==message&&!document.querySelector('#assets-panel').hidden)feedback.scrollIntoView({block:'nearest'});
  }
  finally { busy = false; for (const button of document.querySelectorAll('button')) button.disabled = false; assetWorkspace.syncSelection(); }
}
loginForm.addEventListener('submit', event => {
  event.preventDefault();
  void action(async () => {
    const email = loginForm.elements.namedItem('email').value;
    const password = loginForm.elements.namedItem('password').value;
    try { await api('login', { email, password }); await load(); resetEditor(); }
    finally { loginForm.elements.namedItem('password').value = ''; }
  });
});
gameForm.addEventListener('submit', event => {
  event.preventDefault();
  void action(async () => {
    const form = new FormData(gameForm);
    await api('games', {
      id: selected?.id, expected_updated_at: selected?.updated_at,
      language: form.get('language'), title: form.get('title'), description: form.get('description') || null,
      source_reference: form.get('source_reference'), confidence: Number(form.get('confidence')),
      status: form.get('status'), is_primary: form.has('is_primary'), approved: form.has('approved'),
    });
    await load(); resetEditor(); message.textContent = 'Title saved.';
  });
});
document.querySelector('#new-game').addEventListener('click', resetEditor);
document.querySelector('#logout').addEventListener('click', () => void action(async () => {
  try { await api('logout', {}); message.textContent = 'Signed out.'; }
  finally { showLogin(); resetEditor(); }
}));
const assetWorkspace=createAssetWorkspace({api,action});
void action(async () => { await api('session'); await load(); });
