import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";

/**
 * Register a new technical reviewer and issue JWT tokens.
 *
 * This public registration endpoint creates a new account in the
 * ats_recruitment_techreviewers table for a technical reviewer. Password is
 * securely hashed and email uniqueness is enforced. On success, generates
 * access and refresh JWT tokens and returns an authorized reviewer
 * response—including the profile and token metadata, but never the password.
 * Account is active upon creation.
 *
 * @param props - Request containing body: { email, password, name,
 *   specialization? }
 * @returns Reviewer profile and authorization token
 *   (IAtsRecruitmentTechReviewer.IAuthorized)
 * @throws {Error} If email is already registered or any critical error occurs
 */
export async function postauthTechReviewerJoin(props: {
  body: IAtsRecruitmentTechReviewer.ICreate;
}): Promise<IAtsRecruitmentTechReviewer.IAuthorized> {
  const { email, password, name, specialization } = props.body;

  // 1. Check uniqueness constraint (email) early (for cleaner error)
  const exists = await MyGlobal.prisma.ats_recruitment_techreviewers.findUnique(
    { where: { email } },
  );
  if (exists)
    throw new Error(
      "Email already in use: a technical reviewer already exists with this email",
    );

  // 2. Hash password (do not use plain password)
  const password_hash = await MyGlobal.password.hash(password);
  // 3. All temporal values: use toISOStringSafe to brand as string & tags.Format<'date-time'>
  const now = toISOStringSafe(new Date());
  // 4. Generate UUID for reviewer
  const id = v4() as string & tags.Format<"uuid">;

  // 5. Create new reviewer account
  const created = await MyGlobal.prisma.ats_recruitment_techreviewers.create({
    data: {
      id, // already correctly branded
      email,
      password_hash,
      name,
      is_active: true,
      specialization: specialization ?? null,
      created_at: now,
      updated_at: now,
      // deleted_at not set; schema default is null
    },
  });

  // 6. Generate JWT tokens
  //     TechreviewerPayload: { id, type: "techReviewer" }
  const accessTokenExpiresInSec = 60 * 60; // 1 hour
  const refreshTokenExpiresInSec = 7 * 24 * 60 * 60; // 7 days
  const accessTokenExpiresAt = toISOStringSafe(
    new Date(Date.now() + accessTokenExpiresInSec * 1000),
  );
  const refreshTokenExpiresAt = toISOStringSafe(
    new Date(Date.now() + refreshTokenExpiresInSec * 1000),
  );

  const jwtPayload = { id: created.id, type: "techReviewer" };
  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessTokenExpiresInSec,
    issuer: "autobe",
  });
  const refresh = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshTokenExpiresInSec,
    issuer: "autobe",
  });

  // 7. Log audit event for creation (does not affect output)
  try {
    await MyGlobal.prisma.ats_recruitment_audit_trails.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_timestamp: now,
        actor_id: created.id,
        actor_role: "techReviewer",
        operation_type: "CREATE",
        target_type: "techreviewer_account",
        target_id: created.id,
        event_detail: `Registered new technical reviewer: ${created.email}`,
        ip_address: undefined,
        user_agent: undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (logError) {
    // Logging must never block successful registration
  }

  // 8. Return profile & token—including only DTO-conformant fields
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    specialization: created.specialization ?? undefined,
    is_active: created.is_active,
    token: {
      access,
      refresh,
      expired_at: accessTokenExpiresAt,
      refreshable_until: refreshTokenExpiresAt,
    },
  };
}
