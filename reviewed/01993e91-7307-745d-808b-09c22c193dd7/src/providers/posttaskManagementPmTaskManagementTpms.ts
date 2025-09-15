import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Creates a new Technical Project Manager (TPM) user.
 *
 * This operation inserts a new TPM user record with unique email, hashed
 * password, name, and timestamps for creation and update.
 *
 * The returned object excludes the password hash for security.
 *
 * @param props - Object containing the authorized PM user and TPM create data
 * @param props.pm - The authenticated Project Manager performing the operation
 * @param props.body - The TPM user creation data including email, password
 *   hash, and name
 * @returns The created TPM user data excluding password hash
 * @throws {Error} When a TPM user with the given email already exists
 */
export async function posttaskManagementPmTaskManagementTpms(props: {
  pm: PmPayload;
  body: ITaskManagementTpm.ICreate;
}): Promise<ITaskManagementTpm> {
  const { pm, body } = props;

  // Check existing TPM user by email to prevent duplicates
  const existing = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { email: body.email },
  });

  if (existing !== null) {
    throw new Error(`TPM user with email ${body.email} already exists`);
  }

  // Current time as ISO string with branding
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  // Create TPM user with given data
  const created = await MyGlobal.prisma.task_management_tpm.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      created_at: now,
      updated_at: now,
    },
  });

  // Return created TPM user excluding password_hash
  return {
    id: created.id as string & tags.Format<"uuid">,
    email: created.email,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
