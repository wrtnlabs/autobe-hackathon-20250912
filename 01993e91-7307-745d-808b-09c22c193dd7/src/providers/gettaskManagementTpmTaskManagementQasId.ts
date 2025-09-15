import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Get QA user details by UUID
 *
 * Retrieve detailed information about a specified QA user by their UUID. The
 * response includes email, name, password hash, creation, update, and soft
 * deletion timestamps.
 *
 * This operation requires an authenticated TPM user and respects access
 * restrictions for privacy.
 *
 * @param props - Object containing TPM authentication payload and QA user UUID
 * @param props.tpm - Authenticated TPM user payload
 * @param props.id - UUID of the QA user to retrieve
 * @returns Detailed QA user entity matching the given UUID
 * @throws {Error} Throws an error if the QA user with the specified ID is not
 *   found
 */
export async function gettaskManagementTpmTaskManagementQasId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementQa> {
  const { id } = props;

  const qaUser = await MyGlobal.prisma.task_management_qa.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      email: true,
      password_hash: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: qaUser.id,
    email: qaUser.email,
    password_hash: qaUser.password_hash,
    name: qaUser.name,
    created_at: toISOStringSafe(qaUser.created_at),
    updated_at: toISOStringSafe(qaUser.updated_at),
    deleted_at: qaUser.deleted_at ? toISOStringSafe(qaUser.deleted_at) : null,
  };
}
