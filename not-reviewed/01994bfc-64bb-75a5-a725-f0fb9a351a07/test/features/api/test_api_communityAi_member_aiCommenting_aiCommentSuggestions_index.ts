import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiAiCommentSuggestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiAiCommentSuggestion";
import { ICommunityAiAiCommentSuggestion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiCommentSuggestion";

export async function test_api_communityAi_member_aiCommenting_aiCommentSuggestions_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiAiCommentSuggestion.ISummary =
    await api.functional.communityAi.member.aiCommenting.aiCommentSuggestions.index(
      connection,
      {
        body: typia.random<ICommunityAiAiCommentSuggestion.IRequest>(),
      },
    );
  typia.assert(output);
}
