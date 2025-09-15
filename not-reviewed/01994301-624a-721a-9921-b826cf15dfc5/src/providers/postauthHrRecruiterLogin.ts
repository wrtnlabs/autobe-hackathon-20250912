import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";

/**
 * HR Recruiter Login/Authentication Endpoint
 *
 * Authenticates an existing HR recruiter using email and password. Validates
 * the recruiter's credentials against the ats_recruitment_hrrecruiters table
 * (active and not soft-deleted), verifies the password hash, and upon
 * successful authentication issues JWT access/refresh tokens containing the
 * recruiter's id and type. All successful and failed logins (for existing
 * recruiters) are logged to the ats_recruitment_actor_login_histories audit
 * table for forensic and compliance traceability. No plain password or
 * sensitive data is ever returned in the response.
 *
 * @param props - Request containing the login credentials for the HR recruiter
 * @param props.body - Email/password combination for login
 *   (IAtsRecruitmentHrRecruiter.ILogin)
 * @returns IAtsRecruitmentHrRecruiter.IAuthorized object
 * @throws {Error} If credentials are invalid, recruiter is inactive, or account
 *   not found/soft-deleted
 */
export async function postauthHrRecruiterLogin(props: {
  body: IAtsRecruitmentHrRecruiter.ILogin;
}): Promise<IAtsRecruitmentHrRecruiter.IAuthorized> {
  const { email, password } = props.body;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 1: Find recruiter, must be active and not deleted
  const recruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findFirst({
      where: {
        email,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!recruiter) {
    // Email not found, cannot log because actor_id is required and enforces FK in schema
    throw new Error("Invalid credentials");
  }

  // Step 2: Verify password
  const isPassValid = await MyGlobal.password.verify(
    password,
    recruiter.password_hash,
  );
  if (!isPassValid) {
    // Log failed login for this recruiter
    await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
      data: {
        id: v4(),
        actor_id: recruiter.id,
        actor_type: "hr_recruiter",
        login_succeeded: false,
        origin_ip: null,
        user_agent: null,
        login_at: now,
      },
    });
    throw new Error("Invalid credentials");
  }

  // Step 3: Log successful login
  await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
    data: {
      id: v4(),
      actor_id: recruiter.id,
      actor_type: "hr_recruiter",
      login_succeeded: true,
      origin_ip: null,
      user_agent: null,
      login_at: now,
    },
  });

  // Step 4: Generate JWT tokens and calc expiry
  const accessExp = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExp = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  const jwtPayload = { id: recruiter.id, type: "hrRecruiter" };

  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Step 5: Build response DTO strictly following IAtsRecruitmentHrRecruiter.IAuthorized
  return {
    id: recruiter.id,
    email: recruiter.email,
    name: recruiter.name,
    department:
      recruiter.department !== undefined ? recruiter.department : null,
    is_active: recruiter.is_active,
    token: {
      access,
      refresh,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
  };
}
