import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import { IPageIHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceConsent";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve filtered/paginated compliance consent records for
 * regulatory audit.
 *
 * This endpoint allows system administrators to retrieve a filtered, paginated
 * list of compliance consent records for the healthcare platform for
 * regulatory, operational, and legal review. Records are filtered by fields
 * such as organization, subject, policy version, consent type, granted status,
 * or relevant timestamps (grant, revoke, expiry), supporting compliance audits
 * and resolution. All datetime values are converted to string &
 * tags.Format<'date-time'>; UUIDs and all output types follow DTO structure.
 *
 * @param props - Object containing system admin payload and filter/search
 *   parameters
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.body - Filter and search criteria (organization, subject,
 *   consent type, timestamps, pagination, and sort)
 * @returns Paginated list of matching compliance consent summaries
 */
export async function patchhealthcarePlatformSystemAdminComplianceConsents(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformComplianceConsent.IRequest;
}): Promise<IPageIHealthcarePlatformComplianceConsent.ISummary> {
  const { body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // WHERE clause: only include defined filters
  const where = {
    ...(body.organization_id !== undefined
      ? { organization_id: body.organization_id }
      : {}),
    ...(body.subject_id !== undefined ? { subject_id: body.subject_id } : {}),
    ...(body.policy_version_id !== undefined
      ? { policy_version_id: body.policy_version_id }
      : {}),
    ...(body.consent_type !== undefined
      ? { consent_type: body.consent_type }
      : {}),
    ...(body.granted !== undefined ? { granted: body.granted } : {}),
    ...(body.consent_at !== undefined ? { consent_at: body.consent_at } : {}),
    ...(body.revoked_at !== undefined ? { revoked_at: body.revoked_at } : {}),
    ...(body.expires_at !== undefined ? { expires_at: body.expires_at } : {}),
  };

  // Parse sort string safely, fallback to 'consent_at:desc'
  let orderBy: { [key: string]: "asc" | "desc" } = { consent_at: "desc" };
  if (body.sort) {
    const parts = body.sort.split(":");
    if (parts.length === 2) {
      const [field, dirRaw] = parts;
      const dir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : undefined;
      if (
        [
          "consent_at",
          "revoked_at",
          "expires_at",
          "created_at",
          "updated_at",
        ].includes(field) &&
        dir
      ) {
        orderBy = { [field]: dir };
      }
    }
  }

  // Total records for pagination
  const total =
    await MyGlobal.prisma.healthcare_platform_compliance_consents.count({
      where,
    });

  // Fetch paginated records
  const rows =
    await MyGlobal.prisma.healthcare_platform_compliance_consents.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

  // Map database rows to DTO summaries (with correct typings and formatted dates)
  const data: IHealthcarePlatformComplianceConsent.ISummary[] = rows.map(
    (row) => {
      // Required fields
      const summary: IHealthcarePlatformComplianceConsent.ISummary = {
        id: row.id,
        organization_id: row.organization_id,
        subject_id: row.subject_id ?? undefined,
        policy_version_id: row.policy_version_id,
        consent_type: row.consent_type,
        granted: row.granted,
        consent_at: toISOStringSafe(row.consent_at),
        revoked_at: row.revoked_at
          ? toISOStringSafe(row.revoked_at)
          : undefined,
        revocation_reason: row.revocation_reason ?? undefined,
        expires_at: row.expires_at
          ? toISOStringSafe(row.expires_at)
          : undefined,
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
        deleted_at: row.deleted_at
          ? toISOStringSafe(row.deleted_at)
          : undefined,
      };
      return summary;
    },
  );

  // Pagination response
  const result: IPageIHealthcarePlatformComplianceConsent.ISummary = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
  return result;
}
