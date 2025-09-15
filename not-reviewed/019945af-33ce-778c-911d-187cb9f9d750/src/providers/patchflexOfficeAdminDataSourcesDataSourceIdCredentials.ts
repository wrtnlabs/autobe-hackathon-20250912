import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";
import { IPageIFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceCredential";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Searches credentials for a specific data source.
 *
 * This API endpoint allows an administrator to search and retrieve all
 * credentials linked to a specific data source. Supports filtering, sorting,
 * and pagination.
 *
 * @param props - The properties object containing admin info, data source ID,
 *   and search parameters.
 * @returns A paginated summary list of matching credentials.
 * @throws {Error} When the data source with the specified ID does not exist.
 */
export async function patchflexOfficeAdminDataSourcesDataSourceIdCredentials(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceCredential.IRequest;
}): Promise<IPageIFlexOfficeDataSourceCredential.ISummary> {
  const { admin, dataSourceId, body } = props;

  // Verify the data source exists
  const dataSource = await MyGlobal.prisma.flex_office_data_sources.findUnique({
    where: { id: dataSourceId },
  });

  if (!dataSource) {
    throw new Error(`Data source not found with id ${dataSourceId}`);
  }

  // Default pagination values
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const skip = (page - 1) * limit;

  // Build the where clause filtering out soft-deleted credentials
  const where = {
    flex_office_data_source_id: dataSourceId,
    deleted_at: null,
  };

  // Determine sorting parameters (default to created_at desc)
  const sortBy = body.sort_by ?? "created_at";
  const order = body.order ?? "desc";

  // Query the credentials and total count in parallel
  const [credentials, total] = await Promise.all([
    MyGlobal.prisma.flex_office_data_source_credentials.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_data_source_credentials.count({ where }),
  ]);

  // Map the credentials converting dates to ISO string format
  const data = credentials.map((item) => ({
    id: item.id,
    credential_type: item.credential_type,
    expires_at: item.expires_at ? toISOStringSafe(item.expires_at) : null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));

  // Construct the pagination object
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  // Return the paginated summary
  return {
    pagination,
    data,
  };
}
