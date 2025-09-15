import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Register a new endUser account in telegram_file_downloader_endusers with a
 * unique email and hashed password. Automatically issues JWT tokens for initial
 * authentication.
 *
 * This endpoint ensures email uniqueness and securely stores passwords.
 *
 * @param props - Request props containing endUser payload and body with email
 *   and password_hash
 * @returns Authorized endUser information with tokens
 * @throws {Error} When the email is already registered
 */
export async function postauthEndUserJoin(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderEndUser.ICreate;
}): Promise<ITelegramFileDownloaderEndUser.IAuthorized> {
  const { body } = props;

  const existingUser =
    await MyGlobal.prisma.telegram_file_downloader_endusers.findFirst({
      where: { email: body.email },
    });
  if (existingUser) throw new Error("Email already registered");

  const hashedPassword = await MyGlobal.password.hash(body.password_hash);
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.telegram_file_downloader_endusers.create({
      data: {
        id,
        email: body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
      },
    });

  const accessToken = jwt.sign(
    { id: created.id, email: created.email, type: "enduser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: created.id,
    email: created.email as string & tags.Format<"email">,
    password_hash: created.password_hash,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
