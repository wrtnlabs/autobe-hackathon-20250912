import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Updates the details of an existing interview instance in the ATS.
 *
 * This endpoint allows authorized HR recruiters or system administrators to
 * update key interview properties (title, stage, status, notes) for a given
 * interviewId. Only editable fields may be modified; all other fields remain
 * unchanged. The operation requires a valid authenticated HR recruiter and a
 * valid interview ID, and will fail if the interview does not exist. On
 * success, returns the updated interview record with all scalar fields,
 * converting database Date fields to ISO strings.
 *
 * Authorization is handled by controller decorators; no extra HR recruiter
 * check is needed in this provider.
 *
 * @param props - HrRecruiter: The authenticated HR recruiter (provided via
 *   decorator, required for authorization). interviewId: UUID of the interview
 *   record to update (path parameter). body: Fields to update (title, stage,
 *   status, notes), all are optional and only provided keys will be updated.
 * @returns The updated interview record as IAtsRecruitmentInterview.
 * @throws {Error} If the specified interview does not exist, or interviewId is
 *   invalid.
 */
export async function putatsRecruitmentHrRecruiterInterviewsInterviewId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterview.IUpdate;
}): Promise<IAtsRecruitmentInterview> {
  const { interviewId, body } = props;

  // Fetch interview to ensure it exists (fail if not found or not updatable)
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: interviewId },
    },
  );
  if (!interview) {
    throw new Error("Interview not found");
  }

  // Only update fields actually present in the body (do not overwrite absent fields)
  const updateData: {
    title?: string;
    stage?: string;
    status?: string;
    notes?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.stage !== undefined ? { stage: body.stage } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.ats_recruitment_interviews.update({
    where: { id: interviewId },
    data: updateData,
  });

  return {
    id: updated.id,
    ats_recruitment_application_id: updated.ats_recruitment_application_id,
    title: updated.title,
    stage: updated.stage,
    status: updated.status,
    notes: updated.notes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
