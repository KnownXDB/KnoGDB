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
  invalid_asset: 'The file could not be decoded as a valid, single-frame PNG or JPEG.',
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
function showLogin() { loginPanel.hidden = false; catalogPanel.hidden = true; document.querySelector('#assets-panel').hidden = true; selected = null; pendingUpload=null; document.querySelector('#retry-asset').hidden=true; clearPreview(); }
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
  if([...picker.options].some(option=>option.value===previous))picker.value=previous;
}
async function action(work) {
  if (busy) return; busy = true; message.textContent = '';
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  try { await work(); } catch (error) { message.textContent = error instanceof Error ? error.message : 'The request failed.'; }
  finally { busy = false; for (const button of document.querySelectorAll('button')) button.disabled = false; }
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
void action(async () => { await api('session'); await load(); });

const assetForm=document.querySelector('#asset-form');
const reviewForm=document.querySelector('#review-form');
const gamePicker=document.querySelector('#asset-game');
let reviewAsset=null;
let previewObject=null;
let pendingUpload=null;
function clearPreview(){if(previewObject)URL.revokeObjectURL(previewObject);previewObject=null;const image=document.querySelector('#asset-preview');image.hidden=true;image.removeAttribute('src');reviewForm.hidden=true;reviewAsset=null;}
async function loadAssets(){
  clearPreview();const list=document.querySelector('#assets');list.replaceChildren();
  if(!gamePicker.value)return;
  const {data}=await api(`assets?game_id=${encodeURIComponent(gamePicker.value)}`);
  if(!data.length){const item=document.createElement('li');item.textContent='No assets yet.';list.append(item);}
  for(const asset of data){
    const item=document.createElement('li'),button=document.createElement('button');button.type='button';
    button.textContent=`${asset.role} · ${asset.language_kind==='global'?'Global':asset.language_tags.join(', ')} · ${asset.provenance} · ${asset.moderation_status} · ${asset.publication_status}`;
    button.addEventListener('click',()=>void action(async()=>{
      clearPreview();reviewAsset=asset;reviewForm.reset();
      reviewForm.elements.namedItem('decision').value=['approved','rejected','withdrawn'].includes(asset.moderation_status)?asset.moderation_status:'approved';
      reviewForm.elements.namedItem('publish').checked=asset.publication_status==='published';
      reviewForm.elements.namedItem('rights_reference').value=asset.rights_reference ?? '';
      document.querySelector('#asset-details').textContent=`${asset.width} × ${asset.height} · ${asset.mime_type} · ${(asset.byte_size/1024).toFixed(1)} KiB · ${asset.rendition} · ID: ${asset.id}`;
      for(const field of ['valid_from','valid_until'])if(asset[field]){
        const value=new Date(asset[field]);value.setMinutes(value.getMinutes()-value.getTimezoneOffset());reviewForm.elements.namedItem(field).value=value.toISOString().slice(0,16);
      }
      reviewForm.hidden=false;
      const grant=await api('assets/preview',{id:asset.id,game_id:gamePicker.value});
      const response=await fetch(grant.preview_url,{headers:{Authorization:`Bearer ${grant.preview_grant}`},credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok)throw new Error('The private preview could not be loaded.');
      previewObject=URL.createObjectURL(await response.blob());const image=document.querySelector('#asset-preview');image.src=previewObject;image.hidden=false;
    }));item.append(button);list.append(item);
  }
}
gamePicker.addEventListener('change',()=>void action(loadAssets));
assetForm.elements.namedItem('language_kind').addEventListener('change',()=>{
  const tags=assetForm.elements.namedItem('language_tags');const global=assetForm.elements.namedItem('language_kind').value==='global';
  tags.disabled=global;tags.required=!global;if(global)tags.value='';
});
assetForm.elements.namedItem('language_tags').required=true;
async function completeUpload(){
  if(!pendingUpload)return;
  await api('assets/complete',{id:pendingUpload});pendingUpload=null;document.querySelector('#retry-asset').hidden=true;
  await loadAssets();assetForm.elements.namedItem('file').value='';message.textContent='Original uploaded and validated. It is private and awaiting review.';
}
assetForm.addEventListener('submit',event=>{event.preventDefault();void action(async()=>{
  if(!gamePicker.value)throw new Error('Choose a title before uploading.');
  const form=new FormData(assetForm),file=form.get('file');
  if(!(file instanceof File)||!file.size||file.size>16*1024*1024||!['image/png','image/jpeg'].includes(file.type))throw new Error('Choose a PNG or JPEG file up to 16 MiB.');
  const dimensions={header:[920,430],capsule:[600,900],hero:[3840,1240],icon:[32,32],client_icon:[256,256]};
  const expected=dimensions[form.get('role')];
  if(expected){const bitmap=await createImageBitmap(file);const matches=bitmap.width===expected[0]&&bitmap.height===expected[1];bitmap.close();if(!matches)throw new Error(errors.invalid_asset_dimensions);}
  const bytes=await file.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const global=form.get('language_kind')==='global';
  const prepared=await api('assets/prepare',{game_id:gamePicker.value,role:form.get('role'),mime_type:file.type,byte_size:file.size,checksum_sha256:hash,
    language_kind:form.get('language_kind'),language_tags:global?[]:String(form.get('language_tags')).split(',').map(tag=>tag.trim()).filter(Boolean),
    provenance:form.get('provenance'),source_reference:form.get('source_reference'),confidence:Number(form.get('confidence'))});
  message.textContent='Uploading original…';
  const response=await fetch(prepared.upload_url,{method:'PUT',headers:{Authorization:`Bearer ${prepared.upload_grant}`,'Content-Type':file.type},body:bytes,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw new Error('The original upload failed. Check the connection and try again.');
  pendingUpload=prepared.id;document.querySelector('#retry-asset').hidden=false;
  message.textContent='Validating original…';await completeUpload();
});});
document.querySelector('#retry-asset').addEventListener('click',()=>void action(completeUpload));
reviewForm.addEventListener('submit',event=>{event.preventDefault();void action(async()=>{
  if(!reviewAsset)return;const form=new FormData(reviewForm);const toDate=name=>form.get(name)?new Date(String(form.get(name))).toISOString():null;
  await api('assets/review',{id:reviewAsset.id,decision:form.get('decision'),publish:form.has('publish'),rights_reference:form.get('rights_reference'),reason:form.get('reason'),valid_from:toDate('valid_from'),valid_until:toDate('valid_until')});
  await loadAssets();message.textContent='Review saved. Public delivery also requires a published title and an active validity window.';
});});
