import { NextRequest } from 'next/server'
import { handleTenantLogin } from '@/lib/tenant-login'

export async function POST(request: NextRequest) {
  return handleTenantLogin(request)
}
