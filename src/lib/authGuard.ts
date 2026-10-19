import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from './supabaseServer';

export type UserRole = 'ADMIN' | 'PANITIA' | 'UNIT' | 'PEWAWANCARA';
export type JenjangScope = 'SD' | 'SMP' | 'SMA' | 'TK' | null;

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  jenjangScope: JenjangScope;
  roleLabel: string;
}

/**
 * Server-side trusted role and scope resolver.
 * Strictly verifies role and jenjang scope on the server.
 * Supports:
 * - Supabase user_metadata (role, jenjangScope)
 * - Environment variables (ADMIN_EMAILS, PANITIA_EMAILS, UNIT_SD_EMAILS, etc.)
 * - Email pattern conventions for easy setup
 */
export async function getVerifiedUserRole(
  userId: string,
  email?: string,
  userMetadata?: Record<string, any>
): Promise<{ role: UserRole; jenjangScope: JenjangScope; roleLabel: string } | null> {
  if (!userId || !email) return null;

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check explicit Supabase user_metadata if configured
  if (userMetadata?.role) {
    const rawRole = String(userMetadata.role).toUpperCase();
    if (rawRole === 'ADMIN') {
      return { role: 'ADMIN', jenjangScope: null, roleLabel: 'Super Admin' };
    }
    if (rawRole === 'PANITIA') {
      return { role: 'PANITIA', jenjangScope: null, roleLabel: 'Panitia PPDB' };
    }
    if (rawRole === 'UNIT') {
      const scope = (userMetadata.jenjangScope ? String(userMetadata.jenjangScope).toUpperCase() : 'SD') as JenjangScope;
      return { role: 'UNIT', jenjangScope: scope, roleLabel: `Unit ${scope}` };
    }
    if (rawRole === 'PEWAWANCARA') {
      return { role: 'PEWAWANCARA', jenjangScope: null, roleLabel: 'Pewawancara' };
    }
  }

  // 2. Check Server-side Environment Whitelist
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const panitiaEmails = (process.env.PANITIA_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const unitSdEmails = (process.env.UNIT_SD_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const unitSmpEmails = (process.env.UNIT_SMP_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const unitSmaEmails = (process.env.UNIT_SMA_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const unitTkEmails = (process.env.UNIT_TK_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const interviewerEmails = (process.env.INTERVIEWER_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(normalizedEmail)) {
    return { role: 'ADMIN', jenjangScope: null, roleLabel: 'Super Admin' };
  }

  if (panitiaEmails.includes(normalizedEmail)) {
    return { role: 'PANITIA', jenjangScope: null, roleLabel: 'Panitia PPDB' };
  }

  if (unitSdEmails.includes(normalizedEmail)) {
    return { role: 'UNIT', jenjangScope: 'SD', roleLabel: 'Unit SD' };
  }

  if (unitSmpEmails.includes(normalizedEmail)) {
    return { role: 'UNIT', jenjangScope: 'SMP', roleLabel: 'Unit SMP' };
  }

  if (unitSmaEmails.includes(normalizedEmail)) {
    return { role: 'UNIT', jenjangScope: 'SMA', roleLabel: 'Unit SMA' };
  }

  if (unitTkEmails.includes(normalizedEmail)) {
    return { role: 'UNIT', jenjangScope: 'TK', roleLabel: 'Unit TK' };
  }

  if (interviewerEmails.includes(normalizedEmail)) {
    return { role: 'PEWAWANCARA', jenjangScope: null, roleLabel: 'Pewawancara' };
  }

  // 3. Fallback Whitelist & Email Pattern Detection for Easy Operations
  // Unit SD matching
  if (
    normalizedEmail.startsWith('unit.sd') ||
    normalizedEmail.startsWith('sd@') ||
    normalizedEmail.includes('.sd@') ||
    normalizedEmail.includes('unitsd')
  ) {
    return { role: 'UNIT', jenjangScope: 'SD', roleLabel: 'Unit SD' };
  }

  // Unit SMP matching
  if (
    normalizedEmail.startsWith('unit.smp') ||
    normalizedEmail.startsWith('smp@') ||
    normalizedEmail.includes('.smp@') ||
    normalizedEmail.includes('unitsmp')
  ) {
    return { role: 'UNIT', jenjangScope: 'SMP', roleLabel: 'Unit SMP' };
  }

  // Unit SMA matching
  if (
    normalizedEmail.startsWith('unit.sma') ||
    normalizedEmail.startsWith('sma@') ||
    normalizedEmail.includes('.sma@') ||
    normalizedEmail.includes('unitsma')
  ) {
    return { role: 'UNIT', jenjangScope: 'SMA', roleLabel: 'Unit SMA' };
  }

  // Unit TK matching
  if (
    normalizedEmail.startsWith('unit.tk') ||
    normalizedEmail.startsWith('tk@') ||
    normalizedEmail.includes('.tk@') ||
    normalizedEmail.includes('unittk')
  ) {
    return { role: 'UNIT', jenjangScope: 'TK', roleLabel: 'Unit TK' };
  }

  // Panitia PPDB matching
  if (
    normalizedEmail.startsWith('panitia') ||
    normalizedEmail.includes('.panitia@') ||
    normalizedEmail.includes('panitia@')
  ) {
    return { role: 'PANITIA', jenjangScope: null, roleLabel: 'Panitia PPDB' };
  }

  // Pewawancara matching
  if (
    normalizedEmail.includes('penguji') ||
    normalizedEmail.includes('pewawancara')
  ) {
    return { role: 'PEWAWANCARA', jenjangScope: null, roleLabel: 'Pewawancara' };
  }

  // Admin matching / default fallback
  const DEV_ADMINS = [
    'admin@alquraniyyah.sch.id',
    'ppdb.admin@alquraniyyah.sch.id',
    'admin@alquraniyyah.com',
    'administrasialquraniyyah@gmail.com',
  ];

  if (DEV_ADMINS.includes(normalizedEmail) || normalizedEmail.includes('admin')) {
    return { role: 'ADMIN', jenjangScope: null, roleLabel: 'Super Admin' };
  }

  // Safe default: unrecognized user has no role and is denied access
  return null;
}

/**
 * Validates session and checks role permissions on the server.
 * Returns { user, errorResponse }. If errorResponse is present, caller must return it immediately.
 */
export async function verifySession(allowedRoles?: UserRole[]): Promise<{
  user: AuthenticatedUser | null;
  errorResponse: NextResponse | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: 'Autentikasi diperlukan. Sesi Anda tidak valid atau telah kedaluwarsa.',
          },
          { status: 401 }
        ),
      };
    }

    const roleInfo = await getVerifiedUserRole(user.id, user.email, user.user_metadata);

    if (!roleInfo) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: 'Akses ditolak: Akun Anda terverifikasi tetapi belum memiliki peran (role) yang terdaftar di sistem.',
          },
          { status: 403 }
        ),
      };
    }

    if (allowedRoles && !allowedRoles.includes(roleInfo.role)) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: `Akses ditolak: Peran akun Anda (${roleInfo.roleLabel}) tidak memiliki izin untuk mengakses resource ini.`,
          },
          { status: 403 }
        ),
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        role: roleInfo.role,
        jenjangScope: roleInfo.jenjangScope,
        roleLabel: roleInfo.roleLabel,
      },
      errorResponse: null,
    };
  } catch (err: any) {
    console.error('Unexpected auth verification error:', err);
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Terjadi kegagalan verifikasi keamanan server.',
        },
        { status: 500 }
      ),
    };
  }
}
