import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";

/**
 * Refresh JWT tokens for a logged-in HR recruiter (ats_recruitment_hrrecruiters
 * table).
 *
 * Issues new access/refresh tokens if the supplied refresh token is valid, not
 * expired, and the recruiter's account is active and not deleted. Returns
 * current recruiter profile data and tokens; on error, access is denied and no
 * new token is issued. Used for login session renewal.
 *
 * @param props - Request with body { refreshToken: string } (JWT from prior
 *   login)
 * @returns Current recruiter profile with fresh tokens, or throws on error
 * @throws {Error} When refresh token is invalid, recruiter not found, inactive,
 *   or deleted
 */
export async function postauthHrRecruiterRefresh(props: {
  body: IAtsRecruitmentHrRecruiter.IRefresh;
}): Promise<IAtsRecruitmentHrRecruiter.IAuthorized> {
  const { body } = props;
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new Error("Invalid or expired refresh token");
  }
  // Type guard for expected JWT payload structure
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as { id?: unknown }).id !== "string" ||
    (decoded as { type?: unknown }).type !== "hrRecruiter"
  ) {
    throw new Error("Malformed refresh token payload");
  }
  const recruiterId = (decoded as { id: string }).id;
  // Look up recruiter by id
  const recruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findUnique({
      where: { id: recruiterId },
    });
  if (
    !recruiter ||
    recruiter.is_active !== true ||
    recruiter.deleted_at !== null
  ) {
    throw new Error("Recruiter account inactive or deleted");
  }
  // Token expiration times as ISO strings (string & tags.Format<'date-time'>)
  const nowEpoch = Date.now();
  const accessExpiresInSec = 60 * 60;
  const refreshExpiresInSec = 60 * 60 * 24 * 7;
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowEpoch + accessExpiresInSec * 1000),
  );
  const refreshExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowEpoch + refreshExpiresInSec * 1000),
  );
  // Issue JWTs matching login/join claims (id, type only)
  const jwtPayload = { id: recruiter.id, type: "hrRecruiter" };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: accessExpiresInSec,
  });
  const refreshToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: refreshExpiresInSec,
  });
  return {
    id: recruiter.id,
    email: recruiter.email,
    name: recruiter.name,
    department: recruiter.department ?? null,
    is_active: recruiter.is_active,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
