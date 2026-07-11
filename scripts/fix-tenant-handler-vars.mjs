import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const files = [
  'app/api/notifications/[id]/route.ts',
  'app/api/dashboard/leads/[id]/route.ts',
  'app/api/dashboard/stats/route.ts',
  'app/api/settings/widget/route.ts',
  'app/api/settings/agent/route.ts',
  'app/api/admin/knowledge-base/route.ts',
  'app/api/dashboard/unanswered-queries/route.ts',
  'app/api/notifications/route.ts',
  'app/api/forms/route.ts',
]

for (const rel of files) {
  const fp = path.join(ROOT, rel)
  let s = fs.readFileSync(fp, 'utf8')

  if (s.includes('NextRequest)') && !s.includes("import { NextRequest")) {
    s = s.replace(
      "import { NextResponse } from 'next/server'",
      "import { NextRequest, NextResponse } from 'next/server'"
    )
  }

  // Handlers with (request, { params }) that use tenantId
  s = s.replace(
    /(export async function (?:GET|POST|PUT|PATCH|DELETE)\(\s*request: NextRequest,\s*\{ params \}[^)]*\)\s*\{\s*try \{\s*)(const \{ id \} = await params)/g,
    '$1const tenantId = await getDashboardTenantId(request)\n    $2'
  )

  // Fix stats GET where tenantId was inserted before try incorrectly
  s = s.replace(
    /export async function GET\(request: NextRequest\) \{\n    const tenantId = await getDashboardTenantId\(request\)\n  try \{/,
    'export async function GET(request: NextRequest) {\n  try {\n    const tenantId = await getDashboardTenantId(request)'
  )

  // Handlers with only request that use tenantId but missing declaration inside try
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    const re = new RegExp(
      `export async function ${method}\\(request: NextRequest\\) \\{\\n  try \\{\\n(?!    const tenantId)`,
      'g'
    )
    if (s.includes('tenantId') && s.includes(`export async function ${method}(request: NextRequest)`)) {
      s = s.replace(re, `export async function ${method}(request: NextRequest) {\n  try {\n    const tenantId = await getDashboardTenantId(request)\n`)
    }
  }

  fs.writeFileSync(fp, s)
  console.log('fixed', rel)
}
