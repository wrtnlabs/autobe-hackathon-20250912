import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Delete a subscription plan from the system by its unique identifier.
 *
 * This is a hard delete operation, permanently removing the subscription plan
 * record. Only authenticated administrators can perform this operation.
 *
 * @param props - The properties object containing administrator identity and
 *   subscription plan id.
 * @param props.administrator - The authenticated administrator performing the
 *   operation.
 * @param props.id - The UUID string identifier of the subscription plan to
 *   delete.
 * @returns Void
 * @throws {Error} Throws if the subscription plan does not exist.
 */
export async function deletetelegramFileDownloaderAdministratorSubscriptionPlansId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.telegram_file_downloader_subscription_plans.findUniqueOrThrow(
    {
      where: { id: props.id },
    },
  );
  await MyGlobal.prisma.telegram_file_downloader_subscription_plans.delete({
    where: { id: props.id },
  });
}
