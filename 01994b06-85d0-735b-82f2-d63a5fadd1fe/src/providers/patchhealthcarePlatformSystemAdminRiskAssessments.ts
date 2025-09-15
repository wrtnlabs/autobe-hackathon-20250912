import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import { IPageIHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRiskAssessment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of risk assessments from
 * healthcare_platform_risk_assessments.
 *
 * Retrieves a paginated, filterable list of risk assessments across all
 * organizations or departments, supporting search by assessment metadata and
 * time window. Returns a slice of organizational or department-level risk
 * assessments, with compliance-focused summary metadata, for review by
 * compliance staff, administrators, or auditors.
 *
 * @param props - The props object containing:
 *
 *   - SystemAdmin: SystemadminPayload (authenticated system administrator)
 *   - Body: IHealthcarePlatformRiskAssessment.IRequest (search/filter request body)
 *
 * @returns A paginated summary DTO with matching risk assessments and
 *   normalized pagination info.
 * @throws {Error} If query or pagination fails.
 */
export async function patchhealthcarePlatformSystemAdminRiskAssessments(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformRiskAssessment.IRequest;
}): Promise<IPageIHealthcarePlatformRiskAssessment.ISummary> {
  const { body } = props;
  // Defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Enforce allowed sort fields for security/consistency
  const allowedSortFields = [
    "created_at",
    "window_start",
    "window_end",
    "assessment_type",
    "status",
    "risk_level",
  ];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by as string)
    : "created_at";
  const order: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Build where condition with safe null/undefined handling
  const where = {
    deleted_at: null,
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    ...(body.assessment_type !== undefined &&
      body.assessment_type !== null && {
        assessment_type: body.assessment_type,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.risk_level !== undefined &&
      body.risk_level !== null && {
        risk_level: body.risk_level,
      }),
    ...((body.window_start_from !== undefined &&
      body.window_start_from !== null) ||
    (body.window_start_to !== undefined && body.window_start_to !== null)
      ? {
          window_start: {
            ...(body.window_start_from !== undefined &&
              body.window_start_from !== null && {
                gte: body.window_start_from,
              }),
            ...(body.window_start_to !== undefined &&
              body.window_start_to !== null && {
                lte: body.window_start_to,
              }),
          },
        }
      : {}),
    ...((body.window_end_from !== undefined && body.window_end_from !== null) ||
    (body.window_end_to !== undefined && body.window_end_to !== null)
      ? {
          window_end: {
            ...(body.window_end_from !== undefined &&
              body.window_end_from !== null && {
                gte: body.window_end_from,
              }),
            ...(body.window_end_to !== undefined &&
              body.window_end_to !== null && {
                lte: body.window_end_to,
              }),
          },
        }
      : {}),
    ...(body.search && {
      OR: [
        { methodology: { contains: body.search } },
        { recommendations: { contains: body.search } },
      ],
    }),
  };

  // Fetch risk assessment records and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_risk_assessments.findMany({
      where,
      orderBy: { [sort_by]: order },
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

  // Map and normalize row outputs for summary DTO
  const data = rows.map((row) => {
    return {
      id: row.id,
      assessment_type: row.assessment_type,
      status: row.status,
      risk_level: row.risk_level,
      window_start: toISOStringSafe(row.window_start),
      window_end: toISOStringSafe(row.window_end),
      // Optional + nullable - use null (not undefined) if Prisma returns null; omit if undefined
      ...(row.department_id === null
        ? { department_id: null }
        : row.department_id !== undefined
          ? { department_id: row.department_id }
          : {}),
    };
  });
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  // Normalize to uint32 for pagination fields as required by DTO
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data,
  };
}
