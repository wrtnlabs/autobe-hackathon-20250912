import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a new assessment question linked to a specified assessment.
 *
 * This endpoint creates a question under the given assessmentId. The question
 * includes text, type, and weight as specified in the request body.
 *
 * The newly created question record is returned, including its unique ID and
 * timestamps.
 *
 * Authorization requires the caller to be a contentCreatorInstructor. Tenant
 * isolation and assessment ownership must be enforced externally if required.
 *
 * @param props - Object containing caller identity, assessment ID, and question
 *   data
 * @param props.contentCreatorInstructor - Authenticated content creator
 *   instructor payload
 * @param props.assessmentId - UUID of the target assessment
 * @param props.body - Question create input data
 * @returns The created assessment question entity
 * @throws Error if database operation fails
 */
export async function postenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdQuestions(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentQuestion.ICreate;
}): Promise<IEnterpriseLmsAssessmentQuestion> {
  const { contentCreatorInstructor, assessmentId, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.enterprise_lms_assessment_questions.create({
      data: {
        id,
        assessment_id: assessmentId,
        question_text: body.question_text,
        question_type: body.question_type,
        weight: body.weight,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    assessment_id: created.assessment_id as string & tags.Format<"uuid">,
    question_text: created.question_text,
    question_type: created.question_type,
    weight: created.weight,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
