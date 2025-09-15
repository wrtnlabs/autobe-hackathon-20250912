import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import { IPageIFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeExternalSheet";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchflexOfficeAdminDataSourcesDataSourceIdExternalSheets(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeExternalSheet.IRequest;
}): Promise<IPageIFlexOfficeExternalSheet.ISummary> {
  const { admin, dataSourceId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    flex_office_data_source_id: dataSourceId,
    deleted_at: null,
    ...(body.file_name !== undefined &&
      body.file_name !== null && {
        file_name: { contains: body.file_name },
      }),
    ...(body.file_url !== undefined &&
      body.file_url !== null && {
        file_url: { contains: body.file_url },
      }),
    ...(body.sheet_count !== undefined && {
      sheet_count: body.sheet_count,
    }),
    ...(body.last_synced_at !== undefined &&
      body.last_synced_at !== null && {
        last_synced_at: body.last_synced_at,
      }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.flex_office_external_sheets.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_external_sheets.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      file_name: r.file_name,
      file_url: r.file_url,
      sheet_count: r.sheet_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      last_synced_at: r.last_synced_at
        ? toISOStringSafe(r.last_synced_at)
        : null,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
  };
}
