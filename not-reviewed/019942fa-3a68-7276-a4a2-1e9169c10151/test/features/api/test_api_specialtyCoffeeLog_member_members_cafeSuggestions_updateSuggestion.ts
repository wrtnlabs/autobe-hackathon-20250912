import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISpecialtyCoffeeLogCafeSuggestion } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCafeSuggestion";

export async function test_api_specialtyCoffeeLog_member_members_cafeSuggestions_updateSuggestion(
  connection: api.IConnection,
) {
  const output: ISpecialtyCoffeeLogCafeSuggestion =
    await api.functional.specialtyCoffeeLog.member.members.cafeSuggestions.updateSuggestion(
      connection,
      {
        memberId: typia.random<string & tags.Format<"uuid">>(),
        suggestionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ISpecialtyCoffeeLogCafeSuggestion.IUpdate>(),
      },
    );
  typia.assert(output);
}
