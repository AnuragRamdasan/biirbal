import type { Metadata } from "next";
import "./globals.css";
import "antd/dist/reset.css";
import { generateMetadata, jsonLd } from '@/lib/seo';
import Script from 'next/script';
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = generateMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data */}
        <Script
          id="structured-data-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd.organization),
          }}
        />
        <Script
          id="structured-data-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd.website),
          }}
        />
        <Script
          id="structured-data-software"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd.software),
          }}
        />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        {/* Removed Slack-specific DNS prefetch */}
        
        {/* Theme Color */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Geographic SEO */}
        <meta name="geo.country" content="US" />
        <meta name="geo.region" content="US-CA" />
        <meta name="geo.city" content="San Francisco" />
        <meta name="geo.placename" content="San Francisco, California" />
        <meta name="geo.position" content="37.7749;-122.4194" />
        <meta name="ICBM" content="37.7749, -122.4194" />
        
        {/* Language and Regional */}
        <meta name="language" content="English" />
        <meta name="content-language" content="en-US" />
        <meta name="distribution" content="global" />
        <meta name="audience" content="all" />
        <meta name="target" content="all" />
        
        {/* Mobile and Responsive */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        
        {/* Search Engine Optimization */}
        <meta name="revisit-after" content="1 day" />
        <meta name="rating" content="general" />
        <meta name="classification" content="business" />
        <meta name="category" content="Business Software" />
        <meta name="coverage" content="worldwide" />
        <meta name="googlebot" content="index,follow,snippet,archive" />
        <meta name="bingbot" content="index,follow" />
        <meta name="slurp" content="index,follow" />
        
        {/* Performance & Security */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()" />
        
        {/* Rich Snippets Support */}
        <meta name="application-name" content="Biirbal" />
        <meta name="msapplication-tooltip" content="AI-Powered Audio Summaries" />
        <meta name="msapplication-starturl" content="/" />
        <meta name="msapplication-navbutton-color" content="#6366f1" />
        
        {/* International SEO */}
        <link rel="alternate" hrefLang="en" href="https://www.biirbal.com/" />
        <link rel="alternate" hrefLang="en-US" href="https://www.biirbal.com/" />
        <link rel="alternate" hrefLang="x-default" href="https://www.biirbal.com/" />
      </head>
      <body
        className="antialiased font-sans"
      >
        <SessionProvider>
          {children}
        </SessionProvider>
        
        {/* Analytics Scripts */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics 4 */}
            {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
              <>
                <Script
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
                  strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                  {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    
                    gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                      // Enhanced measurement settings
                      enhanced_measurement: true,
                      page_title: document.title,
                      page_location: window.location.href,
                      
                      // Custom dimensions for SaaS tracking
                      custom_map: {
                        'custom_parameter_1': 'team_id',
                        'custom_parameter_2': 'plan_type',
                        'custom_parameter_3': 'usage_percentage',
                        'custom_parameter_4': 'team_size'
                      },
                      
                      // E-commerce tracking
                      send_page_view: true,
                      
                      // Privacy settings
                      anonymize_ip: true,
                      allow_google_signals: false,
                      allow_ad_personalization_signals: false
                    });
                    
                    // Set default user properties for SaaS tracking
                    gtag('set', {
                      'app_name': 'Biirbal',
                      'app_version': '1.0.0',
                      'content_group1': 'SaaS Application'
                    });
                  `}
                </Script>
              </>
            )}
            
            {/* Hotjar */}
            {process.env.NEXT_PUBLIC_HOTJAR_ID && (
              <Script id="hotjar" strategy="afterInteractive">
                {`
                  (function(h,o,t,j,a,r){
                    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                    h._hjSettings={hjid:${process.env.NEXT_PUBLIC_HOTJAR_ID},hjsv:6};
                    a=o.getElementsByTagName('head')[0];
                    r=o.createElement('script');r.async=1;
                    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                    a.appendChild(r);
                  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
                `}
              </Script>
            )}

            {/* ZapDigits Analytics */}
            <Script
              src="https://www.zapdigits.com/script/track.js"
              data-site-id="9"
              strategy="afterInteractive"
            />
          </>
        )}
      </body>
    </html>
  );
}
