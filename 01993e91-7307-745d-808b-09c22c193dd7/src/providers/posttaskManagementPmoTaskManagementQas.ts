import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Create a new Quality Assurance (QA) user account.
 *
 * This operation creates a new QA user in the taskManagement system, ensuring
 * the email is unique and the password hash is securely stored. Only authorized
 * PMO personnel may perform this operation.
 *
 * @param props - Object containing authorization payload and user creation data
 * @param props.pmo - Authenticated PMO user payload for authorization
 * @param props.body - QA user creation information including email, password
 *   hash, and name
 * @returns The created QA user entity including system-generated timestamps
 * @throws {Error} If the email already exists in the system
 */
export async function posttaskManagementPmoTaskManagementQas(props: {
  pmo: PmoPayload;
  body: ITaskManagementQa.ICreate;
}): Promise<ITaskManagementQa> {
  const { pmo, body } = props;

  // Ensure the email is unique (not used by an active user)
  const existingUser = await MyGlobal.prisma.task_management_qa.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (existingUser) {
    throw new Error("Email already exists");
  }

  // Generate UUID and current timestamp as strings
  const now = toISOStringSafe(new Date());
  const newId = v4();

  // Create a new QA user record
  const created = await MyGlobal.prisma.task_management_qa.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created user with dates converted to ISO string format
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
