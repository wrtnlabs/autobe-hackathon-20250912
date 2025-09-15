import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Creates a new proctored exam session linked to a specific assessment.
 *
 * This operation writes a new record to the enterprise_lms_proctored_exams
 * table, storing exam session metadata such as scheduled time, proctor
 * assignments, and status.
 *
 * Access is restricted to organizationAdmins as per authorization requirements.
 *
 * @param props - Object containing the authorized organization admin, the
 *   assessment ID, and the proctored exam creation data.
 * @param props.organizationAdmin - The authenticated organization admin user
 *   payload.
 * @param props.assessmentId - UUID of the linked assessment.
 * @param props.body - The proctored exam creation payload conforming to
 *   IEnterpriseLmsProctoredExam.ICreate.
 * @returns The newly created proctored exam entity with full metadata.
 * @throws {Error} If the creation operation fails due to database constraints
 *   or unexpected errors.
 */
export async function postenterpriseLmsOrganizationAdminAssessmentsAssessmentIdProctoredExams(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.ICreate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { organizationAdmin, assessmentId, body } = props;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_proctored_exams.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
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
    proctor_id: created.proctor_id === null ? null : created.proctor_id,
    scheduled_at: created.scheduled_at as string & tags.Format<"date-time">,
    status: created.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at:
      created.deleted_at === null
        ? null
        : (created.deleted_at as string & tags.Format<"date-time">),
  };
}
