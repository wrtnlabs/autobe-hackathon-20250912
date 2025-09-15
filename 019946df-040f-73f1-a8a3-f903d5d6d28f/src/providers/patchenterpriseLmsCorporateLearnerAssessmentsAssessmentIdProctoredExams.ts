import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve a paginated list of proctored exams for a given
 * assessment.
 *
 * This endpoint allows authenticated corporate learners to filter and paginate
 * proctored exams belonging to the specified assessment. Supports filtering by
 * status and exam session ID search, ordering, and pagination controls.
 *
 * @param props - Object containing corporateLearner auth, assessmentId path
 *   parameter, and request body for filtering and paging
 * @param props.corporateLearner - The authenticated corporate learner
 * @param props.assessmentId - UUID of the assessment to filter proctored exams
 * @param props.body - Request body with pagination, filtering, and sorting
 *   options
 * @returns A paginated list of proctored exams matching the criteria
 */
export async function patchenterpriseLmsCorporateLearnerAssessmentsAssessmentIdProctoredExams(props: {
  corporateLearner: CorporatelearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IRequest;
}): Promise<IPageIEnterpriseLmsProctoredExam> {
  const { corporateLearner, assessmentId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  const where: {
    assessment_id: string & tags.Format<"uuid">;
    deleted_at: null;
    status?: string;
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

  let orderByField: string = "created_at";
  let orderByDirection: "asc" | "desc" = "desc";

  if (body.orderBy) {
    const parts = body.orderBy.split(" ");
    if (parts.length === 2) {
      const [field, direction] = parts;
      if (field) {
        orderByField = field;
      }
      if (
        direction.toLowerCase() === "asc" ||
        direction.toLowerCase() === "desc"
      ) {
        orderByDirection = direction.toLowerCase() as "asc" | "desc";
      }
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_proctored_exams.findMany({
      where: where,
      orderBy: {
        [orderByField]: orderByDirection,
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_proctored_exams.count({
      where: where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((x) => ({
      id: x.id as string & tags.Format<"uuid">,
      assessment_id: x.assessment_id as string & tags.Format<"uuid">,
      exam_session_id: x.exam_session_id,
      proctor_id: x.proctor_id ?? undefined,
      scheduled_at: toISOStringSafe(x.scheduled_at),
      status: x.status as
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled",
      created_at: toISOStringSafe(x.created_at),
      updated_at: toISOStringSafe(x.updated_at),
      deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : undefined,
    })),
  };
}
