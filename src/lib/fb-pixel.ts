// Facebook Pixel ID
export const FB_PIXEL_ID = '590024414092578'

// Initialize Facebook Pixel
export const initFacebookPixel = () => {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if the pixel is already initialized
  if (window.fbq) {
    return window.fbq;
  }

  // Initialize the Facebook Pixel
  window.fbq = function() {
    // @ts-ignore
    window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
  };

  // Initialize the queue if it doesn't exist
  if (!window._fbq) {
    window._fbq = window.fbq;
  }

  // Set up the pixel
  window.fbq.push = window.fbq;
  window.fbq.loaded = true;
  window.fbq.version = '2.0';
  window.fbq.queue = [];

  console.log("Meta Pixel: Manual initialization");
  
  // Load the pixel code
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  
  script.onload = () => {
    // Initialize when the script loads
    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
    console.log("Meta Pixel: Script loaded & PageView tracked");
  };
  
  // Find the first script tag and insert our script before it
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    // If no script tag is found, append to head
    document.head.appendChild(script);
  }
  
  // Create the noscript pixel image
  const noscript = document.createElement('noscript');
  const img = document.createElement('img');
  img.height = 1;
  img.width = 1;
  img.style.display = 'none';
  img.src = `https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`;
  noscript.appendChild(img);
  
  document.head.appendChild(noscript);
  
  return window.fbq;
};

// Helper function to track Facebook pixel events
export const trackPixelEvent = (event: string, options = {}) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Ensure fbq is available
  if (!window.fbq) {
    console.warn(`Meta Pixel: Attempting to initialize before tracking ${event}`);
    initFacebookPixel();
  }
  
  // Track the event
  if (window.fbq) {
    if (['PageView', 'Lead', 'CompleteRegistration', 'Contact', 'InitiateCheckout', 'Purchase'].includes(event)) {
      window.fbq('track', event, options);
    } else {
      window.fbq('trackCustom', event, options);
    }
    console.log(`Meta Pixel: Tracked ${event}`, options);
  } else {
    console.error(`Meta Pixel: Failed to track ${event} - fbq still not available`);
  }
};

// Add TypeScript support
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}