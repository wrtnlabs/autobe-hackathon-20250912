import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import { IPageINotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflow";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Search and retrieve a filtered, paginated list of notification workflows.
 *
 * This operation allows system administrators to search workflows with various
 * filters such as code, name, active status, entry node, version, and
 * timestamps. Results are paginated and sorted by the last updated timestamp
 * descending.
 *
 * @param props - Object containing the authenticated systemAdmin and search
 *   filters.
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request.
 * @param props.body - Filter, pagination, and sorting parameters conforming to
 *   INotificationWorkflowWorkflow.IRequest.
 * @returns A paginated list of workflows matching the search criteria.
 * @throws {Error} When database access fails or unexpected errors occur.
 */
export async function patchnotificationWorkflowSystemAdminWorkflows(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowWorkflow.IRequest;
}): Promise<IPageINotificationWorkflowWorkflow> {
  const { systemAdmin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = {
    deleted_at: null,
  };

  if (body.code !== undefined && body.code !== null) {
    where.code = { contains: body.code };
  }

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  if (body.is_active !== undefined && body.is_active !== null) {
    where.is_active = body.is_active;
  }

  if (body.entry_node_id !== undefined && body.entry_node_id !== null) {
    where.entry_node_id = body.entry_node_id;
  }

  if (body.version !== undefined && body.version !== null) {
    where.version = body.version;
  }

  if (body.created_at !== undefined && body.created_at !== null) {
    where.created_at = body.created_at;
  }

  if (body.updated_at !== undefined && body.updated_at !== null) {
    where.updated_at = body.updated_at;
  }

  if (body.deleted_at !== undefined && body.deleted_at !== null) {
    where.deleted_at = body.deleted_at;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_workflows.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_workflows.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      code: item.code,
      name: item.name,
      is_active: item.is_active,
      entry_node_id: item.entry_node_id as string & tags.Format<"uuid">,
      version: item.version as number & tags.Type<"int32">,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
