import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Searches and retrieves a paginated list of proctored exams related to a
 * specific assessment within the LMS.
 *
 * This function allows external learners to filter and paginate proctored exam
 * sessions.
 *
 * @param props - Object containing the external learner payload, assessment ID,
 *   and filter/pagination criteria
 * @param props.externalLearner - Authentication payload for external learner
 * @param props.assessmentId - UUID string identifying the assessment
 * @param props.body - Search and pagination filters including status, search
 *   text, and orderBy string
 * @returns A paginated list of proctored exams matching the criteria
 * @throws Error if database or query errors occur
 */
export async function patchenterpriseLmsExternalLearnerAssessmentsAssessmentIdProctoredExams(props: {
  externalLearner: ExternallearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IRequest;
}): Promise<IPageIEnterpriseLmsProctoredExam> {
  const { externalLearner, assessmentId, body } = props;

  // Normalize pagination parameters
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: {
    assessment_id: string & tags.Format<"uuid">;
    status?: "scheduled" | "in_progress" | "completed" | "cancelled";
    OR?:
      | {
          exam_session_id?: { contains: string };
        }
      | {
          proctor_id?: { contains: string };
        }[];
  } = {
    assessment_id: assessmentId,
  };

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.OR = [
      { exam_session_id: { contains: body.search } },
      { proctor_id: { contains: body.search } },
    ];
  }

  // Parse orderBy
  const orderByField = body.orderBy ? body.orderBy.split(" ")[0] : "created_at";
  const orderDirection =
    body.orderBy && body.orderBy.toUpperCase().endsWith("ASC") ? "asc" : "desc";

  // Query database
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_proctored_exams.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_proctored_exams.count({ where }),
  ]);

  // Prepare return data
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((exam) => ({
      id: exam.id,
      assessment_id: exam.assessment_id,
      exam_session_id: exam.exam_session_id,
      proctor_id: exam.proctor_id ?? undefined,
      scheduled_at: toISOStringSafe(exam.scheduled_at),
      status: exam.status as "the exact enum",
      created_at: toISOStringSafe(exam.created_at),
      updated_at: toISOStringSafe(exam.updated_at),
      deleted_at: exam.deleted_at
        ? toISOStringSafe(exam.deleted_at)
        : undefined,
    })),
  };
}
