import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Updates developer user information by ID.
 *
 * Authenticated TPM users can change email, password_hash, and name of the
 * developer. Soft-deleted developers (deleted_at not null) cannot be updated.
 *
 * @param props - Object including TPM user, developer ID and update data
 * @param props.tpm - Authenticated TPM user performing the update
 * @param props.id - UUID of the developer to update
 * @param props.body - Update data with optional fields
 * @returns Updated developer with all fields including created_at, updated_at,
 *   and deleted_at
 * @throws Error if developer not found or soft deleted
 */
export async function puttaskManagementTpmTaskManagementDevelopersId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementDeveloper.IUpdate;
}): Promise<ITaskManagementDeveloper> {
  const { tpm, id, body } = props;

  // Authorization assumed performed externally via tpm

  const existingDeveloper =
    await MyGlobal.prisma.task_management_developer.findUnique({
      where: { id },
    });

  if (!existingDeveloper || existingDeveloper.deleted_at !== null) {
    throw new Error("Developer not found or is soft deleted");
  }

  const now = toISOStringSafe(new Date());

  const updatedDeveloper =
    await MyGlobal.prisma.task_management_developer.update({
      where: { id },
      data: {
        email: body.email ?? undefined,
        password_hash: body.password_hash ?? undefined,
        name: body.name ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updatedDeveloper.id,
    email: updatedDeveloper.email,
    password_hash: updatedDeveloper.password_hash,
    name: updatedDeveloper.name,
    created_at: toISOStringSafe(updatedDeveloper.created_at),
    updated_at: toISOStringSafe(updatedDeveloper.updated_at),
    deleted_at: updatedDeveloper.deleted_at
      ? toISOStringSafe(updatedDeveloper.deleted_at)
      : null,
  };
}
