import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import { IPageIFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSource";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Search and retrieve a list of data sources with filtering and pagination
 * support.
 *
 * Retrieves filtered, paginated external data sources belonging to the
 * FlexOffice system. Supports partial name matching, type filtering, and active
 * status. Results are ordered by creation date descending.
 *
 * @param props - Object containing authenticated editor and search criteria
 * @param props.editor - Authenticated editor payload
 * @param props.body - Search and filter criteria as per
 *   IFlexOfficeDataSource.IRequest
 * @returns A paginated list summary of data sources matching the filters
 * @throws {Error} May throw if database access fails
 */
export async function patchflexOfficeEditorDataSources(props: {
  editor: EditorPayload;
  body: IFlexOfficeDataSource.IRequest;
}): Promise<IPageIFlexOfficeDataSource.ISummary> {
  const { body } = props;

  // Default pagination values
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build where clause with conditional filters
  const where = {
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.type !== undefined &&
      body.type !== null && {
        type: body.type,
      }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
    deleted_at: null,
  };

  // Fetch data and total count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_data_sources.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        is_active: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_data_sources.count({ where }),
  ]);

  // Construct and return paginated summary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      is_active: item.is_active,
    })),
  };
}
