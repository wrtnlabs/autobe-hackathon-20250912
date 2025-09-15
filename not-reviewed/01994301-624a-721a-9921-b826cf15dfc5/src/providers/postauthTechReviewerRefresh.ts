import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";

/**
 * Refresh JWT tokens for a technical reviewer using a valid refresh token.
 *
 * This operation allows an authenticated technical reviewer to refresh their
 * session JWT tokens by submitting a valid refresh token. Token validation is
 * performed for expiry, matching, and account state using the
 * ats_recruitment_techreviewers schema: must be is_active and not soft-deleted
 * (deleted_at is null). On success, returns new access and refresh tokens plus
 * the tech reviewer's profile, all in the
 * IAtsRecruitmentTechReviewer.IAuthorized DTO format. The refresh event is
 * logged for security compliance in ats_recruitment_actor_login_histories. The
 * endpoint strictly follows the fields and business logic defined in the
 * schema—no password change, email change, or MFA as the schema lacks those
 * fields. If the refresh token is expired or does not match schema records, an
 * error is returned; if account is inactive or deleted, refresh is denied. Used
 * in concert with join and login endpoints as part of the full authentication
 * lifecycle for members.
 *
 * @param props - Request payload
 * @param props.body - Contains the refresh token to be validated and used for
 *   renewal
 * @returns The tech reviewer profile and new tokens in
 *   IAtsRecruitmentTechReviewer.IAuthorized format
 * @throws {Error} If the refresh token is invalid, expired, or account is not
 *   active
 */
export async function postauthTechReviewerRefresh(props: {
  body: IAtsRecruitmentTechReviewer.IRefresh;
}): Promise<IAtsRecruitmentTechReviewer.IAuthorized> {
  const { refresh_token } = props.body;

  let decoded: unknown;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  // Structure enforcement for refresh token payload
  if (!decoded || typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid refresh token structure");
  }
  typia.assertGuard<{ id: string; type: "techReviewer" }>(decoded);
  const techReviewerId = (decoded as { id: string }).id;
  const techReviewerType = (decoded as { type: string }).type;
  if (techReviewerType !== "techReviewer" || !techReviewerId) {
    throw new Error("Invalid or expired refresh token");
  }

  // Fetch reviewer & validate status
  const reviewer =
    await MyGlobal.prisma.ats_recruitment_techreviewers.findFirst({
      where: {
        id: techReviewerId,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!reviewer) {
    throw new Error("Reviewer not found, deactivated, or deleted");
  }

  // Date calculations
  const now = toISOStringSafe(new Date());
  const accessExpDt = new Date(Date.now() + 60 * 60 * 1000); // 1h expiry
  const refreshExpDt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14d expiry
  const accessExp = toISOStringSafe(accessExpDt);
  const refreshExp = toISOStringSafe(refreshExpDt);

  // JWT payload (must match login structure)
  const jwtPayload = { id: reviewer.id, type: "techReviewer" };
  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "14d",
    issuer: "autobe",
  });

  // Login history log (origin_ip and user_agent are not available in refresh so set to null)
  await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
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
    specialization: reviewer.specialization ?? undefined,
    is_active: reviewer.is_active,
    token: {
      access,
      refresh,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
  };
}
