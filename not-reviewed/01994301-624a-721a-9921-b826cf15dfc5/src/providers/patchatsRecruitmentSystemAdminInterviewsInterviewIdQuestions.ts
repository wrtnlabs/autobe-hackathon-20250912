import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import { IPageIAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewQuestion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a paginated list of all questions assigned to a specific interview
 * (ats_recruitment_interview_questions).
 *
 * This endpoint returns all questions associated with a given interview,
 * supporting filtering by question type, template/manual, text query, and
 * ordering. Response includes full pagination metadata and detailed question
 * objects for use by HR, system admins, or authorized interview participants.
 *
 * Access control is enforced for systemAdmin via decorator. Throws error if
 * interview not found.
 *
 * @param props - The request object containing:
 * @param props.systemAdmin - Authenticated systemadmin payload (authorization
 *   enforced upstream).
 * @param props.interviewId - The UUID of the interview for which to fetch
 *   questions.
 * @param props.body - Filter and pagination options per
 *   IAtsRecruitmentInterviewQuestion.IRequest (all fields optional).
 * @returns A paginated set of interview question records
 *   (IPageIAtsRecruitmentInterviewQuestion).
 * @throws {Error} If the interview does not exist.
 */
export async function patchatsRecruitmentSystemAdminInterviewsInterviewIdQuestions(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewQuestion.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewQuestion> {
  const { interviewId, body } = props;
  // Step 1: Verify the interview exists
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: { id: interviewId },
  });
  if (!interview) throw new Error("Interview not found");

  // Step 2: Pagination/defaults
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;

  // Step 3: Build where clause from filters
  const where = {
    ats_recruitment_interview_id: interviewId,
    ...(body.question_type !== undefined && {
      question_type: body.question_type,
    }),
    ...(body.is_template !== undefined && { is_template: body.is_template }),
    ...(body.text_query !== undefined &&
      body.text_query !== null &&
      body.text_query !== "" && {
        question_text: { contains: body.text_query },
      }),
  };

  // Step 4: Configure orderBy
  const orderField =
    body.orderBy &&
    ["order", "created_at", "question_type", "question_text"].includes(
      body.orderBy,
    )
      ? body.orderBy
      : "order";
  const orderDirection = body.sortDirection === "desc" ? "desc" : "asc";

  // Step 5: Query database
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_questions.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interview_questions.count({ where }),
  ]);

  // Step 6: Map result to DTO shape (convert created_at to string & tags.Format<'date-time'>)
  const data = rows.map((row) => ({
    id: row.id,
    ats_recruitment_interview_id: row.ats_recruitment_interview_id,
    order: row.order,
    question_text: row.question_text,
    question_type: row.question_type,
    is_template: row.is_template,
    created_at: toISOStringSafe(row.created_at), // string & tags.Format<'date-time'>
  }));

  // Step 7: Pagination result shape
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
