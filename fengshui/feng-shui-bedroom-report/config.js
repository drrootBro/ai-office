// Deploy-time settings. The only values that change between environments.
window.APP_CONFIG = {
  // Lemon Squeezy checkout link (test mode), $9 one-time.
  // In Lemon Squeezy: Product -> Confirmation modal -> Button link, set to
  //   https://<your-site>/feng-shui-bedroom-report/?paid=1
  PAYMENT_LINK: 'https://rootbro.lemonsqueezy.com/checkout/buy/824d0d81-3f9d-46ec-a003-04b82d2a8615',
  PAYMENT_PROVIDER: 'Lemon Squeezy',
  // Legacy key from the Stripe plan; used only if PAYMENT_LINK is empty.
  STRIPE_PAYMENT_LINK: '',
  // While no payment link is set, show a "Demo unlock" button so reviewers can see the full report.
  DEMO_UNLOCK_WHEN_NO_LINK: true,
  PRICE_LABEL: '$9'
};
