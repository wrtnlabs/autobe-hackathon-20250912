import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

/**
 * Developer login operation authenticating email and password to issue JWT
 * tokens.
 *
 * This operation is publicly accessible. It authenticates developer credentials
 * against the database and returns JWT tokens upon success.
 *
 * @param props - Object containing login credentials
 * @param props.body - Login credentials including email and password
 * @returns Authorized developer user information with tokens
 * @throws {Error} Throws error when authentication fails due to invalid
 *   credentials
 */
export async function postauthDeveloperLogin(props: {
  body: ITelegramFileDownloaderDeveloper.ILogin;
}): Promise<ITelegramFileDownloaderDeveloper.IAuthorized> {
  const { body } = props;

  // Find developer user by email
  const user =
    await MyGlobal.prisma.telegram_file_downloader_developers.findUniqueOrThrow(
      {
        where: { email: body.email },
      },
    );

  // Verify password
  const isValid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );
  if (!isValid) throw new Error("Unauthorized: Invalid credentials");

  // Prepare JWT payload
  const payload = { id: user.id, type: "developer" };

  // Generate access token
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Generate refresh token
  const refreshToken = jwt.sign(
    { id: user.id, type: "developer", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Generate expiration timestamps
  const accessExpiryISO = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiryISO = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Return authorized developer
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiryISO,
      refreshable_until: refreshExpiryISO,
    },
  };
}
