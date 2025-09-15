import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Updates an existing Technical Project Manager (TPM) user by their unique
 * identifier.
 *
 * This function ensures that the TPM user exists and performs an email
 * uniqueness check if the email is being changed. It then updates the provided
 * user fields and sets the updated_at timestamp to the current time.
 *
 * Dates are handled as ISO 8601 strings with branding, never using native Date
 * types.
 *
 * @param props - Object containing the PMO payload, TPM user ID, and update
 *   body.
 * @param props.pmo - Authenticated PMO user payload for authorization context.
 * @param props.id - UUID of the TPM user to update.
 * @param props.body - Updatable TPM user fields (email, password_hash, name).
 * @returns The updated TPM user record with all timestamps as ISO strings.
 * @throws {Error} If the TPM user does not exist or if the email is already
 *   used by another user.
 */
export async function puttaskManagementPmoTaskManagementTpmsId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementTpm.IUpdate;
}): Promise<ITaskManagementTpm> {
  const { pmo, id, body } = props;

  // Fetch existing TPM user
  const existing = await MyGlobal.prisma.task_management_tpm.findUniqueOrThrow({
    where: { id },
  });

  // If email updated, check uniqueness
  if (body.email !== undefined && body.email !== existing.email) {
    const duplicate = await MyGlobal.prisma.task_management_tpm.findFirst({
      where: { email: body.email },
    });
    if (duplicate) {
      throw new Error("Email already exists for another TPM user");
    }
  }

  // Current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Update data
  const updated = await MyGlobal.prisma.task_management_tpm.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      updated_at: now,
    },
  });

  // Return with dates converted
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
