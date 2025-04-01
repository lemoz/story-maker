'use client'

import { useEffect } from 'react'
import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"

// Meta Pixel ID
const FB_PIXEL_ID = '590024414092578'

// Helper function to track Facebook events
export const trackFBEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    // For standard events use track, for custom events use trackCustom
    if (
      ['PageView', 'Lead', 'CompleteRegistration', 'Contact', 'InitiateCheckout', 'Purchase'].includes(eventName)
    ) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('trackCustom', eventName, params);
    }
    console.log(`Meta Pixel: Tracked event "${eventName}"`, params);
  } else {
    console.warn(`Meta Pixel: Unable to track "${eventName}" - fbq not available`);
  }
};

export function MetaPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track page view on route change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Add trackFBEvent to window object for global access
      window.trackFBEvent = trackFBEvent;
      
      // Track page view on route change
      if (window.fbq) {
        window.fbq('track', 'PageView');
        console.log(`Meta Pixel: Tracked PageView for ${pathname}`);
      } else {
        console.warn("Meta Pixel: fbq not available for tracking PageView");
      }
    }
  }, [pathname, searchParams]);

  // Handle script load event
  const handleScriptLoad = () => {
    console.log("Meta Pixel: Script loaded successfully");
    if (typeof window !== 'undefined') {
      if (window.fbq) {
        // Make sure we track the initial page view
        window.fbq('track', 'PageView');
        console.log(`Meta Pixel: Manually tracked initial PageView`);
      } else {
        console.error("Meta Pixel: fbq not defined after script load");
      }
    }
  };

  return (
    <>
      {/* Meta Pixel Base Code */}
      <Script 
        id="facebook-pixel"
        strategy="beforeInteractive" 
        onLoad={handleScriptLoad}
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');
            console.log("Meta Pixel: Base code initialized");
          `
        }}
      />
      
      {/* Inline script as a fallback */}
      <Script id="facebook-pixel-fallback">
        {`
          if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
            console.log("Meta Pixel: Fallback check - fbq is available");
          } else {
            console.warn("Meta Pixel: Fallback check - fbq is NOT available");
            
            // Try to reinitialize if missing
            if (typeof window !== 'undefined' && !window.fbq) {
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              
              if (window.fbq) {
                window.fbq('init', '${FB_PIXEL_ID}');
                window.fbq('track', 'PageView');
                console.log("Meta Pixel: Reinitialized via fallback");
              }
            }
          }
        `}
      </Script>
      
      {/* Noscript fallback */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}

// Add TypeScript support for fbq and our tracking function
declare global {
  interface Window {
    fbq: any;
    trackFBEvent: typeof trackFBEvent;
  }
}