import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Searches and retrieves a paginated list of proctored exams related to a
 * specific assessment.
 *
 * This endpoint allows filtering by exam status, search by exam session ID
 * (partial match), sorting by any field with direction, and pagination
 * controls.
 *
 * Only authenticated Content Creator Instructors can access this data.
 *
 * @param props.contentCreatorInstructor - Authenticated instructor payload
 *   (authorization done externally)
 * @param props.assessmentId - UUID of the assessment to filter exams
 * @param props.body - Request body with filtering, pagination, and sorting
 *   parameters
 * @returns Paginated list of proctored exams matching criteria
 * @throws Errors related to invalid parameters or database failures
 */
export async function patchenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdProctoredExams(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IRequest;
}): Promise<IPageIEnterpriseLmsProctoredExam> {
  const { contentCreatorInstructor, assessmentId, body } = props;

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

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.exam_session_id = { contains: body.search };
  }

  let orderByField = "created_at";
  let orderDirection: "asc" | "desc" = "desc";
  if (
    body.orderBy !== undefined &&
    body.orderBy !== null &&
    body.orderBy.trim() !== ""
  ) {
    const parts = body.orderBy.trim().split(/\s+/);
    if (parts.length === 2) {
      orderByField = parts[0];
      orderDirection = parts[1].toLowerCase() === "asc" ? "asc" : "desc";
    } else if (parts.length === 1) {
      orderByField = parts[0];
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_proctored_exams.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_proctored_exams.count({ where }),
  ]);

  const data = results.map((exam) => ({
    id: exam.id,
    assessment_id: exam.assessment_id,
    exam_session_id: exam.exam_session_id,
    proctor_id: exam.proctor_id ?? null,
    scheduled_at: toISOStringSafe(exam.scheduled_at),
    status: exam.status,
    created_at: toISOStringSafe(exam.created_at),
    updated_at: toISOStringSafe(exam.updated_at),
    deleted_at: exam.deleted_at ? toISOStringSafe(exam.deleted_at) : null,
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
