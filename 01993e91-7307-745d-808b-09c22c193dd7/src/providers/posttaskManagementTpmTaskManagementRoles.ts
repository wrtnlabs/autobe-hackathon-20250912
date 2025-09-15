import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new Task Management Role.
 *
 * This operation inserts a new record into the `task_management_roles` table.
 * Only authorized users with role `tpm` can invoke this operation.
 *
 * @param props - An object containing the TPM payload and creation data.
 * @param props.tpm - The authenticated TPM user.
 * @param props.body - The task management role creation input data.
 * @returns The created task management role record with all fields.
 * @throws {Error} Throws if creation fails due to validation or database
 *   errors.
 */
export async function posttaskManagementTpmTaskManagementRoles(props: {
  tpm: TpmPayload;
  body: ITaskManagementTaskManagementRoles.ICreate;
}): Promise<ITaskManagementTaskManagementRoles> {
  const { tpm, body } = props;

  // Generate common timestamp once
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Perform the creation in the database
  const created = await MyGlobal.prisma.task_management_roles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created record with proper date conversions and null handling
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
