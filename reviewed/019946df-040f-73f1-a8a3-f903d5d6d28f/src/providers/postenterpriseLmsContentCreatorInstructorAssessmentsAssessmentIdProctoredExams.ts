import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a new proctored exam session for a specific assessment.
 *
 * This endpoint allows contentCreatorInstructor role users to create a
 * proctored exam session linked to the specified assessment.
 *
 * The proctored exam includes scheduling, proctor assignments, status, and soft
 * delete support.
 *
 * @param props - Object containing the authenticated contentCreatorInstructor,
 *   the assessment ID path parameter, and the creation body.
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor payload.
 * @param props.assessmentId - UUID of the target assessment.
 * @param props.body - Creation payload conforming to
 *   IEnterpriseLmsProctoredExam.ICreate.
 * @returns The newly created proctored exam entity with full metadata.
 * @throws {Error} When assessment ID in body does not match the URL parameter.
 */
export async function postenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdProctoredExams(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.ICreate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { contentCreatorInstructor, assessmentId, body } = props;

  if (body.assessment_id !== assessmentId) {
    throw new Error("Assessment ID in body does not match URL parameter");
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.enterprise_lms_proctored_exams.create({
    data: {
      id,
      assessment_id: assessmentId,
      exam_session_id: body.exam_session_id,
      proctor_id: body.proctor_id ?? null,
      scheduled_at: body.scheduled_at,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    assessment_id: created.assessment_id,
    exam_session_id: created.exam_session_id,
    proctor_id: created.proctor_id ?? null,
    scheduled_at: created.scheduled_at,
    status: created.status,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
