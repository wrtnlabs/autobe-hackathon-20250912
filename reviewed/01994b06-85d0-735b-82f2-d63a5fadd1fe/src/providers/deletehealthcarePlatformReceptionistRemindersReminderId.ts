import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Soft delete a healthcare platform reminder by reminderId as receptionist.
 *
 * This operation marks the specified reminder as deleted (soft delete) by
 * updating the 'deleted_at' timestamp, making it non-active for further
 * workflows and queries. It strictly enforces business rules—reminders that are
 * already deleted, finalized, or compliance-locked are protected from deletion.
 * Only authenticated receptionists may execute this operation. The change is
 * fully auditable for compliance without physically removing the record,
 * complying with regulatory and retention requirements.
 *
 * @param props - The parameters for this operation
 * @param props.receptionist - The authenticated receptionist performing the
 *   delete
 * @param props.reminderId - The UUID of the reminder to delete
 * @returns Void
 * @throws {Error} If the reminder is not found, already deleted, or cannot be
 *   deleted due to business rules
 */
export async function deletehealthcarePlatformReceptionistRemindersReminderId(props: {
  receptionist: ReceptionistPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the reminder that is not already soft-deleted
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: props.reminderId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found or already deleted");
  }
  // Step 2: Enforce business rule - cannot delete finalized or compliance-locked reminders
  if (
    reminder.status === "finalized" ||
    reminder.status === "compliance_locked"
  ) {
    throw new Error(
      "You cannot delete a finalized or compliance-locked reminder.",
    );
  }
  // Step 3: Soft delete - set deleted_at and updated_at to now (ISO 8601 string)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: props.reminderId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
