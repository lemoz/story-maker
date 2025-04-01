import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SessionProvider } from "@/components/providers/session-provider";
import { MetaPixel } from "@/components/meta-pixel";
import "./globals.css";

// Import additional pixel initialization script
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EpicStory Creator",
  description: "Generate personalized AI children's stories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Inline Meta Pixel Base Code */}
        <Script id="facebook-pixel-base" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '590024414092578');
            fbq('track', 'PageView');
          `}
        </Script>
        {/* Noscript fallback */}
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=590024414092578&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {/* Component-based implementation */}
          <MetaPixel />
          {/* Direct manual init in case component approach fails */}
          <Script id="fb-pixel-init" strategy="afterInteractive">
            {`
              (function() {
                if (typeof window !== 'undefined') {
                  // Manual check and init
                  if (!window.fbq) {
                    console.warn("Meta Pixel: fbq not found at render time, initializing manually");
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    
                    if (window.fbq) {
                      window.fbq('init', '590024414092578');
                      window.fbq('track', 'PageView');
                      console.log("Meta Pixel: Manual init successful");
                    }
                  } else {
                    console.log("Meta Pixel: fbq already available");
                    window.fbq('track', 'PageView');
                  }
                }
              })();
            `}
          </Script>
          {children}
          <Toaster richColors position="bottom-center" />
          <Analytics />
        </SessionProvider>
      </body>
    </html>
  );
}
