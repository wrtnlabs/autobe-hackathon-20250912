import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";

/**
 * Register a new HR recruiter and issue authentication tokens.
 *
 * This endpoint allows a new HR recruiter to join the ATS system by submitting
 * their business email, password, name, and (optionally) department. The
 * handler will check for duplicate email (enforcing uniqueness), securely hash
 * the password, and create the user with is_active set to true. JWT access and
 * refresh tokens are generated upon successful registration, and a profile is
 * returned (excluding the password). All dates and IDs are string-formatted,
 * NOT native Date.
 *
 * @param props - Registration request with body (email, password, name,
 *   department)
 * @returns Authorized recruiter profile including JWT tokens and safe profile
 *   fields
 * @throws {Error} If the email already exists in the system.
 */
export async function postauthHrRecruiterJoin(props: {
  body: IAtsRecruitmentHrRecruiter.IJoin;
}): Promise<IAtsRecruitmentHrRecruiter.IAuthorized> {
  const { email, password, name, department } = props.body;

  // 1. Enforce uniqueness constraint on email
  const existing = await MyGlobal.prisma.ats_recruitment_hrrecruiters.findFirst(
    { where: { email } },
  );
  if (existing) {
    throw new Error(
      "해당 이메일은 이미 사용 중입니다. 다른 이메일을 입력하세요.",
    );
  }

  // 2. Prepare required values: hash password and generate all registration fields
  const now = toISOStringSafe(new Date());
  const hashedPassword = await MyGlobal.password.hash(password);
  const newId = v4();

  const created = await MyGlobal.prisma.ats_recruitment_hrrecruiters.create({
    data: {
      id: newId,
      email,
      password_hash: hashedPassword,
      name,
      department: department ?? undefined,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });

  // 3. JWT access and refresh token generation
  const accessTokenDurationSec = 60 * 60; // 1 hour in seconds
  const refreshTokenDurationSec = 7 * 24 * 60 * 60; // 7 days in seconds
  const accessTokenExpiry = new Date(
    Date.now() + accessTokenDurationSec * 1000,
  );
  const refreshTokenExpiry = new Date(
    Date.now() + refreshTokenDurationSec * 1000,
  );

  const jwtPayload = { id: created.id, type: "hrRecruiter" };
  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessTokenDurationSec,
    issuer: "autobe",
  });
  const refresh = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshTokenDurationSec,
    issuer: "autobe",
  });

  // 4. Build response: IAuthorized (all types as required, password omitted)
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    department: created.department ?? undefined,
    is_active: created.is_active,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
