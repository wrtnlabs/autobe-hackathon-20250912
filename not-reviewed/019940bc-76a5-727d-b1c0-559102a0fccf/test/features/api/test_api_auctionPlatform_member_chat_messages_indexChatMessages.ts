import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformChatMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformChatMessage";
import { IAuctionPlatformChatMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformChatMessage";

export async function test_api_auctionPlatform_member_chat_messages_indexChatMessages(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformChatMessage =
    await api.functional.auctionPlatform.member.chat.messages.indexChatMessages(
      connection,
      {
        body: typia.random<IAuctionPlatformChatMessage.IRequest>(),
      },
    );
  typia.assert(output);
}
