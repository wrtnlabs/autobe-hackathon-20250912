import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceAgreement";
import { IPageIHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceAgreement";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate compliance agreements by filter, returning audit-ready
 * summaries.
 *
 * This endpoint allows regulatory and organization administrators to perform
 * filtered, paginated search over all compliance agreement records within their
 * organization. Filters include organization, policy version, agreement type,
 * status, signer, and signed_at date range. Pagination, sorting, and
 * audit-ready metadata are included in the result. Strict organization
 * isolation is enforced.
 *
 * Only admins for the organization may access agreements for their org,
 * regardless of the filter. All queries are subject to privacy, regulatory, and
 * security controls. Returns a paged list of agreement summaries.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin making the
 *   request
 * @param props.body - Search & filter criteria for compliance agreements, with
 *   pagination and sorting
 * @returns A paged, audit-ready summary list of compliance agreements for the
 *   admin's organization
 * @throws {Error} If the request filters an organization not matching the
 *   authenticated admin
 */
export async function patchhealthcarePlatformOrganizationAdminComplianceAgreements(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformComplianceAgreement.IRequest;
}): Promise<IPageIHealthcarePlatformComplianceAgreement.ISummary> {
  const { organizationAdmin, body } = props;
  const orgId = organizationAdmin.id;

  // Enforce org isolation regardless of filter
  const where: Record<string, unknown> = {
    organization_id: orgId,
    ...(body.policy_version_id !== undefined &&
      body.policy_version_id !== null && {
        policy_version_id: body.policy_version_id,
      }),
    ...(body.signer_id !== undefined &&
      body.signer_id !== null && { signer_id: body.signer_id }),
    ...(body.agreement_type !== undefined &&
      body.agreement_type !== null && { agreement_type: body.agreement_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
  };
  // Build signed_at date window
  if (
    (body.signed_at_min !== undefined && body.signed_at_min !== null) ||
    (body.signed_at_max !== undefined && body.signed_at_max !== null)
  ) {
    where.signed_at = {
      ...(body.signed_at_min !== undefined &&
        body.signed_at_min !== null && { gte: body.signed_at_min }),
      ...(body.signed_at_max !== undefined &&
        body.signed_at_max !== null && { lte: body.signed_at_max }),
    };
  }

  // Pagination and sorting
  const allowedSortFields = [
    "created_at",
    "signed_at",
    "agreement_type",
    "status",
    "updated_at",
  ];
  const page = Number(body.page ?? 0);
  const limit = Number(body.limit ?? 20);
  const skip = page * limit;
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortDir = body.sort_dir === "asc" ? "asc" : "desc";

  // Prisma requires orderBy inline for type narrowing
  const orderBy = [{ [sortBy]: sortDir }];

  // Main query & total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_compliance_agreements.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_compliance_agreements.count({ where }),
  ]);

  // Map records to ISummary and convert all dates
  const data = rows.map((row) => {
    return {
      id: row.id,
      organization_id: row.organization_id,
      signer_id: row.signer_id ?? undefined,
      policy_version_id: row.policy_version_id,
      agreement_type: row.agreement_type,
      status: row.status,
      signed_at: row.signed_at ? toISOStringSafe(row.signed_at) : undefined,
      method: row.method ?? undefined,
      expires_at: row.expires_at ? toISOStringSafe(row.expires_at) : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
