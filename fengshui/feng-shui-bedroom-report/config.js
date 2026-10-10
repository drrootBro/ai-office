// Deploy-time settings. The only values that change between environments.
window.APP_CONFIG = {
  // Lemon Squeezy checkout link (live), $9 one-time.
  // In Lemon Squeezy: Product -> Confirmation modal -> Button link, set to
  //   https://<your-site>/feng-shui-bedroom-report/?paid=1
  PAYMENT_LINK: 'https://rootbro.lemonsqueezy.com/checkout/buy/fcdc0f91-ca1f-41d0-811e-21d34b85c342',
  PAYMENT_PROVIDER: 'Lemon Squeezy',
  // Legacy key from the Stripe plan; used only if PAYMENT_LINK is empty.
  STRIPE_PAYMENT_LINK: '',
  // While no payment link is set, show a "Demo unlock" button so reviewers can see the full report.
  DEMO_UNLOCK_WHEN_NO_LINK: true,
  PRICE_LABEL: '$9'
};
