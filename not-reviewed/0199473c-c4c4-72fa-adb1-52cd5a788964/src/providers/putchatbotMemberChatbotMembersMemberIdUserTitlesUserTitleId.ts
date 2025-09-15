import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update an existing user title assignment for a chatbot member.
 *
 * This endpoint updates the chatbot_user_titles record identified by memberId
 * and userTitleId.
 *
 * Authorization: Only the authenticated member owning the user title can
 * perform the update.
 *
 * @param props - Object containing member authentication, path parameters, and
 *   update body
 * @param props.member - Authenticated member payload
 * @param props.memberId - UUID of the target chatbot member
 * @param props.userTitleId - UUID of the user title record to update
 * @param props.body - Partial update data for user title assignment
 * @returns The updated IChatbotUserTitle record
 * @throws {Error} When the user title does not belong to the authenticated
 *   member
 * @throws {Error} When the user title record is not found
 */
export async function putchatbotMemberChatbotMembersMemberIdUserTitlesUserTitleId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  userTitleId: string & tags.Format<"uuid">;
  body: IChatbotUserTitle.IUpdate;
}): Promise<IChatbotUserTitle> {
  const { member, memberId, userTitleId, body } = props;

  // Fetch existing user title record
  const userTitle = await MyGlobal.prisma.chatbot_user_titles.findUniqueOrThrow(
    {
      where: { id: userTitleId },
    },
  );

  // Authorization check - member must own this user title
  if (userTitle.chatbot_member_id !== member.id) {
    throw new Error("Unauthorized: You can only update your own user titles.");
  }

  // Prepare update data with optional fields; undefined skips update
  const updateData: IChatbotUserTitle.IUpdate = {
    chatbot_member_id: body.chatbot_member_id ?? undefined,
    chatbot_title_id: body.chatbot_title_id ?? undefined,
    assigned_at: body.assigned_at ?? undefined,
  };

  // Update record
  const updated = await MyGlobal.prisma.chatbot_user_titles.update({
    where: { id: userTitleId },
    data: updateData,
  });

  // Return updated record with all date values converted to ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    chatbot_member_id: updated.chatbot_member_id as string &
      tags.Format<"uuid">,
    chatbot_title_id: updated.chatbot_title_id as string & tags.Format<"uuid">,
    assigned_at: toISOStringSafe(updated.assigned_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
