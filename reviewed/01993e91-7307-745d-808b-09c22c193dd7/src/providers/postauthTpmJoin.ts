import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Registers a new Technical Project Manager (TPM) user, creating an account
 * with the necessary credentials and issuing initial JWT tokens.
 *
 * This operation uses the task_management_tpm table, handling email,
 * password_hash, name, and timestamps. It is a public endpoint for user
 * registration and requires no prior authentication.
 *
 * @param props - Object containing the registration details
 * @param props.body - Registration details for TPM user including email,
 *   password, and name
 * @returns Authorized TPM user with JWT tokens
 * @throws {Error} When email is already registered or database operation fails
 */
export async function postauthTpmJoin(props: {
  body: ITaskManagementTpm.IJoin;
}): Promise<ITaskManagementTpm.IAuthorized> {
  const { body } = props;

  // Hash the plain password
  const password_hash = await MyGlobal.password.hash(body.password);

  // Generate a new UUID for the user
  const id = v4() as string & tags.Format<"uuid">;

  // Get current timestamp string
  const now = toISOStringSafe(new Date());

  // Create new TPM user
  const created = await MyGlobal.prisma.task_management_tpm.create({
    data: {
      id,
      email: body.email,
      password_hash,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Generate JWT access token
  const access_token = jwt.sign(
    {
      id: created.id,
      type: "tpm",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refresh_token = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Token expiration timestamps
  const access_expired_at = toISOStringSafe(new Date(Date.now() + 3600000)); // 1 hour from now
  const refreshable_until = toISOStringSafe(new Date(Date.now() + 604800000)); // 7 days from now

  // Compose authorization token object
  const token = {
    access: access_token,
    refresh: refresh_token,
    expired_at: access_expired_at,
    refreshable_until,
  };

  // Return the authorized TPM user data
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    access_token,
    refresh_token,
    token,
  };
}
