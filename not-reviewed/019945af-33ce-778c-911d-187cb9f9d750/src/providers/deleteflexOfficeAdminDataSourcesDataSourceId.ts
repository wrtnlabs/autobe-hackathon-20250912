import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Hard delete a data source by dataSourceId.
 *
 * This API endpoint permanently deletes a data source and all related entities,
 * including synchronization records, credentials, external sheets, and logs.
 * Only an admin can perform this operation due to its destructive nature.
 *
 * @param props - The function parameters.
 * @param props.admin - The authenticated admin performing the delete.
 * @param props.dataSourceId - The UUID of the data source to delete.
 * @throws {Error} If the data source does not exist.
 */
export async function deleteflexOfficeAdminDataSourcesDataSourceId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, dataSourceId } = props;

  // Verify the data source exists
  await MyGlobal.prisma.flex_office_data_sources.findUniqueOrThrow({
    where: { id: dataSourceId },
  });

  // Delete the data source (hard delete)
  await MyGlobal.prisma.flex_office_data_sources.delete({
    where: { id: dataSourceId },
  });
}
