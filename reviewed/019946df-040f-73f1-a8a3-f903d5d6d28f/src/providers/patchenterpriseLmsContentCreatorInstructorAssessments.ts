import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import { IPageIEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessments";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Search and retrieve a paginated list of Enterprise LMS assessments.
 *
 * Retrieves assessments filtered by tenant, code, title, assessment type,
 * status, and scheduled date ranges. Supports pagination and sorting.
 *
 * Accessible only by authenticated contentCreatorInstructor role.
 *
 * @param props - Object containing authenticated contentCreatorInstructor and
 *   request body with filters
 * @param props.contentCreatorInstructor - Authenticated
 *   contentCreatorInstructor user payload
 * @param props.body - Search and pagination parameters conforming to
 *   IEnterpriseLmsAssessments.IRequest
 * @returns Paginated list of assessments matching search criteria
 * @throws Error when unexpected errors occur during database access
 */
export async function patchenterpriseLmsContentCreatorInstructorAssessments(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsAssessments.IRequest;
}): Promise<IPageIEnterpriseLmsAssessments> {
  const { contentCreatorInstructor, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = { deleted_at: null };

  if (body.tenant_id !== undefined && body.tenant_id !== null) {
    where.tenant_id = body.tenant_id;
  }
  if (body.code !== undefined && body.code !== null) {
    where.code = { contains: body.code };
  }
  if (body.title !== undefined && body.title !== null) {
    where.title = { contains: body.title };
  }
  if (body.assessment_type !== undefined && body.assessment_type !== null) {
    where.assessment_type = { contains: body.assessment_type };
  }
  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }
  if (
    (body.scheduled_start_after !== undefined &&
      body.scheduled_start_after !== null) ||
    (body.scheduled_end_before !== undefined &&
      body.scheduled_end_before !== null)
  ) {
    where.AND = [];
    if (
      body.scheduled_start_after !== undefined &&
      body.scheduled_start_after !== null
    ) {
      where.AND.push({
        scheduled_start_at: { gte: body.scheduled_start_after },
      });
    }
    if (
      body.scheduled_end_before !== undefined &&
      body.scheduled_end_before !== null
    ) {
      where.AND.push({ scheduled_end_at: { lte: body.scheduled_end_before } });
    }
  }

  let orderBy: any = { created_at: "desc" };
  if (body.orderBy) {
    const direction = body.orderDirection === "asc" ? "asc" : "desc";
    if (
      [
        "code",
        "title",
        "assessment_type",
        "status",
        "scheduled_start_at",
        "scheduled_end_at",
        "created_at",
        "updated_at",
      ].includes(body.orderBy)
    ) {
      orderBy = { [body.orderBy]: direction };
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_assessments.findMany({
      where,
      orderBy,
      skip,
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
