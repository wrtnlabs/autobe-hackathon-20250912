import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Delete a child content tag relationship.
 *
 * This function permanently deletes the child tag relationship identified by
 * parentTagId and childTagId from the enterprise_lms_content_tag_hierarchy
 * table.
 *
 * This operation requires authorization as a content creator instructor.
 *
 * @param props - Object containing the authorized content creator instructor
 *   and the parent and child content tag IDs.
 * @param props.contentCreatorInstructor - The authenticated content creator
 *   instructor.
 * @param props.parentTagId - UUID of the parent content tag.
 * @param props.childTagId - UUID of the child content tag.
 * @throws {Error} Throws if the specified relationship does not exist.
 */
export async function deleteenterpriseLmsContentCreatorInstructorContentTagsParentTagIdChildTagsChildTagId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  parentTagId: string & tags.Format<"uuid">;
  childTagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentCreatorInstructor, parentTagId, childTagId } = props;

  // Assuming authorization is handled by decorator/middleware

  // Find the child tag relationship record
  const record =
    await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.findFirstOrThrow(
      {
        where: {
          parent_tag_id: parentTagId,
          child_tag_id: childTagId,
        },
      },
    );

  // Hard delete the record
  await MyGlobal.prisma.enterprise_lms_content_tag_hierarchy.delete({
    where: { id: record.id },
  });
}
