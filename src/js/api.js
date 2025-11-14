/*
	API helper for sending contact emails using EmailJS.

	Behavior:
	- Exposes window.SiteAPI.sendContactEmails({ name, email, message })
		which returns a Promise that resolves when both emails (admin and user)
		have been sent.

	IMPORTANT: replace the placeholders below with your EmailJS credentials
	(public key already initialized in index.html). Create two templates:
		- admin template (e.g. template_admin) that receives from_name, from_email, message
		- user template (e.g. template_user) that receives to_email, to_name, message

	EmailJS templates must be configured in your EmailJS dashboard to map
	these variables to the actual email fields.
*/

(function (global) {
	// Inspired by js2/email.js: dynamic SDK loader + send sequence (admin -> user)
		const SERVICE_ID = 'service_ucecdrq'; // keep your existing EmailJS service id
	const TEMPLATE_ADMIN = 'template_92w68c5'; // admin template id
	const TEMPLATE_USER = 'template_g0qudwi'; // user auto-reply template id
		const ADMIN_EMAIL = 'nathannkombe@gmail.com'; // recipient for admin notifications

		// Primary CDN for EmailJS SDK (fallbacks could be added if necessary)
	const SDK_URL = 'https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js';

		// user/public key used by EmailJS. Prefer a value exposed on window, else
		// fall back to the value that was previously used in this project.
		const USER_ID = (window && window.EMAILJS_PUBLIC_KEY) ? window.EMAILJS_PUBLIC_KEY : 'J-R25uVYKuSZlk0kL';

	// readiness flag
	global.emailjsReady = false;

	// Try to ensure emailjs is loaded and initialized. If a public key is exposed
	// on window.EMAILJS_PUBLIC_KEY it will be used to init automatically.
	(function ensureSdk() {
		function markReady() {
			try {
				if (global.emailjs && typeof global.emailjs.init === 'function') {
					// If a public key was set on window by the page, prefer it
					if (global.EMAILJS_PUBLIC_KEY) {
						try { global.emailjs.init(global.EMAILJS_PUBLIC_KEY); } catch (e) { /* ignore */ }
					}
					global.emailjsReady = true;
				}
			} catch (e) {
				// silent
			}
		}

		if (global.emailjs) {
			markReady();
			return;
		}

		const s = document.createElement('script');
		s.src = SDK_URL;
		s.async = true;
		s.onload = function () {
			markReady();
		};
		s.onerror = function () {
			// Log an informative error; callers will see a rejection if they try to send.
			console.error('Failed to load EmailJS SDK from', SDK_URL);
		};
		document.head.appendChild(s);
	})();

	function waitForSdk(timeout = 5000) {
		return new Promise((resolve, reject) => {
			if (global.emailjsReady && global.emailjs) return resolve();
			let waited = 0;
			const interval = 100;
			const iv = setInterval(() => {
				if (global.emailjs && (global.emailjsReady || typeof global.emailjs.send === 'function')) {
					clearInterval(iv);
					global.emailjsReady = true;
					return resolve();
				}
				waited += interval;
				if (waited >= timeout) {
					clearInterval(iv);
					return reject(new Error('Failed to load EmailJS SDK'));
				}
			}, interval);
		});
	}

	/**
	 * sendContactEmails({ name, email, message })
	 * - sends an admin notification first, then an auto-reply to the user.
	 * - returns a Promise that resolves with both responses { admin, user } or rejects with the underlying error.
	 * NOTE: Ensure your EmailJS templates accept the variables below (admin: {{from_email}}, {{message}}; user: {{to_email}}, {{message}})
	 */
	function sendContactEmails(params) {
		return new Promise((resolve, reject) => {
			if (!params || !params.email || !params.message) {
				return reject(new Error('Missing params: email and message are required'));
			}

			waitForSdk().then(() => {
						// build admin params (do NOT include reply_to as requested)
						// include to_email so EmailJS knows where to deliver the admin notification
						const adminParams = {
							to_email: ADMIN_EMAIL,
							from_email: String(params.email),
							from_name: String(params.name || ''),
							message: String(params.message)
						};

						// send to admin first (pass userId as 4th param to avoid "The user ID is required" errors)
						global.emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, adminParams, USER_ID)
					.then((respAdmin) => {
						// build user auto-reply params — include to_email so the template can target the recipient
						const userParams = {
							to_email: String(params.email),
							to_name: String(params.name || ''),
							from_email: String(params.email),
							message: String(params.message)
						};

									return global.emailjs.send(SERVICE_ID, TEMPLATE_USER, userParams, USER_ID)
							.then((respUser) => resolve({ admin: respAdmin, user: respUser }));
					})
					.catch((err) => reject(err));
			}).catch(reject);
		});
	}

	// expose API
	global.SiteAPI = global.SiteAPI || {};
	global.SiteAPI.sendContactEmails = sendContactEmails;

})(window);
