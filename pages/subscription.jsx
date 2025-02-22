import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
);

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 10,
    features: [
      "Up to 100 articles/month",
      "2 channels",
      "Standard quality TTS",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 25,
    features: [
      "Up to 500 articles/month",
      "10 channels",
      "Premium quality TTS",
    ],
  },
];

export default function Subscription() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (priceId) => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Choose Your Plan</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {PLANS.map((plan) => (
          <div key={plan.id} className="border rounded-lg p-6">
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className="text-3xl font-bold mt-4">${plan.price}/month</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading}
              className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
