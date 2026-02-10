/**
 * Living In Paradise AI Assistant - WordPress Embed Script
 * Version: 1.0.0
 * 
 * Usage: Add this script to your WordPress site's footer
 * This will embed the AI assistant as a floating chat widget
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Replace with your actual Vercel deployment URL
    assistantUrl: 'https://your-vercel-app.vercel.app/chat?embedded=true',
    // Button position
    position: 'bottom-right',
    // Initial state: 'minimized' or 'open'
    initialState: 'minimized',
    // Welcome message bubble
    welcomeBubble: 'Hi! What can I help you with?',
    // Button colors
    primaryColor: '#000000', // Black button as seen in Chatbase
  };

  // Create button element
  function createButton() {
    const wrapper = document.createElement('div');
    wrapper.id = 'lip-chat-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9998;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
    `;

    // Create welcome bubble
    const bubble = document.createElement('div');
    bubble.id = 'lip-chat-bubble';
    bubble.innerText = CONFIG.welcomeBubble;
    bubble.style.cssText = `
      background: white;
      color: #111;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid #eee;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.5s ease;
      pointer-events: none;
      margin-bottom: 4px;
    `;
    
    const button = document.createElement('button');
    button.id = 'lip-chat-button';
    button.setAttribute('aria-label', 'Open chat assistant');
    
    button.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${CONFIG.primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;
    
    button.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', toggleChat);
    
    wrapper.appendChild(bubble);
    wrapper.appendChild(button);

    // Show bubble after a delay
    setTimeout(() => {
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(0)';
    }, 2000);
    
    return wrapper;
  }

  // Create iframe container
  function createIframe() {
    const container = document.createElement('div');
    container.id = 'lip-chat-container';
    
    container.style.cssText = `
      position: fixed;
      bottom: 95px;
      right: 20px;
      z-index: 9999;
      width: 400px;
      height: 700px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      display: none;
      background: white;
      border: 1px solid rgba(0,0,0,0.05);
    `;
    
    const iframe = document.createElement('iframe');
    iframe.id = 'lip-chat-iframe';
    iframe.src = CONFIG.assistantUrl;
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: 0;
    `;
    iframe.setAttribute('allow', 'clipboard-write');
    
    container.appendChild(iframe);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      color: #666;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      z-index: 1;
      transition: all 0.2s;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    });
    closeBtn.addEventListener('click', toggleChat);
    
    container.appendChild(closeBtn);
    
    return container;
  }

  // Toggle chat visibility
  function toggleChat() {
    const container = document.getElementById('lip-chat-container');
    const wrapper = document.getElementById('lip-chat-wrapper');
    const bubble = document.getElementById('lip-chat-bubble');
    
    if (!container || !wrapper) return;
    
    const isVisible = container.style.display === 'block';
    
    if (isVisible) {
      container.style.display = 'none';
      if (bubble) bubble.style.opacity = '1';
    } else {
      container.style.display = 'block';
      if (bubble) bubble.style.opacity = '0';
      
      // Track analytics
      if (window.fetch) {
        fetch(CONFIG.assistantUrl.replace('/chat?embedded=true', '/api/analytics'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'assistant_open',
            metadata: {
              source_page: window.location.pathname,
              embedded: true,
            },
          }),
        }).catch(() => {});
      }
    }
  }

  // Mobile responsiveness
  function adjustForMobile() {
    const container = document.getElementById('lip-chat-container');
    if (!container) return;
    
    if (window.innerWidth <= 768) {
      container.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: 0;
        z-index: 9999;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        border-radius: 0;
        box-shadow: none;
        display: ${container.style.display};
        background: white;
      `;
    }
  }

  // Initialize
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    // Create and append elements
    const button = createButton();
    const container = createIframe();
    
    document.body.appendChild(button);
    document.body.appendChild(container);
    
    // Open by default if configured
    if (CONFIG.initialState === 'open') {
      setTimeout(toggleChat, 1000);
    }
    
    // Handle mobile responsiveness
    window.addEventListener('resize', adjustForMobile);
    adjustForMobile();
  }

  // Start initialization
  init();
})();



