import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

/**
 * Registers a new developer user for the Telegram File Downloader service.
 *
 * This public API endpoint creates a new developer account by accepting an
 * email and password hash. It enforces unique email addresses and returns a
 * fully-authorized developer user object including JWT access and refresh
 * tokens.
 *
 * @param props - Object containing the request body with developer registration
 *   details
 * @param props.body.email - Unique email address for the developer
 * @param props.body.password_hash - Hashed password for authentication
 * @returns The authorized developer user including JWT tokens
 * @throws {Error} When the email is already registered
 */
export async function postauthDeveloperJoin(props: {
  body: ITelegramFileDownloaderDeveloper.ICreate;
}): Promise<ITelegramFileDownloaderDeveloper.IAuthorized> {
  const { body } = props;
  const now = toISOStringSafe(new Date());

  // Check for duplicate email
  const existing =
    await MyGlobal.prisma.telegram_file_downloader_developers.findUnique({
      where: { email: body.email },
    });
  if (existing) throw new Error("Email already registered");

  // Create new developer user
  const created =
    await MyGlobal.prisma.telegram_file_downloader_developers.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: body.email,
        password_hash: body.password_hash,
        created_at: now,
        updated_at: now,
      },
    });

  // Generate JWT tokens
  const access_token = jwt.sign(
    {
      id: created.id,
      type: "developer",
      email: created.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh_token = jwt.sign(
    {
      id: created.id,
      token_type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Tokens expiration timestamps
  const expired_at = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at,
      refreshable_until,
    },
  };
}
