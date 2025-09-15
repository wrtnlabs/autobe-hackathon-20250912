import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import { IPageIHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceConsent";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve filtered/paginated compliance consent records for
 * regulatory audit.
 *
 * Retrieves a filtered, paginated list of compliance consents for the
 * organization where the requesting admin is scoped. Only consents for the
 * admin's own organization are ever accessible. Supports advanced filter by
 * subject, policy version, consent type, granted/revoked status, and time
 * windows. All audit, ownership, and date fields are included in response
 * records. Pagination, sorting, and RBAC are enforced strictly. All date fields
 * are output as string & tags.Format<'date-time'> and UUID fields as string &
 * tags.Format<'uuid'>. RBAC: The admin must be authenticated as
 * OrganizationadminPayload; scope is limited to their own org
 * (organization_id=admin.id).
 *
 * @param props - Search request for compliance consents
 * @param props.organizationAdmin - Authenticated organization administrator's
 *   JWT payload (RBAC enforced)
 * @param props.body - Search and pagination/filter criteria (organization
 *   filter always overridden to admin's own org)
 * @returns Paginated list of matching compliance consents, including audit,
 *   type, and status fields
 */
export async function patchhealthcarePlatformOrganizationAdminComplianceConsents(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformComplianceConsent.IRequest;
}): Promise<IPageIHealthcarePlatformComplianceConsent.ISummary> {
  const { organizationAdmin, body } = props;

  // RBAC: Only allow access to admin's own org
  const orgId = organizationAdmin.id;

  // Pagination defaults
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // Only allow sorting by whitelisted fields
  const allowedSortFields = [
    "consent_at",
    "created_at",
    "updated_at",
    "expires_at",
    "revoked_at",
    "granted",
  ];
  let sortField = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const [field, dir] = body.sort.split(":");
    if (field && allowedSortFields.includes(field)) {
      sortField = field;
      if (dir === "asc" || dir === "desc") sortOrder = dir;
    }
  }

  // Compose Prisma where object from filters; only non-undefined values included. Always org scope.
  const where = {
    organization_id: orgId,
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

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_compliance_consents.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_compliance_consents.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    subject_id:
      row.subject_id === null || row.subject_id === undefined
        ? undefined
        : row.subject_id,
    policy_version_id: row.policy_version_id,
    consent_type: row.consent_type,
    granted: row.granted,
    consent_at: toISOStringSafe(row.consent_at),
    revoked_at:
      row.revoked_at === null || row.revoked_at === undefined
        ? undefined
        : toISOStringSafe(row.revoked_at),
    revocation_reason:
      row.revocation_reason === null || row.revocation_reason === undefined
        ? undefined
        : row.revocation_reason,
    expires_at:
      row.expires_at === null || row.expires_at === undefined
        ? undefined
        : toISOStringSafe(row.expires_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null || row.deleted_at === undefined
        ? undefined
        : toISOStringSafe(row.deleted_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / (limit > 0 ? limit : 1))),
    },
    data,
  };
}
