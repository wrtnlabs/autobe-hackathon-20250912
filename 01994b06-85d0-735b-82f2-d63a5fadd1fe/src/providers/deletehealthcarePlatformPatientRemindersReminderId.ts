import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Soft delete a healthcare platform reminder (reminderId) from the
 * healthcare_platform_reminders table (sets deleted_at).
 *
 * This operation marks a reminder as deleted by setting its `deleted_at`
 * timestamp, effectively removing it from active queries but preserving the
 * record for compliance and audit purposes. Only reminders owned by the
 * authenticated patient and not in finalized or compliance-locked state may be
 * deleted. Attempting to delete reminders that are already deleted, not owned
 * by the patient, or in a forbidden state will result in an error. This adheres
 * strictly to the business and audit rules for reminders within the healthcare
 * platform.
 *
 * @param props - Properties for the operation
 * @param props.patient - The authenticated patient user making the request
 * @param props.reminderId - The UUID identifier of the reminder to be deleted
 * @returns Void
 * @throws {Error} When the reminder does not exist, is already deleted, is not
 *   owned by the patient, or is in a non-deletable state (finalized,
 *   compliance-locked)
 */
export async function deletehealthcarePlatformPatientRemindersReminderId(props: {
  patient: PatientPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { patient, reminderId } = props;
  // Step 1: Find the reminder with ownership validation and not deleted
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        target_user_id: patient.id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (!reminder) {
    throw new Error(
      "Reminder not found, already deleted, or not owned by this user",
    );
  }
  // Step 2: Check forbidden states - finalized, compliance_locked
  if (
    reminder.status === "finalized" ||
    reminder.status === "compliance_locked"
  ) {
    throw new Error(
      "This reminder may not be deleted in its current state (finalized or compliance-locked)",
    );
  }
  // Step 3: Perform soft delete (update deleted_at)
  await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
