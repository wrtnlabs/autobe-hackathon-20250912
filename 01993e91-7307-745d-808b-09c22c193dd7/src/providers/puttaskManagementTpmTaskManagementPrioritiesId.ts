import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Updates an existing task priority identified by ID.
 *
 * This operation modifies the code, name, and description of a task priority.
 * It enforces that the priority exists and updates the `updated_at` timestamp
 * internally.
 *
 * Authorization: Only a user with TPM role can perform this update.
 *
 * @param props - The parameters including TPM user payload, priority ID, and
 *   update body
 * @param props.tpm - Authenticated TPM user details
 * @param props.id - UUID of the task priority to update
 * @param props.body - The update data payload containing optional fields
 * @returns The updated task priority record
 * @throws {Error} If the priority with given ID does not exist
 */
export async function puttaskManagementTpmTaskManagementPrioritiesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementPriority.IUpdate;
}): Promise<ITaskManagementPriority> {
  const { tpm, id, body } = props;

  // Check the task priority existence
  const existing = await MyGlobal.prisma.task_management_priorities.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Task priority not found");
  }

  // Prepare update data using only fields provided, handle null correctly
  const now = toISOStringSafe(new Date());

  const data: ITaskManagementPriority.IUpdate = {
    code: body.code ?? undefined,
    name: body.name ?? undefined,
    description: body.description ?? null,
  };

  // Perform the update
  const updated = await MyGlobal.prisma.task_management_priorities.update({
    where: { id },
    data: {
      ...data,
      updated_at: now,
    },
  });

  // Return updated record with ISO date strings
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
