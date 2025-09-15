import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignCorporateUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignCorporateUser";

export async function test_api_corporateuser_authentication_success(
  connection: api.IConnection,
) {
  // Generate a valid login payload
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEasySignCorporateUser.ILogin;

  // Call login API and assert the response
  const authorized: IEasySignCorporateUser.IAuthorized =
    await api.functional.auth.corporateUser.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // Validate token structure
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);

  // Business logic validation: authorized email matches input login email
  TestValidator.equals(
    "authorized email matches input email",
    authorized.email,
    loginBody.email,
  );
}
