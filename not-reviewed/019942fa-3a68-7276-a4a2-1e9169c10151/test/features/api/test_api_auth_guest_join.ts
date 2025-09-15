import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISpecialtyCoffeeLogGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogGuest";

export async function test_api_auth_guest_join(connection: api.IConnection) {
  const output: ISpecialtyCoffeeLogGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: typia.random<ISpecialtyCoffeeLogGuest.ICreate>(),
    });
  typia.assert(output);
}
