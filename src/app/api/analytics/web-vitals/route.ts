import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const metrics = await request.json()
    
    // Log Core Web Vitals for monitoring
    console.log('Core Web Vitals:', {
      name: metrics.name,
      value: metrics.value,
      id: metrics.id,
      timestamp: metrics.timestamp,
      url: metrics.url,
      rating: getVitalRating(metrics.name, metrics.value)
    })
    
    // In production, you might want to send this to a monitoring service
    // like Google Analytics, DataDog, or custom analytics endpoint
    
    if (process.env.NODE_ENV === 'production') {
      // Send to external monitoring service
      // await sendToMonitoringService(metrics)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Web vitals recorded' 
    })
  } catch (error) {
    console.error('Error recording web vitals:', error)
    return NextResponse.json(
      { error: 'Failed to record web vitals' },
      { status: 500 }
    )
  }
}

function getVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  // Core Web Vitals thresholds
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 }
  }
  
  const threshold = thresholds[name as keyof typeof thresholds]
  if (!threshold) return 'good'
  
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

// async function sendToMonitoringService(metrics: any) {
//   // Example: Send to Google Analytics 4
//   if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
//     await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`, {
//       method: 'POST',
//       body: JSON.stringify({
//         client_id: 'web-vitals-client',
//         events: [{
//           name: 'web_vitals',
//           params: {
//             metric_name: metrics.name,
//             metric_value: metrics.value,
//             metric_id: metrics.id,
//             page_url: metrics.url
//           }
//         }]
//       })
//     })
//   }
// }