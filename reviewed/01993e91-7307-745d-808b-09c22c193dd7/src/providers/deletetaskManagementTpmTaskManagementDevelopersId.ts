import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Soft delete a developer user by marking the deleted_at timestamp.
 *
 * This operation sets the deleted_at field for the developer record identified
 * by the provided UUID, effectively performing a soft delete. Only existing,
 * not already deleted developers can be soft deleted. The updating user must
 * have TPM authorization.
 *
 * @param props - Object containing the TPM authorization payload and developer
 *   ID.
 * @param props.tpm - TPM authorization context for the request.
 * @param props.id - UUID of the developer to soft delete.
 * @throws {Error} Throws if the developer does not exist or is already deleted.
 */
export async function deletetaskManagementTpmTaskManagementDevelopersId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Verify developer exists and not deleted
  const developer =
    await MyGlobal.prisma.task_management_developer.findUniqueOrThrow({
      where: { id: props.id },
      select: { deleted_at: true },
    });

  // If developer already soft deleted, throw error
  if (developer.deleted_at !== null) {
    throw new Error("Developer already deleted");
  }

  // Soft delete by setting deleted_at and updated_at
  await MyGlobal.prisma.task_management_developer.update({
    where: { id: props.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
