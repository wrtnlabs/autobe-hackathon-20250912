import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Delete a payment record by payment ID with cascade removal of related data.
 *
 * This operation permanently deletes a payment record identified by the payment
 * ID from the telegram_file_downloader_payments table. The operation cascades
 * deletions to related transactions and billing logs to maintain referential
 * integrity.
 *
 * This API is intended for administrator use only due to the sensitivity of
 * payment data. Unauthorized users will be denied access.
 *
 * @param props - Object containing administrator payload and the payment ID
 * @param props.administrator - The authenticated administrator performing the
 *   deletion
 * @param props.id - Unique identifier of the payment to delete
 * @returns Void
 * @throws {Error} Throws if the payment does not exist or deletion fails due to
 *   constraints
 */
export async function deletetelegramFileDownloaderAdministratorPaymentsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, id } = props;

  // Verify the payment record exists
  await MyGlobal.prisma.telegram_file_downloader_payments.findUniqueOrThrow({
    where: { id },
  });

  // Hard delete the payment record which cascades to related records
  await MyGlobal.prisma.telegram_file_downloader_payments.delete({
    where: { id },
  });
}
