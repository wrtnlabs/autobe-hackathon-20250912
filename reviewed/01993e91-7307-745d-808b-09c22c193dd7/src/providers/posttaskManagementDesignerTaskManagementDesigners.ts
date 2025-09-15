import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Creates a new designer user account in the system.
 *
 * The operation validates email uniqueness and inserts a new record into the
 * task_management_designer table. It sets system-managed timestamps for
 * creation and update. The returned object excludes sensitive information such
 * as the password hash.
 *
 * @param props - Parameters including authenticated designer and request body
 * @param props.designer - The authenticated designer making the request
 * @param props.body - The new designer user data including email,
 *   password_hash, and name
 * @returns The newly created designer user record without exposing password
 *   hash
 * @throws {Error} When a designer with the given email already exists
 */
export async function posttaskManagementDesignerTaskManagementDesigners(props: {
  designer: DesignerPayload;
  body: ITaskManagementDesigner.ICreate;
}): Promise<ITaskManagementDesigner> {
  const { designer, body } = props;

  const existing = await MyGlobal.prisma.task_management_designer.findUnique({
    where: { email: body.email },
  });

  if (existing) {
    throw new Error(`Designer with email '${body.email}' already exists`);
  }

  const newId = v4();
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_designer.create({
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

  return {
    id: created.id,
    email: created.email,
    password_hash: undefined,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
