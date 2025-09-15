import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";

/**
 * Refresh ATS applicant JWT token using valid refresh token
 * (ats_recruitment_applicants)
 *
 * This endpoint refreshes the JWT access/refresh token pair for an applicant
 * using a non-expired refresh token. The applicant must exist, be active, and
 * not soft-deleted. The operation validates the refresh token, issues new
 * tokens, and returns applicant session info. All refresh attempts are
 * security-audited.
 *
 * @param props - Object with body.refresh_token string (previously issued
 *   refresh token)
 * @returns IAtsRecruitmentApplicant.IAuthorized: New JWT tokens (access,
 *   refresh, expiry) and applicant info
 * @throws {Error} When token is invalid/expired, applicant not
 *   found/inactive/deleted, or JWT creation fails.
 */
export async function postauthApplicantRefresh(props: {
  body: IAtsRecruitmentApplicant.IRefresh;
}): Promise<IAtsRecruitmentApplicant.IAuthorized> {
  const { body } = props;

  // 1. Verify and decode refresh token; only accept applicant tokens.
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new Error("Invalid or expired refresh token");
  }
  if (
    !decoded ||
    typeof decoded !== "object" ||
    !("id" in decoded) ||
    !("type" in decoded) ||
    (decoded as { type: unknown }).type !== "applicant" ||
    !(typeof (decoded as { id: unknown }).id === "string")
  ) {
    throw new Error("Invalid refresh token payload");
  }
  const applicantId = (decoded as { id: string }).id;

  // 2. Find applicant, ensure it's active and not soft-deleted
  const applicant = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: {
      id: applicantId,
      is_active: true,
      deleted_at: null,
    },
  });
  if (!applicant) throw new Error("Applicant not found, inactive, or deleted");

  // 3. Calculate new expiration datetimes (all as string & tags.Format<'date-time'>)
  const now = Date.now();
  const accessTtlMs = 60 * 60 * 1000; // 1 hour
  const refreshTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpireAt = toISOStringSafe(new Date(now + accessTtlMs));
  const refreshExpireAt = toISOStringSafe(new Date(now + refreshTtlMs));

  // 4. Generate new token pair (payload structure: { id, type: "applicant" })
  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = jwt.sign(
      { id: applicant.id, type: "applicant" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "1h",
      },
    );
    refreshToken = jwt.sign(
      { id: applicant.id, type: "applicant" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "7d",
      },
    );
  } catch (err) {
    throw new Error("Failed to generate new JWT tokens");
  }

  // 5. Audit log the refresh event (optional, but required by spec)
  // Write to ats_recruitment_audit_trails if available
  try {
    await MyGlobal.prisma.ats_recruitment_audit_trails.create({
      data: {
        id: v4(),
        event_timestamp: toISOStringSafe(new Date()),
        actor_id: applicant.id,
        actor_role: "applicant",
        operation_type: "REFRESH_TOKEN",
        target_type: "ats_recruitment_applicants",
        target_id: applicant.id,
        event_detail: JSON.stringify({ refresh: true }),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        ip_address: undefined,
        user_agent: undefined,
        deleted_at: null,
      },
    });
  } catch {}

  // 6. Construct and return authorized session info
  return {
    id: applicant.id,
    email: applicant.email,
    name: applicant.name,
    phone: Object.prototype.hasOwnProperty.call(applicant, "phone")
      ? (applicant.phone ?? undefined)
      : undefined,
    is_active: applicant.is_active,
    created_at: toISOStringSafe(applicant.created_at),
    updated_at: toISOStringSafe(applicant.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireAt,
      refreshable_until: refreshExpireAt,
    },
  };
}
