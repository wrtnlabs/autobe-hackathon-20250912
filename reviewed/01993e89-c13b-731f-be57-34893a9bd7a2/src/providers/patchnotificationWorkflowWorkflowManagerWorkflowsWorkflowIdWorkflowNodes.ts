import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import { IPageINotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowNode";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Search and retrieve workflow nodes for a given workflow.
 *
 * This operation fetches a filtered, paginated list of workflow nodes for the
 * specified workflow ID.
 *
 * Access is restricted to users with the 'workflowManager' role and has been
 * authenticated externally.
 *
 * @param props - Object containing the authenticated workflowManager, the
 *   workflowId path parameter, and filtering and pagination parameters.
 * @param props.workflowManager - The authenticated workflow manager payload.
 * @param props.workflowId - The UUID of the workflow whose nodes are to be
 *   fetched.
 * @param props.body - Filter and pagination parameters conforming to
 *   INotificationWorkflowWorkflowNode.IRequest.
 * @returns Paginated summary list of workflow nodes.
 * @throws {Error} If page or limit parameters are less than 1.
 */
export async function patchnotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowNodes(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowNode.IRequest;
}): Promise<IPageINotificationWorkflowWorkflowNode.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;

  if (page < 1) throw new Error("Page must be 1 or greater");
  if (limit < 1) throw new Error("Limit must be 1 or greater");

  const where: {
    workflow_id: string & tags.Format<"uuid">;
    id?: (string & tags.Format<"uuid">) | null;
    node_type?: string | null;
    name?: { contains: string };
    email_to_template?: { contains: string };
    email_subject_template?: { contains: string };
    email_body_template?: { contains: string };
    sms_to_template?: { contains: string };
    sms_body_template?: { contains: string };
    delay_ms?: (number & tags.Type<"int32">) | null;
    delay_duration?: { contains: string };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    updated_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    deleted_at: null;
  } = {
    workflow_id: props.workflowId,
    deleted_at: null,
  };

  if (props.body.id !== undefined && props.body.id !== null) {
    where.id = props.body.id;
  }
  if (props.body.node_type !== undefined && props.body.node_type !== null) {
    where.node_type = props.body.node_type;
  }
  if (props.body.name !== undefined && props.body.name !== null) {
    where.name = { contains: props.body.name };
  }
  if (
    props.body.email_to_template !== undefined &&
    props.body.email_to_template !== null
  ) {
    where.email_to_template = { contains: props.body.email_to_template };
  }
  if (
    props.body.email_subject_template !== undefined &&
    props.body.email_subject_template !== null
  ) {
    where.email_subject_template = {
      contains: props.body.email_subject_template,
    };
  }
  if (
    props.body.email_body_template !== undefined &&
    props.body.email_body_template !== null
  ) {
    where.email_body_template = { contains: props.body.email_body_template };
  }
  if (
    props.body.sms_to_template !== undefined &&
    props.body.sms_to_template !== null
  ) {
    where.sms_to_template = { contains: props.body.sms_to_template };
  }
  if (
    props.body.sms_body_template !== undefined &&
    props.body.sms_body_template !== null
  ) {
    where.sms_body_template = { contains: props.body.sms_body_template };
  }
  if (props.body.delay_ms !== undefined && props.body.delay_ms !== null) {
    where.delay_ms = props.body.delay_ms;
  }
  if (
    props.body.delay_duration !== undefined &&
    props.body.delay_duration !== null
  ) {
    where.delay_duration = { contains: props.body.delay_duration };
  }

  if (
    (props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null) ||
    (props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null)
  ) {
    where.created_at = {};
    if (
      props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null
    ) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (
      props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null
    ) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  if (
    (props.body.updated_at_from !== undefined &&
      props.body.updated_at_from !== null) ||
    (props.body.updated_at_to !== undefined &&
      props.body.updated_at_to !== null)
  ) {
    where.updated_at = {};
    if (
      props.body.updated_at_from !== undefined &&
      props.body.updated_at_from !== null
    ) {
      where.updated_at.gte = props.body.updated_at_from;
    }
    if (
      props.body.updated_at_to !== undefined &&
      props.body.updated_at_to !== null
    ) {
      where.updated_at.lte = props.body.updated_at_to;
    }
  }

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
      pages: Math.ceil(total / limit),
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
