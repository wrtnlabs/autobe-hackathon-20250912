import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update an existing child content tag relationship
 *
 * This operation updates the child content tag relationship identified by the
 * `parentTagId` and `childTagId` path parameters. It modifies the existing
 * hierarchical relationship in the `enterprise_lms_content_tag_hierarchy` table
 * to reflect changes in parent-child content tag associations.
 *
 * Authorization is limited to users with systemAdmin, organizationAdmin, and
 * contentCreatorInstructor roles.
 *
 * @param props - Object containing the authenticated content creator
 *   instructor, the path parameters `parentTagId` and `childTagId`, and the
 *   update body.
 * @returns The updated child tag hierarchy record.
 * @throws {Error} Throws if the specified tag relationship does not exist.
 */
export async function putenterpriseLmsContentCreatorInstructorContentTagsParentTagIdChildTagsChildTagId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  parentTagId: string & tags.Format<"uuid">;
  childTagId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentTagHierarchy.IUpdate;
}): Promise<IEnterpriseLmsContentTagHierarchy> {
  const { contentCreatorInstructor, parentTagId, childTagId, body } = props;

  // Find existing record
  const existingRecord =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.findFirstOrThrow(
      {
        where: {
          parent_tag_id: parentTagId,
          child_tag_id: childTagId,
        },
      },
    );

  // Prepare update data with conditional inclusion of nullable fields
  const updateData: Partial<IEnterpriseLmsContentTagHierarchy.IUpdate> = {};

  if (body.parent_tag_id !== undefined) {
    updateData.parent_tag_id = body.parent_tag_id;
  }
  if (body.child_tag_id !== undefined) {
    updateData.child_tag_id = body.child_tag_id;
  }

  // Update the record
  const updated =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.update({
      where: { id: existingRecord.id },
      data: updateData,
    });

  // Return updated record with date as ISO string
  return {
    id: updated.id,
    parent_tag_id: updated.parent_tag_id,
    child_tag_id: updated.child_tag_id,
    created_at: toISOStringSafe(updated.created_at),
  };
}
