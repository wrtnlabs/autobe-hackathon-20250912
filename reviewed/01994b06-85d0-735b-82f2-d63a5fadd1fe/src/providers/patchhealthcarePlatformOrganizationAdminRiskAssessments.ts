import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import { IPageIHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRiskAssessment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated list of risk assessments from
 * healthcare_platform_risk_assessments.
 *
 * Retrieves a paginated and filterable list of organizational or
 * department-level risk assessments for the authenticated organization
 * administrator. Supports advanced filtering (by status, type, risk level, date
 * range, department), search, flexible pagination, and sort order. Results are
 * always limited to the organization whose admin is authenticated;
 * cross-organization data access is strictly blocked.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - Search and filter criteria, pagination, and sorting
 *   metadata
 * @returns Paginated list of risk assessment summaries matching query/filters
 */
export async function patchhealthcarePlatformOrganizationAdminRiskAssessments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformRiskAssessment.IRequest;
}): Promise<IPageIHealthcarePlatformRiskAssessment.ISummary> {
  const { organizationAdmin, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const allowedSort = [
    "created_at",
    "status",
    "window_start",
    "assessment_type",
    "window_end",
    "risk_level",
  ];
  const sortBy =
    body.sort_by && allowedSort.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const order = body.order === "asc" ? "asc" : "desc";

  // Build window_start filter
  let windowStartFilter: { gte?: string; lte?: string } = {};
  if (body.window_start_from !== undefined) {
    windowStartFilter.gte = body.window_start_from;
  }
  if (body.window_start_to !== undefined) {
    windowStartFilter.lte = body.window_start_to;
  }
  // Don't include empty object
  const hasWindowStart = Object.keys(windowStartFilter).length > 0;

  // Build window_end filter
  let windowEndFilter: { gte?: string; lte?: string } = {};
  if (body.window_end_from !== undefined) {
    windowEndFilter.gte = body.window_end_from;
  }
  if (body.window_end_to !== undefined) {
    windowEndFilter.lte = body.window_end_to;
  }
  const hasWindowEnd = Object.keys(windowEndFilter).length > 0;

  // Main where clause
  const where: Record<string, unknown> = {
    organization_id: organizationAdmin.id,
    deleted_at: null,
    ...(body.department_id !== undefined &&
      body.department_id !== null && { department_id: body.department_id }),
    ...(body.assessment_type !== undefined && {
      assessment_type: body.assessment_type,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.risk_level !== undefined && { risk_level: body.risk_level }),
    ...(hasWindowStart && { window_start: windowStartFilter }),
    ...(hasWindowEnd && { window_end: windowEndFilter }),
  };

  // Optional search filter (fuzzy text match on methodology/recommendations)
  if (body.search !== undefined && body.search.length > 0) {
    where.OR = [
      { methodology: { contains: body.search } },
      { recommendations: { contains: body.search } },
    ];
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_risk_assessments.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
      select: {
        id: true,
        assessment_type: true,
        status: true,
        risk_level: true,
        window_start: true,
        window_end: true,
        department_id: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_risk_assessments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      assessment_type: row.assessment_type,
      status: row.status,
      risk_level: row.risk_level,
      window_start: toISOStringSafe(row.window_start),
      window_end: toISOStringSafe(row.window_end),
      department_id:
        row.department_id !== null && row.department_id !== undefined
          ? row.department_id
          : undefined,
    })),
  };
}
