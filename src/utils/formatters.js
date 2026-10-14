// Data formatters and privacy masking helpers

export function formatINR(amount) {
  if (amount === undefined || amount === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function maskPan(pan) {
  if (!pan || pan.length < 10) return 'XXXXX0000X';
  return `${pan.slice(0, 3)}****${pan.slice(-2)}`;
}

export function maskBankAccount(acc) {
  if (!acc || acc.length < 6) return '••••••••1234';
  return `••••••••${acc.slice(-4)}`;
}

export function maskPhone(phone) {
  if (!phone) return '+91 ••••• •••••';
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    return `+91 ${clean.slice(-10, -6)}•• ••${clean.slice(-2)}`;
  }
  return phone;
}

export function maskNameForDeepLevel(name, level) {
  if (level <= 1) return name; // Direct child shows full name
  const parts = name.split(' ');
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return `${name.slice(0, 3)}***`;
}
