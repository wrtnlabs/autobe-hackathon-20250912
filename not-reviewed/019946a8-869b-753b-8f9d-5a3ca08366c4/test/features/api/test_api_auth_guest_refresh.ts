import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordGuest";

export async function test_api_auth_guest_refresh(connection: api.IConnection) {
  const output: ITravelRecordGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: typia.random<ITravelRecordGuest.IRefresh>(),
    });
  typia.assert(output);
}
