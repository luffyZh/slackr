import {
	BACKEND_PORT
} from './config.js';
import {
	BACKEND_URL,
	STORAGE_KEY
} from './config.js';
import {
	fileToDataUrl,
	formatDate,
	isLoggedIn,
	showError,
	apiRequest
} from './helpers.js';

document.addEventListener('DOMContentLoaded', () => {
	function clearElement(element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	}

	const loginContainer = document.getElementById('login-container');
	const registerContainer = document.getElementById('register-container');
	const dashboardContainer = document.getElementById('dashboard-container');
	const errorContainer = document.getElementById('error-container');

	const loginForm = document.getElementById('login-form');
	const loginEmail = document.getElementById('login-email');
	const loginPassword = document.getElementById('login-password');
	const registerLink = document.getElementById('register-link');

	const registerForm = document.getElementById('register-form');
	const registerEmail = document.getElementById('register-email');
	const registerName = document.getElementById('register-name');
	const registerPassword = document.getElementById('register-password');
	const registerPasswordConfirm = document.getElementById('register-password-confirm');
	const loginLink = document.getElementById('login-link');

	const errorBody = document.getElementById('error-body');
	const errorClose = document.getElementById('error-close');

	const logoutButton = document.getElementById('logout-button');
	const avatarImage = document.getElementById('avatar-image');
	const createChannelButton = document.getElementById('create-channel-button');
	const publicChannelList = document.getElementById('public-channel-list');
	const privateChannelList = document.getElementById('private-channel-list');

	const createChannelContainer = document.getElementById('create-channel-container');
	const createChannelForm = document.getElementById('create-channel-form');
	const createChannelName = document.getElementById('create-channel-name');
	const createChannelDescription = document.getElementById('create-channel-description');
	const createChannelIsPrivate = document.getElementById('create-channel-is-private');
	const closeCreateChannel = createChannelContainer.querySelector('.close-button');

	const messageInput = document.getElementById('message-input');
	const messageSendButton = document.getElementById('message-send-button');
	const messagesContainer = document.getElementById('messages-container');

	let currentUser = null;
	let currentChannel = null;
	// FIXME: 初始化获取所有用户数据并存下来
	const allUsers = [];

	async function init() {
		setTimeout(() => {
			document.getElementById('loading-page').style.display = 'none';
		}, 3000);
		setupEventListeners();

		if (isLoggedIn()) {
			// FIXME: 登陆成功，初始化获取所有用户数据并存下来
			const { users } = await apiRequest('/user');
			allUsers.push(...users);
			// FIXME: 初始化获取 userId
			const userId = localStorage.getItem('userId');
			console.log('isLogined: ', isLoggedIn(), 'userId: ', userId);
			try {
				// FIXME: 根据 userId 获取用户数据
				const userData = await apiRequest(`/user/${userId}`);
				console.log('Me data: ', userData);
				// FIXME: 修复 currentUser 没有 id 的问题
				currentUser = {
					id: +userId,
					...userData
				};
				showDashboard();
				loadChannels();
				setupHashRouting(); 
			} catch (error) {
				localStorage.removeItem(STORAGE_KEY);
				showLogin();
			}
		} else {
			showLogin();
		}
	}

	function setupEventListeners() {
		loginForm.addEventListener('submit', handleLogin);

		registerForm.addEventListener('submit', handleRegister);

		registerLink.addEventListener('click', (e) => {
			e.preventDefault();
			showRegister();
		});

		loginLink.addEventListener('click', (e) => {
			e.preventDefault();
			showLogin();
		});

		errorClose.addEventListener('click', () => {
			errorContainer.classList.add('hidden');
		});

		logoutButton.addEventListener('click', handleLogout);

		avatarImage.addEventListener('click', showOwnProfile);

		createChannelButton.addEventListener('click', () => {
			createChannelContainer.classList.remove('hidden');
		});

		closeCreateChannel.addEventListener('click', () => {
			createChannelContainer.classList.add('hidden');
			createChannelForm.reset();
		});

		createChannelForm.addEventListener('submit', handleCreateChannel);

		messageSendButton.addEventListener('click', sendMessage);
		messageInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				sendMessage();
			}
		});

		document.getElementById('message-image-upload').addEventListener('change', handleImageMessage);

		setupModalCloseOnOutsideClick();
	}

	function setupHashRouting() {
		window.addEventListener('hashchange', handleHashChange);
		handleHashChange(); 
	}

	async function handleHashChange() {
		const hash = window.location.hash;

		if (hash.startsWith('#channel=')) {
			const channelId = hash.split('=')[1];
			console.log('channelId: ', channelId);
			await loadChannelById(channelId);
		} else if (hash === '#profile') {
			showOwnProfile();
		} else if (hash.startsWith('#profile=')) {
			const userId = hash.split('=')[1];
			showUserProfile(userId);
		}
	}

	async function loadChannelById(channelId) {
		try {
			// FIXME: channels -> channel，为啥 API 全错了，得思考一下，是 server 版本不一样，还是因为 AI 写的
			const channel = await apiRequest(`/channel/${channelId}`);
			// FIXME: channel 里面没有 id 字段，重新构造 currentChannel
			currentChannel = {
				...channel,
				id: channelId,
			};
			console.log('channel: ', currentChannel);
			loadChannelDetails();
			loadMessages();
		} catch (error) {
			console.error('Failed to load channel from ID:', error);
		}
	}

	function setupModalCloseOnOutsideClick() {
		const modals = document.querySelectorAll('.modal');
		modals.forEach(modal => {
			modal.addEventListener('click', (e) => {
				if (e.target === modal) {
					modal.classList.add('hidden');
					if (modal === createChannelContainer) {
						createChannelForm.reset();
					}
				}
			});
		});
	}

	function showLogin() {
		loginContainer.classList.remove('hidden');
		registerContainer.classList.add('hidden');
		dashboardContainer.classList.add('hidden');
	}

	function showRegister() {
		loginContainer.classList.add('hidden');
		registerContainer.classList.remove('hidden');
		dashboardContainer.classList.add('hidden');
	}

	function showDashboard() {
		loginContainer.classList.add('hidden');
		registerContainer.classList.add('hidden');
		dashboardContainer.classList.remove('hidden');
	}

	async function handleLogin(e) {
		e.preventDefault();

		const email = loginEmail.value;
		const password = loginPassword.value;

		try {
			const data = await apiRequest('/auth/login', 'POST', {
				email,
				password
			}, false);

			// const data = {
			// 	token: "123",
			// 	user: {
			// 		id: "1",
			// 		name: "测试",
			// 		email: "123@123",
			// 		profileImage: "https://q3.itc.cn/q_70/images03/20250110/1e71eecf56b34344bcae6a5b85c0bec2.jpeg",
			// 		bio: ""
			// 	}
			// };

			localStorage.setItem(STORAGE_KEY, data.token);
			// FIXME: 这里处理登录后获取用户信息的逻辑，尽量不修改你的原本代码
			currentUser = {
				id: +data.userId,
				email,
			};
			// FIXME: 登陆成功，初始化获取所有用户数据并存下来
			const { users } = await apiRequest('/user');
			allUsers.push(...users);
			// FIXME: 缓存 userId 下来
			localStorage.setItem('userId', data.userId);
			showDashboard();
			loadChannels();
			loginForm.reset();
		} catch (error) {
			console.error('Login failed:', error);
		}
	}

	async function handleRegister(e) {
		e.preventDefault();

		const email = registerEmail.value;
		const name = registerName.value;
		const password = registerPassword.value;
		const passwordConfirm = registerPasswordConfirm.value;

		if (password !== passwordConfirm) {
			showError('Passwords do not match.');
			return;
		}

		try {
			const data = await apiRequest('/auth/register', 'POST', {
				email,
				name,
				password
			}, false);

			localStorage.setItem(STORAGE_KEY, data.token);
			// FIXME: 缓存 userId 下来
			localStorage.setItem('userId', data.userId);
			currentUser = {
				id: +data.userId,
				email,
				name,
			};
			// FIXME: 注册成功，初始化获取所有用户数据并存下来
			const { users } = await apiRequest('/user');
			allUsers.push(...users);
			showDashboard();
			loadChannels();
			registerForm.reset();
		} catch (error) {
			console.error('Registration failed:', error);
		}
	}

	function handleLogout() {
		localStorage.removeItem(STORAGE_KEY);
		currentUser = null;
		currentChannel = null;
		showLogin();
		window.location.hash = ''; // Reset hash on logout
	}

	async function loadChannels() {
		// FIXME: 修改 /channels -> channel，对返回数据进行解构
		const { channels } = await apiRequest('/channel');

		clearElement(publicChannelList);
		clearElement(privateChannelList);

		const publicChannels = channels.filter(channel => !channel.private);
		const privateChannels = channels.filter(channel => channel.private);

		if (publicChannels.length === 0) {
			const msg = document.createElement('div');
			msg.className = 'empty-channel-message';
			msg.textContent = 'No public channels yet';
			publicChannelList.appendChild(msg);
		} else {
			publicChannels.forEach(channel => {
				const channelElement = createChannelElement(channel);
				publicChannelList.appendChild(channelElement);
			});
		}

		if (privateChannels.length === 0) {
			const msg = document.createElement('div');
			msg.className = 'empty-channel-message';
			msg.textContent = 'No private channels joined';
			privateChannelList.appendChild(msg);
		} else {
			privateChannels.forEach(channel => {
				const channelElement = createChannelElement(channel);
				privateChannelList.appendChild(channelElement);
			});
		}
	}

	function createChannelElement(channel) {
		const div = document.createElement('div');
		div.className = `channel-container ${channel.private ? 'private' : 'public'}`;
		div.dataset.channelId = channel.id;

		const nameDiv = document.createElement('div');
		nameDiv.className = 'channel-name';
		nameDiv.textContent = channel.name;

		if (channel.unreadCount > 0) {
			const unreadBadge = document.createElement('span');
			unreadBadge.className = 'unread-badge';
			unreadBadge.textContent = channel.unreadCount;
			nameDiv.appendChild(unreadBadge);
		}

		div.appendChild(nameDiv);

		// FIXME: 如果没有在当前频道 members 列表中，右侧应该显示 Join 按钮
		const isJoined = channel.members.includes(currentUser.id);
		if (!isJoined) {
			const joinBtn = document.createElement('button');
			joinBtn.textContent = 'Join';
			joinBtn.className = 'join-btn';
			joinBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				try {
					await apiRequest(`/channel/${channel.id}/join`, 'POST');
					loadChannels();
				} catch (error) {
					console.error('Failed to join channel:', error);
				}
			});
			nameDiv.appendChild(joinBtn);
		}

		nameDiv.addEventListener('click', async () => {
			currentChannel = channel;
			window.location.hash = `#channel=${channel.id}`;
			loadChannelDetails();
			loadMessages();
			highlightSelectedChannel(div);
		});

		return div;
	}

	function highlightSelectedChannel(channelElement) {
		document.querySelectorAll('.channel-container').forEach(el => {
			el.classList.remove('selected');
		});
		channelElement.classList.add('selected');
	}

	async function handleCreateChannel(e) {
		e.preventDefault();

		const name = createChannelName.value;
		let description = createChannelDescription.value;
		const isPrivate = createChannelIsPrivate.checked;

		if (!description.trim()) {
			description = 'No description.';
		}

		try {
			await apiRequest('/channel', 'POST', {
				name,
				description,
				private: isPrivate,
			});

			createChannelContainer.classList.add('hidden');
			createChannelForm.reset();
			loadChannels();
		} catch (error) {
			console.error('Failed to create channel:', error);
		}
	}

	async function loadChannelDetails() {
		if (!currentChannel) return;

		try {
			// FIXME: 修复 API 调用，从 /channels 到 /channel
			const details = await apiRequest(`/channel/${currentChannel.id}`);
			const container = document.getElementById('channel-details-container');

			clearElement(container);

			const h2 = document.createElement('h2');
			h2.textContent = details.name;
			container.appendChild(h2);

			const descP = document.createElement('p');
			const descStrong = document.createElement('strong');
			descStrong.textContent = 'Description:';
			descP.appendChild(descStrong);
			descP.appendChild(document.createTextNode(' ' + (details.description || '')));
			container.appendChild(descP);

			const typeP = document.createElement('p');
			const typeStrong = document.createElement('strong');
			typeStrong.textContent = 'Type:';
			typeP.appendChild(typeStrong);
			typeP.appendChild(
				document.createTextNode(' ' + (details.isPrivate ? 'Private' : 'Public'))
			);
			container.appendChild(typeP);

			const createdP = document.createElement('p');
			const createdStrong = document.createElement('strong');
			createdStrong.textContent = 'Created:';
			createdP.appendChild(createdStrong);
			createdP.appendChild(
				// FIXME: 后端返回字段是 createdAt，前端需要转换为 Date 对象
				document.createTextNode(' ' + formatDate(new Date(details.createdAt)))
			);
			container.appendChild(createdP);

			// FIXME: details.creator 是用户 id，需要从 allUsers 中找到对应的用户
			const creator = allUsers.find(user => user.id === details.creator);
			const creatorP = document.createElement('p');
			const creatorStrong = document.createElement('strong');
			creatorStrong.textContent = 'Creator:';
			creatorP.appendChild(creatorStrong);
			creatorP.appendChild(
				document.createTextNode(' ' + creator?.email || 'Unknown')
			);
			container.appendChild(creatorP);

			const inviteBtn = document.createElement('button');
			inviteBtn.id = 'invite-user-button';
			inviteBtn.textContent = 'Invite Users';
			container.appendChild(inviteBtn);

			container.classList.remove('hidden');

			inviteBtn.addEventListener('click', () => {
				document.getElementById('channel-invite-container').classList.remove('hidden');
				loadUsersToInvite();
			});
		} catch (error) {
			console.error('Failed to load channel details:', error);
		}
	}

	// FIXME: 获取消息的位置
	const MESSAGE_START = 0;

	async function loadMessages() {
		if (!currentChannel) return;

		try {
			// FIXME: 修复 API 调用，从 /channel/{channelId}/messages 到 /message/{channelId}，然后把 messages 解构出来
			const { messages } = await apiRequest(`/message/${currentChannel.id}?start=${MESSAGE_START}`);

			// const messages = [{
			// 	user:{profileImage:"https://q3.itc.cn/q_70/images03/20250110/1e71eecf56b34344bcae6a5b85c0bec2.jpeg",name:"user1",id:"1"},
			// 	edited:new Date(),
			// 	timeSent:new Date(),
			// 	message:"hahahahaha",
			// 	Image:""
			// },{
			// 	user:{profileImage:"https://att2.citysbs.com/hangzhou/2019/09/25/01/middle_640x598-012417_v2_19951569345857573_9ec4359b4c5a9d5fdd287fbe690c80e2.jpg",name:"user2",id:"2"},
			// 	edited:new Date(),
			// 	timeSent:new Date(),
			// 	message:"Good!",
			// 	Image:""
			// },{
			// 	user:{profileImage:"",name:"user3",id:"3"},
			// 	edited:new Date(),
			// 	timeSent:new Date(),
			// 	message:"666",
			// 	Image:""
			// }];

			displayMessages(messages);
		} catch (error) {
			console.error('Failed to load messages:', error);
		}
	}

	async function sendMessage() {
		if (!currentChannel) {
			showError('Please select a channel first.');
			return;
		}

		const content = messageInput.value.trim();

		if (!content) {
			showError('Message cannot be empty.');
			return;
		}

		try {
			// FIXME: 发送消息的 API 调用错误：从 /channels/{channelId}/messages 到 /message/{channelId}
			await apiRequest(`/message/${currentChannel.id}`, 'POST', {
				message: content
			});

			messageInput.value = '';
			loadMessages(); 
		} catch (error) {
			console.error('Failed to send message:', error);
		}
	}

	async function handleImageMessage(e) {
		if (!currentChannel) {
			showError('Please select a channel first.');
			e.target.value = '';
			return;
		}

		const file = e.target.files[0];
		if (!file) return;

		try {
			const dataUrl = await fileToDataUrl(file);
			await apiRequest(`/channels/${currentChannel.id}/messages`, 'POST', {
				image: dataUrl
			});

			loadMessages(); 
			e.target.value = ''; 
		} catch (error) {
			console.error('Failed to send image message:', error);
			e.target.value = '';
		}
	}

	function createMessageElement(message) {
		const div = document.createElement('div');
		div.className = 'message-container';
		// FIXME: 确定发送者是谁
		const sender = allUsers.find(user => user.id === message.sender);

		// FIXME: 不确定是否有 user 这个对象
		const avatarUrl = message.sender === currentUser.id ? 'me.png' : sender?.profileImage || 'default-avatar.png';

		const avatarImg = document.createElement('img');
		avatarImg.className = 'message-avatar';
		// FIXME: 不确定是否有 user 这个对象
		avatarImg.alt = sender?.email || 'Unknown User';
		avatarImg.src = avatarUrl;
		div.appendChild(avatarImg);

		const contentDiv = document.createElement('div');
		contentDiv.className = 'message-content';
		div.appendChild(contentDiv);

		const headerDiv = document.createElement('div');
		headerDiv.className = 'message-header';
		contentDiv.appendChild(headerDiv);

		const nameSpan = document.createElement('span');
		nameSpan.className = 'message-user-name';
		// FIXME: 不确定是否有 user 这个对象
		nameSpan.dataset.userId = sender?.id || 'unknown';
		nameSpan.textContent = sender?.email || 'Unknown User';
		headerDiv.appendChild(nameSpan);

		const timeSpan = document.createElement('span');
		timeSpan.className = 'message-timestamp';
		// FIXME: 确定时间戳的格式
		timeSpan.textContent = formatDate(new Date(message.sentAt));
		headerDiv.appendChild(timeSpan);

		if (message.edited) {
			const editedSpan = document.createElement('span');
			editedSpan.className = 'message-edited';
			editedSpan.textContent = `Edited ${formatDate(new Date(message.edited))}`;
			headerDiv.appendChild(editedSpan);
		}

		if (message.message) {
			const textP = document.createElement('p');
			textP.className = 'message-text';
			textP.textContent = message.message;
			contentDiv.appendChild(textP);
		}

		if (message.image) {
			const img = document.createElement('img');
			img.className = 'message-image';
			img.alt = 'Message image';
			img.src = message.image;
			contentDiv.appendChild(img);
		}

		const actionsDiv = document.createElement('div');
		actionsDiv.className = 'message-actions';
		contentDiv.appendChild(actionsDiv);
		console.log('currentUser: ', currentUser);
		// FIXME: 你的代码逻辑里就没有获取 user 的逻辑，所以要通过 message.sender 来判断
		if (message.sender === currentUser.id) {
			const editBtn = document.createElement('button');
			editBtn.className = 'message-edit-button';
			editBtn.dataset.messageId = message.id;
			editBtn.textContent = 'Edit';
			actionsDiv.appendChild(editBtn);

			const deleteBtn = document.createElement('button');
			deleteBtn.className = 'message-delete-button';
			deleteBtn.dataset.messageId = message.id;
			deleteBtn.textContent = 'Delete';
			actionsDiv.appendChild(deleteBtn);

			editBtn.addEventListener('click', () => {
				editMessage(message.id);
			});

			deleteBtn.addEventListener('click', () => {
				deleteMessage(message.id);
			});
		}

		const reactionsDiv = document.createElement('div');
		reactionsDiv.className = 'message-reactions';
		actionsDiv.appendChild(reactionsDiv);

		nameSpan.addEventListener('click', () => {
			showUserProfile(message.user.id);
		});

		setupReactionButtons(div, message);

		return div;
	}


	function setupReactionButtons(messageElement, message) {
		const reactionsContainer = messageElement.querySelector('.message-reactions');
		const reactions = ['👍', '❤️', '😂']; 
		reactions.forEach(emoji => {
			const button = document.createElement('button');
			button.className = 'reaction-button';
			button.textContent = emoji;

			const userReacted = message.reactions?.some(r =>
				r.emoji === emoji && r.userIds.includes(currentUser.id)
			);

			if (userReacted) {
				button.classList.add('reacted');
			}

			button.addEventListener('click', () => {
				toggleReaction(message.id, emoji);
			});

			reactionsContainer.appendChild(button);
		});
	}

	async function toggleReaction(messageId, emoji) {
		try {
			await apiRequest(`/messages/${messageId}/react`, 'POST', {
				emoji
			});
			loadMessages(); 
		} catch (error) {
			console.error('Failed to toggle reaction:', error);
		}
	}

	async function editMessage(messageId) {
		const newContent = prompt('Edit your message:');
		if (newContent === null) return; 

		const trimmedContent = newContent.trim();
		if (!trimmedContent) {
			showError('Message cannot be empty.');
			return;
		}

		try {
			const message = await apiRequest(`/messages/${messageId}`);
			if (message.message === trimmedContent) {
				showError('Message is the same as original.');
				return;
			}

			await apiRequest(`/messages/${messageId}`, 'PATCH', {
				message: trimmedContent
			});
			loadMessages(); 
		} catch (error) {
			console.error('Failed to edit message:', error);
		}
	}

	async function deleteMessage(messageId) {
		if (confirm('Are you sure you want to delete this message?')) {
			try {
				await apiRequest(`/messages/${messageId}`, 'DELETE');
				loadMessages(); 
			} catch (error) {
				console.error('Failed to delete message:', error);
			}
		}
	}

	function displayMessages(messages) {
		clearElement(messagesContainer);
		const sortedMessages = [...messages].sort(
			(a, b) => new Date(a.timeSent) - new Date(b.timeSent)
		);

		sortedMessages.forEach(message => {
			const messageElement = createMessageElement(message);
			messagesContainer.appendChild(messageElement);
		});
	}

	async function loadUsersToInvite() {
		if (!currentChannel) return;

		try {
			const users = await apiRequest(`/channels/${currentChannel.id}/invitable`);
			const userList = document.getElementById('users-to-invite-list');

			clearElement(userList);
			const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

			sortedUsers.forEach(user => {
				const userElement = document.createElement('div');
				userElement.className = 'invite-user-item';

				const label = document.createElement('label');

				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.className = 'invite-member-checkbox';
				checkbox.value = user.id;

				const nameSpan = document.createElement('span');
				nameSpan.className = 'invite-member-name';
				nameSpan.textContent = user.name;

				label.appendChild(checkbox);
				label.appendChild(nameSpan);
				userElement.appendChild(label);
				userList.appendChild(userElement);
			});

			const inviteSubmitButton = document.getElementById('invite-submit-button');
			inviteSubmitButton.onclick = handleInviteUsers; 
		} catch (error) {
			console.error('Failed to load invitable users:', error);
		}
	}

	async function handleInviteUsers() {
		if (!currentChannel) return;

		const checkboxes = document.querySelectorAll('.invite-member-checkbox:checked');
		const userIds = Array.from(checkboxes).map(cb => cb.value);

		if (userIds.length === 0) {
			showError('Please select at least one user to invite.');
			return;
		}

		try {
			await apiRequest(`/channels/${currentChannel.id}/invite`, 'POST', {
				userIds
			});

			document.getElementById('channel-invite-container').classList.add('hidden');
			showError('Users invited successfully!');
		} catch (error) {
			console.error('Failed to invite users:', error);
		}
	}

	function showOwnProfile() {
		const container = document.getElementById('own-profile-container');
		const content = document.getElementById('own-profile-content');
		clearElement(content);

		const title = document.createElement('h2');
		title.textContent = 'Your Profile';
		content.appendChild(title);

		const img = document.createElement('img');
		img.id = 'profile-image';
		img.src = currentUser.profileImage || 'default-avatar.png';
		content.appendChild(img);

		const nameDiv = document.createElement('div');
		const nameLabel = document.createElement('label');
		nameLabel.htmlFor = 'profile-name';
		nameLabel.textContent = 'Name:';
		const nameInput = document.createElement('input');
		nameInput.id = 'profile-name';
		nameInput.type = 'text';
		nameInput.value = currentUser.name;
		nameDiv.appendChild(nameLabel);
		nameDiv.appendChild(nameInput);
		content.appendChild(nameDiv);

		const emailDiv = document.createElement('div');
		const emailLabel = document.createElement('label');
		emailLabel.htmlFor = 'profile-email';
		emailLabel.textContent = 'Email:';
		const emailInput = document.createElement('input');
		emailInput.id = 'profile-email';
		emailInput.type = 'email';
		emailInput.value = currentUser.email;
		emailDiv.appendChild(emailLabel);
		emailDiv.appendChild(emailInput);
		content.appendChild(emailDiv);

		const bioDiv = document.createElement('div');
		const bioLabel = document.createElement('label');
		bioLabel.htmlFor = 'profile-bio';
		bioLabel.textContent = 'Bio:';
		const bioTextarea = document.createElement('textarea');
		bioTextarea.id = 'profile-bio';
		bioTextarea.value = currentUser.bio || '';
		bioDiv.appendChild(bioLabel);
		bioDiv.appendChild(bioTextarea);
		content.appendChild(bioDiv);

		const pwDiv = document.createElement('div');
		const pwLabel = document.createElement('label');
		pwLabel.htmlFor = 'new-password';
		pwLabel.textContent = 'New Password:';
		const pwInput = document.createElement('input');
		pwInput.id = 'new-password';
		pwInput.type = 'password';
		const toggleBtn = document.createElement('button');
		toggleBtn.id = 'toggle-password';
		toggleBtn.type = 'button';
		toggleBtn.textContent = 'Show';
		pwDiv.appendChild(pwLabel);
		pwDiv.appendChild(pwInput);
		pwDiv.appendChild(toggleBtn);
		content.appendChild(pwDiv);

		const updateBtn = document.createElement('button');
		updateBtn.id = 'update-profile';
		updateBtn.textContent = 'Update Profile';
		content.appendChild(updateBtn);

		const closeBtn = document.createElement('button');
		closeBtn.id = 'close-profile';
		closeBtn.textContent = 'Close';
		content.appendChild(closeBtn);

		container.classList.remove('hidden');

		toggleBtn.addEventListener('click', () => {
			if (pwInput.type === 'password') {
				pwInput.type = 'text';
				toggleBtn.textContent = 'Hide';
			} else {
				pwInput.type = 'password';
				toggleBtn.textContent = 'Show';
			}
		});

		updateBtn.addEventListener('click', async () => {
			try {
				const name = nameInput.value.trim();
				const email = emailInput.value.trim();
				const bio = bioTextarea.value.trim();
				const newPassword = pwInput.value.trim();

				const updateData = { name, email, bio };
				if (newPassword) updateData.password = newPassword;

				const updatedUser = await apiRequest('/users/me', 'PATCH', updateData);
				currentUser = updatedUser;
				showError('Profile updated successfully!');
				document.getElementById('own-profile-container').classList.add('hidden');
			} catch (error) {
				console.error('Failed to update profile:', error);
			}
		});

		closeBtn.addEventListener('click', () => {
			document.getElementById('own-profile-container').classList.add('hidden');
		});

	}


	async function updateOwnProfile() {
		const name = document.getElementById('profile-name').value;
		const email = document.getElementById('profile-email').value;
		const bio = document.getElementById('profile-bio').value;
		const newPassword = document.getElementById('new-password').value;

		try {
			const updateData = {
				name,
				email,
				bio
			};
			if (newPassword) updateData.password = newPassword;

			const updatedUser = await apiRequest('/users/me', 'PATCH', updateData);
			currentUser = updatedUser;
			showError('Profile updated successfully!');
			document.getElementById('own-profile-container').classList.add('hidden');
		} catch (error) {
			console.error('Failed to update profile:', error);
		}
	}

	// Upload profile photo
	async function uploadProfilePhoto(e) {
		const file = e.target.files[0];
		if (!file) return;

		try {
			const dataUrl = await fileToDataUrl(file);
			const updatedUser = await apiRequest('/users/me', 'PATCH', {
				profileImage: dataUrl
			});
			currentUser = updatedUser;
			showError('Profile photo updated successfully!');
			e.target.value = '';
		} catch (error) {
			console.error('Failed to upload profile photo:', error);
			e.target.value = '';
		}
	}

	async function showUserProfile(userId) {
		try {
			const user = await apiRequest(`/users/${userId}`);
			const container = document.getElementById('profile-container');
			const content = document.getElementById('profile-content');

			clearElement(content);

			const title = document.createElement('h2');
			title.textContent = `${user.name}'s Profile`;
			content.appendChild(title);

			const img = document.createElement('img');
			img.id = 'profile-image';
			img.src = user.profileImage || 'default-avatar.png';
			content.appendChild(img);

			const nameP = document.createElement('p');
			const nameStrong = document.createElement('strong');
			nameStrong.textContent = 'Name:';
			const nameSpan = document.createElement('span');
			nameSpan.id = 'profile-name';
			nameSpan.textContent = user.name;
			nameP.appendChild(nameStrong);
			nameP.appendChild(document.createTextNode(' '));
			nameP.appendChild(nameSpan);
			content.appendChild(nameP);

			const emailP = document.createElement('p');
			const emailStrong = document.createElement('strong');
			emailStrong.textContent = 'Email:';
			const emailSpan = document.createElement('span');
			emailSpan.id = 'profile-email';
			emailSpan.textContent = user.email;
			emailP.appendChild(emailStrong);
			emailP.appendChild(document.createTextNode(' '));
			emailP.appendChild(emailSpan);
			content.appendChild(emailP);

			const bioP = document.createElement('p');
			const bioStrong = document.createElement('strong');
			bioStrong.textContent = 'Bio:';
			const bioSpan = document.createElement('span');
			bioSpan.id = 'profile-bio';
			bioSpan.textContent = user.bio || 'No bio';
			bioP.appendChild(bioStrong);
			bioP.appendChild(document.createTextNode(' '));
			bioP.appendChild(bioSpan);
			content.appendChild(bioP);

			container.classList.remove('hidden');
		} catch (error) {
			console.error('Failed to load user profile:', error);
		}
	}

	init();
});
