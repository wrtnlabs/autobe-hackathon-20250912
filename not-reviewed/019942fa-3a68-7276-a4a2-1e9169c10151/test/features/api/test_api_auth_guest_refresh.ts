import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISpecialtyCoffeeLogGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogGuest";
import { ISpecialtyCoffeeLogGuestRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogGuestRefreshToken";

export async function test_api_auth_guest_refresh(connection: api.IConnection) {
  const output: ISpecialtyCoffeeLogGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: typia.random<ISpecialtyCoffeeLogGuestRefreshToken.IRequest>(),
    });
  typia.assert(output);
}
