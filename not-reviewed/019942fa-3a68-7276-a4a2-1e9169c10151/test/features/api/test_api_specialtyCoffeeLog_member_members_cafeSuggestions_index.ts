import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageISpecialtyCoffeeLogCafeSuggestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISpecialtyCoffeeLogCafeSuggestion";
import { ISpecialtyCoffeeLogCafeSuggestion } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCafeSuggestion";

export async function test_api_specialtyCoffeeLog_member_members_cafeSuggestions_index(
  connection: api.IConnection,
) {
  const output: IPageISpecialtyCoffeeLogCafeSuggestion.ISummary =
    await api.functional.specialtyCoffeeLog.member.members.cafeSuggestions.index(
      connection,
      {
        memberId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ISpecialtyCoffeeLogCafeSuggestion.IRequest>(),
      },
    );
  typia.assert(output);
}
