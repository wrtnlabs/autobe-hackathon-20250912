import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { IPageIEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessmentResult";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve paginated list of assessment results for a specified assessment.
 *
 * This PATCH endpoint allows an organization administrator to fetch a filtered,
 * sorted, and paginated list of assessment results belonging to their tenant.
 *
 * Tenant isolation is enforced using the organizationAdmin's tenant ID.
 *
 * @param props - Object containing organizationAdmin payload, assessmentId, and
 *   filtering criteria as per IEnterpriseLmsAssessmentResult.IRequest.
 * @returns A paginated list of assessment results matching the criteria.
 * @throws {Error} Throws if the organizationAdmin does not exist.
 * @throws {Error} Throws if invalid sorting fields are provided.
 */
export async function patchenterpriseLmsOrganizationAdminAssessmentsAssessmentIdResults(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentResult.IRequest;
}): Promise<IPageIEnterpriseLmsAssessmentResult> {
  const { organizationAdmin, assessmentId, body } = props;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  // Fetch tenant ID for organizationAdmin to ensure tenant isolation
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });

  const whereConditions = {
    tenant_id: admin.tenant_id,
    assessment_id: assessmentId,
    deleted_at: null as null,
    ...(body.filter?.learner_id !== undefined &&
      body.filter?.learner_id !== null && {
        learner_id: body.filter.learner_id,
      }),
    ...(body.filter?.status !== undefined &&
      body.filter?.status !== null && { status: body.filter.status }),
    ...((body.filter?.date_from !== undefined &&
      body.filter?.date_from !== null) ||
    (body.filter?.date_to !== undefined && body.filter?.date_to !== null)
      ? {
          completed_at: {
            ...(body.filter?.date_from !== undefined &&
              body.filter?.date_from !== null && {
                gte: body.filter.date_from,
              }),
            ...(body.filter?.date_to !== undefined &&
              body.filter?.date_to !== null && { lte: body.filter.date_to }),
          },
        }
      : {}),
  };

  // Validate and sanitize sorting
  const sortableFields = ["score", "completed_at", "created_at", "updated_at"];
  const sortFieldRaw = body.sort?.field ?? "created_at";
  const sortOrderRaw = body.sort?.order ?? "desc";
  const sortField = sortableFields.includes(sortFieldRaw)
    ? sortFieldRaw
    : "created_at";
  const sortOrder =
    sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : "desc";

  // Retrieve total count for pagination
  const total = await MyGlobal.prisma.enterprise_lms_assessment_results.count({
    where: whereConditions,
  });

  // Retrieve paginated data
  const results =
    await MyGlobal.prisma.enterprise_lms_assessment_results.findMany({
      where: whereConditions,
      orderBy: { [sortField]: sortOrder },
      skip: skip,
      take: limit,
    });

  // Map results and convert date fields
  const data = results.map((result) => ({
    id: result.id,
    assessment_id: result.assessment_id,
    learner_id: result.learner_id,
    score: result.score,
    completed_at: result.completed_at
      ? toISOStringSafe(result.completed_at)
      : null,
    status: result.status,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
