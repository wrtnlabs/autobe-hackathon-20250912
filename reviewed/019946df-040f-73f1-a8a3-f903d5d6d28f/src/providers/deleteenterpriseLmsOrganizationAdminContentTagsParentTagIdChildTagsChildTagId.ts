import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Deletes a child content tag relationship between the specified parent tag and
 * child tag.
 *
 * This operation permanently removes the relational link from the
 * enterprise_lms_content_tag_hierarchy table. Access is restricted to
 * organizationAdmin roles.
 *
 * @param props - Object containing authorization and identifiers for the tags
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload
 * @param props.parentTagId - UUID of the parent content tag
 * @param props.childTagId - UUID of the child content tag
 * @throws {Error} Throws an error if the specified relationship does not exist
 */
export async function deleteenterpriseLmsOrganizationAdminContentTagsParentTagIdChildTagsChildTagId(props: {
  organizationAdmin: OrganizationadminPayload;
  parentTagId: string & tags.Format<"uuid">;
  childTagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, parentTagId, childTagId } = props;

  const deleted =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.deleteMany({
      where: {
        parent_tag_id: parentTagId,
        child_tag_id: childTagId,
      },
    });

  if (deleted.count === 0) {
    throw new Error("Relationship not found");
  }
}
