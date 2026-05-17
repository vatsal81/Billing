/**
 * Simple toast notification utility — replaces browser alert() popups.
 * Injects a styled toast div into the DOM without any external library.
 */
export function showToast(message, type = 'info') {
  // Remove any existing toast so they don't stack
  const existing = document.getElementById('app-toast-notification');
  if (existing) existing.remove();

  const colors = {
    info:    { bg: '#1e293b', border: '#334155', icon: 'ℹ️' },
    success: { bg: '#064e3b', border: '#065f46', icon: '✅' },
    error:   { bg: '#7f1d1d', border: '#991b1b', icon: '❌' },
    warning: { bg: '#78350f', border: '#92400e', icon: '⚠️' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.id = 'app-toast-notification';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: ${c.bg};
    border: 1px solid ${c.border};
    color: #f1f5f9;
    padding: 14px 20px;
    border-radius: 12px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.92rem;
    font-weight: 500;
    max-width: 380px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    line-height: 1.4;
  `;

  // Add keyframe animation once
  if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.textContent = `
      @keyframes toastIn {
        from { opacity: 0; transform: translateY(16px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to   { opacity: 0; transform: translateY(8px) scale(0.95); }
      }
    `;
    document.head.appendChild(style);
  }

  toast.innerHTML = `<span style="font-size:1.1rem">${c.icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  // Auto-dismiss after 3.5 seconds
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(() => toast.remove(), 260);
  }, 3500);
}
