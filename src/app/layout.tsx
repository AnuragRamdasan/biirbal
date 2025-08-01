import type { Metadata } from "next";
import "./globals.css";
import "antd/dist/reset.css";
import { generateMetadata, jsonLd } from '@/lib/seo';
import Script from 'next/script';

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
        <link rel="dns-prefetch" href="https://slack.com" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Performance & Security */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body
        className="antialiased font-sans"
      >
        {children}
        
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
          </>
        )}
      </body>
    </html>
  );
}
