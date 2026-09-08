const KEY='prestadores_v9';
const API='/api';
let backendOnline=false;
let data=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('prestadores_v7')||localStorage.getItem('prestadores_v6')||localStorage.getItem('prestadores_v4')||'[]');
let renewals=JSON.parse(localStorage.getItem('prestadores_v8_renewals')||localStorage.getItem('prestadores_v7_renewals')||localStorage.getItem('prestadores_v6_renewals')||'[]');
let applications=JSON.parse(localStorage.getItem('prestadores_v8_applications')||localStorage.getItem('prestadores_v7_applications')||'[]');
const SERVICES=['Aire acondicionado','Albañilería','Animación de eventos','Armado de muebles','Asesoría contable','Asesoría jurídica','Asesoría informática','Asistencia virtual','Barbería a domicilio','Cuidado de adultos mayores','Cuidado de mascotas','Cuidado de niños','Cerrajería','Clases de idiomas','Clases de música','Clases de matemáticas','Clases de refuerzo escolar','Coaching personal','Community manager','Confección de ropa','Construcción','Consultoría empresarial','Cocina a domicilio','Decoración de eventos','Diseño gráfico','Diseño web','Electricidad','Enfermería a domicilio','Entrenador personal','Estilismo','Fotografía','Fumigación','Gasfitería / plomería','Gestión de redes sociales','Instalación de cámaras','Instalación de pisos','Instalación de vidrios','Instalación de drywall','Instalación de internet','Jardinería','Lavado de autos','Lavado de muebles','Lavandería','Limpieza de casas','Limpieza de oficinas','Limpieza de vidrios','Manicure y pedicure','Maquillaje profesional','Masajes','Mantenimiento de computadores','Mantenimiento de celulares','Mantenimiento de electrodomésticos','Mantenimiento de piscinas','Mantenimiento de motos','Mantenimiento de bicicletas','Mantenimiento de aires acondicionados','Mensajería','Mudanzas','Niñera','Nutrición','Organización de eventos','Organización de espacios','Panadería y repostería','Peluquería a domicilio','Pintura de interiores','Pintura de exteriores','Plomería','Podología','Reparación de calzado','Reparación de electrodomésticos','Reparación de computadores','Reparación de celulares','Reparación de muebles','Reparación de motos','Reparación de bicicletas','Reparación de puertas','Reparación de ventanas','Reparación de lavadoras','Reparación de neveras','Reparación de televisores','Reparación de ventiladores','Reparación de herramientas','Reparación de instrumentos musicales','Reparación de relojes','Reparación de joyería','Secretaría / digitación','Seguridad privada','Servicio de catering','Servicio de mesero','Soporte técnico','Tapicería','Tatuaje y piercing','Traducción','Transporte particular','Transporte de carga','Tutorías académicas','Venta de comida preparada','Video y edición','Visagismo de cejas','Costura y arreglos'];
const CITIES=['Buenaventura'];
const $=s=>document.querySelector(s);
function D(s){return new Date(s+'T00:00:00')} function today(){return new Date().toISOString().slice(0,10)}
function addMonths(s,n){let d=D(s),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return d.toISOString().slice(0,10)}
function expired(x){return !!x.expiration&&D(x.expiration)<D(today())} function monthsFor(p){return p==='gratis'?3:p==='anual'?12:1}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function save(){localStorage.setItem(KEY,JSON.stringify(data));localStorage.setItem('prestadores_v9_renewals',JSON.stringify(renewals));localStorage.setItem('prestadores_v9_applications',JSON.stringify(applications));localStorage.setItem('prestadores_v9_events',JSON.stringify(events||[]));localStorage.setItem('prestadores_v9_notifications',JSON.stringify(notifications||[])); if(backendOnline){fetch(API+'/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,applications,renewals,events,notifications})}).catch(()=>{backendOnline=false;updateBackendBadge()})}}
function normalizePhone(phone){let p=String(phone||'').replace(/\D/g,'');if(p.length===10&&p.startsWith('3'))p='57'+p;return p}
function customerSearch(){if(!CITIES.includes($('#customerCity').value))return alert('Selecciona Buenaventura.');let city=$('#customerCity').value.trim().toLowerCase(),service=$('#customerService').value,desc=$('#customerDescription').value.trim();sync();let pool=data.filter(x=>x.active&&!expired(x)&&x.service===service&&String(x.city||'').trim().toLowerCase()===city);pool.sort((a,b)=>(a.exposures||0)-(b.exposures||0)||(a.requests||0)-(b.requests||0)||a.id-b.id);let results=$('#customerResults'),cards=$('#providerCards');results.classList.remove('hidden');$('#resultsCount').textContent=pool.length+' disponible'+(pool.length===1?'':'s');$('#resultsSummary').textContent=pool.length?`Mostrando ${Math.min(5,pool.length)} perfiles priorizados por rotación justa.`:'No encontramos prestadores activos para esa combinación.';cards.innerHTML=pool.slice(0,5).map(x=>`<article class="provider-card">${x.photoUrl?`<div class="provider-avatar"><img src="${esc(x.photoUrl)}" alt="Foto de ${esc(x.name)}" loading="lazy"></div>`:''}<h3>${esc(x.name)}</h3><div class="meta">🛠️ ${esc(x.service)}</div><div class="meta">📍 ${esc(x.city)}</div><p>${esc(x.description||'Prestador disponible para atender solicitudes.')}</p><button class="wa-btn" onclick="openTerms(${x.id})">💬 Contactar por WhatsApp</button></article>`).join('')||'<p>No hay perfiles disponibles. Prueba otra ciudad o servicio.</p>';window.customerContext={city,service,description:desc}}
function openTerms(providerId){window.pendingContactId=providerId;$('#termsAccepted').checked=false;$('#termsAccept').disabled=true;$('#termsModal').classList.remove('hidden')}
async function confirmTerms(){let x=data.find(p=>p.id===window.pendingContactId);if(!x||!$('#termsAccepted').checked)return;let now=new Date().toISOString(),version='TIVA-CONEXION-v1.0';x.exposures=(x.exposures||0)+1;x.requests=(x.requests||0)+1;x.contactHistory=x.contactHistory||[];x.contactHistory.push({date:now,accepted:true,termsVersion:version,action:'Contacto iniciado por WhatsApp',city:window.customerContext?.city||'',service:window.customerContext?.service||''});logEvent('Aceptación de condiciones',x,`Usuario aceptó ${version}; contacto por WhatsApp`);if(backendOnline){fetch(API+'/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({providerId:x.id,providerName:x.name,service:x.service,city:x.city,acceptedAt:now,termsVersion:version})}).catch(()=>{})}save();$('#termsModal').classList.add('hidden');let phone=normalizePhone(x.phone);let msg=`Hola ${x.name}, encontré tu servicio en TIVA.`;if(window.customerContext?.description)msg+=' Necesito: '+window.customerContext.description;window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank');customerSearch()}
function fillServices(){['#registerService','#planService','#rotationService','#customerService'].forEach(id=>{let el=$(id);if(!el)return;el.innerHTML=(id==='#rotationService'?'<option value="">Todos los servicios</option>':'<option value="">Selecciona un servicio</option>')+SERVICES.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')});$('#serviceCatalog').innerHTML=SERVICES.map((s,i)=>`<div><b>${i+1}.</b> ${esc(s)}</div>`).join('')}
function showView(v){
  const ids=['landing','customerView','renewalView','providerView','aboutView','rulesView','adminView','adminLoginView'];
  ids.forEach(id=>{const el=$('#'+id);if(el)el.classList.add('hidden')});
  if(v==='admin'){
    const target=window.adminAuthenticated?'adminView':'adminLoginView';
    const el=$('#'+target); if(el)el.classList.remove('hidden');
  }else{
    const map={landing:'landing',customer:'customerView',renewal:'renewalView',provider:'providerView',about:'aboutView',rules:'rulesView'};
    const el=$('#'+map[v]); if(el)el.classList.remove('hidden');
  }
  window.scrollTo(0,0);
}

function calc(){let r=$('#registration').value,p=$('#plan').value;if(r)$('#expiration').value=addMonths(r,monthsFor(p))}
function sync(){let changed=false;data.forEach(x=>{if(x.active&&expired(x)){x.active=false;x.autoExpired=true;logEvent('Vencimiento automático',x,'Membresía vencida');notifyWhatsApp(x,'Membresía vencida', typeof renewalMessage==='function'?renewalMessage(x):'Tu membresía ha vencido. Renueva para reactivarlo.');changed=true}});if(changed)save()}
function render(){if(!$('#total'))return;sync();$('#total').textContent=data.length;$('#active').textContent=data.filter(x=>x.active&&!expired(x)).length;$('#expired').textContent=data.filter(expired).length;$('#exposures').textContent=data.reduce((a,x)=>a+(x.exposures||0),0);let q=$('#search').value.toLowerCase(),f=$('#filter').value;
$('#tbody').innerHTML=data.filter(x=>{let st=expired(x)?'expired':x.active?'active':'inactive';return(!q||[x.name,x.service,x.city,x.phone].join(' ').toLowerCase().includes(q))&&(!f||f===st)}).map(x=>{let e=expired(x),st=e?'<span class="status bad">Vencido</span>':x.active?'<span class="status ok">Activo</span>':'<span class="status off">Desactivado</span>';let p=x.plan==='gratis'?'3 meses gratis':x.plan==='anual'?'Anual':'Mensual';return `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.service)}</td><td>${esc(x.city)}</td><td>${x.registration||''}</td><td>${x.expiration||''}</td><td>${p}</td><td>${st}</td><td>${x.exposures||0}</td><td class="actions-cell"><button class="edit" onclick="edit(${x.id})">✏️ Editar</button><button class="toggle" onclick="toggle(${x.id})">${x.active?'Desactivar':'Activar'}</button></td></tr>`}).join('')||'<tr><td colspan="9">No hay prestadores.</td></tr>';renderRenewals();renderApplications();initRotation();if(typeof renderRenewalRequests==='function')renderRenewalRequests()}
function renderRenewals(){let box=$('#renewalsBody');box.innerHTML=renewals.slice().reverse().slice(0,20).map(r=>`<tr><td>${r.date}</td><td><b>${esc(r.providerName)}</b></td><td>${r.plan==='anual'?'Anual':r.plan==='mensual'?'Mensual':'3 meses gratis'}</td><td>${r.start}</td><td>${r.expiration}</td></tr>`).join('')||'<tr><td colspan="5">Aún no hay renovaciones registradas.</td></tr>'}
function normalizeApplications(){let changed=false;applications=applications.map(a=>{if(a&&a.status==='subiendo_documentos'&&a.idDocAvailable&&a.photoAvailable){a.status='pendiente';a.documentStatus='recibida_para_revision';a.documentsStored=true;changed=true}return a});if(changed&&backendOnline){fetch(API+'/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,applications,renewals,events,notifications})}).catch(()=>{})}}
document.addEventListener('click',e=>{const b=e.target.closest?.('.review-application-btn');if(!b)return;e.preventDefault();reviewApplication(b.dataset.reviewId);});
function renderApplications(){normalizeApplications();let pending=applications.filter(a=>a&&((a.status==='pendiente')||(a.idDocAvailable&&a.photoAvailable&&a.status!=='aprobada'&&a.status!=='rechazada')));$('#pendingBadge').textContent=`${pending.length} pendiente${pending.length===1?'':'s'}`;$('#pendingBody').innerHTML=pending.map(a=>`<tr><td>${esc(a.createdAt)}</td><td><b>${esc(a.name)}</b></td><td>${esc(a.service)}</td><td>${esc(a.city)}</td><td>${esc(a.idDocName||a.idDocNameOriginal||'Cédula')}<br><small>${((a.idDocSize||0)/1024/1024).toFixed(2)} MB</small><br><a class="secondary" target="_blank" href="/api/application-file?application_id=${encodeURIComponent(a.id)}&kind=idDoc">⬇ Ver / descargar</a></td><td>${esc(a.photoName||a.photoNameOriginal||'Foto')}<br><small>${((a.photoSize||0)/1024/1024).toFixed(2)} MB</small><br><a class="secondary" target="_blank" href="/api/application-file?application_id=${encodeURIComponent(a.id)}&kind=photo">👁 Ver / descargar</a></td><td><span class="status bad">Pendiente</span></td><td><button type="button" class="renew review-application-btn" data-review-id="${esc(String(a.id))}">Revisar</button></td></tr>`).join('')||'<tr><td colspan="8">No hay solicitudes pendientes.</td></tr>'}
function openNew(){$('#modalTitle').textContent='Agregar prestador';$('#saveBtn').textContent='Guardar';$('#form').reset();$('#form').id.value='';$('#registration').value=today();calc();$('#modal').classList.remove('hidden')}
function edit(id){let x=data.find(a=>a.id===id);if(!x)return;let f=$('#form');f.id.value=x.id;f.name.value=x.name;f.service.value=x.service;f.city.value=x.city;f.phone.value=x.phone;f.plan.value=x.plan;f.registration.value=x.registration;f.description.value=x.description||'';$('#modalTitle').textContent='Editar prestador';$('#saveBtn').textContent='Guardar cambios';calc();$('#modal').classList.remove('hidden')}
function toggle(id){let x=data.find(a=>a.id===id);if(!x)return;if(expired(x)){alert('La membresía está vencida. Renueva antes de activar.');return}x.active=!x.active;logEvent(x.active?'Activación':'Suspensión',x,x.active?'Perfil activado manualmente':'Perfil desactivado manualmente');notifyWhatsApp(x,x.active?'Cuenta reactivada':'Cuenta suspendida',x.active?'Tu cuenta fue reactivada y puede recibir solicitudes.':'Tu cuenta fue suspendida temporalmente. Contacta a administración para más información.');save();render();renderV8()}
async function reviewApplication(id){
  try{
    let a=applications.find(x=>String(x.id)===String(id));
    if(!a && backendOnline){
      const r=await fetch(API+'/state',{cache:'no-store'});
      if(r.ok){const st=await r.json();applications=st.applications||[];a=applications.find(x=>String(x.id)===String(id));}
    }
    if(!a){alert('No se encontró la solicitud seleccionada. Actualiza la página e inténtalo nuevamente.');return;}
    window.currentReviewId=String(a.id);
    const modal=$('#reviewModal'),content=$('#reviewContent');
    if(!modal||!content){alert('No se pudo abrir la ventana de revisión.');return;}
    const base=`/api/application-file?application_id=${encodeURIComponent(a.id)}`;
    content.innerHTML=`<div class="review-grid"><p><b>Nombre:</b><br>${esc(a.name)}</p><p><b>Servicio:</b><br>${esc(a.service)}</p><p><b>Ciudad:</b><br>${esc(a.city)}</p><p><b>WhatsApp:</b><br>${esc(a.phone)}</p><p><b>Cédula:</b><br>${esc(a.idDocName||'Documento')} (${((a.idDocSize||0)/1024/1024).toFixed(2)} MB)<br><a class="secondary" target="_blank" href="${base}&kind=idDoc">⬇ Ver / descargar cédula</a></p><p><b>Foto:</b><br>${esc(a.photoName||'Foto')} (${((a.photoSize||0)/1024/1024).toFixed(2)} MB)<br><a class="secondary" target="_blank" href="${base}&kind=photo">👁 Abrir foto</a></p><div class="full review-photo"><img src="${base}&kind=photo" alt="Foto del prestador" loading="lazy"></div><p class="full"><b>Descripción:</b><br>${esc(a.description||'Sin descripción')}</p></div><div class="note">Los documentos solo son accesibles al administrador autenticado. Si la solicitud es aprobada, la foto se conservará asociada al perfil del prestador.</div>`;
    modal.classList.remove('hidden');
    modal.scrollTop=0;
  }catch(err){console.error('reviewApplication:',err);alert('No fue posible abrir la revisión. '+(err.message||'Error inesperado.'));}
}
window.reviewApplication=reviewApplication;
function initRotation(){let sel=$('#rotationService');if(!sel)return;let current=sel.value;sel.innerHTML='<option value="">Todos los servicios</option>'+SERVICES.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');if(current)sel.value=current}
function chooseNext(){sync();let service=$('#rotationService').value,pool=data.filter(x=>x.active&&!expired(x)&&(!service||x.service===service));let result=$('#rotationResult');if(!pool.length){result.innerHTML='<b>No hay prestadores activos disponibles</b> para este servicio.';return}pool.sort((a,b)=>(a.exposures||0)-(b.exposures||0)||(a.requests||0)-(b.requests||0)||a.id-b.id);let five=pool.slice(0,5);result.innerHTML='<b>5 perfiles priorizados</b><div class="rotation-list">'+five.map((x,i)=>`<div class="rotation-item"><b>${i+1}. ${esc(x.name)}</b> — ${esc(x.service)} · ${esc(x.city)} · Exposiciones: ${x.exposures||0}</div>`).join('')+'</div>'; }
$('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();let f=new FormData(e.target),err=$('#loginError');err.classList.add('hidden');try{let r=await fetch(API+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:f.get('username'),password:f.get('password')})});let out=await r.json();if(!r.ok)throw new Error(out.error||'No autorizado');window.adminAuthenticated=true;e.target.reset();showView('admin');await bootBackend();}catch(x){err.textContent=x.message;err.classList.remove('hidden')}});
$('#logoutBtn')?.addEventListener('click',async()=>{try{await fetch(API+'/logout',{method:'POST'})}catch(e){}window.adminAuthenticated=false;backendOnline=false;showView('landing');updateBackendBadge()});
$('#loginHomeBtn')?.addEventListener('click',()=>showView('landing')); $('#loginCancel')?.addEventListener('click',()=>showView('landing'));
$('#navRenewal')?.addEventListener('click',e=>{e.preventDefault();showView('renewal')}); $('#navAbout')?.addEventListener('click',e=>{e.preventDefault();showView('about')}); $('#navRules')?.addEventListener('click',e=>{e.preventDefault();showView('rules')}); $('#aboutBack')?.addEventListener('click',()=>showView('landing')); $('#rulesBack')?.addEventListener('click',()=>showView('landing'));
$('#providerAccessBtn')?.addEventListener('click',()=>showView('provider')); $('#customerAccessBtn')?.addEventListener('click',()=>showView('customer')); $('#customerHomeBtn')?.addEventListener('click',()=>showView('landing'));
$('#searchServiceForm')?.addEventListener('submit',e=>{e.preventDefault();customerSearch()}); $('#termsAccepted')?.addEventListener('change',e=>$('#termsAccept').disabled=!e.target.checked); $('#termsAccept')?.addEventListener('click',confirmTerms); $('#termsCancel')?.addEventListener('click',()=>$('#termsModal').classList.add('hidden')); $('#termsClose')?.addEventListener('click',()=>$('#termsModal').classList.add('hidden'));
$('#notificationsBtn')?.addEventListener('click',()=>{$('#notifications')?.scrollIntoView({behavior:'smooth'});renderV8()}); $('#sendNotificationsBtn')?.addEventListener('click',sendPendingWhatsApp);
$('#adminAccessBtn')?.addEventListener('click',()=>{window.location.href='admin.html'}); $('#providerHomeBtn')?.addEventListener('click',()=>showView('landing')); $('#registerBack')?.addEventListener('click',()=>showView('landing')); $('#adminHomeBtn')?.addEventListener('click',()=>showView('landing'));
async function uploadApplicationFile(applicationId,kind,file){
  const r=await fetch(API+'/application-file-upload',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-Application-Id':String(applicationId),'X-File-Kind':kind,'X-File-Name':encodeURIComponent(file.name)},body:file});
  let out={}; try{out=await r.json()}catch(e){}
  if(!r.ok)throw new Error(out.error||`No fue posible subir ${kind}`);
  return out.application;
}
$('#dataConsent')?.addEventListener('change',e=>{const b=$('#registerSubmit');if(b)b.disabled=!e.target.checked});
$('#registerForm')?.addEventListener('submit',async e=>{e.preventDefault();let f=new FormData(e.target),idDoc=f.get('idDoc'),photo=f.get('photo'),consent=f.get('dataConsent');if(!consent)return alert('Debes autorizar el tratamiento de tus datos personales para enviar la solicitud.');if(!CITIES.includes(String(f.get('city')||'')))return alert('Selecciona una ciudad válida.');if(!idDoc||!photo)return;if(idDoc.size>2*1024*1024||photo.size>2*1024*1024){alert('Cada archivo debe pesar máximo 2 MB.');return}try{if(!backendOnline)throw new Error('No hay conexión con el servidor.');let acceptedAt=new Date().toISOString(),authorizationVersion='TIVA-DATOS-v1.0',authorizationText='Autorización previa, expresa e informada para el tratamiento de datos personales en TIVA, conforme a la información y finalidades mostradas en el formulario de registro.';let application={id:Date.now(),createdAt:today(),name:f.get('name'),service:f.get('service'),city:f.get('city'),phone:f.get('phone'),description:f.get('description'),idDocName:idDoc.name,idDocSize:idDoc.size,photoName:photo.name,photoSize:photo.size,status:'subiendo_documentos',dataAuthorizationAccepted:true,authorizationAcceptedAt:acceptedAt,authorizationVersion,authorizationText,dataResponsible:'Bladimir Mena — CEO & Founder de TIVA',dataRightsEmail:'tivaservices@gmail.com',reviewNoticeAccepted:true};let r=await fetch(API+'/application',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(application)});let out={};try{out=await r.json()}catch(e){}if(!r.ok)throw new Error(out.error||'No fue posible crear la solicitud');application=out.application||application;application=await uploadApplicationFile(application.id,'idDoc',idDoc);application=await uploadApplicationFile(application.id,'photo',photo);application.status='pendiente';application.documentStatus='recibida_para_revision';application.documentsStored=true;applications.push(application);save();logEvent('Registro enviado',application,'Solicitud creada; autorización de datos aceptada; documentos recibidos para revisión');notifyWhatsApp(application,'Registro recibido','Recibimos tu solicitud de registro y los documentos adjuntos. Tu solicitud quedó PENDIENTE DE REVISIÓN. Administración verificará la información antes de activar tu perfil.');e.target.reset();$('#dataConsent').checked=false;$('#registerSubmit').disabled=true;$('#registerSuccess').innerHTML='<h3>¡Solicitud recibida!</h3><p>Hemos recibido tu solicitud y tus documentos.</p><p><b>Estado: Pendiente de revisión</b></p><p>La administración de TIVA revisará la información antes de aprobar y activar tu perfil.</p><p>Tu autorización de tratamiento de datos quedó registrada con la versión <b>'+authorizationVersion+'</b>.</p>';$('#registerSuccess').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});}catch(err){console.error(err);alert('No fue posible enviar la solicitud con sus documentos. '+(err.message||'Verifica la conexión e intenta nuevamente.'))}});
$('#approveBtn')?.addEventListener('click',()=>{let a=applications.find(x=>String(x.id)===String(window.currentReviewId));if(!a)return;let reg=today(),exp=addMonths(reg,3);let newId=Date.now();data.push({id:newId,name:a.name,service:a.service,city:a.city,phone:a.phone,plan:'gratis',registration:reg,expiration:exp,description:a.description,active:true,exposures:0,requests:0,verified:true,photoApplicationId:String(a.id),photoUrl:`/api/provider-photo?id=${newId}`});a.status='aprobada';a.reviewedAt=today();let approved=data[data.length-1];let message=`🎉 ¡Hola ${approved.name}!\n\nTu registro en TIVA ha sido aprobado.\n\n✅ Estado: ACTIVO\n🎁 Membresía: 3 meses GRATIS\n📅 Inicio: ${reg}\n📅 Vencimiento: ${exp}\n\nYa puedes aparecer en las búsquedas de clientes y recibir contactos directamente por WhatsApp.\n\n¡Bienvenido a TIVA! 🚀`;logEvent('Aprobación',approved,'3 meses gratis; activación del perfil');notifyWhatsApp(approved,'Registro aprobado',message);save();$('#reviewModal').classList.add('hidden');render();renderV8();alert('Solicitud aprobada. Se creó una notificación lista para enviar por WhatsApp.');});
$('#rejectBtn')?.addEventListener('click',()=>{let a=applications.find(x=>String(x.id)===String(window.currentReviewId));if(!a)return;let reason=prompt('Motivo del rechazo (opcional):','Documentación pendiente o no válida');if(reason===null)return;a.status='rechazada';a.reviewedAt=today();a.rejectionReason=reason||'';let message=`Hola ${a.name},\n\nTu solicitud de registro en TIVA no fue aprobada en esta revisión.\n\n❌ Motivo: ${a.rejectionReason||'No especificado'}\n\nSi deseas corregir la información o documentación, puedes comunicarte con administración de TIVA.`;logEvent('Rechazo',a,'Motivo: '+(a.rejectionReason||'No especificado'));notifyWhatsApp(a,'Registro rechazado',message);save();$('#reviewModal').classList.add('hidden');render();renderV8();alert('Solicitud rechazada. Se creó una notificación lista para enviar por WhatsApp.');});
$('#reviewClose')?.addEventListener('click',()=>$('#reviewModal').classList.add('hidden')); $('#addBtn')?.addEventListener('click',openNew); $('#close')?.addEventListener('click',()=>$('#modal').classList.add('hidden')); $('#cancel')?.addEventListener('click',()=>$('#modal').classList.add('hidden')); $('#plan')?.addEventListener('change',calc); $('#registration')?.addEventListener('change',calc); $('#search')?.addEventListener('input',render); $('#filter')?.addEventListener('change',render);
$('#form')?.addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target),id=Number(f.get('id')),r=f.get('registration'),p=f.get('plan'),exp=addMonths(r,monthsFor(p));if(id){let x=data.find(a=>a.id===id);Object.assign(x,{name:f.get('name'),service:f.get('service'),city:f.get('city'),phone:f.get('phone'),plan:p,registration:r,expiration:exp,description:f.get('description')});if(!expired(x)&&x.autoExpired){x.active=true;x.autoExpired=false}}else data.push({id:Date.now(),name:f.get('name'),service:f.get('service'),city:f.get('city'),phone:f.get('phone'),plan:p,registration:r,expiration:exp,description:f.get('description'),active:true,exposures:0,requests:0});save();$('#modal').classList.add('hidden');render()});
$('#historyBtn')?.addEventListener('click',()=>$('#history')?.scrollIntoView({behavior:'smooth'})); $('#rotationBtn')?.addEventListener('click',()=>{let p=$('#rotationPanel');if(!p)return;p.classList.toggle('hidden');p.scrollIntoView({behavior:'smooth'})}); $('#nextProvider')?.addEventListener('click',chooseNext);
// V8: eventos, auditoría y cola de notificaciones WhatsApp (simulación local)
let events=JSON.parse(localStorage.getItem('prestadores_v9_events')||localStorage.getItem('prestadores_v8_events')||'[]');
let notifications=JSON.parse(localStorage.getItem('prestadores_v9_notifications')||localStorage.getItem('prestadores_v8_notifications')||'[]');
function persistV8(){localStorage.setItem('prestadores_v9_events',JSON.stringify(events));localStorage.setItem('prestadores_v9_notifications',JSON.stringify(notifications)); if(backendOnline)fetch(API+'/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,applications,renewals,events,notifications})}).catch(()=>{backendOnline=false;updateBackendBadge()})}
function updateBackendBadge(){const el=$('#backendStatus');if(el)el.textContent=backendOnline?'● Base de datos conectada':'● Modo local / backend desconectado';if(el)el.className='backend-status '+(backendOnline?'online':'offline');}
async function bootBackend(){
  try{
    const sr=await fetch(API+'/session',{cache:'no-store'});
    const session=await sr.json();
    window.adminAuthenticated=!!session.authenticated;
    if(window.adminAuthenticated){
      const r=await fetch(API+'/state',{cache:'no-store'}); if(!r.ok) throw new Error();
      const st=await r.json(); data=st.data||[]; applications=st.applications||[]; renewals=st.renewals||[]; events=st.events||[]; notifications=st.notifications||[];
    } else {
      // Clientes deben cargar los prestadores reales desde PostgreSQL.
      // Nunca usamos el localStorage como fuente principal del catálogo público.
      const r=await fetch(API+'/providers',{cache:'no-store'}); if(!r.ok) throw new Error();
      const st=await r.json(); data=st.providers||[];
    }
    backendOnline=true; localStorage.setItem(KEY,JSON.stringify(data)); render(); renderV8();
  }catch(e){ backendOnline=false; }
  updateBackendBadge();
}
function logEvent(action, provider, detail=''){events.push({id:Date.now()+Math.random(),date:new Date().toLocaleString('es-CO'),action,provider:provider?.name||'—',detail});if(events.length>200)events=events.slice(-200);persistV8();}
function normalizePhoneForWa(phone){let d=String(phone||'').replace(/\D/g,'');if(d.length===10&&d.startsWith('3'))d='57'+d;return d}
function waLink(phone,message){let d=normalizePhoneForWa(phone);return d?'https://wa.me/'+d+'?text='+encodeURIComponent(message):''}
function openWhatsAppNotification(id){let n=notifications.find(x=>String(x.id)===String(id));if(!n||!n.phone){alert('Este prestador no tiene un WhatsApp válido.');return}let url=waLink(n.phone,n.message);if(!url)return;window.open(url,'_blank');n.status='enviado';n.sentAt=new Date().toLocaleString('es-CO');persistV8();renderV8();}
function notifyWhatsApp(provider, event, message){if(!provider||!provider.phone)return;notifications.push({id:Date.now()+Math.random(),date:new Date().toLocaleString('es-CO'),provider:provider.name,phone:provider.phone,event,message,status:'pendiente'});if(notifications.length>200)notifications=notifications.slice(-200);persistV8();}
function renderV8(){let nb=$('#notificationBadge'), nbody=$('#notificationsBody'), abody=$('#auditBody');if(nb)nb.textContent=notifications.filter(n=>n.status==='pendiente').length+' pendientes';if(nbody)nbody.innerHTML=notifications.slice().reverse().slice(0,30).map(n=>`<tr><td>${esc(n.date)}</td><td>${esc(n.provider)}</td><td>${esc(n.phone)}</td><td>${esc(n.event)}</td><td>${esc(n.message)}</td><td><span class="status ${n.status==='enviado'?'ok':'bad'}">${n.status==='enviado'?'Enviado':'Pendiente'}</span> ${n.status!=='enviado'?`<button class="renew" onclick="openWhatsAppNotification(${JSON.stringify(n.id)})">💬 Abrir WhatsApp</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6">No hay notificaciones.</td></tr>';if(abody)abody.innerHTML=events.slice().reverse().slice(0,50).map(e=>`<tr><td>${esc(e.date)}</td><td>${esc(e.action)}</td><td><b>${esc(e.provider)}</b></td><td>${esc(e.detail)}</td></tr>`).join('')||'<tr><td colspan="4">No hay acciones registradas.</td></tr>';}
function sendPendingWhatsApp(){let pending=notifications.filter(n=>n.status==='pendiente');pending.forEach(n=>{n.status='enviado'});persistV8();renderV8();if(pending.length)alert(`${pending.length} notificación(es) marcadas como enviadas en modo demo.

Para envío real conectaremos WhatsApp Business Platform.`);}

fillServices();normalizeApplications();render();renderV8();updateBackendBadge();bootBackend();setInterval(()=>{render();renderV8()},60000);

// V18.4 — Renovación mediante Link de Pago Nequi con validación por WhatsApp + servicio
function renewalUrl(){ return window.location.origin + window.location.pathname + '?renovar=1'; }
function renewalMessage(x){ return `🔴 Tu membresía TIVA ha vencido\n\nHola ${x.name}, tu membresía se encuentra vencida y tu perfil actualmente no aparece en las búsquedas de clientes.\n\n🔄 Renueva tu membresía aquí:\n${renewalUrl()}\n\nElige tu plan y realiza el pago desde el enlace de Nequi.\n\n⏱️ IMPORTANTE: TIVA verificará el pago en un plazo de hasta 24 horas hábiles. Los pagos realizados los viernes serán habilitados el lunes hábil, una vez realizada la verificación.\n\nGracias por continuar siendo parte de TIVA.`; }
function openRenewal(){ showView('renewal'); $('#renewalSuccess').classList.add('hidden'); window.scrollTo(0,0); }
function renderRenewalRequests(){
  const body=$('#renewalRequestsBody'), badge=$('#renewalPendingBadge'); if(!body)return;
  const pending=renewals.filter(r=>r.status==='pendiente_verificacion');
  badge.textContent=`${pending.length} pendiente${pending.length===1?'':'s'}`;
  body.innerHTML=pending.slice().reverse().map(r=>`<tr><td>${esc(r.createdAt||r.date||'')}</td><td><b>${esc(r.name||r.providerName||'')}</b><br><small>${esc(r.phone||'')}</small><br><small>${esc(r.city||'')} · ${esc(r.service||'')}</small></td><td>${r.plan==='anual'?'Anual':'Mensual'}</td><td><b>${r.plan==='anual'?'$100.000 COP':'$20.000 COP'}</b><br><small>Nequi · Link de pago</small></td><td><span class="status bad">Pendiente de verificación</span></td><td><div class="review-actions"><button class="primary" onclick="approveRenewal(${JSON.stringify(r.id)})">✅ Aprobar</button><button class="renew" onclick="rejectRenewal(${JSON.stringify(r.id)})">❌ Rechazar</button></div></td></tr>`).join('')||'<tr><td colspan="6">No hay solicitudes de renovación pendientes.</td></tr>';
}
async function approveRenewal(id){
  const r=renewals.find(x=>String(x.id)===String(id)); if(!r)return;
  if(backendOnline){
    try{
      const rr=await fetch(API+'/renewal/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:r.id})});
      const out=await rr.json();
      if(!rr.ok)throw new Error(out.error||'No fue posible aprobar la renovación.');
      const updatedProvider=out.provider, updatedRenewal=out.renewal;
      const idx=data.findIndex(x=>String(x.id)===String(updatedProvider.id));
      if(idx>=0)data[idx]=updatedProvider; else data.push(updatedProvider);
      const ri=renewals.findIndex(x=>String(x.id)===String(updatedRenewal.id));
      if(ri>=0)renewals[ri]=updatedRenewal;
      const history={id:Date.now()+Math.random(),providerId:updatedProvider.id,providerName:updatedProvider.name,plan:updatedRenewal.plan,start:updatedRenewal.start,expiration:updatedRenewal.expiration,date:today(),amount:updatedRenewal.amount||'',paymentMethod:'Nequi / Link de pago TIVA',source:'Pago verificado manualmente en Nequi'};
      renewals.push(history);
      logEvent('Renovación aprobada',updatedProvider,`Pago verificado en Nequi · ${updatedRenewal.plan} · nuevo vencimiento ${updatedRenewal.expiration}`);
      notifyWhatsApp(updatedProvider,'Renovación aprobada',`🎉 ¡Renovación confirmada!\n\nHola ${updatedProvider.name}, tu pago fue verificado correctamente.\n\n✅ Estado: ACTIVO\n📋 Plan: ${updatedRenewal.plan==='anual'?'Anual':'Mensual'}\n📅 Inicio: ${updatedRenewal.start}\n📅 Nueva fecha de vencimiento: ${updatedRenewal.expiration}\n\nGracias por continuar siendo parte de TIVA. 🚀`);
      save(); render(); renderV8(); renderRenewalRequests(); alert('Pago aprobado. El registro existente del prestador fue actualizado y quedó activo.');
      return;
    }catch(err){alert(err.message||'No fue posible aprobar la renovación.');return;}
  }
  const x=data.find(p=>normalizePhoneForWa(p.phone)===normalizePhoneForWa(r.phone) && String(p.service||'').trim().toLowerCase()===String(r.service||'').trim().toLowerCase());
  if(!x){alert('No se encontró un prestador que coincida con WhatsApp y servicio.');return;}
  const start=expired(x)?today():(x.expiration||today()); const plan=r.plan||'mensual'; const exp=addMonths(start,monthsFor(plan));
  x.plan=plan; x.expiration=exp; x.active=true; x.autoExpired=false;
  r.status='aprobada'; r.approvedAt=new Date().toLocaleString('es-CO'); r.providerId=x.id; r.providerName=x.name; r.start=start; r.expiration=exp;
  const history={id:Date.now()+Math.random(),providerId:x.id,providerName:x.name,plan,start,expiration:exp,date:today(),amount:r.amount||'',paymentMethod:'Nequi / Link de pago TIVA',source:'Pago verificado manualmente en Nequi'};
  renewals.push(history); logEvent('Renovación aprobada',x,`Pago verificado en Nequi · ${plan} · nuevo vencimiento ${exp}`);
  notifyWhatsApp(x,'Renovación aprobada',`🎉 ¡Renovación confirmada!\n\nHola ${x.name}, tu pago fue verificado correctamente.\n\n✅ Estado: ACTIVO\n📋 Plan: ${plan==='anual'?'Anual':'Mensual'}\n📅 Inicio: ${start}\n📅 Nueva fecha de vencimiento: ${exp}\n\nGracias por continuar siendo parte de TIVA. 🚀`);
  save(); render(); renderV8(); renderRenewalRequests(); alert('Pago aprobado. El registro existente del prestador fue actualizado y quedó activo.');
}
function rejectRenewal(id){
  const r=renewals.find(x=>String(x.id)===String(id)); if(!r)return; const reason=prompt('Motivo del rechazo del pago:','No fue posible verificar el pago en Nequi.'); if(reason===null)return;
  r.status='rechazada'; r.rejectedAt=new Date().toLocaleString('es-CO'); r.rejectionReason=reason||'No especificado';
  const x=data.find(p=>normalizePhoneForWa(p.phone)===normalizePhoneForWa(r.phone)) || {name:r.name,phone:r.phone};
  logEvent('Renovación rechazada',x,`Motivo: ${r.rejectionReason}`);
  notifyWhatsApp(x,'Pago no verificado',`⚠️ Hola ${r.name||x.name}, no pudimos verificar tu pago.\n\nMotivo: ${r.rejectionReason}\n\nPuedes volver a solicitar la renovación aquí:\n${renewalUrl()}\n\n⏱️ TIVA verifica los pagos en un plazo de hasta 24 horas hábiles. Los pagos realizados los viernes serán habilitados el lunes hábil, una vez verificados.`);
  save(); renderV8(); renderRenewalRequests(); alert('Solicitud rechazada y notificación preparada para WhatsApp.');
}
function initV18_2(){
  const rs=$('#renewalService'); if(rs) rs.innerHTML='<option value="">Selecciona un servicio</option>'+SERVICES.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
  const planSelect=$('#renewalPlan'), paymentText=$('#paymentAmountText'), paymentBtn=$('#paymentLinkBtn'), benefits=$('#membershipBenefits');
  const phoneInput=$('#renewalRequestForm input[name="phone"]'), serviceInput=rs, validationBox=$('#renewalProviderValidation');
  const paymentLinks={mensual:'https://checkout.nequi.wompi.co/l/svhoxW',anual:'https://checkout.nequi.wompi.co/method'};
  const paymentAmounts={mensual:'20000',anual:'100000'};
  const benefitText={
    mensual:'Vigencia de 30 días. Mantén tu perfil activo en TIVA, visible para clientes y disponible para recibir contactos por WhatsApp durante el período de la membresía.',
    anual:'Vigencia de 12 meses. Mantén tu perfil activo durante todo el año y ahorra frente al pago mensual. Ideal si quieres permanecer en TIVA sin renovar cada mes.'
  };
  let renewalProviderValid=false, renewalLookupTimer=null;
  function setValidation(ok,message){ renewalProviderValid=!!ok; if(validationBox){validationBox.className=ok?'validation-message ok':'validation-message bad';validationBox.innerHTML=message||'';} if(paymentBtn)paymentBtn.disabled=!ok || !paymentLinks[planSelect?.value||'']; }
  async function validateRenewalProvider(showRequired=false){
    const phone=String(phoneInput?.value||'').trim(), service=String(serviceInput?.value||'').trim();
    if(!phone||!service){setValidation(false,showRequired?'Completa WhatsApp y servicio para validar el prestador.':'');return false;}
    setValidation(false,'🔎 Verificando que el prestador esté registrado...');
    try{
      const rr=await fetch(API+'/provider-lookup?phone='+encodeURIComponent(phone)+'&service='+encodeURIComponent(service));
      const out=await rr.json();
      if(out.exists){const p=out.provider||{}; setValidation(true,`✅ <b>Prestador encontrado:</b> ${esc(p.name||'')} · ${esc(p.service||service)}.<br><small>${p.expired?'Tu membresía está vencida y puede renovarse.':p.active?'Tu membresía está activa. La nueva vigencia se agregará al finalizar la actual.':'Tu registro existe y puede continuar con la renovación.'}</small>`); return true;}
      setValidation(false,'❌ <b>Prestador no encontrado.</b> '+esc(out.message||'Verifica tu número de WhatsApp y servicio.')); return false;
    }catch(err){
      const local=data.find(p=>normalizePhoneForWa(p.phone)===normalizePhoneForWa(phone) && String(p.service||'').trim().toLowerCase()===service.toLowerCase());
      if(local){setValidation(true,`✅ <b>Prestador encontrado:</b> ${esc(local.name||'')} · ${esc(local.service||service)}.`);return true;}
      setValidation(false,'⚠️ No fue posible validar el registro en este momento. Intenta nuevamente.'); return false;
    }
  }
  function scheduleRenewalValidation(){clearTimeout(renewalLookupTimer);renewalLookupTimer=setTimeout(()=>validateRenewalProvider(false),350);}
  phoneInput?.addEventListener('input',scheduleRenewalValidation); phoneInput?.addEventListener('blur',()=>validateRenewalProvider(false)); serviceInput?.addEventListener('change',()=>validateRenewalProvider(false));
  function syncPaymentLink(){
    const plan=planSelect?.value||'';
    if(paymentText) paymentText.innerHTML=plan==='mensual'?'Membresía mensual: <b>$20.000 COP</b>':plan==='anual'?'Membresía anual: <b>$100.000 COP</b>':'Selecciona una membresía para continuar.';
    if(benefits) benefits.innerHTML=plan&&benefitText[plan]?`<p><b>${plan==='anual'?'⭐ Membresía anual':'🟢 Membresía mensual'}</b></p><p>${benefitText[plan]}</p>`:'<p>Selecciona una opción para conocer brevemente su vigencia y beneficios.</p>';
    if(paymentBtn){ paymentBtn.disabled=!renewalProviderValid || !paymentLinks[plan]; paymentBtn.textContent=paymentLinks[plan]?`Pagar ${plan==='anual'?'$100.000':'$20.000'} con Nequi`:'Pagar con Nequi'; }
  }
  planSelect?.addEventListener('change',syncPaymentLink); syncPaymentLink();
  $('#navRenewal')?.addEventListener('click',e=>{e.preventDefault();openRenewal()}); $('#renewHomeBtn')?.addEventListener('click',()=>showView('landing'));
  $('#renewalRequestForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const f=new FormData(e.target), plan=f.get('plan'), expectedAmounts={mensual:'20000',anual:'100000'};
    if(!expectedAmounts[plan]){alert('Selecciona una membresía válida.');return;}
    if(!CITIES.includes(String(f.get('city')||''))){alert('Selecciona una ciudad válida.');return;}
    const valid=await validateRenewalProvider(true); if(!valid){return;}
    const request={id:Date.now()+Math.random(),createdAt:new Date().toLocaleString('es-CO'),name:String(f.get('name')||'').trim(),phone:String(f.get('phone')||'').trim(),city:String(f.get('city')||'').trim(),service:String(f.get('service')||''),plan,amount:expectedAmounts[plan],status:'pendiente_verificacion',paymentMethod:'Nequi / Link de pago TIVA'};
    if(!request.name||!request.phone||!request.service){alert('Completa todos los datos requeridos.');return;}
    try{
      let stored={...request};
      if(backendOnline){const rr=await fetch(API+'/renewal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(stored)}); const out=await rr.json(); if(!rr.ok)throw new Error(out.error||'No fue posible registrar la solicitud.'); stored=out.renewal||stored;}
      renewals.push(stored); logEvent('Solicitud de renovación',stored,`Plan ${plan==='anual'?'anual':'mensual'} · pago iniciado en Nequi · verificación: hasta 24 horas hábiles`); save();
      const url=paymentLinks[plan];
      $('#renewalSuccess').innerHTML='✅ <b>Solicitud registrada.</b><br><br>Ahora serás llevado a la plataforma de pago de Nequi para completar el pago.<br><br>⏱️ TIVA verificará el pago en un plazo de hasta <b>24 horas hábiles</b>. Los pagos realizados los <b>viernes</b> serán habilitados el <b>lunes hábil</b>, una vez realizada la verificación.';
      $('#renewalSuccess').classList.remove('hidden');
      setTimeout(()=>{window.location.href=url;},250);
    }catch(err){alert(err.message||'No fue posible registrar la solicitud. Verifica que el servidor esté disponible e intenta nuevamente.');}
  });
  const oldRender=render; window.render=()=>{oldRender();renderRenewalRequests();};
  renderRenewalRequests();
  if(new URLSearchParams(location.search).get('renovar')==='1') setTimeout(openRenewal,50);
}
initV18_2();

initV14();
if(document.body.classList.contains('admin-page') || $('#adminView')){ setTimeout(()=>showView('admin'),0); }
