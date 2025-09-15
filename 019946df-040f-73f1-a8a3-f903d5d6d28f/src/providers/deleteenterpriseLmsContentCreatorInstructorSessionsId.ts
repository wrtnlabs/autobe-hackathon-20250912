import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Erase a LMS user session permanently
 *
 * Delete a user session by its unique identifier. This permanently removes the
 * session record from the database, revoking user access.
 *
 * Careful authorization checks must be done before performing this operation.
 * Only the owner contentCreatorInstructor user can delete their session.
 *
 * @param props - Object containing the authenticated contentCreatorInstructor
 *   user and session ID
 * @param props.contentCreatorInstructor - The authenticated content
 *   creator/instructor user payload
 * @param props.id - Unique UUID identifier of the session to delete
 * @returns Void
 * @throws {Error} If the session does not exist or the user is unauthorized
 */
export async function deleteenterpriseLmsContentCreatorInstructorSessionsId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentCreatorInstructor, id } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_sessions.findUniqueOrThrow({
      where: { id },
    });

  if (session.user_id !== contentCreatorInstructor.id) {
    throw new Error(
      "Unauthorized: Only the session owner can delete the session.",
    );
  }

  await MyGlobal.prisma.enterprise_lms_sessions.delete({
    where: { id },
  });
}
