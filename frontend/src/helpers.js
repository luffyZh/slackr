/**
 * Given a js file object representing a jpg or png image, such as one taken
 * from a html file input element, return a promise which resolves to the file
 * data as a data url.
 * More info:
 *   https://developer.mozilla.org/en-US/docs/Web/API/File
 *   https://developer.mozilla.org/en-US/docs/Web/API/FileReader
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 * 
 * Example Usage:
 *   const file = document.querySelector('input[type="file"]').files[0];
 *   console.log(fileToDataUrl(file));
 * @param {File} file The file to be read.
 * @return {Promise<string>} Promise which resolves to the file as a data url.
 */
export function fileToDataUrl(file) {
	const validFileTypes = ['image/jpeg', 'image/png', 'image/jpg']
	const valid = validFileTypes.find(type => type === file.type);
	// Bad data, let's walk away.
	if (!valid) {
		throw Error('provided file is not a png, jpg or jpeg image.');
	}

	const reader = new FileReader();
	const dataUrlPromise = new Promise((resolve, reject) => {
		reader.onerror = reject;
		reader.onload = () => resolve(reader.result);
	});
	reader.readAsDataURL(file);
	return dataUrlPromise;
}

/**
 * formatDate
 */
export function formatDate(timestamp) {
	if (!timestamp) {
		return "Invalid date";
	}

	let date;
	if (typeof timestamp === 'string') {
		const normalized = timestamp.replace(/[年月日:]/g, '-').replace(/\s+/g, 'T');
		date = new Date(normalized);
	} else {
		date = new Date(timestamp);
	}

	if (isNaN(date.getTime())) {
		return "Invalid date";
	}

	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

/**
 * Check the user's login status
 */
export function isLoggedIn() {
	return localStorage.getItem('slackr_auth_token') !== null;
}

/**
 * Display error message
 */
export function showError(message) {
	const errorContainer = document.getElementById('error-container');
	const errorBody = document.getElementById('error-body');
	const errorClose = document.getElementById('error-close');

	errorBody.textContent = message;
	errorContainer.classList.remove('hidden');

	errorClose.onclick = () => {
		errorContainer.classList.add('hidden');
	};
}

/**
 * Request the backend
 */
export async function apiRequest(endpoint, method = 'GET', data = null, requireAuth = true) {
	const {
		BACKEND_URL,
		STORAGE_KEY
	} = await import('./config.js');
	const url = `${BACKEND_URL}${endpoint}`;

	const options = {
		method,
		headers: {
			'Content-Type': 'application/json',
		},
	};
	
	if (requireAuth) {
		// FIXME: 粗心，上面是 STORAGE_KEY，使用的时候用的是 storage_KEY
		const token = localStorage.getItem(STORAGE_KEY);
		if (!token) {
			window.location.href = '#login';
			throw new Error('Need to log in.');
		}
		options.headers['Authorization'] = `Bearer ${token}`;
	}

	if (data) {
		options.body = JSON.stringify(data);
	}

	try {
		const response = await fetch(url, options);
		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'Request failed');
		}

		return result;
	} catch (error) {
		showError(error.message);
		throw error;
	}
}
