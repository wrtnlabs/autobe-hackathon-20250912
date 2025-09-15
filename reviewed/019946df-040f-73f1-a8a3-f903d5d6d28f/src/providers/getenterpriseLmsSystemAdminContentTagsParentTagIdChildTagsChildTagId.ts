import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTagChild } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagChild";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get child tag detail by parent and child tag IDs
 *
 * This operation retrieves detailed information about a specific child tag
 * associated with a given parent tag ID. The resource is identified by the path
 * parameters 'parentTagId' and 'childTagId'. It fetches data from the
 * enterprise_lms_content_tag_hierarchy table, providing administrators with
 * precise hierarchical tag details.
 *
 * Access is authorized only to system administrators.
 *
 * @param props - Object containing systemAdmin payload and identifiers
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.parentTagId - Unique identifier of the parent content tag
 * @param props.childTagId - Unique identifier of the child content tag
 * @returns The detailed parent-child tag relationship information
 * @throws {Error} Throws if the parent-child relationship is not found
 */
export async function getenterpriseLmsSystemAdminContentTagsParentTagIdChildTagsChildTagId(props: {
  systemAdmin: SystemadminPayload;
  parentTagId: string & tags.Format<"uuid">;
  childTagId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentTagChild> {
  const { parentTagId, childTagId } = props;

  const hierarchy =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.findFirstOrThrow(
      {
        where: {
          parent_tag_id: parentTagId,
          child_tag_id: childTagId,
        },
      },
    );

  return {
    id: hierarchy.id,
    parent_tag_id: hierarchy.parent_tag_id,
    child_tag_id: hierarchy.child_tag_id,
    created_at: toISOStringSafe(hierarchy.created_at),
  };
}
