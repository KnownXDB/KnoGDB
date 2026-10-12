const dimensions={header:[920,430],capsule:[600,900],hero:[3840,1240],icon:[32,32],client_icon:[256,256]};
const roleNames={header:'Header',capsule:'Capsule',hero:'Hero',logo:'Logo',icon:'Icon',client_icon:'Client icon'};
const stateNames={in_review:'Pending review',submitted:'Submitted',approved:'Approved',rejected:'Rejected',withdrawn:'Withdrawn'};
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const label=(text,control)=>{const node=element('label',text);node.append(control);return node;};
const tags=value=>value.split(',').map(tag=>tag.trim()).filter(Boolean);

export function createAssetWorkspace({api,action}){
  const picker=document.querySelector('#asset-game'),fileInput=document.querySelector('#batch-files');
  const feedback=document.querySelector('#asset-message'),reviewFeedback=document.querySelector('#review-message');
  const queueNode=document.querySelector('#upload-queue'),grid=document.querySelector('#assets');
  const kind=document.querySelector('#batch-kind'),languages=document.querySelector('#batch-tags');
  const source=document.querySelector('#batch-source'),provenance=document.querySelector('#batch-provenance');
  const rights=document.querySelector('#batch-rights'),reason=document.querySelector('#batch-reason');
  const dialog=document.querySelector('#original-dialog');
  let games=[],queue=[],assets=[],selected=new Set(),blobs=new Set(),generation=0,locked=false;
  function disposeGallery(){generation++;for(const url of blobs)URL.revokeObjectURL(url);blobs.clear();dialog.close();document.querySelector('#original-image').removeAttribute('src');}
  function clearQueue(){for(const item of queue)if(item.preview)URL.revokeObjectURL(item.preview);queue=[];renderQueue();}
  function syncSelection(){
    document.querySelector('#selection-count').textContent=`${selected.size} selected`;
    for(const button of document.querySelectorAll('[data-decision]'))button.disabled=locked||selected.size===0;
    document.querySelector('#select-assets').disabled=locked||assets.length===0;
  }
  function setLocked(value){
    locked=value;
    for(const control of document.querySelectorAll('#assets-panel input, #assets-panel select, #assets-panel textarea'))control.disabled=value;
    if(!value){languages.disabled=kind.value==='global';renderQueue();}
    syncSelection();
  }
  async function run(work,target=feedback){await action(async()=>{setLocked(true);try{await work();}finally{setLocked(false);}},target);syncSelection();}
  function commonLanguage(){return {kind:kind.value,tags:kind.value==='global'?[]:tags(languages.value)};}
  function renderQueue(){
    queueNode.replaceChildren();
    for(const item of queue){
      const row=element('div',undefined,'queue-row');
      const image=element('img');image.alt='';if(item.preview)image.src=item.preview;else image.hidden=true;
      const thumbnail=element('div',undefined,'queue-thumbnail');thumbnail.append(image);
      const name=element('div');name.append(element('strong',item.file.name),element('p',`${(item.file.size/1024).toFixed(1)} KiB`,'hint'));
      const role=element('select');role.setAttribute('aria-label',`Role for ${item.file.name}`);role.add(new Option('Choose role',''));
      for(const [value,title]of Object.entries(roleNames))role.add(new Option(title,value));role.value=item.role;
      role.disabled=locked||item.status==='done'||item.stored;role.addEventListener('change',()=>{item.role=role.value;});
      const languageKind=element('select');languageKind.setAttribute('aria-label',`Classification for ${item.file.name}`);
      languageKind.add(new Option('Localized','localized'));languageKind.add(new Option('Global','global'));languageKind.value=item.kind;
      const languageTags=element('input');languageTags.setAttribute('aria-label',`Languages for ${item.file.name}`);languageTags.value=item.tags.join(', ');languageTags.placeholder='en, es';
      languageTags.disabled=locked||item.kind==='global'||item.status==='done'||item.stored;languageKind.disabled=locked||item.status==='done'||item.stored;
      languageKind.addEventListener('change',()=>{item.kind=languageKind.value;if(item.kind==='global')item.tags=[];renderQueue();});
      languageTags.addEventListener('input',()=>{item.tags=tags(languageTags.value);});
      const classification=element('div');classification.append(languageKind,languageTags);
      const status=element('p',item.error??({queued:'Ready',uploading:'Uploading…',validating:'Validating…',done:'Uploaded',error:'Failed'}[item.status]),`queue-status ${item.status==='error'?'error':''}`);
      status.setAttribute('role','status');
      const remove=element('button','Remove','secondary');remove.type='button';remove.disabled=locked;remove.setAttribute('aria-label',`Remove ${item.file.name}`);
      remove.addEventListener('click',()=>{if(item.preview)URL.revokeObjectURL(item.preview);queue=queue.filter(row=>row!==item);renderQueue();});
      row.append(thumbnail,name,label('Role',role),label('Language',classification),status,remove);queueNode.append(row);
    }
    document.querySelector('#queue-count').textContent=queue.length?`${queue.filter(item=>item.status==='done').length}/${queue.length} uploaded`:'';
    document.querySelector('#upload-batch').textContent=queue.some(item=>item.status==='error')?'Upload / retry remaining':'Upload queued files';
  }
  async function addFiles(files){
    if(queue.length+files.length>30)throw Error('Add up to 30 files per queue.');
    for(const file of files){
      const language=commonLanguage();const item={file,role:'',kind:language.kind,tags:language.tags,status:'queued',error:null,preview:null,uploadId:null,stored:false};
      if(file.name.toLowerCase().endsWith('.ico')){item.status='error';item.error='ICO import is not available yet. Use PNG or JPEG.';}
      else if(!['image/png','image/jpeg'].includes(file.type)||!file.size||file.size>16*1024*1024){item.status='error';item.error='Choose PNG/JPEG up to 16 MiB.';}
      else {
        item.preview=URL.createObjectURL(file);
        try{const bitmap=await createImageBitmap(file);item.width=bitmap.width;item.height=bitmap.height;bitmap.close();
          item.role=Object.keys(dimensions).find(role=>dimensions[role][0]===item.width&&dimensions[role][1]===item.height)??(file.name.toLowerCase().includes('logo')?'logo':'');
        }catch{item.status='error';item.error='The image could not be decoded.';}
      }
      queue.push(item);
    }
    renderQueue();
  }
  async function upload(item,game){
    item.error=null;
    try{
      if(item.file.name.toLowerCase().endsWith('.ico'))throw Error('ICO import is not available yet. Use PNG or JPEG.');
      if(!['image/png','image/jpeg'].includes(item.file.type)||!item.file.size||item.file.size>16*1024*1024)throw Error('Choose PNG/JPEG up to 16 MiB.');
      if(!item.role)throw Error('Choose a role for this file.');
      const expected=dimensions[item.role];if(expected&&(item.width!==expected[0]||item.height!==expected[1]))throw Error(`${roleNames[item.role]} requires ${expected[0]} × ${expected[1]} pixels.`);
      if(item.kind==='localized'&&!item.tags.length)throw Error('Choose a language or Global for this file.');
      item.status='uploading';renderQueue();
      if(!item.stored){
        const bytes=await item.file.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
        const prepared=await api('assets/prepare',{game_id:game,role:item.role,mime_type:item.file.type,byte_size:item.file.size,checksum_sha256:hash,
          language_kind:item.kind,language_tags:item.kind==='global'?[]:item.tags,provenance:provenance.value,source_reference:source.value,confidence:1});
        item.uploadId=prepared.id;
        const response=await fetch(prepared.upload_url,{method:'PUT',headers:{Authorization:`Bearer ${prepared.upload_grant}`,'Content-Type':item.file.type},body:bytes,credentials:'omit',referrerPolicy:'no-referrer'});
        if(!response.ok&&response.status!==409)throw Error('Upload failed. Retry this file.');
        item.stored=true;
      }
      item.status='validating';renderQueue();await api('assets/complete',{id:item.uploadId});item.status='done';
    }catch(error){item.status='error';item.error=error instanceof Error?error.message:'Upload failed.';}
    renderQueue();
  }
  async function load(){
    disposeGallery();selected.clear();assets=[];grid.replaceChildren();syncSelection();
    const game=picker.value;if(!game){document.querySelector('#asset-count').textContent='Choose a title to manage its originals.';return;}
    const primary=games.find(row=>row.id===game)?.localizations.find(row=>row.is_primary);
    if(!source.value&&primary?.source_reference)source.value=primary.source_reference;
    const result=await api(`assets?game_id=${encodeURIComponent(game)}`);if(picker.value!==game)return;assets=result.data;
    document.querySelector('#asset-count').textContent=`${assets.length} originals · select images to review together`;
    if(!assets.length)grid.append(element('p','No assets yet. Add your first originals above.','hint'));
    const thumbnails=[];
    for(const asset of assets){
      const card=element('article',undefined,'asset-card');
      const checkbox=element('input');checkbox.type='checkbox';checkbox.setAttribute('aria-label',`Select ${roleNames[asset.role]} ${asset.language_kind==='global'?'Global':asset.language_tags.join(', ')} ${asset.id}`);
      checkbox.addEventListener('change',()=>{if(checkbox.checked)selected.add(asset.id);else selected.delete(asset.id);card.classList.toggle('selected',checkbox.checked);syncSelection();});
      const preview=element('button',undefined,'asset-thumbnail');preview.type='button';preview.setAttribute('aria-label',`Preview ${roleNames[asset.role]} ${asset.id}`);
      const image=element('img');image.alt=`${roleNames[asset.role]} original`;image.hidden=true;preview.append(image,element('span','Loading preview…','hint'));
      preview.addEventListener('click',()=>{if(!asset.preview)return;document.querySelector('#original-caption').textContent=`${roleNames[asset.role]} · ${asset.width} × ${asset.height}`;document.querySelector('#original-image').src=asset.preview;dialog.showModal();});
      const title=element('div',undefined,'toolbar');title.append(element('strong',roleNames[asset.role]),checkbox);
      card.append(title,preview,element('p',`${asset.language_kind==='global'?'Global':asset.language_tags.join(', ')} · ${asset.provenance==='official'?'Official':'Community'}`),
        element('p',`${stateNames[asset.moderation_status]??asset.moderation_status} · ${asset.publication_status==='published'?'Published':'Private'}`,'hint'),
        element('p',`${asset.width} × ${asset.height} · ${(asset.byte_size/1024).toFixed(1)} KiB`,'hint'));
      grid.append(card);thumbnails.push({asset,image,preview});
    }
    syncSelection();const current=generation;
    async function previews(){let next=0;await Promise.all(Array.from({length:Math.min(3,thumbnails.length)},async()=>{
      while(next<thumbnails.length&&current===generation){const item=thumbnails[next++];try{
        const grant=await api('assets/preview',{id:item.asset.id,game_id:game});
        const response=await fetch(grant.preview_url,{headers:{Authorization:`Bearer ${grant.preview_grant}`},credentials:'omit',referrerPolicy:'no-referrer'});
        if(!response.ok)throw Error('Preview unavailable');const blob=await response.blob();if(current!==generation)continue;
        const url=URL.createObjectURL(blob);blobs.add(url);item.asset.preview=url;item.image.src=url;item.image.hidden=false;item.preview.querySelector('span').remove();
      }catch{if(current===generation)item.preview.querySelector('span').textContent='Preview unavailable · refresh to retry';}}
    }));}
    void previews();
  }
  fileInput.addEventListener('change',()=>void run(async()=>{const files=[...fileInput.files];fileInput.value='';await addFiles(files);}));
  const drop=document.querySelector('#drop-zone');drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('dragging');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('dragging');const files=[...event.dataTransfer.files];void run(()=>addFiles(files));});
  kind.addEventListener('change',()=>{languages.disabled=kind.value==='global';if(kind.value==='global')languages.value='';});
  document.querySelector('#apply-language').addEventListener('click',()=>{const language=commonLanguage();for(const item of queue)if(item.status!=='done'&&!item.stored){item.kind=language.kind;item.tags=[...language.tags];}renderQueue();});
  document.querySelector('#clear-queue').addEventListener('click',()=>{for(const item of queue)if(item.status==='done'&&item.preview)URL.revokeObjectURL(item.preview);queue=queue.filter(item=>item.status!=='done');renderQueue();});
  picker.addEventListener('change',()=>void run(async()=>{clearQueue();source.value='';rights.value='';await load();}));
  document.querySelector('#refresh-assets').addEventListener('click',()=>void run(load,reviewFeedback));
  document.querySelector('#upload-batch').addEventListener('click',()=>void run(async()=>{
    if(!picker.value)throw Error('Choose a title before uploading.');if(!source.value.trim())throw Error('Enter the source reference once for this set.');
    const game=picker.value;const pending=queue.filter(item=>item.status!=='done');if(!pending.length)throw Error('Add files to the queue first.');
    for(const item of pending)await upload(item,game);await load();
    const uploaded=queue.filter(item=>item.status==='done'&&item.uploadId).map(item=>item.uploadId);for(const id of uploaded)selected.add(id);
    for(const checkbox of grid.querySelectorAll('input[type=checkbox]')){const card=checkbox.closest('.asset-card');const id=assets.find(asset=>checkbox.getAttribute('aria-label').endsWith(asset.id))?.id;if(id&&selected.has(id)){checkbox.checked=true;card.classList.add('selected');}}
    syncSelection();feedback.textContent=`${uploaded.length}/${queue.length} uploaded. Originals remain private until you review the selection.`;
    if(queue.every(item=>item.status==='done'))document.querySelector('#intake-details').open=false;
  }));
  document.querySelector('#select-assets').addEventListener('click',()=>{for(const asset of assets)selected.add(asset.id);for(const checkbox of grid.querySelectorAll('input[type=checkbox]')){checkbox.checked=true;checkbox.closest('.asset-card').classList.add('selected');}syncSelection();});
  document.querySelector('#clear-selection').addEventListener('click',()=>{selected.clear();for(const checkbox of grid.querySelectorAll('input[type=checkbox]')){checkbox.checked=false;checkbox.closest('.asset-card').classList.remove('selected');}syncSelection();});
  for(const button of document.querySelectorAll('[data-decision]'))button.addEventListener('click',()=>void run(async()=>{
    const ids=[...selected];if(!ids.length)throw Error('Select assets to review.');
    const publish=button.dataset.publish==='true';if(publish&&!rights.value.trim())throw Error('Enter the distribution rights reference once for the selected assets.');
    const result=await api('assets/review-batch',{game_id:picker.value,ids,decision:button.dataset.decision,publish,rights_reference:rights.value,reason:reason.value});
    await load();feedback.textContent='';reviewFeedback.textContent=`${result.ids.length} assets reviewed${publish?' and published':''}.`;
  },reviewFeedback));
  document.querySelector('#close-original').addEventListener('click',()=>dialog.close());
  return {setGames:value=>{games=value;},load,syncSelection,clear:()=>{disposeGallery();clearQueue();selected.clear();assets=[];grid.replaceChildren();syncSelection();}};
}
