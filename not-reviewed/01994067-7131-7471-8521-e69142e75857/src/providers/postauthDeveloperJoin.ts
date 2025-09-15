import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * Registers a new developer account in the OAuth server system.
 *
 * This endpoint creates a developer record with a unique email and hashed
 * password. It issues JWT access and refresh tokens upon successful
 * registration.
 *
 * @param props - Object containing the request body for developer creation
 * @param props.body - Developer creation data including email, email_verified,
 *   and password_hash (plaintext to be hashed)
 * @returns Newly created developer information along with authorization tokens
 * @throws {Error} Throws an error with message "Email already in use" if the
 *   provided email already exists
 */
export async function postauthDeveloperJoin(props: {
  body: IOauthServerDeveloper.ICreate;
}): Promise<IOauthServerDeveloper.IAuthorized> {
  const { body } = props;

  // Check for existing developer with the same email
  const existingDeveloper =
    await MyGlobal.prisma.oauth_server_developers.findFirst({
      where: { email: body.email },
    });
  if (existingDeveloper) throw new Error("Email already in use");

  // Hash the password using MyGlobal.password
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Prepare timestamps in ISO 8601 string format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessTokenExpiryMs = 3600 * 1000; // 1 hour in milliseconds
  const refreshTokenExpiryMs = 7 * 24 * 3600 * 1000; // 7 days in milliseconds

  // Create new developer record with the hashed password and timestamps
  const createdDeveloper = await MyGlobal.prisma.oauth_server_developers.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: body.email,
        email_verified: body.email_verified,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
      },
    },
  );

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: createdDeveloper.id,
      email: createdDeveloper.email,
      email_verified: createdDeveloper.email_verified,
      type: "developer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      id: createdDeveloper.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Return authorized developer response
  return {
    id: createdDeveloper.id,
    email: createdDeveloper.email,
    email_verified: createdDeveloper.email_verified,
    password_hash: createdDeveloper.password_hash,
    created_at: now,
    updated_at: now,
    deleted_at: createdDeveloper.deleted_at ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + accessTokenExpiryMs)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + refreshTokenExpiryMs),
      ),
    },
  };
}
