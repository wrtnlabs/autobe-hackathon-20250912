import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiComments";
import { ICommunityAiComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiComments";

export async function test_api_communityAi_admin_comments_searchComments(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiComments.ISummary =
    await api.functional.communityAi.admin.comments.searchComments(connection, {
      body: typia.random<ICommunityAiComments.IRequest>(),
    });
  typia.assert(output);
}
