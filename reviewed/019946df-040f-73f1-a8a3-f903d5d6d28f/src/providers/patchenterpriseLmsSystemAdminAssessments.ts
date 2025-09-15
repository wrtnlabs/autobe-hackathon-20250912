import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { IPageIEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessments";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of Enterprise LMS assessments.
 *
 * This operation allows a system administrator to query assessments with
 * filters including tenant ID, code, title, assessment type, status, and
 * scheduled dates. Supports pagination and sorting. Ensures that only
 * non-deleted assessments are returned.
 *
 * @param props - An object containing the authenticated systemAdmin and the
 *   search request body.
 * @param props.systemAdmin - The authenticated system administrator payload.
 * @param props.body - Search and pagination filters for assessments.
 * @returns A paginated list of assessments matching the search criteria.
 * @throws {Error} When an internal server error occurs during database
 *   operations.
 */
export async function patchenterpriseLmsSystemAdminAssessments(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsAssessments.IRequest;
}): Promise<IPageIEnterpriseLmsAssessments> {
  const { systemAdmin, body } = props;

  // Normalize pagination inputs with fallback defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build where condition with filtering
  const whereCondition = {
    deleted_at: null,
    ...(body.tenant_id !== undefined &&
      body.tenant_id !== null && { tenant_id: body.tenant_id }),
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.title !== undefined &&
      body.title !== null && { title: { contains: body.title } }),
    ...(body.assessment_type !== undefined &&
      body.assessment_type !== null && {
        assessment_type: body.assessment_type,
      }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.scheduled_start_after !== undefined &&
    body.scheduled_start_after !== null
      ? { scheduled_start_at: { gte: body.scheduled_start_after } }
      : {}),
    ...(body.scheduled_end_before !== undefined &&
    body.scheduled_end_before !== null
      ? { scheduled_end_at: { lte: body.scheduled_end_before } }
      : {}),
  };

  // Execute concurrent queries: data and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_assessments.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy:
        body.orderBy &&
        (body.orderDirection === "asc" || body.orderDirection === "desc")
          ? { [body.orderBy]: body.orderDirection }
          : { created_at: "desc" },
    }),
    MyGlobal.prisma.enterprise_lms_assessments.count({ where: whereCondition }),
  ]);

  // Map results to DTO with ISO string conversions
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((assessment) => ({
      id: assessment.id,
      tenant_id: assessment.tenant_id,
      code: assessment.code,
      title: assessment.title,
      description: assessment.description ?? undefined,
      assessment_type: assessment.assessment_type,
      max_score: assessment.max_score,
      passing_score: assessment.passing_score,
      scheduled_start_at: assessment.scheduled_start_at
        ? toISOStringSafe(assessment.scheduled_start_at)
        : null,
      scheduled_end_at: assessment.scheduled_end_at
        ? toISOStringSafe(assessment.scheduled_end_at)
        : null,
      status: assessment.status,
      created_at: toISOStringSafe(assessment.created_at),
      updated_at: toISOStringSafe(assessment.updated_at),
      deleted_at: assessment.deleted_at
        ? toISOStringSafe(assessment.deleted_at)
        : null,
    })),
  };
}
