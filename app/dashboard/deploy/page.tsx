'use client'

import { useState } from 'react'
import { 
  CommandLineIcon, 
  CodeBracketIcon, 
  DocumentDuplicateIcon,
  CheckIcon,
  GlobeAltIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline'

export default function DeployPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [autoOpen, setAutoOpen] = useState(false)
  
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  
  const embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = "${appUrl}/api/embed${autoOpen ? '?autoOpen=true' : ''}";
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`

  const iframeCode = `<iframe
  src="${appUrl}/chat?embedded=true${autoOpen ? '&autoOpen=true' : ''}"
  width="100%"
  style="height: 100%; min-height: 700px"
  frameborder="0"
></iframe>`

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Deploy Assistant</h1>
        <p className="text-gray-600 mt-2">Choose how you want to embed your AI assistant on your website.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Chat Widget Option */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-primary-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <ChatBubbleBottomCenterTextIcon className="w-8 h-8 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Chat Widget</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={autoOpen} 
                    onChange={(e) => setAutoOpen(e.target.checked)}
                    className="sr-only" 
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${autoOpen ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${autoOpen ? 'translate-x-5' : ''}`}></div>
                </div>
                <span className="text-xs font-semibold text-primary-700 uppercase tracking-wider">Auto-Open</span>
              </label>
            </div>
            <p className="text-sm text-gray-600">
              A floating chat bubble that appears in the corner of your website. Best for customer support.
            </p>
          </div>
          
          <div className="p-6 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Embed Code</h3>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto leading-relaxed">
                {embedCode}
              </pre>
              <button
                onClick={() => handleCopy(embedCode, 'widget')}
                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                {copied === 'widget' ? <CheckIcon className="w-5 h-5 text-green-400" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <GlobeAltIcon className="w-5 h-5 text-primary-500" />
                How to install
              </h4>
              <ol className="text-sm text-gray-600 space-y-3 list-decimal pl-4">
                <li>Copy the code snippet above.</li>
                <li>Paste it into your website's <strong>{"<head>"}</strong> tag or right before the closing <strong>{"</body>"}</strong> tag.</li>
                <li>The chat bubble will automatically appear in the bottom-right corner.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Full Page / Iframe Option */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-green-50">
            <div className="flex items-center gap-3 mb-2">
              <CodeBracketIcon className="w-8 h-8 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Full Page Embed</h2>
            </div>
            <p className="text-sm text-gray-600">
              Embed the chat interface directly into a page on your site. Best for "Contact Us" or "FAQ" pages.
            </p>
          </div>
          
          <div className="p-6 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Iframe Code</h3>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto leading-relaxed">
                {iframeCode}
              </pre>
              <button
                onClick={() => handleCopy(iframeCode, 'iframe')}
                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                {copied === 'iframe' ? <CheckIcon className="w-5 h-5 text-green-400" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <CommandLineIcon className="w-5 h-5 text-green-500" />
                How to install
              </h4>
              <ol className="text-sm text-gray-600 space-y-3 list-decimal pl-4">
                <li>Create a new page on your website (e.g., yoursite.com/chat).</li>
                <li>Switch to HTML/Code view in your editor.</li>
                <li>Paste the iframe code where you want the chat to appear.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* ENNIA / stakeholder demo link */}
      <div className="mt-8 bg-teal-50 border border-teal-100 rounded-2xl p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Share ENNIA demo (username + password)</h3>
        <p className="text-gray-600 text-sm mb-4">
          Send stakeholders a private link to try the assistant with your ENNIA knowledge base — without dashboard access.
          Set <code className="bg-white px-1 rounded text-xs">DEMO_ENNIA_USERNAME</code> and{' '}
          <code className="bg-white px-1 rounded text-xs">DEMO_ENNIA_PASSWORD</code> in Vercel env vars, then share:
        </p>
        <div className="bg-white border border-teal-100 rounded-lg p-4 font-mono text-sm text-gray-800 break-all">
          {appUrl}/demo/ennia
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Customer signs in at <code className="bg-white px-1 rounded">/demo/ennia/login</code> → full dashboard + chat with ENNIA branding and knowledge base.
          Provision DB user: <code className="bg-white px-1 rounded">npm run saas:provision-user -- --slug ennia --username ennia-demo --password YOUR_PASSWORD</code>
        </p>
      </div>

      {/* WordPress Help */}
      <div className="mt-12 bg-blue-50 border border-blue-100 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <div className="bg-white p-3 rounded-xl shadow-sm">
            <img src="https://s.w.org/style/images/about/WordPress-logotype-wmark.png" alt="WordPress" className="h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Using WordPress?</h3>
            <p className="text-gray-600 text-sm mb-4">
              You can use a plugin like "Insert Headers and Footers" or "WPCode" to easily add the Chat Widget code to your entire site without editing theme files.
            </p>
            <div className="flex gap-4">
              <a 
                href="/chat" 
                target="_blank"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 underline"
              >
                Preview Chat Interface
              </a>
              <a 
                href="/dashboard/settings" 
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 underline"
              >
                Customize Branding
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

