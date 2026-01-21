import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
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
            <h2 className="text-xl font-semibold text-gray-900">1. Overview</h2>
            <p>
              This Privacy Policy explains how this application (the “Service”) collects, uses, and
              protects information when you sign in and use Google Drive features.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">2. Information we collect</h2>
            <p>
              The Service may collect and process the following categories of information:
            </p>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Account information:</span> your email address and basic
                profile information (such as name) provided by Google during sign-in.
              </p>
              <p>
                <span className="font-semibold">Google Drive data:</span> files and folders that you
                choose to view, upload, organize, or share within the Service. The Service only
                accesses Google Drive data according to the Google OAuth scopes you authorize.
              </p>
              <p>
                <span className="font-semibold">Usage and technical data:</span> basic logs needed for
                security, debugging, and feature reliability (for example request timestamps and
                error messages).
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">3. How we use information</h2>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Authentication:</span> to sign you in and maintain your
                session.
              </p>
              <p>
                <span className="font-semibold">Google Drive features:</span> to provide document
                management features such as listing folders, viewing file metadata, uploading files,
                and applying access controls based on your actions.
              </p>
              <p>
                <span className="font-semibold">Security and abuse prevention:</span> to detect and
                prevent unauthorized access and to protect user data.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">4. Google API Services User Data Policy</h2>
            <p>
              The Service’s use and transfer of information received from Google APIs will comply
              with the Google API Services User Data Policy, including the Limited Use requirements.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">5. Data sharing</h2>
            <p>
              The Service does not sell your personal information. We only share information when it
              is necessary to operate the Service (for example, with infrastructure providers) or if
              required by law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">6. Data retention</h2>
            <p>
              We retain information only as long as needed to provide the Service, comply with legal
              obligations, resolve disputes, and enforce agreements. You can request deletion of your
              account data as described below.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">7. Security</h2>
            <p>
              We use reasonable administrative, technical, and organizational measures to protect
              information. No method of transmission or storage is 100% secure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">8. Your choices</h2>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Revoke access:</span> you can revoke Google account access
                at any time from your Google Account settings.
              </p>
              <p>
                <span className="font-semibold">Account deletion:</span> you can request deletion of your
                Service account and associated data.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">9. Contact</h2>
            <p>
              If you have questions about this Privacy Policy or data handling, contact the Service
              administrator at: <span className="font-semibold">[YOUR_CONTACT_EMAIL]</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
