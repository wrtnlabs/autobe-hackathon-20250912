import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve a chatbot user title record by member and user title IDs.
 *
 * This function fetches a specific chatbot_user_title record corresponding to
 * the unique userTitleId and belonging to the chatbot member specified by
 * memberId. Only non-deleted records (where deleted_at is null) are returned.
 *
 * @param props - Object containing member authentication payload, memberId, and
 *   userTitleId
 * @param props.member - The authenticated member payload
 * @param props.memberId - UUID of the chatbot member whose user title is
 *   requested
 * @param props.userTitleId - UUID of the chatbot user title record
 * @returns Detailed chatbot user title record including assignment and audit
 *   timestamps
 * @throws {Error} Throws if no matching record found or unauthorized access
 */
export async function getchatbotMemberChatbotMembersMemberIdUserTitlesUserTitleId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  userTitleId: string & tags.Format<"uuid">;
}): Promise<IChatbotUserTitle> {
  const { member, memberId, userTitleId } = props;

  const record = await MyGlobal.prisma.chatbot_user_titles.findUniqueOrThrow({
    where: {
      id: userTitleId,
      chatbot_member_id: memberId,
      deleted_at: null,
    },
  });

  return {
    id: record.id,
    chatbot_member_id: record.chatbot_member_id,
    chatbot_title_id: record.chatbot_title_id,
    assigned_at: toISOStringSafe(record.assigned_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
