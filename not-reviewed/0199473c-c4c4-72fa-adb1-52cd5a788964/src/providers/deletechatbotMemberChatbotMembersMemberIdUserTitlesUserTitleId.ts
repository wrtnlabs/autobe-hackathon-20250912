import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Deletes a chatbot user title association record permanently.
 *
 * This operation removes the link between a chatbot member and a title,
 * identified by the userTitleId and belonging to the memberId. The user title
 * association is hard deleted from the database.
 *
 * @param props - Object containing member authentication and identifiers
 * @param props.member - The authenticated member performing the deletion
 * @param props.memberId - UUID of the chatbot member
 * @param props.userTitleId - UUID of the user title association to delete
 * @throws {Error} When the user title association does not exist
 * @throws {Error} When the user title association does not belong to the member
 */
export async function deletechatbotMemberChatbotMembersMemberIdUserTitlesUserTitleId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  userTitleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, memberId, userTitleId } = props;

  // Fetch the user title association record by id
  const userTitle = await MyGlobal.prisma.chatbot_user_titles.findUnique({
    where: { id: userTitleId },
  });

  if (userTitle === null) {
    throw new Error("User title association not found");
  }

  // Authorization: ensure this belongs to the member
  if (userTitle.chatbot_member_id !== memberId) {
    throw new Error("Unauthorized: user title does not belong to the member");
  }

  // Hard delete the association record
  await MyGlobal.prisma.chatbot_user_titles.delete({
    where: { id: userTitleId },
  });
}
