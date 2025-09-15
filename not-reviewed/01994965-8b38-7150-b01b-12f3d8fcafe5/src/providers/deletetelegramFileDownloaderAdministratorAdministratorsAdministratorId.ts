import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Delete an administrator user permanently by their unique ID.
 *
 * This operation performs a hard delete on the
 * telegram_file_downloader_administrators record, permanently removing the
 * administrator from the system. Only authorized users with administrator
 * payload can invoke this.
 *
 * @param props - Object containing the authenticated administrator and the
 *   target administrator ID to delete
 * @param props.administrator - The authenticated administrator payload
 *   performing the deletion
 * @param props.administratorId - The UUID of the administrator user to delete
 * @throws {Error} If the administrator to delete does not exist
 */
export async function deletetelegramFileDownloaderAdministratorAdministratorsAdministratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administratorId } = props;

  await MyGlobal.prisma.telegram_file_downloader_administrators.delete({
    where: {
      id: administratorId,
    },
  });
}
