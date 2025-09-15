import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

export async function test_api_external_learner_join_flow(
  connection: api.IConnection,
) {
  // Successful registration with valid data
  const validJoinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: validJoinBody,
      },
    );
  typia.assert(authorized);

  TestValidator.predicate(
    "response has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.equals(
    "tenant_id matches request",
    authorized.tenant_id,
    validJoinBody.tenant_id,
  );
  TestValidator.equals(
    "email matches request",
    authorized.email,
    validJoinBody.email,
  );
  TestValidator.equals(
    "first_name matches request",
    authorized.first_name,
    validJoinBody.first_name,
  );
  TestValidator.equals(
    "last_name matches request",
    authorized.last_name,
    validJoinBody.last_name,
  );
  TestValidator.equals("status is active", authorized.status, "active");
  TestValidator.predicate(
    "access_token present",
    authorized.access_token !== undefined && authorized.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token present",
    authorized.refresh_token !== undefined &&
      authorized.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "token.access is nonempty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is nonempty string",
    authorized.token.refresh.length > 0,
  );

  // Failure test: missing tenant_id
  await TestValidator.error(
    "join fails when tenant_id is empty string",
    async () => {
      await api.functional.auth.externalLearner.join.joinExternalLearner(
        connection,
        {
          body: {
            tenant_id: "",
            email: validJoinBody.email,
            password_hash: validJoinBody.password_hash,
            first_name: validJoinBody.first_name,
            last_name: validJoinBody.last_name,
            status: validJoinBody.status,
          } satisfies IEnterpriseLmsExternalLearner.IJoin,
        },
      );
    },
  );

  await TestValidator.error(
    "join fails when tenant_id is malformed UUID",
    async () => {
      await api.functional.auth.externalLearner.join.joinExternalLearner(
        connection,
        {
          body: {
            tenant_id: "invalid-uuid-format",
            email: validJoinBody.email,
            password_hash: validJoinBody.password_hash,
            first_name: validJoinBody.first_name,
            last_name: validJoinBody.last_name,
            status: validJoinBody.status,
          } satisfies IEnterpriseLmsExternalLearner.IJoin,
        },
      );
    },
  );
}
