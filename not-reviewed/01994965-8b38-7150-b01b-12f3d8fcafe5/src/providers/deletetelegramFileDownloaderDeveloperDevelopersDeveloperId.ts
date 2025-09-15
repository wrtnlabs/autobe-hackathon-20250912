import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Delete developer user by developer ID
 *
 * Permanently removes the developer user from the database. Ensures only the
 * authenticated developer who owns the account can delete it. Throws if the
 * developer does not exist or if unauthorized.
 *
 * @param props - Object containing authenticated developer and developerId path
 *   parameter
 * @param props.developer - Authenticated developer payload
 * @param props.developerId - UUID of the developer to delete
 * @throws {Error} When the authenticated developer does not match the
 *   developerId
 * @throws {Error} When the developer user does not exist or is already deleted
 */
export async function deletetelegramFileDownloaderDeveloperDevelopersDeveloperId(props: {
  developer: DeveloperPayload;
  developerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { developer, developerId } = props;

  if (developer.id !== developerId) {
    throw new Error(
      "Unauthorized: You can only delete your own developer account",
    );
  }

  await MyGlobal.prisma.telegram_file_downloader_developers.findFirstOrThrow({
    where: {
      id: developerId,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.telegram_file_downloader_developers.delete({
    where: {
      id: developerId,
    },
  });
}
