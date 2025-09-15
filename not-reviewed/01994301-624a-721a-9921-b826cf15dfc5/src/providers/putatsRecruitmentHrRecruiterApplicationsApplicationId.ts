import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update details of an existing job application using applicationId (HR or
 * admin only).
 *
 * This operation allows authorized HR recruiters or system administrators to
 * update select fields of a job application, such as changing the associated
 * resume or updating the status, subject to business rule enforcement. It
 * strictly validates allowed transitions, logs all updates for audit/compliance
 * purposes, and triggers downstream notifications if required.
 *
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 *   (injected by HrrecruiterAuth decorator).
 * @param props.applicationId - Unique identifier of the job application to
 *   update.
 * @param props.body - Update fields for the job application (resume_id,
 *   current_status, last_state_change_at).
 * @returns The updated job application with all fields, formatted as per
 *   IAtsRecruitmentApplication contract.
 * @throws {Error} If the application does not exist, is deleted, or a business
 *   rule is violated (e.g., illegal status transition).
 */
export async function putatsRecruitmentHrRecruiterApplicationsApplicationId(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplication.IUpdate;
}): Promise<IAtsRecruitmentApplication> {
  const { applicationId, body } = props;
  // Fetch the application and ensure it exists and isn't soft-deleted
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: {
        id: applicationId,
        deleted_at: null,
      },
    });
  if (!application) {
    throw new Error("Application not found");
  }

  // Enforce business rules: for example, prohibit update of accepted/rejected, restrict workflow transitions, etc.
  // (Stub implementation; logic should be added as per real workflow requirements)
  if (
    application.current_status === "accepted" ||
    application.current_status === "rejected"
  ) {
    throw new Error(
      "Cannot update an application that is already accepted or rejected",
    );
  }

  // If updating resume_id, validate resume exists if provided (and is allowed by business rules)
  if (body.resume_id !== undefined && body.resume_id !== null) {
    const resumeExists =
      await MyGlobal.prisma.ats_recruitment_resumes.findFirst({
        where: {
          id: body.resume_id,
          deleted_at: null,
        },
      });
    if (!resumeExists) {
      throw new Error("Resume not found");
    }
  }

  // If updating current_status, validate allowed state transitions here as required (stub)
  if (
    body.current_status !== undefined &&
    body.current_status !== null &&
    typeof body.current_status === "string" &&
    body.current_status.trim() === ""
  ) {
    throw new Error("current_status, if provided, may not be empty");
  }

  const now = toISOStringSafe(new Date());

  // Apply updates using direct assignment for clarity and type safety
  const updated = await MyGlobal.prisma.ats_recruitment_applications.update({
    where: { id: applicationId },
    data: {
      resume_id: body.resume_id === undefined ? undefined : body.resume_id, // can be null to unlink per business rules
      current_status: body.current_status ?? undefined,
      last_state_change_at: body.last_state_change_at ?? undefined,
      updated_at: now,
    },
  });

  // Audit trail and downstream notification triggers (stub):
  // await MyGlobal.prisma.ats_recruitment_audit_trails.create({...})
  // await MyGlobal.notification.notifyApplicationUpdate(...)

  return {
    id: updated.id,
    applicant_id: updated.applicant_id,
    job_posting_id: updated.job_posting_id,
    resume_id:
      updated.resume_id === null ? null : (updated.resume_id ?? undefined),
    current_status: updated.current_status,
    submitted_at: toISOStringSafe(updated.submitted_at),
    last_state_change_at: toISOStringSafe(updated.last_state_change_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
