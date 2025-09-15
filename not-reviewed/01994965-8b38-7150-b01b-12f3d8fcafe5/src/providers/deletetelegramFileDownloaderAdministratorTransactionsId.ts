import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Permanently delete a payment transaction record by its ID.
 *
 * This operation removes the specified transaction record completely from the
 * database. Only administrators may perform this action, and the record must
 * exist.
 *
 * @param props - Object containing administrator payload and transaction ID.
 * @param props.administrator - The authenticated administrator performing the
 *   deletion.
 * @param props.id - UUID of the transaction to delete.
 * @returns Void
 * @throws {Error} Throws if the transaction is not found.
 */
export async function deletetelegramFileDownloaderAdministratorTransactionsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, id } = props;

  // Ensure the transaction exists or throw
  await MyGlobal.prisma.telegram_file_downloader_transactions.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Perform hard delete operation
  await MyGlobal.prisma.telegram_file_downloader_transactions.delete({
    where: { id },
  });
}
