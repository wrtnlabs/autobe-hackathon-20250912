import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated list of proctored exams for a given
 * assessment.
 *
 * This function queries the enterprise_lms_proctored_exams table scoped to the
 * provided assessmentId and applies filtering, sorting, and pagination based on
 * the provided IRequest parameters.
 *
 * Authorization is required: only users with the organizationAdmin role are
 * authorized to perform this operation.
 *
 * @param props - Object containing the organizationAdmin payload, target
 *   assessmentId, and filter/pagination body
 * @param props.organizationAdmin - Authorized organization admin payload
 * @param props.assessmentId - UUID of the assessment to filter proctored exams
 * @param props.body - Request body containing filter and pagination options
 * @returns Paginated list of proctored exam records matching the criteria
 * @throws {Error} Throws if the query or pagination parameters are invalid
 */
export async function patchenterpriseLmsOrganizationAdminAssessmentsAssessmentIdProctoredExams(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IRequest;
}): Promise<IPageIEnterpriseLmsProctoredExam> {
  const { organizationAdmin, assessmentId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    assessment_id: string & tags.Format<"uuid">;
    deleted_at: null;
    status?: "scheduled" | "in_progress" | "completed" | "cancelled";
    exam_session_id?: { contains: string };
  } = {
    assessment_id: assessmentId,
    deleted_at: null,
  };

  if (body.status !== null && body.status !== undefined) {
    where.status = body.status;
  }

  if (body.search !== null && body.search !== undefined) {
    where.exam_session_id = { contains: body.search };
  }

  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.orderBy) {
    const match = body.orderBy.match(/^(\+|-)?([a-zA-Z_]+)$/);
    if (match) {
      const direction = match[1] === "-" ? "desc" : "asc";
      const field = match[2];
      orderBy = { [field]: direction };
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_proctored_exams.findMany({
      where,
      orderBy,
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_proctored_exams.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((item) => ({
      id: item.id,
      assessment_id: item.assessment_id,
      exam_session_id: item.exam_session_id,
      proctor_id: item.proctor_id ?? undefined,
      scheduled_at: toISOStringSafe(item.scheduled_at),
      status: item.status as
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled",
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
