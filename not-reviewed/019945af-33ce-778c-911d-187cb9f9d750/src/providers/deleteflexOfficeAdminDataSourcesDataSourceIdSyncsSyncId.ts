import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteflexOfficeAdminDataSourcesDataSourceIdSyncsSyncId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  syncId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, dataSourceId, syncId } = props;

  // Verify existence of the sync record
  const syncRecord =
    await MyGlobal.prisma.flex_office_data_source_syncs.findFirst({
      where: {
        id: syncId,
        flex_office_data_source_id: dataSourceId,
      },
    });

  if (syncRecord === null) {
    throw new Error("Sync record not found or already deleted");
  }

  // Perform soft delete by setting deleted_at
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.flex_office_data_source_syncs.update({
    where: { id: syncId },
    data: { deleted_at: deletedAt },
  });
}
