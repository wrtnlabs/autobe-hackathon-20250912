import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianAdmin";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

/**
 * This test validates that an admin user can delete a vendor successfully.
 *
 * 1. Create and authenticate as an admin user.
 * 2. Create a subscription vendor.
 * 3. Delete the vendor using the admin vendor erase API.
 * 4. Confirm deletion yields 204 No Content by lack of errors.
 * 5. Confirm that deleting same vendorId again fails with Not Found.
 */
export async function test_api_vendor_deletion_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies ISubscriptionRenewalGuardianAdmin.ICreate;
  const admin: ISubscriptionRenewalGuardianAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin login to ensure auth token is set
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies ISubscriptionRenewalGuardianAdmin.ILogin;
  const adminLogin: ISubscriptionRenewalGuardianAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Create a vendor via user vendor create API
  const vendorCreateBody = {
    name: `Vendor_${RandomGenerator.alphaNumeric(8)}`,
  } satisfies ISubscriptionRenewalGuardianVendor.ICreate;
  const vendor: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.create(
      connection,
      {
        body: vendorCreateBody,
      },
    );
  typia.assert(vendor);

  // 4. Delete the vendor using admin vendor erase API
  await api.functional.subscriptionRenewalGuardian.admin.vendors.erase(
    connection,
    {
      vendorId: vendor.id,
    },
  );

  // 5. Confirm that deleting the same vendor again results in Not Found error
  await TestValidator.error(
    "deleting non-existent vendor should produce Not Found error",
    async () => {
      await api.functional.subscriptionRenewalGuardian.admin.vendors.erase(
        connection,
        {
          vendorId: vendor.id,
        },
      );
    },
  );
}
