import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import { IPageIEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentAccessControl";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

export async function patchenterpriseLmsOrganizationAdminContentAccessControls(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsContentAccessControl.IRequest;
}): Promise<IPageIEnterpriseLmsContentAccessControl.ISummary> {
  const { organizationAdmin, body } = props;

  // page and limit are not part of IRequest; provide defaults for pagination
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereConditions = {
    ...(body.content_id !== undefined &&
      body.content_id !== null && { content_id: body.content_id }),
    ...(body.tenant_id !== undefined &&
      body.tenant_id !== null && { tenant_id: body.tenant_id }),
    ...(body.allowed_roles !== undefined &&
      body.allowed_roles !== null && {
        allowed_roles: { contains: body.allowed_roles },
      }),
    ...(body.allowed_learners !== undefined &&
      body.allowed_learners !== null && {
        allowed_learners: { contains: body.allowed_learners },
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && {
        created_at: toISOStringSafe(body.created_at),
      }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && {
        updated_at: toISOStringSafe(body.updated_at),
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_content_access_controls.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_content_access_controls.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((record) => ({
      id: record.id,
      content_id: record.content_id,
      tenant_id: record.tenant_id,
      allowed_roles:
        record.allowed_roles === null ? null : record.allowed_roles,
      allowed_learners:
        record.allowed_learners === null ? null : record.allowed_learners,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
