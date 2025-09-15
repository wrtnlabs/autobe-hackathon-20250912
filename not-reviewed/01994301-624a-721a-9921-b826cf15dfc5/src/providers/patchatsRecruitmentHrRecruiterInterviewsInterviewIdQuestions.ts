import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import { IPageIAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewQuestion";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a paginated list of all questions assigned to a specific interview
 * (ats_recruitment_interview_questions).
 *
 * This endpoint fetches a filterable and paginated list of interview questions
 * assigned to a particular interview, supporting filtering by question type or
 * template/manual status, full-text search, and sorting. Accessible only to HR
 * recruiters who own the interview.
 *
 * @param props - Request parameters
 * @param props.hrRecruiter - Authenticated HR recruiter making the request
 * @param props.interviewId - Unique UUID of the interview to fetch questions
 *   for
 * @param props.body - Filtering and pagination options for the query
 * @returns Paginated set of interview question records, including type,
 *   content, and order
 * @throws {Error} If the interview does not exist or does not belong to the HR
 *   recruiter
 */
export async function patchatsRecruitmentHrRecruiterInterviewsInterviewIdQuestions(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewQuestion.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewQuestion> {
  const { hrRecruiter, interviewId, body } = props;

  // Step 1: Fetch the interview and validate recruiter ownership via application -> job_posting
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: interviewId,
      deleted_at: null,
    },
    select: {
      ats_recruitment_application_id: true,
    },
  });
  if (!interview) {
    throw new Error("Interview not found or access denied");
  }

  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: {
        id: interview.ats_recruitment_application_id,
        deleted_at: null,
      },
      select: {
        job_posting_id: true,
      },
    });
  if (!application) {
    throw new Error("Interview not found or access denied");
  }

  const jobPosting =
    await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
      where: {
        id: application.job_posting_id,
        deleted_at: null,
      },
      select: {
        hr_recruiter_id: true,
      },
    });
  if (!jobPosting || jobPosting.hr_recruiter_id !== hrRecruiter.id) {
    throw new Error("Interview not found or access denied");
  }

  // Pagination params
  const page = typeof body.page === "number" ? Number(body.page) : 0;
  const limit = typeof body.limit === "number" ? Number(body.limit) : 20;
  const skip = page * limit;

  // Build filters
  const where = {
    ats_recruitment_interview_id: interviewId,
    ...(body.question_type !== undefined && {
      question_type: body.question_type,
    }),
    ...(body.is_template !== undefined && { is_template: body.is_template }),
    ...(body.text_query
      ? { question_text: { contains: body.text_query } }
      : {}),
  };

  // Build orderBy
  const baseOrder = body.sortDirection === "desc" ? "desc" : "asc";
  let orderBy: Record<string, "asc" | "desc"> = { order: baseOrder };
  if (body.orderBy === "created_at") {
    orderBy = { created_at: baseOrder };
  } else if (body.orderBy === "question_text") {
    orderBy = { question_text: baseOrder };
  } else if (body.orderBy === "order") {
    orderBy = { order: baseOrder };
  }

  // Query data and count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_questions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interview_questions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data: records.map((record) => ({
      id: record.id,
      ats_recruitment_interview_id: record.ats_recruitment_interview_id,
      order: record.order,
      question_text: record.question_text,
      question_type: record.question_type,
      is_template: record.is_template,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
