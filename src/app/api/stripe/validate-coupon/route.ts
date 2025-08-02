import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
}) : null

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const { couponCode } = await request.json()

    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      )
    }

    try {
      // Try to retrieve the coupon/promotion code
      let coupon: Stripe.Coupon | null = null
      let promotionCode: Stripe.PromotionCode | null = null

      // First, try to find it as a promotion code
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: couponCode.trim().toUpperCase(),
          limit: 1
        })

        if (promotionCodes.data.length > 0) {
          promotionCode = promotionCodes.data[0]
          if (promotionCode.coupon) {
            coupon = promotionCode.coupon
          }
        }
      } catch (error) {
        console.log('Not found as promotion code, trying as coupon ID')
      }

      // If not found as promotion code, try as coupon ID
      if (!coupon) {
        try {
          coupon = await stripe.coupons.retrieve(couponCode.trim())
        } catch (error) {
          console.log('Not found as coupon ID either')
        }
      }

      if (!coupon) {
        return NextResponse.json({
          valid: false,
          error: 'Invalid coupon code'
        })
      }

      // Check if coupon is valid
      if (!coupon.valid) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon is no longer valid'
        })
      }

      // Check if coupon has expired
      if (coupon.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon has expired'
        })
      }

      // Check usage limits for promotion codes
      if (promotionCode) {
        if (promotionCode.max_redemptions && promotionCode.times_redeemed >= promotionCode.max_redemptions) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon has reached its usage limit'
          })
        }

        if (promotionCode.expires_at && promotionCode.expires_at < Math.floor(Date.now() / 1000)) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon has expired'
          })
        }
      }

      // Check usage limits for coupons
      if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon has reached its usage limit'
        })
      }

      // Return valid coupon info
      const discount = {
        type: coupon.percent_off ? 'percent' : 'amount',
        amount: coupon.percent_off || coupon.amount_off || 0,
        name: coupon.name || 'Discount'
      }

      return NextResponse.json({
        valid: true,
        discount,
        couponId: coupon.id,
        promotionCodeId: promotionCode?.id
      })

    } catch (error) {
      console.error('Error validating coupon:', error)
      return NextResponse.json({
        valid: false,
        error: 'Invalid coupon code'
      })
    }

  } catch (error) {
    console.error('Coupon validation failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to validate coupon',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}