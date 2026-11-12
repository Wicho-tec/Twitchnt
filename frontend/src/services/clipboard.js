export async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // The practice uses HTTP; the Clipboard API requires HTTPS outside localhost.
  const field = document.createElement('textarea');
  field.value = text;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  try {
    if (!document.execCommand('copy')) throw new Error('No se pudo copiar. Selecciona y copia el texto manualmente.');
  } finally { field.remove(); }
}
