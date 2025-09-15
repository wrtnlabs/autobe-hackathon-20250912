import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_specialtyCoffeeLog_member_members_cafeSuggestions_eraseSuggestion(
  connection: api.IConnection,
) {
  const output =
    await api.functional.specialtyCoffeeLog.member.members.cafeSuggestions.eraseSuggestion(
      connection,
      {
        memberId: typia.random<string & tags.Format<"uuid">>(),
        suggestionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
