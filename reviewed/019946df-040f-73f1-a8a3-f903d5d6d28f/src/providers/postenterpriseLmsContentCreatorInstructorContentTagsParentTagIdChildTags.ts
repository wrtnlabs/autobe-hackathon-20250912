import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a child content tag under the specified parent content tag.
 *
 * This operation inserts a new record linking a parent tag to a child tag in
 * the enterprise_lms_content_tag_hierarchy table, ensuring proper tenant-scoped
 * hierarchical relationships.
 *
 * @param props - Contains the authenticated contentCreatorInstructor, the
 *   parentTagId path parameter, and the creation request body with the
 *   child_tag_id.
 * @returns The newly created content tag hierarchy record.
 * @throws {Error} If any error occurs during creation (e.g., duplicates or DB
 *   errors).
 */
export async function postenterpriseLmsContentCreatorInstructorContentTagsParentTagIdChildTags(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  parentTagId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentTagHierarchy.ICreate;
}): Promise<IEnterpriseLmsContentTagHierarchy> {
  const id = v4() as string & tags.Format<"uuid">;
  const created_at = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.create({
      data: {
        id,
        parent_tag_id: props.parentTagId,
        child_tag_id: props.body.child_tag_id,
        created_at,
      },
    });

  return {
    id: created.id,
    parent_tag_id: created.parent_tag_id,
    child_tag_id: created.child_tag_id,
    created_at: created_at,
  };
}
