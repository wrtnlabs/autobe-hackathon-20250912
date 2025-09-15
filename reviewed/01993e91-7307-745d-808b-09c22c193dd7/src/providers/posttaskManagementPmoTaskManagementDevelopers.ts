import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Create a new developer user.
 *
 * This endpoint is restricted to PMO users, allowing them to add new developer
 * accounts securely. It ensures email uniqueness and manages timestamps.
 *
 * @param props - Properties including authenticated PMO user and developer
 *   data.
 * @param props.pmo - Authenticated PMO payload.
 * @param props.body - Developer creation data including email, password_hash,
 *   and name.
 * @returns The newly created developer user information, fully timestamped.
 * @throws {Error} If the email is already registered by another developer.
 */
export async function posttaskManagementPmoTaskManagementDevelopers(props: {
  pmo: PmoPayload;
  body: ITaskManagementDeveloper.ICreate;
}): Promise<ITaskManagementDeveloper> {
  const { pmo, body } = props;

  // Check if the email already exists
  const existing = await MyGlobal.prisma.task_management_developer.findFirst({
    where: { email: body.email },
  });

  if (existing !== null) {
    throw new Error("Developer email already exists");
  }

  // Generate ID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the developer
  const created = await MyGlobal.prisma.task_management_developer.create({
    data: {
      id,
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      deleted_at: body.deleted_at ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return with proper date conversions
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
