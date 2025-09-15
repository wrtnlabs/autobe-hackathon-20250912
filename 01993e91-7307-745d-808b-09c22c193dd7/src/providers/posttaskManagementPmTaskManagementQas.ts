import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Create a new Quality Assurance (QA) user account in the taskManagement
 * system.
 *
 * This function requires a PM-role authenticated user to create a new QA user.
 * It validates email uniqueness and securely creates a user with provided
 * email, hashed password, and name.
 *
 * @param props - Object containing pm payload and QA user creation info
 * @param props.pm - The authenticated PM user payload
 * @param props.body - The QA user creation information (email, password hash,
 *   name)
 * @returns The created QA user entity including system-generated timestamps
 * @throws {Error} Throws if the email already exists in the database
 */
export async function posttaskManagementPmTaskManagementQas(props: {
  pm: PmPayload;
  body: ITaskManagementQa.ICreate;
}): Promise<ITaskManagementQa> {
  const { pm, body } = props;

  // Check for existing email to enforce uniqueness
  const existingUser = await MyGlobal.prisma.task_management_qa.findUnique({
    where: { email: body.email },
  });

  if (existingUser !== null) {
    throw new Error("Email already exists");
  }

  // Generate UUID and timestamps
  const newId = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the QA user in the database
  const createdUser = await MyGlobal.prisma.task_management_qa.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: createdUser.id,
    email: createdUser.email,
    password_hash: createdUser.password_hash,
    name: createdUser.name,
    created_at: createdUser.created_at
      ? toISOStringSafe(createdUser.created_at)
      : now,
    updated_at: createdUser.updated_at
      ? toISOStringSafe(createdUser.updated_at)
      : now,
    deleted_at: createdUser.deleted_at
      ? toISOStringSafe(createdUser.deleted_at)
      : null,
  };
}
