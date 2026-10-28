(function () {
  const CHAT_ENDPOINT = 'https://portfolio-chat.johnraphaelabino.workers.dev';
  const MAX_HISTORY = 10;
  const MAX_INPUT_HEIGHT = 96;
  const REQUEST_TIMEOUT_MS = 25000;
  const CONTACT_EMAIL = 'johnraphaelabino@gmail.com';
  const DEBUG = true;

  const TEXT = {
    busy: 'I am getting too many requests right now. Please try again in a minute.',
    failed: `Sorry, I could not respond just now. You can email John at ${CONTACT_EMAIL}.`,
  };

  const TYPING_MARKUP = '<div class="typing" aria-label="Thinking"><span></span><span></span><span></span></div>';
  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
  }

  function formatInline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function formatReply(text) {
    const html = [];
    let listTag = null;

    function closeList() {
      if (!listTag) return;
      html.push(`</${listTag}>`);
      listTag = null;
    }

    escapeHtml(text.trim()).split('\n').forEach((line) => {
      const bullet = line.match(/^\s*[-*]\s+(.*)/);
      const numbered = line.match(/^\s*\d+\.\s+(.*)/);
      const item = bullet || numbered;

      if (item) {
        const tag = bullet ? 'ul' : 'ol';
        if (listTag !== tag) {
          closeList();
          html.push(`<${tag}>`);
          listTag = tag;
        }
        html.push(`<li>${formatInline(item[1])}</li>`);
        return;
      }

      closeList();
      if (line.trim()) html.push(`<p>${formatInline(line)}</p>`);
    });

    closeList();
    return html.join('');
  }

  const chat = document.getElementById('chat');
  const panel = document.getElementById('chatPanel');
  const launcher = document.getElementById('chatLauncher');
  const closeButton = document.getElementById('chatClose');
  const resetButton = document.getElementById('chatReset');
  const body = document.getElementById('chatBody');
  const welcome = document.getElementById('chatWelcome');
  const messages = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendButton = document.getElementById('chatSend');

  const bubble = document.createElement('div');
  bubble.className = 'cat-bubble';
  chat.appendChild(bubble);

  const bubbleTexts = ['Wanna Chat?', 'Hello', 'I Love You', 'Add me on IG', 'Click me'];
  let bubbleIndex = 0;

  function showBubble() {
    bubble.textContent = bubbleTexts[bubbleIndex];
    bubble.classList.add('show');
    setTimeout(() => {
      bubble.classList.remove('show');
    }, 3500);
    bubbleIndex = (bubbleIndex + 1) % bubbleTexts.length;
  }

  setInterval(showBubble, 7000);
  setTimeout(showBubble, 2000);

  const conversation = [];
  let isWaiting = false;

  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  function updateSendState() {
    sendButton.disabled = isWaiting || input.value.trim() === '';
  }

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }

  function setOpen(open) {
    chat.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  }

  function addUserMessage(text) {
    const message = document.createElement('div');
    message.className = 'message message-user';
    message.textContent = text;
    messages.appendChild(message);
    scrollToBottom();
  }

  function addAiMessage(html) {
    const message = document.createElement('div');
    message.className = 'message message-ai';
    message.innerHTML = '<span class="sparkle sparkle-sm" aria-hidden="true"></span><div class="message-content"></div>';
    message.querySelector('.message-content').innerHTML = html;
    messages.appendChild(message);
    scrollToBottom();
    return message;
  }

  function fillAiMessage(message, html, isError) {
    message.classList.toggle('is-error', isError);
    message.querySelector('.message-content').innerHTML = html;
    scrollToBottom();
  }

  async function requestReply() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation.slice(-MAX_HISTORY) }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error('Request failed');
        error.status = response.status;
        error.detail = await response.text().catch(() => '');
        throw error;
      }

      const { reply } = await response.json();
      return reply;
    } finally {
      clearTimeout(timer);
    }
  }

  async function sendMessage(rawText) {
    const text = rawText.trim();
    if (!text || isWaiting) return;

    welcome.hidden = true;
    addUserMessage(text);
    input.value = '';
    resizeInput();

    conversation.push({ role: 'user', text });
    isWaiting = true;
    updateSendState();

    const pending = addAiMessage(TYPING_MARKUP);

    try {
      const reply = await requestReply();
      conversation.push({ role: 'model', text: reply });
      fillAiMessage(pending, formatReply(reply), false);
    } catch (error) {
      conversation.pop();
      const message = error.status === 429 ? TEXT.busy : TEXT.failed;
      const detail = DEBUG ? `\n${error.status || ''} ${error.detail || error.message}` : '';
      fillAiMessage(pending, formatReply(message + detail), true);
    } finally {
      isWaiting = false;
      updateSendState();
      input.focus();
    }
  }

  function resetChat() {
    conversation.length = 0;
    messages.innerHTML = '';
    welcome.hidden = false;
    body.scrollTop = 0;
    input.focus();
  }

  launcher.addEventListener('click', () => setOpen(!chat.classList.contains('open')));
  closeButton.addEventListener('click', () => setOpen(false));
  resetButton.addEventListener('click', resetChat);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });

  input.addEventListener('input', () => {
    resizeInput();
    updateSendState();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    sendMessage(input.value);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && chat.classList.contains('open')) setOpen(false);
  });

  updateSendState();
})();