import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Add a participant (applicant, HR recruiter, or tech reviewer) to an interview
 * session.
 *
 * This operation enables a system administrator to invite an actor as a
 * participant in a given interview. Allowed participant types include
 * applicant, HR recruiter, and tech reviewer. The system enforces that the
 * interview exists and is not deleted, prohibits duplicate participants, and
 * requires at least one participant reference to be provided. Invitation and
 * audit timestamps are set strictly.
 *
 * Authorization: Only users with systemadmin privileges (verified by
 * SystemadminPayload) may use this route.
 *
 * @param props - Properties for the request.
 * @param props.systemAdmin - Authenticated system admin performing the action
 *   (type-safe payload).
 * @param props.interviewId - The UUID of the interview session to which the
 *   participant will be added.
 * @param props.body - The participant creation payload, providing role/type and
 *   linkage information.
 * @returns The added participant as an IAtsRecruitmentInterviewParticipant
 *   object (API contract).
 * @throws {Error} If the interview does not exist, is deleted, participant info
 *   is missing, or is a duplicate.
 */
export async function postatsRecruitmentSystemAdminInterviewsInterviewIdParticipants(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewParticipant.ICreate;
}): Promise<IAtsRecruitmentInterviewParticipant> {
  const { interviewId, body } = props;

  // Step 1: Validate interview existence and not deleted
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: interviewId,
      deleted_at: null,
    },
  });
  if (!interview) {
    throw new Error("Interview not found or has been deleted.");
  }

  // Step 2: At least one actor reference must be present
  const hasActorReference =
    (body.ats_recruitment_applicant_id !== undefined &&
      body.ats_recruitment_applicant_id !== null) ||
    (body.ats_recruitment_hrrecruiter_id !== undefined &&
      body.ats_recruitment_hrrecruiter_id !== null) ||
    (body.ats_recruitment_techreviewer_id !== undefined &&
      body.ats_recruitment_techreviewer_id !== null);
  if (!hasActorReference) {
    throw new Error(
      "At least one actor reference (applicant, HR recruiter, or tech reviewer) must be provided.",
    );
  }

  // Step 3: Prevent duplicate participant (enforce unique constraint)
  const existing =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        ats_recruitment_applicant_id: body.ats_recruitment_applicant_id ?? null,
        ats_recruitment_hrrecruiter_id:
          body.ats_recruitment_hrrecruiter_id ?? null,
        ats_recruitment_techreviewer_id:
          body.ats_recruitment_techreviewer_id ?? null,
      },
    });
  if (existing) {
    throw new Error(
      "A participant with this set of references (actor(s) + role) already exists for this interview.",
    );
  }

  // Step 4: Insert participant record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.ats_recruitment_interview_participants.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ats_recruitment_interview_id: interviewId,
        ats_recruitment_applicant_id: body.ats_recruitment_applicant_id ?? null,
        ats_recruitment_hrrecruiter_id:
          body.ats_recruitment_hrrecruiter_id ?? null,
        ats_recruitment_techreviewer_id:
          body.ats_recruitment_techreviewer_id ?? null,
        role: body.role,
        invited_at: now,
        confirmation_status: body.confirmation_status,
        created_at: now,
      },
    });

  // Step 5: Map DB record to API contract (handle nullable IDs → undefined)
  return {
    id: created.id,
    ats_recruitment_interview_id: created.ats_recruitment_interview_id,
    ats_recruitment_applicant_id:
      created.ats_recruitment_applicant_id === null
        ? undefined
        : created.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id:
      created.ats_recruitment_hrrecruiter_id === null
        ? undefined
        : created.ats_recruitment_hrrecruiter_id,
    ats_recruitment_techreviewer_id:
      created.ats_recruitment_techreviewer_id === null
        ? undefined
        : created.ats_recruitment_techreviewer_id,
    role: created.role,
    invited_at: created.invited_at,
    confirmation_status: created.confirmation_status,
    created_at: created.created_at,
  };
}
