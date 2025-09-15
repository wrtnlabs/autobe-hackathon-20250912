import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";

/**
 * Applicant member account login and JWT authentication
 * (ats_recruitment_applicants)
 *
 * This endpoint performs login/authentication for applicants. It validates the
 * provided email and password against the stored applicant info, only
 * permitting active, non-deleted users to log in. On successful login, it
 * generates access and refresh JWT tokens and returns the applicant's profile
 * info (never the password). All login attempts, successful or failed, are
 * logged in ats_recruitment_actor_login_histories.
 *
 * @param props - Login request with credentials to authenticate applicant
 * @param props.body - Login payload { email, password }
 * @returns Authorized applicant JWT and profile info
 * @throws {Error} If credentials are invalid, applicant is inactive or
 *   soft-deleted, or password does not match
 */
export async function postauthApplicantLogin(props: {
  body: IAtsRecruitmentApplicant.ILogin;
}): Promise<IAtsRecruitmentApplicant.IAuthorized> {
  const { body } = props;
  // Get current timestamp as ISO string for audit log
  const loginAt = toISOStringSafe(new Date());
  // Look up applicant by login email
  const applicant = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: {
      email: body.email,
    },
  });
  // If not found, log failed attempt (with random actor_id for referential integrity)
  if (!applicant) {
    await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
      data: {
        id: v4(),
        actor_id: v4(), // no matching account, still generate valid UUID
        actor_type: "applicant",
        login_succeeded: false,
        origin_ip: undefined,
        user_agent: undefined,
        login_at: loginAt,
      },
    });
    throw new Error("Invalid credentials");
  }
  // Reject if soft-deleted or inactive
  if (!applicant.is_active || applicant.deleted_at !== null) {
    await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
      data: {
        id: v4(),
        actor_id: applicant.id,
        actor_type: "applicant",
        login_succeeded: false,
        origin_ip: undefined,
        user_agent: undefined,
        login_at: loginAt,
      },
    });
    throw new Error("Account inactive or deleted");
  }
  // Password validation
  const passwordOk = await MyGlobal.password.verify(
    body.password,
    applicant.password_hash,
  );
  if (!passwordOk) {
    await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
      data: {
        id: v4(),
        actor_id: applicant.id,
        actor_type: "applicant",
        login_succeeded: false,
        origin_ip: undefined,
        user_agent: undefined,
        login_at: loginAt,
      },
    });
    throw new Error("Invalid credentials");
  }
  // Log successful login
  await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
    data: {
      id: v4(),
      actor_id: applicant.id,
      actor_type: "applicant",
      login_succeeded: true,
      origin_ip: undefined,
      user_agent: undefined,
      login_at: loginAt,
    },
  });

  // JWT token generation - set expiry explicitly and use only allowed structure
  const accessExp = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1h from now
  const refreshExp = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7d from now
  const access = jwt.sign(
    { id: applicant.id, type: "applicant" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: applicant.id, type: "applicant", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Assemble API response
  return {
    id: applicant.id,
    token: {
      access,
      refresh,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
    email: applicant.email,
    name: applicant.name,
    phone: typeof applicant.phone === "string" ? applicant.phone : null,
    is_active: applicant.is_active,
    created_at: toISOStringSafe(applicant.created_at),
    updated_at: toISOStringSafe(applicant.updated_at),
  };
}
