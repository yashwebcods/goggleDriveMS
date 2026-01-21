const admin = require('firebase-admin');

let initialized = false;

const initFirebaseAdmin = () => {
    if (initialized) return;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (admin.apps.length) {
        initialized = true;
        return;
    }

    if (projectId && clientEmail && privateKeyRaw) {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        initialized = true;
        return;
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error(
            'Firebase Admin credentials not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (service account) in the backend environment, or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file path.'
        );
    }

    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } catch (err) {
        const message = (err && err.message) ? String(err.message) : String(err);
        throw new Error(
            `Firebase Admin credentials not configured. Original error: ${message}`
        );
    }
    initialized = true;
};

const getFirebaseAuth = () => {
    initFirebaseAdmin();
    return admin.auth();
};

module.exports = {
    getFirebaseAuth,
};
