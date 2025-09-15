import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { IPageITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProject";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieves a paginated list of task management projects supporting filtering
 * and search.
 *
 * This endpoint supports optional search on code and name fields and filtering
 * by code, name, and owner_id. Pagination parameters page and limit control
 * result size. Only projects not marked as deleted (deleted_at IS NULL) are
 * returned.
 *
 * @param props - Properties including authenticated QA user and
 *   filtering/request body
 * @param props.qa - Authenticated QA user payload
 * @param props.body - The request body containing search and pagination
 *   criteria
 * @returns Paginated summary list of projects matching the criteria
 * @throws {Error} Throws when database access fails
 */
export async function patchtaskManagementQaProjects(props: {
  qa: QaPayload;
  body: ITaskManagementProject.IRequest;
}): Promise<IPageITaskManagementProject.ISummary> {
  const { body } = props;

  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;

  // Convert to plain numbers for pagination calculations
  const page = Number(pageRaw);
  const limit = Number(limitRaw);

  // Build 'where' clause with soft delete filter
  const where: {
    deleted_at: null;
    OR?: { code: { contains: string } }[];
    code?: string | null;
    name?: string | null;
    owner_id?: (string & tags.Format<"uuid">) | null;
  } = {
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.OR = [
      { code: { contains: body.search } },
      { name: { contains: body.search } },
    ];
  }

  if (body.code !== undefined && body.code !== null) {
    where.code = body.code;
  }

  if (body.name !== undefined && body.name !== null) {
    where.name = body.name;
  }

  if (body.owner_id !== undefined && body.owner_id !== null) {
    where.owner_id = body.owner_id;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_projects.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.task_management_projects.count({ where }),
  ]);

  // Map returned records to API summary format with ISO date conversion
  const data = results.map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
    created_at: toISOStringSafe(project.created_at),
    updated_at: toISOStringSafe(project.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
