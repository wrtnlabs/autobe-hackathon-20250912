import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTagChild } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagChild";
import { IPageIEnterpriseLmsContentTagChild } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTagChild";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List child tags under a parent content tag with pagination and filtering.
 *
 * This endpoint retrieves a paginated and filtered list of child content tags
 * linked to a specified parent tag, supporting secure hierarchical browsing.
 *
 * Only system administrators can access this endpoint.
 *
 * @param props - The function input parameter containing authentication,
 *   parentTagId, and filter/pagination information.
 * @returns A paginated summary list of child content tags under the parent tag.
 * @throws {Error} When authorization fails or if query execution has issues.
 */
export async function patchenterpriseLmsSystemAdminContentTagsParentTagIdChildTags(props: {
  systemAdmin: SystemadminPayload;
  parentTagId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentTagChild.IRequest;
}): Promise<IPageIEnterpriseLmsContentTagChild.ISummary> {
  const { systemAdmin, parentTagId, body } = props;

  // Normalize pagination parameters
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 10;
  const search = body.search ?? null;

  const sort = body.sort ?? "created_at desc";

  // Build the basic where filter
  const where: {
    parent_tag_id: string & tags.Format<"uuid">;
    OR?:
      | { id: string & tags.Format<"uuid"> }[]
      | { child_tag_id: string & tags.Format<"uuid"> }[];
  } = { parent_tag_id: parentTagId };

  // If search is a valid UUID, apply it as OR condition on id or child_tag_id
  if (typeof search === "string" && search.trim() !== "") {
    const trimmed = search.trim();
    const uuidv4regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (uuidv4regex.test(trimmed)) {
      where.OR = [
        { id: trimmed as string & tags.Format<"uuid"> },
        { child_tag_id: trimmed as string & tags.Format<"uuid"> },
      ];
    }
  }

  // Parse sort string into orderBy object for Prisma
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (sort) {
    const [field, dir] = sort.split(" ");
    if (
      field &&
      dir &&
      (dir.toLowerCase() === "asc" || dir.toLowerCase() === "desc")
    ) {
      orderBy = { [field]: dir.toLowerCase() as "asc" | "desc" };
    }
  }

  // Calculate offset
  const skip = (page - 1) * limit;

  // Get total count
  const total =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.count({ where });

  // Query records with pagination
  const records =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        parent_tag_id: true,
        child_tag_id: true,
      },
    });

  // Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      parent_tag_id: r.parent_tag_id as string & tags.Format<"uuid">,
      child_tag_id: r.child_tag_id as string & tags.Format<"uuid">,
    })),
  };
}
