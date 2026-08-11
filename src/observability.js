const VERCEL_SCRIPTS = [
  {
    id: 'vercel-web-analytics',
    src: '/_vercel/insights/script.js',
  },
  {
    id: 'vercel-speed-insights',
    src: '/_vercel/speed-insights/script.js',
  },
]

const createQueue = (queueName) => (...args) => {
  window[queueName] = window[queueName] || []
  window[queueName].push(args)
}

export function isVercelObservabilityHost(hostname) {
  const normalizedHostname = String(hostname || '').toLowerCase()
  return normalizedHostname === 'altairesports.com'
    || normalizedHostname === 'www.altairesports.com'
    || normalizedHostname.endsWith('.vercel.app')
}

export function registerVercelObservability() {
  if (!import.meta.env.PROD) return
  if (!isVercelObservabilityHost(window.location.hostname)) return

  window.va = window.va || createQueue('vaq')
  window.si = window.si || createQueue('siq')

  for (const { id, src } of VERCEL_SCRIPTS) {
    if (document.getElementById(id)) continue

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.defer = true
    document.head.appendChild(script)
  }
}
