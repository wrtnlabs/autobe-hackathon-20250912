import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Login for Technical Project Manager (TPM) user.
 *
 * Authenticates an existing TPM user using email and password. Verifies
 * credentials against the task_management_tpm table. If valid, issues JWT
 * access and refresh tokens with specified expiration times and issuer.
 *
 * This is a public authentication endpoint.
 *
 * @param props - Object containing the login credentials
 * @param props.body.email - Registered email address of the TPM user
 * @param props.body.password - Plain text password for authentication
 * @returns An authorized TPM user object including tokens and timestamps
 * @throws {Error} When credentials are invalid or user is soft-deleted
 */
export async function postauthTpmLogin(props: {
  body: ITaskManagementTpm.ILogin;
}): Promise<ITaskManagementTpm.IAuthorized> {
  const { email, password } = props.body;

  const user = await MyGlobal.prisma.task_management_tpm.findFirstOrThrow({
    where: {
      email,
      deleted_at: null,
    },
  });

  const isValid = await MyGlobal.password.verify(password, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const nowIso = toISOStringSafe(new Date());
  const accessExpireMs = 3600 * 1000; // 1 hour
  const refreshExpireMs = 7 * 24 * 3600 * 1000; // 7 days

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    name: user.name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    access_token: accessToken,
    refresh_token: refreshToken,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + accessExpireMs)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + refreshExpireMs),
      ),
    },
  };
}
