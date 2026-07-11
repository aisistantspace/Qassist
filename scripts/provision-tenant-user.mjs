#!/usr/bin/env node
/**
 * Create or update a tenant user (SaaS account).
 * Usage: npm run saas:provision-user -- --slug ennia --username ennia-demo --password "secret"
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, envFile)
    if (!fs.existsSync(envPath)) continue
    const raw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { slug: 'ennia', username: '', password: '', name: '' }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slug') opts.slug = args[++i]
    else if (args[i] === '--username') opts.username = args[++i]
    else if (args[i] === '--password') opts.password = args[++i]
    else if (args[i] === '--name') opts.name = args[++i]
  }
  return opts
}

async function main() {
  loadEnv()
  const opts = parseArgs()
  if (!opts.username || !opts.password) {
    console.error('Usage: npm run saas:provision-user -- --slug ennia --username USER --password PASS')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const slug = opts.slug.toLowerCase()

  let { data: tenant } = await supabase.from('tenants').select('id, slug, name').eq('slug', slug).maybeSingle()

  if (!tenant && (slug === 'ennia' || slug === 'default')) {
    tenant = { id: '00000000-0000-0000-0000-000000000001', slug: 'ennia', name: 'ENNIA' }
    await supabase.from('tenants').upsert({
      id: tenant.id,
      name: 'ENNIA',
      slug: 'ennia',
      subscription_plan: 'growth',
      status: 'active',
    })
  }

  if (!tenant) {
    console.error(`Tenant not found for slug: ${slug}. Run supabase/provision-ennia-tenant.sql first.`)
    process.exit(1)
  }

  const passwordHash = hashPassword(opts.password)
  const { data: existing } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('username', opts.username)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('tenant_users')
      .update({
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
        full_name: opts.name || `${tenant.name} Admin`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw error
    console.log(`Updated user "${opts.username}" for tenant ${tenant.slug}`)
  } else {
    const { error } = await supabase.from('tenant_users').insert({
      tenant_id: tenant.id,
      username: opts.username,
      password_hash: passwordHash,
      role: 'admin',
      full_name: opts.name || `${tenant.name} Admin`,
    })
    if (error) throw error
    console.log(`Created user "${opts.username}" for tenant ${tenant.slug}`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'
  console.log('\n--- Share with customer ---')
  console.log(`Login:    ${appUrl}/demo/${tenant.slug}/login`)
  console.log(`Dashboard: ${appUrl}/dashboard`)
  console.log(`Chat:     ${appUrl}/chat`)
  console.log(`Username: ${opts.username}`)
  console.log(`Password: ${opts.password}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
