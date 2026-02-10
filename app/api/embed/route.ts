import { NextRequest, NextResponse } from 'next/server'
import { getBrandingConfig } from '@/lib/branding'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getTenantFromRequest } from '@/lib/tenant'
import { escapeForJS, sanitizeUrl } from '@/lib/security'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const autoOpen = searchParams.get('autoOpen') === 'true'
    const tenantContext = await getTenantFromRequest(request)

    const branding = await getBrandingConfig(tenantContext.tenantId)

    let chatIconUrl = ''
    let bubbleText = ''
    let bubblePosition = 'left'
    let allowedOrigins: string[] = []
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const { data: widgetData } = await supabaseAdmin
        .from('widget_config')
        .select('chat_icon_url, bubble_text, bubble_position, allowed_origins')
        .eq('tenant_id', tenantContext.tenantId)
        .limit(1)
        .maybeSingle()
      
      if (widgetData?.chat_icon_url) {
        chatIconUrl = widgetData.chat_icon_url.trim()
      }
      if (widgetData?.bubble_text) {
        bubbleText = widgetData.bubble_text
      }
      if (widgetData?.bubble_position) {
        bubblePosition = widgetData.bubble_position
      }
      if (widgetData?.allowed_origins && Array.isArray(widgetData.allowed_origins)) {
        allowedOrigins = widgetData.allowed_origins
      }
    } catch (error) {
      console.error('Error fetching widget config:', error)
      // Continue with defaults if fetch fails
    }

    // Origin validation: if allowed_origins is configured, check the requesting origin
    if (allowedOrigins.length > 0) {
      const origin = request.headers.get('origin') || request.headers.get('referer') || ''
      const originHost = (() => {
        try { return new URL(origin).origin } catch { return '' }
      })()
      const isAllowed = allowedOrigins.some(ao => {
        try { return new URL(ao).origin === originHost } catch { return ao === originHost }
      })
      if (!isAllowed) {
        return new NextResponse('// Access denied: origin not allowed', {
          status: 403,
          headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
        })
      }
    }

    // Determine CORS origin header
    const corsOrigin = allowedOrigins.length > 0
      ? (request.headers.get('origin') || '*')
      : '*'

    const appUrl = escapeForJS(process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin)
    const tenantParam = tenantContext.slug ? `slug=${encodeURIComponent(tenantContext.slug)}` : `tenant=${encodeURIComponent(tenantContext.tenantId)}`
    const chatUrl = escapeForJS(`${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/chat?embedded=true&${tenantParam}`)

    // Validate URLs
    const safeBookingUrl = sanitizeUrl(branding.booking_url || '')
    const safeCompanyWebsite = sanitizeUrl(branding.company_website || '')

    // Escape all branding strings properly for JS inclusion
    const safeCompanyName = escapeForJS(branding.company_name || '')
    const safeWidgetTitle = escapeForJS(branding.widget_title || 'Chat Assistant')
    const safeWelcomeMessage = escapeForJS(branding.welcome_message || 'Hello! How can I help you today?')
    const safePrimaryColor = escapeForJS(branding.primary_color || '#3B82F6')
    const safeBubbleText = escapeForJS(bubbleText || '')
    const safeBubblePosition = escapeForJS(bubblePosition)
    const safeChatIconUrl = escapeForJS(chatIconUrl)

    const embedScript = `
/**
 * AI Chat Assistant - Embeddable Widget
 * Auto-generated with branding configuration
 */

(function() {
  'use strict';

  // Configuration (dynamically injected from server)
  const CONFIG = {
    assistantUrl: '${chatUrl}',
    companyName: '${safeCompanyName}',
    widgetTitle: '${safeWidgetTitle}',
    welcomeMessage: '${safeWelcomeMessage}',
    primaryColor: '${safePrimaryColor}',
    position: 'bottom-right',
    initialState: '${autoOpen ? 'open' : 'minimized'}',
    bubbleText: '${safeBubbleText}',
    bubblePosition: '${safeBubblePosition}',
  };

  // Darken color for hover effect
  function darkenColor(color) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  const hoverColor = darkenColor(CONFIG.primaryColor);

  // Check if bubble was dismissed
  const isBubbleDismissed = localStorage.getItem('chat-bubble-dismissed') === 'true';
  const shouldShowBubble = CONFIG.bubbleText && CONFIG.bubbleText.trim() !== '' && !isBubbleDismissed;

  // Create button wrapper (contains bubble and button)
  function createButton() {
    // Create wrapper container
    const wrapper = document.createElement('div');
    wrapper.id = 'ai-chat-wrapper';
    
    const positionStyles = CONFIG.position === 'bottom-right'
      ? 'bottom: 20px; right: 20px;'
      : 'bottom: 20px; left: 20px;';
    
    // Set flex direction and alignment based on bubble position
    let flexDirection = 'row-reverse';
    let alignItems = 'center';
    
    if (CONFIG.bubblePosition === 'top') {
      flexDirection = 'column-reverse';
      alignItems = 'flex-end';
    } else if (CONFIG.bubblePosition === 'bottom') {
      flexDirection = 'column';
      alignItems = 'flex-end';
    } else if (CONFIG.bubblePosition === 'right') {
      flexDirection = 'row';
      alignItems = 'center';
    } else {
      // 'left' (default)
      flexDirection = 'row-reverse';
      alignItems = 'center';
    }
    
    wrapper.style.cssText = \`
      position: fixed;
      \${positionStyles}
      z-index: 9998;
      display: flex;
      align-items: \${alignItems};
      gap: 12px;
      flex-direction: \${flexDirection};
    \`;

    // Create text bubble if text is provided and not dismissed
    if (shouldShowBubble) {
      const bubble = document.createElement('div');
      bubble.id = 'ai-chat-bubble';
      bubble.style.cssText = \`
        background: white;
        color: #111;
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        border: 1px solid #eee;
        max-width: 200px;
        position: relative;
        animation: fadeIn 0.3s ease;
      \`;
      
      bubble.innerHTML = \`
        <div style="position: relative;">
          <button 
            id="ai-chat-bubble-close"
            aria-label="Close"
            style="
              position: absolute;
              top: -8px;
              right: -8px;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #f0f0f0;
              border: 1px solid #ddd;
              color: #666;
              font-size: 14px;
              line-height: 1;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
              padding: 0;
            "
            onmouseover="this.style.background='#e0e0e0'; this.style.borderColor='#ccc';"
            onmouseout="this.style.background='#f0f0f0'; this.style.borderColor='#ddd';"
          >×</button>
          <div style="padding-right: 8px;">\${CONFIG.bubbleText}</div>
        </div>
      \`;
      
      // Close button handler
      const closeBtn = bubble.querySelector('#ai-chat-bubble-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('chat-bubble-dismissed', 'true');
        bubble.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
          bubble.style.display = 'none';
        }, 300);
      });
      
      wrapper.appendChild(bubble);
    }

    // Create button element
    const button = document.createElement('button');
    button.id = 'ai-chat-button';
    button.setAttribute('aria-label', 'Open ' + CONFIG.widgetTitle);
    
    button.style.cssText = \`
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: \${CONFIG.primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    \`;
    
    // Use custom icon if provided, otherwise use default SVG
    const chatIconUrl = '${safeChatIconUrl}';
    const hasCustomIcon = chatIconUrl && chatIconUrl.trim() !== '' && chatIconUrl !== 'undefined';
    
    // Debug: log icon status
    console.log('Chat widget icon check:', { hasCustomIcon, chatIconUrl: chatIconUrl ? chatIconUrl.substring(0, 50) : 'empty' });
    
    if (hasCustomIcon) {
      // Use background-image approach for better circular fill
      const iconUrl = chatIconUrl.trim();
      button.style.backgroundImage = \`url("\${iconUrl}")\`;
      button.style.backgroundSize = 'cover';
      button.style.backgroundPosition = 'center';
      button.style.backgroundRepeat = 'no-repeat';
      button.style.backgroundColor = 'transparent';
      button.style.overflow = 'hidden';
      button.style.borderRadius = '50%';
      button.innerHTML = '';
      
      // Handle image load error - fallback to default icon
      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';
      testImg.onload = () => {
        // Image loaded successfully, ensure it's visible
        button.style.backgroundImage = \`url("\${iconUrl}")\`;
        button.style.backgroundColor = 'transparent';
        console.log('Custom icon loaded successfully');
      };
      testImg.onerror = () => {
        // Image failed to load, fallback to default
        console.error('Failed to load custom icon, using default');
        button.style.backgroundImage = 'none';
        button.style.backgroundColor = CONFIG.primaryColor;
        button.innerHTML = \`
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        \`;
      };
      testImg.src = iconUrl;
    } else {
      button.innerHTML = \`
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      \`;
    }
    
    button.addEventListener('mouseenter', () => {
      if (!hasCustomIcon) {
        button.style.backgroundColor = hoverColor;
      } else {
        // For custom icons, just add a slight scale effect
        button.style.transform = 'scale(1.1)';
      }
    });
    
    button.addEventListener('mouseleave', () => {
      if (!hasCustomIcon) {
        button.style.backgroundColor = CONFIG.primaryColor;
      }
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', toggleChat);
    
    wrapper.appendChild(button);
    
    // Add CSS animations
    if (shouldShowBubble && !document.getElementById('ai-chat-bubble-styles')) {
      const style = document.createElement('style');
      style.id = 'ai-chat-bubble-styles';
      let transformIn = 'translateX(10px)';
      let transformOut = 'translateX(10px)';
      
      if (CONFIG.bubblePosition === 'top') {
        transformIn = 'translateY(10px)';
        transformOut = 'translateY(10px)';
      } else if (CONFIG.bubblePosition === 'bottom') {
        transformIn = 'translateY(-10px)';
        transformOut = 'translateY(-10px)';
      } else if (CONFIG.bubblePosition === 'right') {
        transformIn = 'translateX(-10px)';
        transformOut = 'translateX(-10px)';
      }
      // 'left' uses default translateX(10px)
      
      style.textContent = \`
        @keyframes fadeIn {
          from { opacity: 0; transform: \${transformIn}; }
          to { opacity: 1; transform: translateX(0) translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateX(0) translateY(0); }
          to { opacity: 0; transform: \${transformOut}; }
        }
      \`;
      document.head.appendChild(style);
    }
    
    return wrapper;
  }

  // Create iframe container
  function createIframe() {
    const container = document.createElement('div');
    container.id = 'ai-chat-container';
    
    const positionStyles = CONFIG.position === 'bottom-right'
      ? 'bottom: 90px; right: 20px;'
      : 'bottom: 90px; left: 20px;';
    
    container.style.cssText = \`
      position: fixed;
      \${positionStyles}
      z-index: 9999;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      display: none;
      background: white;
    \`;
    
    const iframe = document.createElement('iframe');
    iframe.id = 'ai-chat-iframe';
    iframe.src = CONFIG.assistantUrl;
    iframe.title = CONFIG.widgetTitle;
    iframe.style.cssText = \`
      width: 100%;
      height: 100%;
      border: 0;
      border-radius: 12px;
    \`;
    iframe.setAttribute('allow', 'clipboard-write');
    
    container.appendChild(iframe);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.style.cssText = \`
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
    \`;
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
    const container = document.getElementById('ai-chat-container');
    const wrapper = document.getElementById('ai-chat-wrapper');
    
    if (!container || !wrapper) return;
    
    const isVisible = container.style.display === 'block';
    
    if (isVisible) {
      container.style.display = 'none';
      wrapper.style.display = 'flex';
    } else {
      container.style.display = 'block';
      wrapper.style.display = 'none';
      
      // Track analytics
      if (window.fetch) {
        const base = CONFIG.assistantUrl.split('?')[0];
        const qs = CONFIG.assistantUrl.includes('?') ? '&' + CONFIG.assistantUrl.split('?')[1] : '';
        fetch(base.replace('/chat', '/api/analytics') + '?' + qs.replace(/^&/, ''), {
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
    const container = document.getElementById('ai-chat-container');
    if (!container) return;
    
    if (window.innerWidth <= 768) {
      container.style.cssText = \`
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
        display: \${container.style.display};
        background: white;
      \`;
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
    const wrapper = createButton();
    const container = createIframe();
    
    document.body.appendChild(wrapper);
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
`.trim()

    // Return as JavaScript with proper headers
    return new NextResponse(embedScript, {
      status: 200,
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error: any) {
    console.error('Error generating embed script:', error)
    // Return a minimal valid script that logs the error
    const errorScript = `(function(){console.error('Chat widget script error:', ${JSON.stringify(error.message || 'Unknown error')});})();`
    return new NextResponse(errorScript, {
      status: 500,
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  }
}


