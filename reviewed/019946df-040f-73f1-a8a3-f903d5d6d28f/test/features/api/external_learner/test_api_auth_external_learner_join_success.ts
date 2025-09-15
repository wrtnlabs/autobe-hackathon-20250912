import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

export async function test_api_auth_external_learner_join_success(
  connection: api.IConnection,
) {
  // Prepare valid join request data
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email =
    `${RandomGenerator.name(1).toLowerCase()}@example.com` as string &
      tags.Format<"email">;
  const passwordPlain = "Password123!"; // Placeholder for password - assume password_hash is backend hashed
  // Since the API requires password_hash, we provide a simulated hashed password string
  // Here for test we simulate a hashed password string format (real validation on backend)
  const passwordHash = `hashed${passwordPlain}`;
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const requestBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  // 1. Successful join
  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: requestBody },
    );
  typia.assert(authorized);

  // Basic validation of response data
  TestValidator.predicate(
    "authorized user has valid UUID id",
    typia.is<string & tags.Format<"uuid">>(authorized.id),
  );
  TestValidator.equals(
    "authorized tenant_id matches request",
    authorized.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "authorized email matches request",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "authorized first_name matches request",
    authorized.first_name,
    firstName,
  );
  TestValidator.equals(
    "authorized last_name matches request",
    authorized.last_name,
    lastName,
  );
  TestValidator.equals(
    "authorized status is active",
    authorized.status,
    "active",
  );

  // Token presence validations
  TestValidator.predicate(
    "access_token exists",
    authorized.access_token !== undefined && authorized.access_token !== null,
  );
  TestValidator.predicate(
    "refresh_token exists",
    authorized.refresh_token !== undefined && authorized.refresh_token !== null,
  );
  TestValidator.predicate(
    "token property exists",
    authorized.token !== undefined && authorized.token !== null,
  );
  TestValidator.predicate(
    "token access string present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh string present",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // 2. Error scenarios

  // Duplicate email error (simulate by retrying same request)
  await TestValidator.error(
    "joining with duplicate email should fail",
    async () => {
      await api.functional.auth.externalLearner.join.joinExternalLearner(
        connection,
        { body: requestBody },
      );
    },
  );

  // Invalid tenant_id format
  const invalidTenantIdRequest = {
    tenant_id: "invalid-uuid-format",
    email: `unique${RandomGenerator.alphaNumeric(5).toLowerCase()}@example.com`,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  await TestValidator.error(
    "joining with invalid tenant_id format should fail",
    async () => {
      await api.functional.auth.externalLearner.join.joinExternalLearner(
        connection,
        { body: invalidTenantIdRequest },
      );
    },
  );

  // Missing required fields (simulate missing email by empty string)
  const missingEmailRequest = {
    tenant_id: tenantId,
    email: "",
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  await TestValidator.error(
    "joining with missing email should fail",
    async () => {
      await api.functional.auth.externalLearner.join.joinExternalLearner(
        connection,
        { body: missingEmailRequest },
      );
    },
  );

  // Weak password enforcement is backend validation,
  // so test with short password hash simulating weak password
  const weakPasswordRequest = {
    tenant_id: tenantId,
    email: `weakpass${RandomGenerator.alphaNumeric(5).toLowerCase()}@example.com`,
    password_hash: "1234",
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  await TestValidator.error(
    "joining with weak password should fail",
    async () => {
      await api.functional.auth.externalLearner.join.joinExternalLearner(
        connection,
        { body: weakPasswordRequest },
      );
    },
  );
}
