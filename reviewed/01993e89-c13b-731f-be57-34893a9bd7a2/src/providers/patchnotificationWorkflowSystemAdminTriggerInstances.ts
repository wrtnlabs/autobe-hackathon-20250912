import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import { IPageINotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowTriggerInstance";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * List and search trigger instances with filters and pagination.
 *
 * This function retrieves paginated trigger instances filtered by optional
 * workflow ID and status. It is accessible only by authorized system
 * administrators.
 *
 * @param props - The function parameters containing systemAdmin payload and
 *   request body.
 * @param props.systemAdmin - Authenticated system administrator's identity
 *   payload.
 * @param props.body - Request object with optional filters page, limit,
 *   workflow_id, and status.
 * @returns Paginated list of trigger instance summaries.
 * @throws {Error} Throws when database query fails or unexpected error occurs.
 */
export async function patchnotificationWorkflowSystemAdminTriggerInstances(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowTriggerInstance.IRequest;
}): Promise<IPageINotificationWorkflowTriggerInstance.ISummary> {
  const { systemAdmin, body } = props;

  const page = body.page ?? 1;
  const limitUnclamped = body.limit ?? 10;
  const limit = limitUnclamped > 100 ? 100 : limitUnclamped;

  const where: {
    workflow_id?: string & tags.Format<"uuid">;
    status?: string;
  } = {};

  if (body.workflow_id !== undefined && body.workflow_id !== null) {
    where.workflow_id = body.workflow_id;
  }

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_trigger_instances.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_trigger_instances.count({ where }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    workflow_id: item.workflow_id,
    idempotency_key: item.idempotency_key,
    cursor_current_node_id: item.cursor_current_node_id ?? null,
    status: item.status,
    attempts: item.attempts,
    available_at: toISOStringSafe(item.available_at),
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
