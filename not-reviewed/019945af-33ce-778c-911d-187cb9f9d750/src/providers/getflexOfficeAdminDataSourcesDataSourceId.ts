import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed FlexOffice data source information by its unique UUID.
 *
 * This endpoint is restricted to authorized admin users. It fetches the full
 * data source configuration including activation status and audit timestamps.
 *
 * @param props - Object containing the authenticated admin and the target data
 *   source UUID.
 * @param props.admin - The authenticated admin user making the request.
 * @param props.dataSourceId - UUID of the target data source to retrieve.
 * @returns Detailed data source record conforming to IFlexOfficeDataSource.
 * @throws {Error} Throws if no data source found with the specified UUID.
 */
export async function getflexOfficeAdminDataSourcesDataSourceId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeDataSource> {
  const { admin, dataSourceId } = props;

  const result =
    await MyGlobal.prisma.flex_office_data_sources.findUniqueOrThrow({
      where: { id: dataSourceId },
    });

  return {
    id: result.id,
    name: result.name,
    type: result.type,
    connection_info: result.connection_info,
    is_active: result.is_active,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
