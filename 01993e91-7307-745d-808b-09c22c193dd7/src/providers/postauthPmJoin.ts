import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Creates a new Project Manager (PM) account with secure credentials.
 *
 * This function registers a new PM user by validating email uniqueness and
 * hashing the provided password. Upon successful creation, it issues JWT tokens
 * for authentication purposes.
 *
 * @param props - Object containing the PM payload and registration data
 * @param props.pm - The PM payload (authentication context) - not used directly
 *   since this is public join
 * @param props.body - Registration data including email, password, and name
 * @returns Newly created authorized PM user information including tokens
 * @throws {Error} When the email is already in use
 */
export async function postauthPmJoin(props: {
  pm: PmPayload;
  body: ITaskManagementPm.ICreate;
}): Promise<ITaskManagementPm.IAuthorized> {
  const { body } = props;

  // Check if email is already used
  const existing = await MyGlobal.prisma.task_management_pm.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new Error("Email already in use");
  }

  // Hash the plain password
  const password_hash = await MyGlobal.password.hash(body.password);

  // Generate new id and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create PM user
  const created = await MyGlobal.prisma.task_management_pm.create({
    data: {
      id,
      email: body.email,
      password_hash,
      name: body.name,
      created_at: now,
      updated_at: now,
    },
  });

  // Generate tokens
  const accessToken = jwt.sign(
    { id: created.id, type: "pm" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: created.id, type: "pm", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Return authorized DTO
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: now,
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  };
}
