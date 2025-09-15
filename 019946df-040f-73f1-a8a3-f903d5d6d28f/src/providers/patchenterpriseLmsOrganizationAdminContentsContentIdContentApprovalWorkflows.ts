import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentApprovalWorkflow";
import { IPageIEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentApprovalWorkflow";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve content approval workflow steps for a given content.
 *
 * This endpoint returns a paginated list of approval workflow steps associated
 * with a specific content item. The response includes reviewer roles, step
 * numbers, statuses, and comments, supporting filtering by search keyword,
 * sorting, and pagination.
 *
 * Tenant-restricted access applies: only organization administrators with
 * appropriate rights can access this data.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin making the
 *   request
 * @param props.contentId - UUID of the content item
 * @param props.body - Query parameters for search, pagination, and sorting
 * @returns Paginated list of content approval workflow steps
 * @throws {Error} When content approval workflows cannot be retrieved
 */
export async function patchenterpriseLmsOrganizationAdminContentsContentIdContentApprovalWorkflows(props: {
  organizationAdmin: OrganizationadminPayload;
  contentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentApprovalWorkflow.IRequest;
}): Promise<IPageIEnterpriseLmsContentApprovalWorkflow.ISummary> {
  const { organizationAdmin, contentId, body } = props;

  const searchKeyword = body.search?.trim() ?? null;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where: any = {
    content_id: contentId,
  };

  if (searchKeyword !== null && searchKeyword !== "") {
    where.OR = [
      { reviewer_role: { contains: searchKeyword } },
      { comments: { contains: searchKeyword } },
    ];
  }

  let orderBy: Record<string, "asc" | "desc"> = { step_number: "asc" };
  if (body.sort) {
    const sortStr = body.sort.trim();
    const isDesc = sortStr.startsWith("-");
    const fieldName =
      isDesc || sortStr.startsWith("+") ? sortStr.substring(1) : sortStr;
    if (["step_number", "created_at", "updated_at"].includes(fieldName)) {
      orderBy = { [fieldName]: isDesc ? "desc" : "asc" };
    }
  }

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_content_approval_workflows.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_content_approval_workflows.count({
      where,
    }),
  ]);

  // Use typia.assertGuard to narrow types safely instead of 'as' assertions
  rows.forEach((row) => {
    typia.assertGuard<string & tags.Format<"uuid">>(row.id);
    typia.assertGuard<string & tags.Format<"uuid">>(row.content_id);
    typia.assertGuard<number & tags.Type<"int32">>(row.step_number);
    typia.assertGuard<string>(row.reviewer_role);
    typia.assertGuard<string>(row.status);
    // comments can be string|null|undefined, no assertion needed
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      content_id: row.content_id,
      step_number: row.step_number,
      reviewer_role: row.reviewer_role,
      status: row.status,
      comments: row.comments ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
