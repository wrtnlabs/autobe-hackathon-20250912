import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";
import { WorkerServicePayload } from "../decorators/payload/WorkerServicePayload";

/**
 * Update an existing WorkerService user account specified by unique ID.
 *
 * Only the authenticated WorkerService user themselves may perform this update.
 *
 * @param props - Object containing parameters and authenticated user
 * @param props.workerService - The authenticated WorkerService user making the
 *   request
 * @param props.id - The UUID of the WorkerService user account to update
 * @param props.body - The update data for email and/or password_hash
 * @returns The updated WorkerService user account information
 * @throws {Error} When unauthorized access is attempted
 * @throws {Error} When the specified user account does not exist
 */
export async function putnotificationWorkflowWorkerServiceWorkerServicesId(props: {
  workerService: WorkerServicePayload;
  id: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkerService.IUpdate;
}): Promise<INotificationWorkflowWorkerService> {
  const { workerService, id, body } = props;

  // Authorization check: ensure only own account can be updated
  if (workerService.id !== id) {
    throw new Error(
      "Unauthorized: cannot update other worker service accounts",
    );
  }

  // Fetch the existing worker service record or throw error if not found
  const existing =
    await MyGlobal.prisma.notification_workflow_workerservices.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Prepare update data object with optional fields if they are provided
  const updated_at = toISOStringSafe(new Date());

  // Only update email and password_hash if they are defined
  const updateData: INotificationWorkflowWorkerService.IUpdate = {
    email: body.email ?? undefined,
    password_hash: body.password_hash ?? undefined,
  };

  // Perform the update
  const updated =
    await MyGlobal.prisma.notification_workflow_workerservices.update({
      where: { id },
      data: {
        ...updateData,
        updated_at,
      },
    });

  // Return the updated user account with all timestamps formatted as strings
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated_at,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
