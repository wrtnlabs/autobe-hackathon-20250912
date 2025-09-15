import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Soft delete a virtual classroom session by setting the deleted_at timestamp.
 *
 * This operation marks the virtual classroom as deleted without physically
 * removing it from the database. It enforces that only the owning content
 * creator/instructor can perform the deletion.
 *
 * @param props - Object containing the authenticated content creator/instructor
 *   and the virtual classroom ID
 * @param props.contentCreatorInstructor - The authenticated content
 *   creator/instructor performing the deletion
 * @param props.virtualClassroomId - The UUID of the virtual classroom to be
 *   soft deleted
 * @throws {Error} Throws an error if the virtual classroom does not exist
 * @throws {Error} Throws an error if unauthorized deletion is attempted
 */
export async function deleteenterpriseLmsContentCreatorInstructorVirtualClassroomsVirtualClassroomId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  virtualClassroomId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentCreatorInstructor, virtualClassroomId } = props;

  const virtualClassroom =
    await MyGlobal.prisma.enterprise_lms_virtual_classrooms.findUnique({
      where: { id: virtualClassroomId },
    });

  if (!virtualClassroom) {
    throw new Error("Virtual classroom not found");
  }

  if (virtualClassroom.instructor_id !== contentCreatorInstructor.id) {
    throw new Error(
      "Unauthorized: You can only delete your own virtual classrooms",
    );
  }

  await MyGlobal.prisma.enterprise_lms_virtual_classrooms.update({
    where: { id: virtualClassroomId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
