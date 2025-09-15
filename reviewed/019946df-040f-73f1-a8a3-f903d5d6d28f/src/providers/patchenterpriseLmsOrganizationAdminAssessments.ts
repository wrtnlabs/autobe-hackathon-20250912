import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { IPageIEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessments";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated list of Enterprise LMS assessments.
 *
 * Supports filtering by tenant, code, title, assessment_type, status, scheduled
 * start and end dates. Pagination and sorting are included. Only active
 * (non-deleted) assessments are returned.
 *
 * @param props - Object containing the authenticated organizationAdmin and
 *   request body filters
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload
 * @param props.body - Request body containing filtering and pagination
 *   parameters
 * @returns Paginated list of assessments matching the filters
 * @throws {Error} When tenant_id is missing from the request body
 */
export async function patchenterpriseLmsOrganizationAdminAssessments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsAssessments.IRequest;
}): Promise<IPageIEnterpriseLmsAssessments> {
  const { organizationAdmin, body } = props;

  if (!body.tenant_id) {
    throw new Error("tenant_id is required");
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where = {
    tenant_id: body.tenant_id,
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
    ...((body.scheduled_start_after !== undefined &&
      body.scheduled_start_after !== null) ||
    (body.scheduled_end_before !== undefined &&
      body.scheduled_end_before !== null)
      ? {
          scheduled_start_at: {
            ...(body.scheduled_start_after !== undefined &&
              body.scheduled_start_after !== null && {
                gte: body.scheduled_start_after,
              }),
            ...(body.scheduled_end_before !== undefined &&
              body.scheduled_end_before !== null && {
                lte: body.scheduled_end_before,
              }),
          },
        }
      : {}),
    deleted_at: null,
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_assessments.findMany({
      where,
      orderBy: body.orderBy
        ? { [body.orderBy]: body.orderDirection === "asc" ? "asc" : "desc" }
        : { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_assessments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((a) => ({
      id: a.id,
      tenant_id: a.tenant_id,
      code: a.code,
      title: a.title,
      description: a.description ?? undefined,
      assessment_type: a.assessment_type,
      max_score: a.max_score,
      passing_score: a.passing_score,
      scheduled_start_at: a.scheduled_start_at
        ? toISOStringSafe(a.scheduled_start_at)
        : null,
      scheduled_end_at: a.scheduled_end_at
        ? toISOStringSafe(a.scheduled_end_at)
        : null,
      status: a.status,
      created_at: toISOStringSafe(a.created_at),
      updated_at: toISOStringSafe(a.updated_at),
      deleted_at: a.deleted_at ? toISOStringSafe(a.deleted_at) : null,
    })),
  };
}
