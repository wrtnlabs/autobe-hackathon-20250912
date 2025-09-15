import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { IPageITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProject";
import { PmPayload } from "../decorators/payload/PmPayload";

export async function patchtaskManagementPmProjects(props: {
  pm: PmPayload;
  body: ITaskManagementProject.IRequest;
}): Promise<IPageITaskManagementProject.ISummary> {
  const { pm, body } = props;

  const page = (body.page ?? 1) satisfies number as number;
  const limit = (body.limit ?? 10) satisfies number as number;
  const skip = (page - 1) * limit;

  await MyGlobal.prisma.task_management_pm.findUniqueOrThrow({
    where: { id: pm.id, deleted_at: null },
  });

  const where = {
    deleted_at: null,
    ...(body.owner_id !== undefined &&
      body.owner_id !== null && { owner_id: body.owner_id }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search } },
          { name: { contains: body.search } },
        ],
      }),
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  const [projects, total] = await Promise.all([
    MyGlobal.prisma.task_management_projects.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.task_management_projects.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      created_at: toISOStringSafe(p.created_at),
      updated_at: toISOStringSafe(p.updated_at),
    })),
  };
}
