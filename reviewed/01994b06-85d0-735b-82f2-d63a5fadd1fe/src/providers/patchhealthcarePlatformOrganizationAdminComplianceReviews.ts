import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import { IPageIHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceReview";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate compliance review events
 * (healthcare_platform_compliance_reviews).
 *
 * Performs advanced search and retrieval of compliance review records in
 * healthcarePlatform, including reviews for legal holds, risk assessments,
 * audits, and investigations. Restricted to the authenticated organization
 * admin's organization with support for filtering and pagination.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin performing
 *   the query
 * @param props.body - Filters and search controls for compliance reviews
 * @returns Paginated list of compliance review records with full audit metadata
 * @throws {Error} If role is not organizationadmin
 */
export async function patchhealthcarePlatformOrganizationAdminComplianceReviews(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformComplianceReview.IRequest;
}): Promise<IPageIHealthcarePlatformComplianceReview> {
  const { organizationAdmin, body } = props;
  if (organizationAdmin.type !== "organizationadmin") {
    throw new Error(
      "Forbidden: Only organization admins may access compliance reviews",
    );
  }
  const orgId = organizationAdmin.id;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Filtering logic
  const where = {
    organization_id: orgId,
    ...(body.hold_id !== undefined &&
      body.hold_id !== null && { hold_id: body.hold_id }),
    ...(body.risk_assessment_id !== undefined &&
      body.risk_assessment_id !== null && {
        risk_assessment_id: body.risk_assessment_id,
      }),
    ...(body.reviewer_id !== undefined &&
      body.reviewer_id !== null && { reviewer_id: body.reviewer_id }),
    ...(body.review_type !== undefined &&
      body.review_type !== null && { review_type: body.review_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.outcome !== undefined &&
      body.outcome !== null && { outcome: body.outcome }),
    ...((body.reviewed_at_from !== undefined &&
      body.reviewed_at_from !== null) ||
    (body.reviewed_at_to !== undefined && body.reviewed_at_to !== null)
      ? {
          reviewed_at: {
            ...(body.reviewed_at_from !== undefined &&
              body.reviewed_at_from !== null && { gte: body.reviewed_at_from }),
            ...(body.reviewed_at_to !== undefined &&
              body.reviewed_at_to !== null && { lte: body.reviewed_at_to }),
          },
        }
      : {}),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
    deleted_at: null,
  };

  // Sorting (only allow selected sortable fields)
  const sortableFields = [
    "created_at",
    "updated_at",
    "reviewed_at",
    "status",
    "review_type",
  ];
  const sortBy =
    body.sort_by && sortableFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDir: "asc" | "desc" =
    body.sort_direction === "asc" || body.sort_direction === "desc"
      ? body.sort_direction
      : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_compliance_reviews.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_compliance_reviews.count({ where }),
  ]);

  const data = rows.map((row) => {
    const reviewed_at =
      row.reviewed_at !== null && row.reviewed_at !== undefined
        ? toISOStringSafe(row.reviewed_at)
        : undefined;
    const created_at = toISOStringSafe(row.created_at);
    const updated_at = toISOStringSafe(row.updated_at);
    const deleted_at =
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined;
    return {
      id: row.id,
      organization_id: row.organization_id,
      hold_id: row.hold_id ?? undefined,
      risk_assessment_id: row.risk_assessment_id ?? undefined,
      reviewer_id: row.reviewer_id ?? undefined,
      review_type: row.review_type,
      method: row.method,
      status: row.status,
      outcome: row.outcome ?? undefined,
      recommendations: row.recommendations ?? undefined,
      reviewed_at,
      comments: row.comments ?? undefined,
      created_at,
      updated_at,
      deleted_at,
    };
  });
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / (limit || 1)),
  };
  return {
    pagination,
    data,
  };
}
