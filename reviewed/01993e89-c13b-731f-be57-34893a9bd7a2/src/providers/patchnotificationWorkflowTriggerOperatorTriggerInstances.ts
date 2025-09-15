import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import { IPageINotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowTriggerInstance";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Lists trigger instances with pagination and filtering for workflow and
 * status.
 *
 * Allows trigger operators to query lifecycle status and retry attempts of
 * workflow triggers.
 *
 * @param props - Contains triggerOperator payload and request body with
 *   filtering options
 * @param props.triggerOperator - Authenticated trigger operator user
 *   information
 * @param props.body - Request body containing pagination and filtering options
 * @returns A paginated summary list of trigger instances
 * @throws {Error} When database access fails
 */
export async function patchnotificationWorkflowTriggerOperatorTriggerInstances(props: {
  triggerOperator: TriggerOperatorPayload;
  body: INotificationWorkflowTriggerInstance.IRequest;
}): Promise<IPageINotificationWorkflowTriggerInstance.ISummary> {
  const { body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;
  const skip = page * limit;

  const where = {
    ...(body.workflow_id !== undefined &&
      body.workflow_id !== null && { workflow_id: body.workflow_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_trigger_instances.findMany({
      where,
      orderBy: { available_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_trigger_instances.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id as string & tags.Format<"uuid">,
      workflow_id: row.workflow_id as string & tags.Format<"uuid">,
      idempotency_key: row.idempotency_key,
      cursor_current_node_id: row.cursor_current_node_id ?? undefined,
      status: row.status,
      attempts: row.attempts,
      available_at: toISOStringSafe(row.available_at),
    })),
  };
}
