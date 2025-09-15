import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing child tag relationship between a parent tag and its child
 * tag.
 *
 * This endpoint is authorized for systemAdmin only.
 *
 * @param props.systemAdmin - The authenticated system administrator making this
 *   request.
 * @param props.parentTagId - The UUID of the parent content tag.
 * @param props.childTagId - The UUID of the child content tag to update.
 * @param props.body - The update data for the child tag relationship.
 * @returns The updated content tag hierarchy record.
 * @throws {Error} If the specified tag relationship does not exist.
 */
export async function putenterpriseLmsSystemAdminContentTagsParentTagIdChildTagsChildTagId(props: {
  systemAdmin: SystemadminPayload;
  parentTagId: string & tags.Format<"uuid">;
  childTagId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentTagHierarchy.IUpdate;
}): Promise<IEnterpriseLmsContentTagHierarchy> {
  const { systemAdmin, parentTagId, childTagId, body } = props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.findFirst({
      where: {
        parent_tag_id: parentTagId,
        child_tag_id: childTagId,
      },
    });

  if (!existing) {
    throw new Error("Content tag hierarchy relationship not found");
  }

  const updateData: IEnterpriseLmsContentTagHierarchy.IUpdate = {};

  if (body.parent_tag_id !== undefined) {
    updateData.parent_tag_id = body.parent_tag_id ?? null;
  }

  if (body.child_tag_id !== undefined) {
    updateData.child_tag_id = body.child_tag_id ?? null;
  }

  const updated =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.update({
      where: { id: existing.id },
      data: updateData,
    });

  return {
    id: updated.id,
    parent_tag_id: updated.parent_tag_id,
    child_tag_id: updated.child_tag_id,
    created_at: toISOStringSafe(updated.created_at),
  };
}
