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
