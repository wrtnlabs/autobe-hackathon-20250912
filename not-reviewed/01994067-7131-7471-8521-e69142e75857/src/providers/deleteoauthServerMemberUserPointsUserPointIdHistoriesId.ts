import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete a specific user point history entry permanently.
 *
 * This operation deletes a user point history record identified by the
 * userPointId and id parameters, performing a hard delete from the database.
 *
 * Authorization depends on the member ownership of the user point record. Only
 * the owner member can delete history entries associated with their user
 * points.
 *
 * @param props - Object containing member authentication payload, userPointId
 *   path parameter, and history record id path parameter.
 * @param props.member - Authenticated member payload
 * @param props.userPointId - UUID of the user point record containing the
 *   history
 * @param props.id - UUID of the specific user point history record to delete
 * @returns Void
 * @throws {Error} Throws if authorization fails or records are not found
 */
export async function deleteoauthServerMemberUserPointsUserPointIdHistoriesId(props: {
  member: MemberPayload;
  userPointId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userPointId, id } = props;

  // Retrieve the user_point and verify ownership
  const userPoint =
    await MyGlobal.prisma.oauth_server_user_points.findUniqueOrThrow({
      where: { id: userPointId },
    });

  if (userPoint.user_id !== member.id) {
    throw new Error("Unauthorized to delete this user point history");
  }

  // Retrieve the target history record
  await MyGlobal.prisma.oauth_server_user_point_histories.findFirstOrThrow({
    where: { id, user_point_id: userPointId },
  });

  // Delete the history record
  await MyGlobal.prisma.oauth_server_user_point_histories.delete({
    where: { id },
  });
}
