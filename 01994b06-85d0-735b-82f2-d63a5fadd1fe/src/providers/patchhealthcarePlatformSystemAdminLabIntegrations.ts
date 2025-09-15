import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import { IPageIHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function patchhealthcarePlatformSystemAdminLabIntegrations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformLabIntegration.IRequest;
}): Promise<IPageIHealthcarePlatformLabIntegration.ISummary> {
  const { body } = props;

  // Pagination defaults
  const page = Math.max(Number(body.page ?? 1), 1);
  const pageSize = Math.max(Number(body.page_size ?? 20), 1);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Build the where filter strictly per schema
  const where = {
    ...(body.healthcare_platform_organization_id !== undefined &&
      body.healthcare_platform_organization_id !== null && {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
      }),
    ...(body.lab_vendor_code !== undefined &&
      body.lab_vendor_code !== null && {
        lab_vendor_code: body.lab_vendor_code,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.supported_message_format !== undefined &&
      body.supported_message_format !== null && {
        supported_message_format: body.supported_message_format,
      }),
    ...(((body.created_at_from !== undefined &&
      body.created_at_from !== null) ||
      (body.created_at_to !== undefined && body.created_at_to !== null)) && {
      created_at: {
        ...(body.created_at_from !== undefined &&
          body.created_at_from !== null && {
            gte: body.created_at_from,
          }),
        ...(body.created_at_to !== undefined &&
          body.created_at_to !== null && {
            lte: body.created_at_to,
          }),
      },
    }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { lab_vendor_code: { contains: body.search } },
          { supported_message_format: { contains: body.search } },
          { status: { contains: body.search } },
        ],
      }),
  };

  // Inline orderBy per system rule
  // Only use inline definition, don't extract variable.
  // TypeScript requires explicit cast to 'asc' | 'desc' for literal type safety.

  // Compose orderBy branch inline inside Prisma queries.
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_integrations.findMany({
      where,
      orderBy:
        body.sort_by !== undefined && body.sort_by !== null
          ? {
              [body.sort_by]: (body.sort_direction === "asc"
                ? "asc"
                : "desc") as Prisma.SortOrder,
            }
          : { created_at: "desc" as const },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_lab_integrations.count({ where }),
  ]);

  const data = rows.map((row) => {
    const result: IHealthcarePlatformLabIntegration.ISummary = {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      lab_vendor_code: row.lab_vendor_code,
      connection_uri: row.connection_uri,
      supported_message_format: row.supported_message_format,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      ...(row.deleted_at !== undefined &&
        row.deleted_at !== null && {
          deleted_at: toISOStringSafe(row.deleted_at),
        }),
    };
    return result;
  });

  const pages = Math.ceil(total / pageSize);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: pages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
