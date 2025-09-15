import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Creates a new Project Manager (PM) entity in the system.
 *
 * This operation requires authentication with the 'pm' role. It validates
 * uniqueness of the email before creating the record. The plain password is
 * hashed securely before storage.
 *
 * @param props - Object containing the authenticated pm and creation body
 * @param props.pm - The authenticated Project Manager performing the action
 * @param props.body - The creation data including email, plain password, and
 *   name
 * @returns The newly created Project Manager entity with fields excluding plain
 *   password
 * @throws {Error} If the email already exists in the system
 */
export async function posttaskManagementPmTaskManagementPms(props: {
  pm: PmPayload;
  body: ITaskManagementPm.ICreate;
}): Promise<ITaskManagementPm> {
  const { pm, body } = props;

  // Verify email uniqueness
  const existing = await MyGlobal.prisma.task_management_pm.findFirst({
    where: { email: body.email },
  });
  if (existing !== null) {
    throw new Error("Email already exists");
  }

  // Hash the plain password
  const passwordHash = await MyGlobal.password.hash(body.password);

  // Generate UUID for new PM
  const id = v4() as string & tags.Format<"uuid">;

  // Current timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Create new PM record
  const created = await MyGlobal.prisma.task_management_pm.create({
    data: {
      id,
      email: body.email,
      password_hash: passwordHash,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return created PM with converted date strings
  return {
    id: created.id as string & tags.Format<"uuid">,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
