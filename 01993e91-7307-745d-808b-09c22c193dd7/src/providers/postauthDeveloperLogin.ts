import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Login operation for developers.
 *
 * Validates the provided email and password against stored credentials. Upon
 * successful authentication, issues JWT access and refresh tokens. Returns the
 * authorized developer user data along with tokens.
 *
 * This endpoint is publicly accessible and does not require prior
 * authentication.
 *
 * @param props - Object containing the developer login credentials.
 * @param props.developer - The developer role payload (unused here).
 * @param props.body - The login credentials including email and password.
 * @returns The authorized developer user information with tokens.
 * @throws {Error} When credentials are invalid or developer not found.
 */
export async function postauthDeveloperLogin(props: {
  developer: DeveloperPayload;
  body: ITaskManagementDeveloper.ILogin;
}): Promise<ITaskManagementDeveloper.IAuthorized> {
  const { body } = props;

  // Find the developer user by email where not soft deleted
  const developer =
    await MyGlobal.prisma.task_management_developer.findFirstOrThrow({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });

  // Verify password using MyGlobal.password
  const isValidPassword = await MyGlobal.password.verify(
    body.password,
    developer.password_hash,
  );
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  // Generate current timestamp for token expiry calculations
  const nowMs = Date.now();

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: developer.id,
      email: developer.email,
      type: "developer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    { id: developer.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Compute token expiry timestamps as ISO strings
  const expiredAt = toISOStringSafe(new Date(nowMs + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  );

  // Return full authorized developer data with tokens
  return {
    id: developer.id,
    email: developer.email,
    password_hash: developer.password_hash,
    name: developer.name,
    created_at: toISOStringSafe(developer.created_at),
    updated_at: toISOStringSafe(developer.updated_at),
    deleted_at: developer.deleted_at
      ? toISOStringSafe(developer.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
