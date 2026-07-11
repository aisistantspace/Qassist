import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const files = [
  'app/api/dashboard/unanswered-queries/route.ts',
  'app/api/notifications/route.ts',
  'app/api/dashboard/recent-leads/route.ts',
  'app/api/dashboard/leads/route.ts',
  'app/api/dashboard/conversations/route.ts',
  'app/api/settings/agent/route.ts',
  'app/api/dashboard/stats/route.ts',
  'app/api/admin/knowledge-base/route.ts',
  'app/api/notifications/[id]/route.ts',
  'app/api/forms/route.ts',
  'app/api/documents/route.ts',
  'app/api/settings/widget/route.ts',
  'app/api/dashboard/leads/[id]/route.ts',
]

for (const rel of files) {
  const fp = path.join(ROOT, rel)
  let s = fs.readFileSync(fp, 'utf8')
  if (!s.includes('DEFAULT_TENANT_ID')) {
    console.log('skip', rel)
    continue
  }

  if (!s.includes('getDashboardTenantId')) {
    if (s.includes("import { DEFAULT_TENANT_ID } from '@/lib/tenant'")) {
      s = s.replace(
        "import { DEFAULT_TENANT_ID } from '@/lib/tenant'",
        "import { getDashboardTenantId } from '@/lib/dashboard-tenant'"
      )
    } else {
      s = s.replace(
        /import \{([^}]*), DEFAULT_TENANT_ID([^}]*)\} from '@\/lib\/tenant'/,
        "import {$1$2} from '@/lib/tenant'\nimport { getDashboardTenantId } from '@/lib/dashboard-tenant'"
      )
    }
  }

  s = s.replace(/\.eq\('tenant_id', DEFAULT_TENANT_ID\)/g, ".eq('tenant_id', tenantId)")
  s = s.replace(/tenant_id: DEFAULT_TENANT_ID/g, 'tenant_id: tenantId')

  const handlers = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  for (const h of handlers) {
    s = s.replace(
      new RegExp(`export async function ${h}\\(\\)(\\s*\\{)`, 'g'),
      `export async function ${h}(request: NextRequest)$1`
    )
  }

  for (const h of handlers) {
    const fnStart = `export async function ${h}(request: NextRequest) {`
    if (s.includes(fnStart) && !s.includes(`export async function ${h}(request: NextRequest) {\n    const tenantId`)) {
      s = s.replace(fnStart, `${fnStart}\n    const tenantId = await getDashboardTenantId(request)`)
    }
  }

  if (!s.includes('NextRequest')) {
    if (s.includes("import { NextResponse } from 'next/server'")) {
      s = s.replace(
        "import { NextResponse } from 'next/server'",
        "import { NextRequest, NextResponse } from 'next/server'"
      )
    }
  }

  fs.writeFileSync(fp, s)
  console.log('patched', rel)
}
