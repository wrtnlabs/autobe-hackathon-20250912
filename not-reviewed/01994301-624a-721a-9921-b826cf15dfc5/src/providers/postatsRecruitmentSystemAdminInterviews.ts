import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new interview session/entity (ats_recruitment_interviews table)
 * associated with an application, with stage, status, and participant
 * information.
 *
 * This endpoint allows a system administrator to create a new interview event
 * bound to an existing job application. The operation validates application
 * existence, assigns all required fields, and handles all date fields using ISO
 * string conversion. Optional notes are handled as null when missing.
 * Participant assignment and schedule management are performed via separate API
 * calls/tables, not as part of this creation.
 *
 * @param props - Function parameters
 * @param props.systemAdmin - The authenticated system admin user performing the
 *   operation (must be present)
 * @param props.body - Interview creation request structure (see
 *   IAtsRecruitmentInterview.ICreate)
 * @returns The fully created interview entity, ready for integration with
 *   participant/schedule logic
 * @throws {Error} If the referenced application does not exist or has been
 *   deleted
 */
export async function postatsRecruitmentSystemAdminInterviews(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentInterview.ICreate;
}): Promise<IAtsRecruitmentInterview> {
  const { systemAdmin, body } = props;

  // Step 1: Validate the referenced application exists and is not deleted
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: {
        id: body.ats_recruitment_application_id,
        deleted_at: null,
      },
    });
  if (!application) {
    throw new Error(
      "Referenced application does not exist or has been deleted",
    );
  }

  // Step 2: Create new interview, using only permitted and verified fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ats_recruitment_interviews.create({
    data: {
      id: v4(),
      ats_recruitment_application_id: body.ats_recruitment_application_id,
      title: body.title,
      stage: body.stage,
      status: body.status,
      notes: body.notes ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 3: Map result to DTO, strictly handling types and date strings
  return {
    id: created.id,
    ats_recruitment_application_id: created.ats_recruitment_application_id,
    title: created.title,
    stage: created.stage,
    status: created.status,
    notes: created.notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
