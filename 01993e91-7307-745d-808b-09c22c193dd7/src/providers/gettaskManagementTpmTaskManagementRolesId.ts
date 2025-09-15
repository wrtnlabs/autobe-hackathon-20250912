import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Get detailed info of a TaskManagementRole by ID
 *
 * Retrieves detailed information about a specific task management role by its
 * unique identifier. Access is restricted to authorized TPM users.
 *
 * @param props - Request properties
 * @param props.tpm - The authenticated TPM payload making the request
 * @param props.id - UUID of the TaskManagementRole to retrieve
 * @returns Detailed TaskManagementRole information
 * @throws {Error} When the TPM user is unauthorized or deleted
 * @throws {Error} When the TaskManagementRole with the given ID does not exist
 */
export async function gettaskManagementTpmTaskManagementRolesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskManagementRoles> {
  const { tpm, id } = props;

  // Verify TPM user exists and is not soft deleted
  const tpmUser = await MyGlobal.prisma.task_management_tpm.findFirst({
    where: {
      id: tpm.id,
      deleted_at: null,
    },
  });

  if (!tpmUser) {
    throw new Error("Unauthorized: TPM user not found or deleted");
  }

  // Fetch the requested role by ID or throw if not found
  const role = await MyGlobal.prisma.task_management_roles.findUniqueOrThrow({
    where: { id },
  });

  // Return with all fields and date strings converted
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description ?? null,
    created_at: toISOStringSafe(role.created_at),
    updated_at: toISOStringSafe(role.updated_at),
  };
}
