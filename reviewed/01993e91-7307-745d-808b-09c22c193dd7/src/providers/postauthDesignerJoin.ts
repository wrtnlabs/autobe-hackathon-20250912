import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Registers a new Designer user account by creating an entry in the
 * 'task_management_designer' database table. Requires unique email, secure
 * password hashing, and user name. Upon success, returns JWT authorization
 * tokens encapsulated in the 'ITaskManagementDesigner.IAuthorized' response.
 * This operation is public and is the entry point for new Designer user
 * registrations with security considerations for email uniqueness and password
 * protection via hashing.
 *
 * @param props - Object containing the registration payload for creating a new
 *   Designer user account
 * @param props.body - Registration payload containing email, password_hash
 *   (plain password string which will be hashed in this function), and name
 * @returns The authorized Designer user profile and JWT tokens
 * @throws {Error} Throws if the email is already registered
 */
export async function postauthDesignerJoin(props: {
  body: ITaskManagementDesigner.ICreate;
}): Promise<ITaskManagementDesigner.IAuthorized> {
  const { body } = props;

  // Check for duplicate email
  const existing = await MyGlobal.prisma.task_management_designer.findUnique({
    where: { email: body.email },
  });
  if (existing)
    throw new Error(
      "Duplicate email: A designer with this email already exists.",
    );

  // Hash the password
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Generate UUID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the designer user
  const created = await MyGlobal.prisma.task_management_designer.create({
    data: {
      id,
      email: body.email,
      password_hash: hashedPassword,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      { id: created.id, type: "designer" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      { id: created.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
    refreshable_until: toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 3600 * 1000),
    ),
  };

  // Return authorized user with tokens
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
    token,
  };
}
