import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformChatMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformChatMessage";

export async function test_api_auctionPlatform_member_chat_messages_createChatMessage(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformChatMessage =
    await api.functional.auctionPlatform.member.chat.messages.createChatMessage(
      connection,
      {
        body: typia.random<IAuctionPlatformChatMessage.ICreate>(),
      },
    );
  typia.assert(output);
}
