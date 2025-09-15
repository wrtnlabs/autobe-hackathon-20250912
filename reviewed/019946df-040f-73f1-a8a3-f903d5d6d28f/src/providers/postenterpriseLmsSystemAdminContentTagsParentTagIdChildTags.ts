import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Creates a new child content tag entry linking a child tag to a parent tag
 * within the hierarchical content tagging system.
 *
 * This operation corresponds to creating a record in the
 * enterprise_lms_content_tag_hierarchy table in the database which manages
 * parent-child relationships between content tags.
 *
 * @param props - Object containing the authenticated system administrator
 *   payload, the parent tag ID path parameter, and the request body containing
 *   the child tag ID.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation.
 * @param props.parentTagId - UUID string identifying the parent content tag.
 * @param props.body - Payload for creating the child tag relationship.
 * @returns The created content tag hierarchy record with all fields populated.
 * @throws {Error} When the parentTagId path parameter does not match
 *   body.parent_tag_id.
 * @throws {Error} When a child tag relationship between the given parent and
 *   child already exists.
 */
export async function postenterpriseLmsSystemAdminContentTagsParentTagIdChildTags(props: {
  systemAdmin: SystemadminPayload;
  parentTagId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentTagHierarchy.ICreate;
}): Promise<IEnterpriseLmsContentTagHierarchy> {
  const { systemAdmin, parentTagId, body } = props;

  if (parentTagId !== body.parent_tag_id) {
    throw new Error(
      "parentTagId path parameter and body.parent_tag_id must match",
    );
  }

  const existing =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.findFirst({
      where: {
        parent_tag_id: parentTagId,
        child_tag_id: body.child_tag_id,
      },
    });

  if (existing !== null) {
    throw new Error(
      "Child tag relationship already exists for this parent and child",
    );
  }

  const created =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        parent_tag_id: parentTagId,
        child_tag_id: body.child_tag_id,
        created_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: created.id,
    parent_tag_id: created.parent_tag_id,
    child_tag_id: created.child_tag_id,
    created_at: toISOStringSafe(created.created_at),
  };
}
