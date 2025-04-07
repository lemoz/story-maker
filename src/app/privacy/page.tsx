export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-purple max-w-none">
        <h2>1. Information We Collect</h2>
        <p>
          We collect information that you provide directly to us, including:
        </p>
        <ul>
          <li>Email address and account information</li>
          <li>Story content and images you create</li>
          <li>Payment information (processed securely by Stripe)</li>
          <li>Usage data and preferences</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and improve our services</li>
          <li>Process your payments</li>
          <li>Send you updates and marketing communications (if opted in)</li>
          <li>Analyze and improve our platform</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We do not sell your personal information. We may share your
          information with:
        </p>
        <ul>
          <li>Service providers who assist in our operations</li>
          <li>Legal authorities when required by law</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement appropriate security measures to protect your personal
          information. However, no method of transmission over the internet is
          100% secure.
        </p>

        <h2>5. Children's Privacy</h2>
        <p>
          Our service is intended for use by adults. We do not knowingly collect
          personal information from children under 13.
        </p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your information</li>
          <li>Opt out of marketing communications</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>
          We use cookies and similar technologies to improve user experience and
          analyze platform usage.
        </p>

        <h2>8. Changes to Privacy Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify
          you of any material changes.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at
          privacy@storymaker.com.
        </p>
      </div>
    </div>
  );
}
