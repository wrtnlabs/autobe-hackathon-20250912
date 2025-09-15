import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update task priority by ID
 *
 * This operation updates an existing task priority record identified by ID in
 * the task_management_priorities table. It allows modifying the priority code,
 * human-readable name, and optional description. Creation and update timestamps
 * are maintained internally.
 *
 * Users with the PMO role are authorized to perform this action.
 *
 * @param props - Object containing the PMO payload, priority ID, and update
 *   body
 * @param props.pmo - The authenticated PMO user performing the update
 * @param props.id - The UUID of the task priority to update
 * @param props.body - Partial update data for the task priority
 * @returns The updated task priority record
 * @throws {Error} If the priority record does not exist
 */
export async function puttaskManagementPmoTaskManagementPrioritiesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementPriority.IUpdate;
}): Promise<ITaskManagementPriority> {
  const now = toISOStringSafe(new Date());

  // Ensure the task priority exists
  await MyGlobal.prisma.task_management_priorities.findUniqueOrThrow({
    where: { id: props.id },
  });

  // Update fields
  const updated = await MyGlobal.prisma.task_management_priorities.update({
    where: { id: props.id },
    data: {
      code: props.body.code ?? undefined,
      name: props.body.name ?? undefined,
      description: props.body.description ?? undefined,
      updated_at: now,
    },
  });

  // Return updated record with date fields converted properly
  return {
    id: updated.id as string & tags.Format<"uuid">,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
