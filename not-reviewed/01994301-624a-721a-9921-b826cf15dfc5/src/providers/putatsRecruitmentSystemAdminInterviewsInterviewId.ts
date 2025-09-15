import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Updates an existing interview record's editable fields (title, stage, status,
 * notes) as a system admin.
 *
 * Only system admins (systemAdmin role) are authorized to perform this
 * operation. The function:
 *
 * - Validates authorization (via props.systemAdmin)
 * - Locates the interview by interviewId (must not be soft deleted)
 * - Updates only editable fields from IAtsRecruitmentInterview.IUpdate (title,
 *   stage, status, notes), and updated_at
 * - Returns the full interview record with all date fields as ISO 8601 strings
 * - Throws if the interview does not exist or is soft-deleted
 *
 * @param props - Request properties: systemAdmin payload, interviewId, update
 *   body (allowed fields)
 * @param props.systemAdmin - Authenticated system admin making the request
 * @param props.interviewId - The UUID of the interview to update
 * @param props.body - Partial update fields for interview (title, stage,
 *   status, notes)
 * @returns The updated interview record in API format, with all fields
 * @throws {Error} If the interview does not exist or is already deleted
 */
export async function putatsRecruitmentSystemAdminInterviewsInterviewId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterview.IUpdate;
}): Promise<IAtsRecruitmentInterview> {
  const { systemAdmin, interviewId, body } = props;

  // 1. Find existing interview (must not be soft-deleted)
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: { id: interviewId, deleted_at: null },
  });
  if (!interview) {
    throw new Error("Interview not found or already deleted");
  }

  // 2. Update only allowed fields + updated_at
  const updateNow = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ats_recruitment_interviews.update({
    where: { id: interviewId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.stage !== undefined && { stage: body.stage }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
      updated_at: updateNow,
    },
  });

  return {
    id: updated.id,
    ats_recruitment_application_id: updated.ats_recruitment_application_id,
    title: updated.title,
    stage: updated.stage,
    status: updated.status,
    // "notes" is optional and nullable in the DTO
    notes: updated.notes === null ? null : (updated.notes ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
