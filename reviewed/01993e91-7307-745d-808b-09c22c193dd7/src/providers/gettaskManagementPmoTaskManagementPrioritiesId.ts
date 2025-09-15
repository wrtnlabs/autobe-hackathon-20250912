import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPriorities } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriorities";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Get detailed task priority information by ID from task_management_priorities
 * table.
 *
 * This endpoint retrieves a single task priority entity including code, name,
 * description, and audit timestamps. Access is restricted to authorized PMO
 * users.
 *
 * @param props - Object containing PMO authentication payload and target
 *   priority ID
 * @param props.pmo - Authenticated PMO user payload
 * @param props.id - The UUID of the target task priority to retrieve
 * @returns The detailed task priority record conforming to
 *   ITaskManagementPriorities
 * @throws {Error} Throws if the PMO user is unauthorized or the priority ID
 *   does not exist
 */
export async function gettaskManagementPmoTaskManagementPrioritiesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementPriorities> {
  const { pmo, id } = props;

  // Authorization: verify PMO user exists and is not soft deleted
  const existingPmo = await MyGlobal.prisma.task_management_pmo.findFirst({
    where: {
      id: pmo.id,
      deleted_at: null,
    },
  });

  if (!existingPmo) {
    throw new Error("Unauthorized: PMO user not found or inactive");
  }

  // Retrieve the task priority by its ID
  const priority =
    await MyGlobal.prisma.task_management_priorities.findUniqueOrThrow({
      where: { id },
    });

  // Return with proper ISO string date conversions
  return {
    id: priority.id,
    code: priority.code,
    name: priority.name,
    description: priority.description ?? null,
    created_at: toISOStringSafe(priority.created_at),
    updated_at: toISOStringSafe(priority.updated_at),
  };
}
