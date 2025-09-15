import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update QA user account by UUID.
 *
 * This endpoint allows authorized TPM users to update the QA user record's
 * updated_at timestamp.
 *
 * @param props - Object containing the TPM authentication payload, QA user
 *   UUID, and update body with updated_at field
 * @param props.tpm - Authenticated TPM user performing the update
 * @param props.id - UUID of the QA user to update
 * @param props.body - Update payload containing updated_at timestamp
 * @returns Updated QA user entity with all fields
 * @throws {Error} When the QA user is not found
 */
export async function puttaskManagementTpmTaskManagementQasId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementQa.IUpdate;
}): Promise<ITaskManagementQa> {
  const { tpm, id, body } = props;

  // Fetch existing QA user and confirm existence
  const existingUser =
    await MyGlobal.prisma.task_management_qa.findUniqueOrThrow({
      where: { id },
    });

  // Update only the updated_at field using toISOStringSafe for date conversion
  const updated = await MyGlobal.prisma.task_management_qa.update({
    where: { id },
    data: {
      updated_at: body.updated_at
        ? toISOStringSafe(body.updated_at)
        : toISOStringSafe(new Date()),
    },
  });

  // Return full updated QA user entity with datetime fields converted to string
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
