import postgres from 'postgres';
import * as argon2 from 'argon2';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const email = process.argv[2]?.toLowerCase();
const newPassword = process.argv[3];
if (!email || !newPassword) {
  console.error('Usage: node reset-user-password.mjs <email> <newPassword>');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error('Password must be at least 8 characters');
  process.exit(1);
}

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const sql = postgres(url);
try {
  const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
  const [user] = await sql`
    UPDATE identity.users
    SET
      password_hash = ${passwordHash},
      must_change_password = false,
      user_ver = user_ver + 1,
      updated_at = now()
    WHERE lower(email) = lower(${email})
    RETURNING id, email, role, user_ver
  `;

  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }

  const [staff] = await sql`
    UPDATE hrm.staff_profiles sp
    SET updated_at = now()
    FROM identity.users u
    WHERE sp.user_id = u.id AND lower(u.email) = lower(${email})
    RETURNING sp.full_name
  `;

  if (staff?.full_name) {
    await sql`
      UPDATE identity.users
      SET display_name = ${staff.full_name}, updated_at = now()
      WHERE lower(email) = lower(${email}) AND display_name IS NULL
    `;
  }

  const verifyOk = await argon2.verify(passwordHash, newPassword);
  console.log(
    JSON.stringify(
      {
        ok: true,
        email: user.email,
        userId: user.id,
        role: user.role,
        userVer: user.user_ver,
        verifyOk,
        displayNameBackfilled: staff?.full_name ?? null,
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end();
}
