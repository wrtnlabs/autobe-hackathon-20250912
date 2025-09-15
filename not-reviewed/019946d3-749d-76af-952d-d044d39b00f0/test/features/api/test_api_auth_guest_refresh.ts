import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerGuest";

export async function test_api_auth_guest_refresh(connection: api.IConnection) {
  const output: IPoliticalNewsCrawlerGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: typia.random<IPoliticalNewsCrawlerGuest.IRefresh>(),
    });
  typia.assert(output);
}
