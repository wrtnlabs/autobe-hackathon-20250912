import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * Create a new Telegram File Downloader end user account.
 *
 * This operation inserts a new record into telegram_file_downloader_endusers
 * table. It requires unique email and password hash for registration.
 *
 * @param props - Object containing the creation body with email and password
 *   hash.
 * @param props.body - Creation data for the end user.
 * @returns The newly created end user record including assigned ID and
 *   timestamps.
 * @throws {Error} When email already exists (duplicate unique constraint
 *   error).
 */
export async function posttelegramFileDownloaderEndusers(props: {
  body: ITelegramFileDownloaderEndUser.ICreate;
}): Promise<ITelegramFileDownloaderEndUser> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    const created =
      await MyGlobal.prisma.telegram_file_downloader_endusers.create({
        data: {
          id,
          email: body.email,
          password_hash: body.password_hash,
          created_at: now,
          updated_at: now,
        },
      });

    return {
      id: created.id as string & tags.Format<"uuid">,
      email: created.email,
      password_hash: created.password_hash,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      error.meta?.target &&
      Array.isArray(error.meta.target) &&
      error.meta.target.includes("email")
    ) {
      throw new Error(`Email already exists: ${body.email}`);
    }
    throw error;
  }
}
