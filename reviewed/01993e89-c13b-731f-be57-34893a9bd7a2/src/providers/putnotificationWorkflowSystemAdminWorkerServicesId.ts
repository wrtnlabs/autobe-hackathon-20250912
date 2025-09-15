import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Update an existing WorkerService user account
 *
 * This operation updates allowed fields (email, password_hash) for a
 * WorkerService user specified by unique ID. Operation is authorized by system
 * administrator context.
 *
 * @param props.systemAdmin - The authenticated system administrator user
 *   performing the update
 * @param props.id - UUID of the WorkerService user to update
 * @param props.body - Data to update with possible email and/or password_hash
 * @returns The updated WorkerService user entity with safe date fields
 * @throws {Error} When the specified WorkerService user does not exist
 */
export async function putnotificationWorkflowSystemAdminWorkerServicesId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkerService.IUpdate;
}): Promise<INotificationWorkflowWorkerService> {
  const { systemAdmin, id, body } = props;

  // Verify existence
  const existing =
    await MyGlobal.prisma.notification_workflow_workerservices.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Prepare update payload
  const dataToUpdate: INotificationWorkflowWorkerService.IUpdate = {};
  if (body.email !== undefined) dataToUpdate.email = body.email;
  if (body.password_hash !== undefined)
    dataToUpdate.password_hash = body.password_hash;

  // Perform update
  const updated =
    await MyGlobal.prisma.notification_workflow_workerservices.update({
      where: { id },
      data: dataToUpdate,
    });

  // Return mapped updated entity with date conversions
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
