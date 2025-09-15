import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";

/**
 * Authenticate an existing technical reviewer (ats_recruitment_techreviewers
 * table) and issue JWT tokens using login authentication flow.
 *
 * This endpoint allows a technical reviewer to log in with their email and
 * password. If the credentials and account status are valid, JWT access and
 * refresh tokens are issued, and the technical reviewer's basic profile is
 * returned. All login attempts (success and failure) are recorded in the audit
 * log.
 *
 * Security: Only tech reviewers with active accounts (is_active = true and not
 * soft-deleted) may log in. Passwords are verified using the system hash. No
 * password hash or sensitive credential is exposed. This endpoint does not
 * require prior authentication.
 *
 * @param props - The login request object
 *
 *   - Body.email: Reviewer login email
 *   - Body.password: Reviewer login password
 *
 * @returns Reviewer profile with JWT token information
 *   (IAtsRecruitmentTechReviewer.IAuthorized)
 * @throws {Error} If email is not found, password is incorrect, or account is
 *   inactive/deleted
 */
export async function postauthTechReviewerLogin(props: {
  body: IAtsRecruitmentTechReviewer.ILogin;
}): Promise<IAtsRecruitmentTechReviewer.IAuthorized> {
  const { email, password } = props.body;

  // Find tech reviewer by email, must be active and not soft-deleted
  const reviewer =
    await MyGlobal.prisma.ats_recruitment_techreviewers.findFirst({
      where: {
        email,
        is_active: true,
        deleted_at: null,
      },
    });

  // Helper for current datetime as ISO (string & tags.Format<'date-time'>)
  const now = toISOStringSafe(new Date());

  // Log failed attempt if user not found or not active
  if (!reviewer) {
    await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
      data: {
        id: v4(),
        actor_id: v4(), // No user found, must still log (cannot use reviewer.id)
        actor_type: "techReviewer",
        login_succeeded: false,
        origin_ip: null,
        user_agent: null,
        login_at: now,
      },
    });
    throw new Error("Invalid credentials");
  }

  const isValid = await MyGlobal.password.verify(
    password,
    reviewer.password_hash,
  );
  if (!isValid) {
    await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
      data: {
        id: v4(),
        actor_id: reviewer.id,
        actor_type: "techReviewer",
        login_succeeded: false,
        origin_ip: null,
        user_agent: null,
        login_at: now,
      },
    });
    throw new Error("Invalid credentials");
  }

  // JWT payload: reviewer id/type only (do not include unsafe fields)
  const accessExpiresInSeconds = 3600; // 1 hour
  const refreshExpiresInSeconds = 604800; // 7 days

  const accessToken = jwt.sign(
    { id: reviewer.id, type: "techReviewer" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: accessExpiresInSeconds, issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: reviewer.id, type: "techReviewer" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: refreshExpiresInSeconds, issuer: "autobe" },
  );

  // Compute expiration fields as string & tags.Format<'date-time'>
  const expired_at = toISOStringSafe(
    new Date(Date.now() + accessExpiresInSeconds * 1000),
  );
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + refreshExpiresInSeconds * 1000),
  );

  // Log success audit
  await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
    data: {
      id: v4(),
      actor_id: reviewer.id,
      actor_type: "techReviewer",
      login_succeeded: true,
      origin_ip: null,
      user_agent: null,
      login_at: now,
    },
  });

  return {
    id: reviewer.id,
    email: reviewer.email,
    name: reviewer.name,
    specialization:
      typeof reviewer.specialization !== "undefined" &&
      reviewer.specialization !== null
        ? reviewer.specialization
        : undefined,
    is_active: reviewer.is_active,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
