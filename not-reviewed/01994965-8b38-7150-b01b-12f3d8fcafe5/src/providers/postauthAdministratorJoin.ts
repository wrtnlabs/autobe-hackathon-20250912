import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Create a new telegram_file_downloader_administrators account and issue JWT
 * authorization tokens
 *
 * This endpoint allows system administrators to register new administrator
 * accounts by providing their email and password. The operation securely stores
 * the password hash and creates a new administrator record in the
 * telegram_file_downloader_administrators table. Upon successful registration,
 * it issues authorization tokens compliant with JWT for subsequent
 * authenticated API access.
 *
 * This ensures that only registered administrators can access protected admin
 * functionalities such as managing subscriptions, monitoring logs, and viewing
 * payment status. The operation strictly references the existing schema
 * columns: email, password_hash, created_at, updated_at, deleted_at.
 * Registration data must comply with the database schema constraints and unique
 * email indices. No assumptions about additional fields are made, ensuring
 * consistency and integrity of administrator data.
 *
 * @param props - Object containing request body with administrator email and
 *   password_hash
 * @returns Authorized administrator information including JWT tokens
 * @throws {Error} When email is already in use
 */
export async function postauthAdministratorJoin(props: {
  body: ITelegramFileDownloaderAdministrator.ICreate;
}): Promise<ITelegramFileDownloaderAdministrator.IAuthorized> {
  const { body } = props;
  const now = toISOStringSafe(new Date());

  // Check for duplicate email
  const existing =
    await MyGlobal.prisma.telegram_file_downloader_administrators.findUnique({
      where: { email: body.email },
    });
  if (existing) throw new Error("Email already in use");

  const id = v4() as string & tags.Format<"uuid">;

  // Create new administrator record
  const created =
    await MyGlobal.prisma.telegram_file_downloader_administrators.create({
      data: {
        id,
        email: body.email,
        password_hash: body.password_hash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "administrator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Calculate token expiration timestamps as ISO strings
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Return the created administrator's info with tokens
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
