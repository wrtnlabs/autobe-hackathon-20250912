import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

/**
 * Test the registration of an external learner guest user including token
 * issuance.
 *
 * This test function calls the POST /auth/externalLearner/join endpoint to
 * register a new guest user with the "externalLearner" role. It verifies
 * that the account was created with correct profile information and
 * receives JWT tokens scoped for guest access.
 *
 * The workflow includes:
 *
 * 1. Creating a new external learner guest user with valid random profile
 *    data.
 * 2. Validating fields in the response including user id, email, tenant id,
 *    status, timestamps, and authentication tokens.
 * 3. Ensuring tokens are well-formed JWT strings and contain expected
 *    expiration timestamps.
 * 4. Attempting to register another user with the same email to verify
 *    rejection of duplicate registration.
 *
 * This test simulates a user joining as a guest external learner, which
 * does not require a separate login step but relies on refresh tokens to
 * maintain sessions.
 *
 * Implements verification for error scenarios such as email duplication and
 * weak password hash value.
 */
export async function test_api_external_learner_guest_registration_and_token_provision(
  connection: api.IConnection,
) {
  // Generate realistic random profile data for external learner registration
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email =
    `guest_${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
      tags.Format<"email">;
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  // Generate a secure but dummy password hash string (simulate hash)
  const passwordHash = RandomGenerator.alphaNumeric(64) satisfies string;

  // Compose join body
  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  // 1. Attempt to register new external learner guest user
  const joinResult =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(joinResult);

  // 2. Validate response fields
  TestValidator.predicate(
    "User Id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      joinResult.id,
    ),
  );
  TestValidator.equals("Email matches input", joinResult.email, email);
  TestValidator.equals(
    "TenantId matches input",
    joinResult.tenant_id,
    tenantId,
  );
  TestValidator.equals("Status is active", joinResult.status, "active");

  // Validate timestamps exist and are ISO 8601 date-time strings
  for (const field of ["created_at", "updated_at"] as const) {
    TestValidator.predicate(
      `${field} is ISO 8601`,
      typeof joinResult[field] === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
          joinResult[field],
        ),
    );
  }

  // Validate refresh_token and access_token fields in token
  TestValidator.predicate(
    "Token.access is non-empty string",
    typeof joinResult.token.access === "string" &&
      joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "Token.refresh is non-empty string",
    typeof joinResult.token.refresh === "string" &&
      joinResult.token.refresh.length > 0,
  );

  // Validate token expiration fields are ISO 8601 date-time strings
  for (const field of ["expired_at", "refreshable_until"] as const) {
    TestValidator.predicate(
      `${field} is ISO 8601`,
      typeof joinResult.token[field] === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
          joinResult.token[field],
        ),
    );
  }

  // 3. Attempt duplicate registration with the same email - expect error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.externalLearner.join.joinExternalLearner(
        connection,
        {
          body: {
            tenant_id: tenantId,
            email: email,
            password_hash: passwordHash,
            first_name: "Duplicate",
            last_name: "User",
            status: "active",
          } satisfies IEnterpriseLmsExternalLearner.IJoin,
        },
      );
    },
  );

  // 4. Attempt weak password hash registration - assume empty string as weak
  await TestValidator.error("weak password hash should fail", async () => {
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: {
          tenant_id: typia.random<string & tags.Format<"uuid">>(),
          email:
            `weakpw_${RandomGenerator.alphaNumeric(6)}@example.com` satisfies string &
              tags.Format<"email">,
          password_hash: "",
          first_name: "Weak",
          last_name: "Password",
          status: "active",
        } satisfies IEnterpriseLmsExternalLearner.IJoin,
      },
    );
  });
}
