import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new billing code entry (healthcare_platform_billing_codes table)
 *
 * This operation creates a new billing code in the
 * healthcare_platform_billing_codes table, allowing organization administrators
 * and billing managers to add procedural, diagnostic, or product/service codes
 * for future billing and claim use. Required fields include code, code_system,
 * name, and active status. After creation, the record is returned for
 * validation and registration in downstream systems. Supports business and
 * compliance logic for code systems, naming, uniqueness, and active status
 * control.
 *
 * Authorization: Requires authenticated OrganizationadminPayload. The caller
 * must possess organizationAdmin privileges, but authorization logic is
 * performed externally and is guaranteed by decorator handling.
 *
 * @param props - The request props
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request (signature required for auditing business events)
 * @param props.body - The billing code creation body (code, code_system, name,
 *   description?, active)
 * @returns The newly created billing code record as an
 *   IHealthcarePlatformBillingCode object
 * @throws {Prisma.PrismaClientKnownRequestError} When code/code_system
 *   uniqueness constraint is violated or other DB error
 */
export async function posthealthcarePlatformOrganizationAdminBillingCodes(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBillingCode.ICreate;
}): Promise<IHealthcarePlatformBillingCode> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_billing_codes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        code: props.body.code,
        code_system: props.body.code_system,
        name: props.body.name,
        description: props.body.description ?? undefined,
        active: props.body.active,
        created_at: now,
        updated_at: now,
      },
    });
  return {
    id: created.id,
    code: created.code,
    code_system: created.code_system,
    name: created.name,
    description:
      created.description === undefined ? undefined : created.description,
    active: created.active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
