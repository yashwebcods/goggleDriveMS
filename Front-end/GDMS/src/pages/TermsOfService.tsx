import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="mt-2 text-sm text-gray-600">Effective date: {new Date().toISOString().slice(0, 10)}</p>
          </div>

          <Link
            to="/login"
            className="text-sm text-gray-900 underline underline-offset-4 hover:text-black"
          >
            Back to login
          </Link>
        </div>

        <div className="mt-8 space-y-6 text-gray-800 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of terms</h2>
            <p>
              By accessing or using this application (the “Service”), you agree to be bound by these
              Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">2. Description of the Service</h2>
            <p>
              The Service provides document and folder management features and may integrate with
              Google Drive to help you organize, access, and manage files.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">3. Accounts and authentication</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and for all
              activity that occurs under your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">4. Google Drive and API usage</h2>
            <p>
              If you connect Google Drive, you authorize the Service to access Google Drive data
              according to the Google OAuth scopes you grant. You are responsible for ensuring you
              have rights to any content you upload or manage.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">5. Prohibited activities</h2>
            <p>You agree not to:</p>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Misuse the Service:</span> interfere with security,
                attempt unauthorized access, or disrupt functionality.
              </p>
              <p>
                <span className="font-semibold">Violate laws or rights:</span> upload or manage content
                that infringes intellectual property or violates applicable laws.
              </p>
              <p>
                <span className="font-semibold">Abuse Google APIs:</span> use the Service in a way that
                violates Google’s policies or the Google API Services User Data Policy.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">6. Availability and changes</h2>
            <p>
              We may modify, suspend, or discontinue the Service at any time. We may also update
              these Terms from time to time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">7. Disclaimer</h2>
            <p>
              The Service is provided “as is” and “as available” without warranties of any kind.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, the Service will not be liable for indirect,
              incidental, special, consequential, or punitive damages.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">9. Termination</h2>
            <p>
              We may suspend or terminate access to the Service if we reasonably believe you have
              violated these Terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">10. Contact</h2>
            <p>
              For questions about these Terms, contact: <span className="font-semibold">[YOUR_CONTACT_EMAIL]</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
