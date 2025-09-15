import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import { IPageINotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowNode";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Search and retrieve workflow nodes for a given workflow.
 *
 * This operation allows authorized system administrators to fetch a filtered,
 * paginated list of workflow nodes that belong to a specified workflow. The
 * nodes can be filtered by various parameters such as id, node type, name,
 * templates, delays, and creation/update timestamp ranges.
 *
 * @param props - Object containing system admin auth, workflow ID path param,
 *   and request body with filters
 * @param props.systemAdmin - Authenticated system administrator user
 * @param props.workflowId - UUID of the workflow to list nodes for
 * @param props.body - Filter and pagination parameters
 * @returns A paginated summary list of workflow nodes matching filtering
 *   criteria
 * @throws Error if any database operation fails
 */
export async function patchnotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowNodes(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowNode.IRequest;
}): Promise<IPageINotificationWorkflowWorkflowNode.ISummary> {
  const { systemAdmin, workflowId, body } = props;

  const where: {
    deleted_at: null;
    workflow_id: string & tags.Format<"uuid">;
    id?: string & tags.Format<"uuid">;
    node_type?: string;
    name?: { contains: string };
    email_to_template?: { contains: string };
    email_subject_template?: { contains: string };
    email_body_template?: { contains: string };
    sms_to_template?: { contains: string };
    sms_body_template?: { contains: string };
    delay_ms?: number;
    delay_duration?: { contains: string };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    updated_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    deleted_at: null,
    workflow_id: workflowId,
  };

  if (body.id !== undefined && body.id !== null) {
    where.id = body.id;
  }
  if (body.node_type !== undefined && body.node_type !== null) {
    where.node_type = body.node_type;
  }
  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }
  if (body.email_to_template !== undefined && body.email_to_template !== null) {
    where.email_to_template = { contains: body.email_to_template };
  }
  if (
    body.email_subject_template !== undefined &&
    body.email_subject_template !== null
  ) {
    where.email_subject_template = { contains: body.email_subject_template };
  }
  if (
    body.email_body_template !== undefined &&
    body.email_body_template !== null
  ) {
    where.email_body_template = { contains: body.email_body_template };
  }
  if (body.sms_to_template !== undefined && body.sms_to_template !== null) {
    where.sms_to_template = { contains: body.sms_to_template };
  }
  if (body.sms_body_template !== undefined && body.sms_body_template !== null) {
    where.sms_body_template = { contains: body.sms_body_template };
  }
  if (body.delay_ms !== undefined && body.delay_ms !== null) {
    where.delay_ms = body.delay_ms;
  }
  if (body.delay_duration !== undefined && body.delay_duration !== null) {
    where.delay_duration = { contains: body.delay_duration };
  }
  if (
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
  ) {
    where.created_at = {};
    if (body.created_at_from !== undefined && body.created_at_from !== null) {
      where.created_at.gte = body.created_at_from;
    }
    if (body.created_at_to !== undefined && body.created_at_to !== null) {
      where.created_at.lte = body.created_at_to;
    }
  }
  if (
    (body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
  ) {
    where.updated_at = {};
    if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
      where.updated_at.gte = body.updated_at_from;
    }
    if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
      where.updated_at.lte = body.updated_at_to;
    }
  }

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const [nodes, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_workflow_nodes.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_workflow_nodes.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data: nodes.map((node) => ({
      id: node.id,
      node_type: node.node_type,
      name: node.name,
      created_at: toISOStringSafe(node.created_at),
      updated_at: toISOStringSafe(node.updated_at),
    })),
  };
}
