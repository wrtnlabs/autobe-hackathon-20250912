import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentApprovalWorkflow";
import { IPageIEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentApprovalWorkflow";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a paginated list of approval workflow steps for a specific content
 * item.
 *
 * Provides filtering by a search keyword applied to reviewer roles and
 * comments. Supports pagination with page and limit parameters. Enforces
 * tenant-based data isolation through contentId matching.
 *
 * @param props - Object containing the system admin payload, contentId, and
 *   request body
 * @param props.systemAdmin - Authenticated system admin performing the request
 * @param props.contentId - UUID of the content whose approval workflows are
 *   requested
 * @param props.body - Request body containing filter and pagination options
 * @returns Paginated summary of content approval workflows
 * @throws {Error} Throws if pagination parameters are invalid
 */
export async function patchenterpriseLmsSystemAdminContentsContentIdContentApprovalWorkflows(props: {
  systemAdmin: SystemadminPayload;
  contentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentApprovalWorkflow.IRequest;
}): Promise<IPageIEnterpriseLmsContentApprovalWorkflow.ISummary> {
  const { systemAdmin, contentId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  if (page <= 0) throw new Error("Page must be a positive integer");
  if (limit <= 0) throw new Error("Limit must be a positive integer");

  const skip = (page - 1) * limit;

  // Construct where condition with content_id and optional search string filter
  const whereCondition = {
    content_id: contentId,
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { reviewer_role: { contains: body.search } },
          { comments: { contains: body.search } },
        ],
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_content_approval_workflows.findMany({
      where: whereCondition,
      orderBy: { step_number: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_content_approval_workflows.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => ({
      id: row.id as string & tags.Format<"uuid">,
      content_id: row.content_id as string & tags.Format<"uuid">,
      step_number: row.step_number as number & tags.Type<"int32">,
      reviewer_role: row.reviewer_role,
      status: row.status,
      comments: row.comments ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
