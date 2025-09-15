import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Authenticate administrator and issue JWT access tokens.
 *
 * This endpoint validates provided email and password credentials against
 * active administrator records. Upon successful authentication, it issues JWT
 * access and refresh tokens for secure API access.
 *
 * @param props - Object containing login credentials.
 * @param props.body - Login credentials with email and password.
 * @returns The authorized administrator data along with JWT tokens.
 * @throws {Error} When the administrator is not found or credentials are
 *   invalid.
 */
export async function postauthAdministratorLogin(props: {
  body: ITelegramFileDownloaderAdministrator.ILogin;
}): Promise<ITelegramFileDownloaderAdministrator.IAuthorized> {
  const { body } = props;

  const admin =
    await MyGlobal.prisma.telegram_file_downloader_administrators.findFirstOrThrow(
      {
        where: {
          email: body.email,
          deleted_at: null,
        },
      },
    );

  const isValid = await MyGlobal.password.verify(
    body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Calculate token expiration times
  const now = Date.now();
  const expiredAt = toISOStringSafe(new Date(now + 3600 * 1000)); // 1 hour from now
  const refreshableUntil = toISOStringSafe(
    new Date(now + 7 * 24 * 3600 * 1000),
  ); // 7 days from now

  const accessToken = jwt.sign(
    {
      id: admin.id,
      type: "administrator",
      email: admin.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
