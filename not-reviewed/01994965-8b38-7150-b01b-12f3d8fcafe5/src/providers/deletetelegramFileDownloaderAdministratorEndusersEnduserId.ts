import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Deletes a telegram file downloader end user by their unique identifier.
 *
 * This operation permanently removes the end user and all related data
 * leveraging database cascade deletes. Despite soft delete fields in the
 * schema, this performs a hard delete.
 *
 * Authorization: Administrator only.
 *
 * @param props - Object containing the administrator payload and enduserId
 * @param props.administrator - Authenticated administrator performing this
 *   action
 * @param props.enduserId - UUID of the end user to delete
 * @returns Void
 * @throws {Error} Throws if the end user does not exist
 */
export async function deletetelegramFileDownloaderAdministratorEndusersEnduserId(props: {
  administrator: AdministratorPayload;
  enduserId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, enduserId } = props;

  // Verify the end user exists
  await MyGlobal.prisma.telegram_file_downloader_endusers.findUniqueOrThrow({
    where: { id: enduserId },
  });

  // Hard delete the end user record (related data deleted via cascade)
  await MyGlobal.prisma.telegram_file_downloader_endusers.delete({
    where: { id: enduserId },
  });
}
