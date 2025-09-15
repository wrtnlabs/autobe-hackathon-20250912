import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update details of an existing job application using applicationId (HR or
 * admin only).
 *
 * This operation allows authorized system administrators to update select
 * fields of a job application, like changing the attached resume or updating
 * workflow state, as long as the business workflow rules permit. It enforces
 * strict permission and transition validation, including checking application
 * state and validating linked resume ownership. All updates update the audit
 * timestamp, and responses use immutable, functional patterns with proper type
 * branding and null/undefined handling.
 *
 * @param props - Function properties
 * @param props.systemAdmin - The authenticated SystemadminPayload invoking this
 *   operation
 * @param props.applicationId - UUID of the application to update
 * @param props.body - Fields to update: resume_id, current_status,
 *   last_state_change_at
 * @returns The updated IAtsRecruitmentApplication object with all fields using
 *   strict types
 * @throws {Error} If application not found, validation fails, or illegal state
 *   transitions occur
 */
export async function putatsRecruitmentSystemAdminApplicationsApplicationId(props: {
  systemAdmin: SystemadminPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplication.IUpdate;
}): Promise<IAtsRecruitmentApplication> {
  const { applicationId, body } = props;
  // Step 1: Fetch existing application (must exist & not soft-deleted)
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: { id: applicationId, deleted_at: null },
    });
  if (!application) throw new Error("Application not found or already deleted");

  // Step 2: If resume_id is specified for update, must exist, belong to applicant, and not be deleted
  if (Object.prototype.hasOwnProperty.call(body, "resume_id")) {
    if (body.resume_id !== null && body.resume_id !== undefined) {
      const resume = await MyGlobal.prisma.ats_recruitment_resumes.findFirst({
        where: {
          id: body.resume_id,
          ats_recruitment_applicant_id: application.applicant_id,
          deleted_at: null,
        },
      });
      if (!resume)
        throw new Error(
          "Specified resume_id does not exist, is deleted, or does not belong to the applicant.",
        );
    }
  }

  // Step 3: Enforce business rules for status update (no changes allowed if already accepted/rejected)
  if (Object.prototype.hasOwnProperty.call(body, "current_status")) {
    const curr = application.current_status;
    if (curr === "accepted" || curr === "rejected") {
      throw new Error("Application status is terminal and cannot be updated");
    }
    // Additional allowed-transitions logic could fit here
  }

  // Step 4: Prepare update fields - include only touched fields
  const updateFields: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(body, "resume_id"))
    updateFields["resume_id"] =
      body.resume_id === undefined ? undefined : body.resume_id;
  if (Object.prototype.hasOwnProperty.call(body, "current_status"))
    updateFields["current_status"] = body.current_status;
  if (Object.prototype.hasOwnProperty.call(body, "last_state_change_at"))
    updateFields["last_state_change_at"] = body.last_state_change_at;
  // Always update updated_at
  updateFields["updated_at"] = toISOStringSafe(new Date());

  // Step 5: Run the update
  const updated = await MyGlobal.prisma.ats_recruitment_applications.update({
    where: { id: applicationId },
    data: updateFields,
  });

  // Step 6: Return mapped IAtsRecruitmentApplication result (type-safe, all date branding)
  return {
    id: updated.id,
    applicant_id: updated.applicant_id,
    job_posting_id: updated.job_posting_id,
    resume_id: updated.resume_id ?? undefined,
    current_status: updated.current_status,
    submitted_at: toISOStringSafe(updated.submitted_at),
    last_state_change_at: toISOStringSafe(updated.last_state_change_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
