const APP_NAME = 'Intelligent Document Organizer';

/**
 * Request permission to show browser/system notifications.
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return Notification.requestPermission();
}

/**
 * Show a system-level browser notification.
 */
export function showNotification(title, options = {}) {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission has not been granted.');
    return null;
  }

  return new Notification(title, {
    icon: '/favicon.ico',
    ...options,
  });
}