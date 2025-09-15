import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Deletes a child content tag relationship.
 *
 * This operation permanently removes the child tag relationship between the
 * specified parent tag and child tag from the internal hierarchical content tag
 * relationship table enterprise_lms_content_tag_hierarchy.
 *
 * Access is restricted to authenticated system administrators.
 *
 * @param props - Object containing system administrator payload and tag
 *   identifiers
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.parentTagId - UUID of the parent content tag
 * @param props.childTagId - UUID of the child content tag
 * @throws {Error} When the specified child tag relationship does not exist
 */
export async function deleteenterpriseLmsSystemAdminContentTagsParentTagIdChildTagsChildTagId(props: {
  systemAdmin: SystemadminPayload;
  parentTagId: string & tags.Format<"uuid">;
  childTagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { parentTagId, childTagId } = props;

  const deleteResult =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.deleteMany({
      where: {
        parent_tag_id: parentTagId,
        child_tag_id: childTagId,
      },
    });

  if (deleteResult.count === 0) {
    throw new Error("Relationship does not exist");
  }
}
