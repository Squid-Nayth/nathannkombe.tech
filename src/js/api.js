(function (global) {
	const SERVICE_ID = 'service_ucecdrq';
	const TEMPLATE_ADMIN = 'template_92w68c5';
	const TEMPLATE_USER = 'template_g0qudwi';
	const ADMIN_EMAIL = 'nathannkombe@gmail.com';

	const SDK_URL = 'https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js';

	const USER_ID = (window && window.EMAILJS_PUBLIC_KEY) ? window.EMAILJS_PUBLIC_KEY : 'J-R25uVYKuSZlk0kL';

	global.emailjsReady = false;

	(function ensureSdk() {
		function markReady() {
			try {
				if (global.emailjs && typeof global.emailjs.init === 'function') {
					if (global.EMAILJS_PUBLIC_KEY) {
						try { global.emailjs.init(global.EMAILJS_PUBLIC_KEY); } catch (e) { }
					}
					global.emailjsReady = true;
				}
			} catch (e) { }
		}

		if (global.emailjs) { markReady(); return; }

		const s = document.createElement('script');
		s.src = SDK_URL;
		s.async = true;
		s.onload = markReady;
		s.onerror = function () { console.error('Failed to load EmailJS SDK from', SDK_URL); };
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

	/** sendContactEmails({ name, email, message })
	 *  Sends admin notification then user auto-reply. Returns Promise<{admin,user}>.
	 */
	function sendContactEmails(params) {
		return new Promise((resolve, reject) => {
			if (!params || !params.email || !params.message) return reject(new Error('Missing params: email and message are required'));

			waitForSdk().then(() => {
				const adminParams = {
					to_email: ADMIN_EMAIL,
					from_email: String(params.email),
					from_name: String(params.name || ''),
					message: String(params.message)
				};

				global.emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, adminParams, USER_ID)
				.then((respAdmin) => {
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
