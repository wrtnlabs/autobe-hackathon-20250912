import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import { IPageIHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceReview";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate compliance review events
 * (healthcare_platform_compliance_reviews).
 *
 * Performs advanced search and retrieval of compliance review records in the
 * healthcarePlatform. This may include reviews for legal holds, risk
 * assessments, periodic audits, regulatory investigations, or internal
 * compliance checks. Users provide a request body specifying complex search
 * filters (review status, type, organization, reviewer, date ranges, outcomes,
 * etc.) and pagination controls.
 *
 * Security: Only users with systemAdmin role can access this API. The operation
 * enforces strict filtering to ensure users only see reviews within their
 * organization or department scope. Data is returned in paginated form; each
 * review exposes full audit/compliance metadata.
 *
 * @param props - The request properties.
 * @param props.systemAdmin - Authenticated system admin making the request.
 * @param props.body - Search/filter and pagination criteria for compliance
 *   review aggregation.
 * @returns Paginated list of compliance review entries with search metadata and
 *   reviews.
 * @throws {Error} If any RBAC or validation failure is detected.
 */
export async function patchhealthcarePlatformSystemAdminComplianceReviews(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformComplianceReview.IRequest;
}): Promise<IPageIHealthcarePlatformComplianceReview> {
  const { body } = props;

  // Allowed sort fields as per business logic
  const allowedSortFields = [
    "created_at",
    "reviewed_at",
    "status",
    "review_type",
  ];
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 25) as number;

  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Build where clause based on provided filters
  const where = {
    ...(body.organization_id !== undefined && {
      organization_id: body.organization_id,
    }),
    ...(body.hold_id !== undefined && {
      hold_id: body.hold_id,
    }),
    ...(body.risk_assessment_id !== undefined && {
      risk_assessment_id: body.risk_assessment_id,
    }),
    ...(body.reviewer_id !== undefined && {
      reviewer_id: body.reviewer_id,
    }),
    ...(body.review_type !== undefined && {
      review_type: body.review_type,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.outcome !== undefined && {
      outcome: { contains: body.outcome },
    }),
    ...(((body.reviewed_at_from !== undefined &&
      body.reviewed_at_from !== null) ||
      (body.reviewed_at_to !== undefined && body.reviewed_at_to !== null)) && {
      reviewed_at: {
        ...(body.reviewed_at_from !== undefined &&
          body.reviewed_at_from !== null && {
            gte: body.reviewed_at_from,
          }),
        ...(body.reviewed_at_to !== undefined &&
          body.reviewed_at_to !== null && {
            lte: body.reviewed_at_to,
          }),
      },
    }),
    ...(((body.created_at_from !== undefined &&
      body.created_at_from !== null) ||
      (body.created_at_to !== undefined && body.created_at_to !== null)) && {
      created_at: {
        ...(body.created_at_from !== undefined &&
          body.created_at_from !== null && {
            gte: body.created_at_from,
          }),
        ...(body.created_at_to !== undefined &&
          body.created_at_to !== null && {
            lte: body.created_at_to,
          }),
      },
    }),
  };

  // Paginated data and total count (parallel)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_compliance_reviews.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_compliance_reviews.count({ where }),
  ]);

  // Map and brand all fields properly per IHealthcarePlatformComplianceReview
  const result: IPageIHealthcarePlatformComplianceReview = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => {
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
        reviewed_at:
          row.reviewed_at === null || row.reviewed_at === undefined
            ? undefined
            : toISOStringSafe(row.reviewed_at),
        comments: row.comments ?? undefined,
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
        deleted_at:
          row.deleted_at === null || row.deleted_at === undefined
            ? undefined
            : toISOStringSafe(row.deleted_at),
      };
    }),
  };

  return result;
}
