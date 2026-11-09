// Acceso con enlace mágico: solo se envía si el correo tiene usuario en Progress.
// Si el correo es del otro tipo (equipo/cliente), el enlace lleva a su vista correcta.
window.requestAccessLink = async function (sb, email, here /* 'client' | 'member' */) {
  email = String(email || '').trim().toLowerCase();
  const base = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
  const { data, error } = await sb.functions.invoke('check-access', { body: { email } });
  if (error) return { ok: false, text: 'No pudimos verificar tu correo. Intenta de nuevo en un momento.' };
  if (!data?.kind) {
    return { ok: false, text: here === 'member'
      ? 'No hay ningún usuario del equipo asociado a este correo. Pide que te creen como usuario en GHL.'
      : 'No hay ningún usuario asociado a este correo. Si eres cliente de Ideas en Movimiento, escríbenos y te damos acceso.' };
  }
  const target = data.kind === 'member' ? 'team.html' : 'portal.html';
  const { error: e2 } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: base + target } });
  if (e2) return { ok: false, text: 'No pudimos enviar el enlace. Intenta de nuevo en unos minutos.' };
  const other = data.kind !== here;
  return { ok: true, text: '📩 Te enviamos el enlace. Revisa tu correo y ábrelo en este mismo dispositivo.' +
    (other ? (data.kind === 'member' ? ' (Este correo es del equipo: entrarás a Staff.)' : ' (Este correo es de cliente: entrarás a tu portal.)') : '') };
};

// Acceso con clave (no depende de que llegue un correo).
window.signInWithPassword = async function (sb, email, password) {
  email = String(email || '').trim().toLowerCase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) return { ok: true };
  return { ok: false, text: /invalid/i.test(error.message)
    ? 'Correo o clave incorrectos. Si aún no tienes clave, pídesela a un administrador (Santiago o Evelyn) o usa “Recibir enlace por correo”.'
    : 'No pudimos entrar. Intenta de nuevo en un momento.' };
};

// Formulario de acceso: clave por defecto; el enlace por correo queda como alternativa.
window.wireLogin = function (sb, { form, email, password, sendBtn, linkBtn, okEl, errEl, here }) {
  const $ = (el) => (typeof el === 'string' ? document.getElementById(el) : el);
  const show = (el, text) => { $(el).textContent = text; $(el).classList.remove('hidden'); };
  const reset = () => { $(okEl).classList.add('hidden'); $(errEl).classList.add('hidden'); };
  $(form).addEventListener('submit', async (e) => {
    e.preventDefault(); reset();
    $(sendBtn).disabled = true;
    const r = await signInWithPassword(sb, $(email).value, $(password).value);
    $(sendBtn).disabled = false;
    if (!r.ok) show(errEl, r.text);
  });
  $(linkBtn).addEventListener('click', async () => {
    reset();
    if (!$(email).value.trim()) { show(errEl, 'Escribe tu correo primero.'); $(email).focus(); return; }
    $(linkBtn).disabled = true;
    const r = await requestAccessLink(sb, $(email).value, here);
    $(linkBtn).disabled = false;
    show(r.ok ? okEl : errEl, r.text);
  });
};

// Ventana "Mi cuenta": cambiar la clave y salir.
window.openAccountDialog = function (sb) {
  let dlg = document.getElementById('accountDlg');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'accountDlg';
    dlg.className = 'card account-dlg';
    dlg.innerHTML = `
      <h2 style="margin:0 0 4px;font-size:20px">Mi cuenta</h2>
      <p class="small muted" id="accEmail" style="margin:0 0 14px"></p>
      <form id="accForm" method="dialog">
        <label for="accPass">Nueva clave</label>
        <input id="accPass" type="password" minlength="8" required autocomplete="new-password" placeholder="Mínimo 8 caracteres">
        <label for="accPass2">Repítela</label>
        <input id="accPass2" type="password" minlength="8" required autocomplete="new-password">
        <div id="accMsg" class="small hidden" style="margin-top:12px"></div>
        <div class="row" style="margin-top:18px;justify-content:space-between">
          <button type="button" class="ghost" id="accOut">Salir de Progress</button>
          <div class="row"><button type="button" class="secondary" id="accClose">Cerrar</button>
          <button type="submit" id="accSave">Guardar clave</button></div>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    const msg = (t, ok) => { const m = dlg.querySelector('#accMsg'); m.textContent = t; m.style.color = ok ? 'var(--ok)' : 'var(--danger, #c0392b)'; m.classList.remove('hidden'); };
    dlg.querySelector('#accClose').onclick = () => dlg.close();
    dlg.querySelector('#accOut').onclick = async () => { await sb.auth.signOut(); location.reload(); };
    dlg.querySelector('#accForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = dlg.querySelector('#accPass').value, p2 = dlg.querySelector('#accPass2').value;
      if (p1.length < 8) return msg('La clave debe tener al menos 8 caracteres.');
      if (p1 !== p2) return msg('Las dos claves no coinciden.');
      dlg.querySelector('#accSave').disabled = true;
      const { error } = await sb.auth.updateUser({ password: p1 });
      dlg.querySelector('#accSave').disabled = false;
      if (error) return msg(/different/i.test(error.message) ? 'La nueva clave debe ser distinta de la actual.' : 'No pudimos guardar la clave. Intenta de nuevo.');
      dlg.querySelector('#accForm').reset();
      msg('✅ Clave guardada. Desde ahora entra con tu correo y esta clave.', true);
    });
  }
  sb.auth.getUser().then(({ data }) => { dlg.querySelector('#accEmail').textContent = data?.user?.email ?? ''; });
  dlg.querySelector('#accMsg').classList.add('hidden');
  dlg.showModal();
};
