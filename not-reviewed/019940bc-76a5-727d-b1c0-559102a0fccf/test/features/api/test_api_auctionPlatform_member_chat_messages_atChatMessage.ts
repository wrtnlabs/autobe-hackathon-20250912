import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformChatMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformChatMessage";

export async function test_api_auctionPlatform_member_chat_messages_atChatMessage(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformChatMessage =
    await api.functional.auctionPlatform.member.chat.messages.atChatMessage(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
